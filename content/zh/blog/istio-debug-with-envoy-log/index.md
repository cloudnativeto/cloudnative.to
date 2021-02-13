---
title: "istio 数据面日志调试"
date: 2020-02-18T11:29:01+08:00
draft: false
image: "/images/blog/132.jpg"
author: "[钟华](https://imfox.io)"
description: "istio 遵循最大透明化的设计目标，在遥测系统中屏蔽了 sidecar 的信息，本文分享如何通过 envoy 日志对数据面流量问题进行定位"
tags: ["istio", "envoy"]
categories: ["service mesh"]
keywords: ["envoy log","envoy","istio"]
type: "post"
avatar: "/images/profile/default.jpg"
---

## 背景

这是使用 istio 最常见的困境：在微服务中引入 envoy 作为代理后，当流量访问和预期行为不符时，用户很难快速确定问题是出在哪个环节。客户端收到的异常响应，诸如 403、404、503 或者连接中断等，可能是链路中任一 sidecar 执行流量管控的结果， 但也有可能是来自某个服务的合理逻辑响应。

特别的，当 service mesh 系统的维护者和应用程序的开发者来自不同的团队时，问题尤为凸显。

在 mesh 中引入全链路跟踪系统，可以解决部分问题，我们可以知道请求到达了哪些工作负载，但是对于中断的异常请求，我们仍然很难确定原因。 因为本着最大透明化（Maximize Transparency）的[设计目标](https://istio.io/docs/ops/deployment/architecture/#design-goals)，istio 的遥测系统会尽量屏蔽掉 sidecar 的存在。另一方面，用户自行维护一套全链路跟踪系统成本也很高，受限于遥测采样率和有限的协议支持，我们通常无法采集所有链路数据。

幸运的是，envoy 本身可以记录流量的信息，本文主要介绍如何利用 envoy 日志，对类似问题进行定位。

demo 环境为腾讯云 TKE，istio 版本 1.4.3，代码归档于：[github.com/zhongfox/envoy-log-demo](https://github.com/zhongfox/envoy-log-demo)

---

## Envoy 流量模型

我们先看看 envoy 的流量模型：

1. 监听，接受连接
2. 根据用户流量操纵规则，进行流量特征识别
3. 进行流量操纵，如负载均衡，转发，拒绝等

在以上流程中， Envoy 接受请求流量叫做 **Downstream**，Envoy 发出请求流量叫做**Upstream**。在处理Downstream 和 Upstream 过程中， 分别会涉及2个流量端点，即请求的发起端和接收端：

![image-20200212134617057](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2020-02-12-054619.png)

在这个过程中， envoy 会根据用户规则，计算出符合条件的转发目的主机集合，这个集合叫做 **UPSTREAM_CLUSTER**,  并根据负载均衡规则，从这个集合中选择一个 host 作为流量转发的接收端点，这个 host 就是 **UPSTREAM_HOST**。

以上就是 envoy 请求处理的 **流量五元组信息**， 这是 envoy 日志里最重要的部分，通过这个五元组我们可以准确的观测流量「从哪里来」和「到哪里去」。

* UPSTREAM_CLUSTER
* DOWNSTREAM_REMOTE_ADDRESS
* DOWNSTREAM_LOCAL_ADDRESS
* UPSTREAM_LOCAL_ADDRESS
* UPSTREAM_HOST

---

## Helloworld example

在 istio 场景中，envoy 既可以是正向代理，也可以是反向代理。在上图中， 如果envoy 处理的是 outbound 流量， 业务容器是作为 Downstream 端点（右边）；如果 envoy 处理的是 inbound 流量， 业务容器是作为 Upstream 端点（左边）。

istio 中默认不开启 envoy 中的访问日志，需要手动打开，将 istio 配置中 `accessLogFile` 设置为 `/dev/stdout`：

```yaml
% kubectl -n istio-system edit cm istio
......
# Set accessLogFile to empty string to disable access log.
accessLogFile: "/dev/stdout" # 开启日志

accessLogEncoding: 'JSON' # 默认日志是单行格式， 可选设置为 JSON
......
```

我们以 sleep pod 访问 hello 服务来举例说明：

```shell
kubectl apply -f sleep-hello.yaml
```

![image-20200212222251433](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2020-02-12-142255.png)

该文件定义了 2个版本的 helloworld 和一个 sleep Pod，helloworld service 的端口是 4000， 而 pod 的端口是5000。

从 sleep Pod 中去访问 helloworld 服务, 确认应用正常：

```shell
% SLEEP_POD=$(kubectl get pod -l app=sleep -o jsonpath="{.items[0].metadata.name}")
% HELLO_V1_POD=$(kubectl get pod -l app=helloworld -l version=v1 -o jsonpath="{.items[0].metadata.name}")
% kubectl exec -it $SLEEP_POD -csleep -- sh
/ # curl helloworld:4000/hello
```

这时候我们可以去分析 2 个 pod 各自的envoy 日志：

![image-20200212222055391](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2020-02-12-142111.png)

用一张图来说明：

![image-20200218100343328](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2020-02-18-020347.png)

从日志中我们可以分析出：

对于 sleep pod， sleep app 发出的流量目的端是 hello service ip 和 service port，sleep envoy 处理的是 outbound 流量， envoy 根据规则选择的 「UPSTREAM_CLUSTER 」是`outbound|4000||helloworld.default.svc.cluster.local`, 然后转发给其中的一个 「UPSTREAM_HOST 」, 也就是 hello pod 的 ip 和port。

对于 hello pod，其 envoy 处理的是 inbound 流量，envoy 根据规则选择的 「UPSTREAM_CLUSTER 」 是`inbound|4000|http|helloworld.default.svc.cluster.local`, 其中的 「UPSTREAM_HOST 」 是 「127.0.0.1:5000 」, 也就是该 pod 里的 hello app。

因此，我们可以总结出 istio 中流量端点值的逻辑规则：

**UPSTREAM_HOST**

上游主机的 host，表示从 envoy 发出的请求的目的端，通常是「ip:port」

通常来说，对于 outbound cluster，此值是「上游pod-ip : pod-port」 ，而对于 inbound  cluster，此值是「127.0.0.1 : pod-port」

**UPSTREAM_LOCAL_ADDRESS**

 上游连接中，当前 envoy 的本地地址，此值是「当前pod-ip : 随机端口」

**DOWNSTREAM_LOCAL_ADDRESS**

 下游连接中，当前 envoy 的本地地址。

通常来说，对于 outbound cluster，此值是「目的service-ip : service-port 」，而对于 inbound  cluster，此值是「当前pod-ip : pod-port」

**DOWNSTREAM_REMOTE_ADDRESS**

下游连接中远端地址。

通常来说，对于 outbound cluster，此值是「当前pod-ip : 随机端口 」，而对于 inbound  cluster，此值是「下游pod-ip : 随机端口」

---

## Envoy 日志格式

envoy 允许定制日志格式， 格式通过若干「Command Operators」组合，用于提取请求信息，istio 没有使用 envoy 默认的日志格式， istio 定制的访问日志格式如下：

![image-20200205002607125](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2020-02-04-162610.png)

完整的「Command Operators」含义可查阅 [Envoy Access logging Command Operators](https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log#command-operators)

除了以上流量五元组，流量分析中常用的重要信息还有：

**RESPONSE_CODE**

响应状态码

**RESPONSE_FLAGS**

 很重要的信息，envoy 中自定义的响应标志位， 可以认为是envoy 附加的流量状态码。

如 「NR」表示找不到路由，「UH」表示upstream cluster 中没有健康的 host，「RL」表示触发 rate limit，「UO」触发断路器。

`RESPONSE_FLAGS`  可选值有十几个，这些信息在调试中非常关键。

**X-REQUEST-ID**

一次 C 到 S 的 http 请求，envoy 会在 C 端生产 request id，并附加到 header 中，传递到 S 端，在 2 端的日志中都会记录该值， 因此可以通过这个 ID 关联请求的上下游。注意不要和全链路跟踪中的 trace id 混淆。

**ROUTE_NAME**

匹配执行的路由名称

---

## 场景一：判断异常返回是来自业务还是 sidecar？

比如我们希望所有请求 helloworld 都路由到 v1 版本，创建对应的 virtual service：

```shell
% kubectl apply -f hello-v1-virtualservice.yaml
```

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: hello
spec:
  hosts:
    - "helloworld"
  http:
    - route:
      - destination:
          host: helloworld
          subset: v1
          port:
            number: 4000
```

从 sleep 中访问发现响应 503：

![image-20200212222518280](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2020-02-12-142520.png)

如果没有上下文，我们很难判断 503 是来自业务容器还是 sidecar，查看 sleep 和 hello 的 envoy 日志，可以发现：hello pod 的envoy 没有接受到请求，sleep pod 的 envoy 里日志：

![image-20200212222631659](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2020-02-12-142634.png)

其中`"response_flags": "NR"`  表示「No route configured」，也就是 envoy 找不到路由，我们可以判断出该异常是有 envoy 返回。

通过简单的分析就可以找到原因， 我们在VirtualService 中使用的 Destination 没有定义，将其补上：

```shell
% kubectl apply -f hello-v1-destinationrule.yaml
```

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: hello
spec:
  host: helloworld
  subsets:
    - name: v1
      labels:
        version: v1
```

再次访问请求正常，日志中`response_flags` 为空：

![image-20200212222913583](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2020-02-12-142915.png)

---

## 场景二：调试 istio mTLS 神坑

我们在现有环境中开启 mTLS: 在 istio-system namespace 中配置 mTLS 所需 meshpolicy 和 destinationrule，分别代表服务端和客户端开启 mTLS （省略 了 istio-policy istio-telemetry 相关的调整）。

```shell
% kubectl -n istio-system apply -f mtls-init.yaml
meshpolicy.authentication.istio.io/default configured
destinationrule.networking.istio.io/default created
```

```yaml
apiVersion: authentication.istio.io/v1alpha1
kind: MeshPolicy
metadata:
  name: default
spec:
  peers:
  - mtls: {}
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  labels:
    release: istio
  name: default
  namespace: istio-system
spec:
  host: '*.local'
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

片刻后， sleep 再次访问 helloworld 出现`connection termination`异常，sleep envoy 中有如下日志：

![image-20200212123932832](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2020-02-12-060832.png)

Sleep envoy `"response_flags": "UC"` 表示 Upstream 端终止了连接， `"upstream_host": "172.16.0.15:5000"`可以看出流量是发往了 helloworld v1 pod，进而查看 helloworld pod envoy 日志，发现居然没有日志！

一时间我们没法判断流量是因何终止。

这种情况，我们可以考虑开启更高级别的日志记录，envoy 默认的日志级别是 warning，我们可以调整为 debug 或者trace。

在 istio 中 有 2 种方式调整 envoy 日志级别， 第一种是在 istio 全局配置中调整， 这会修改 mesh 中所有 envoy 的日志级别，第二种方式，如果已经知道调试的目标 Pod， 我们可以给该 pod envoy 下发指令，只修改目标 envoy 的日志级别。

登录 helloworld pod，通过 admin api 将日志级别改为 debug：

```shell
% kubectl exec -it $HELLO_V1_POD -chelloworld -- sh
# curl -XPOST http://localhost:15000/logging\?level\=info
```

以上操作会改动这个 envoy 的所有日志目标，还可以只修改指定目标的日志级别，以减少日志量，比如：

```shell
curl -XPOST http://localhost:15000/logging\?filter\=debug
curl -XPOST http://localhost:15000/logging\?conn_handler\=debug
curl -XPOST http://localhost:15000/logging\?connection\=debug
curl -XPOST http://localhost:15000/logging\?router\=debug
```

这时我们可以看到，流量的确到达了 helloworld，但是在 TLS 握手阶段发生了错误：

![image-20200212131616274](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2020-02-12-061445.png)

进一步分析，我们可以发现是因为服务端（helloworld）开启了 mTLS，但是客户端（sleep）却没有开启，为什么 istio-system 中的 default destination rule 没有起作用？

原来我们在上一个 demo 中增加的 helloworld DestinationRule中， 默认是没有 mTLS 定义（所以不开启 mTLS），这个 DR 会在 helloworld pod 中覆盖 istio-system 中的 default destination rule。

我们在 helloworld DestinationRule 中补充 mTLS 配置：

```shell
% kubectl apply -f hello-v1-destinationrule-with-mtls.yaml
```

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: hello
spec:
  host: helloworld
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
  subsets:
    - name: v1
      labels:
        version: v1
```

再次测试，访问正常。

这种 istio mTLS 用户接口极度不友好，虽然 mTLS 默认做到了全局透明， 业务感知不到 mTLS 的存在， 但是一旦业务定义了 DestinationRule，DestinationRule 就必须要知道当前 mTLS 是否开启，并作出调整。试想 mTLS 配置交由安全团队负责，而业务团队负责各自的 DestinationRule，2个 团队的耦合会非常严重。

istio 官方在[文档](https://istio.io/docs/tasks/security/authentication/authn-policy/)里做了提示：

> Don’t forget that destination rules are also used for non-auth reasons such as setting up canarying, but the same order of precedence applies. So if a service requires a specific destination rule for any reason - for example, for a configuration load balancer - the rule must contain a similar TLS block with `ISTIO_MUTUAL` mode, as otherwise it will override the mesh- or namespace-wide TLS settings and disable TLS.

社区也有对这块的实现进行反思和重新设计：

![image-20200212133704748](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2020-02-12-061458.png)

未来版本中我们应该可以看到 mTLS 定义的优化。

---

## 小结

envoy 日志记录了 mesh 中流量走向和特征的关键信息，是数据面问题调试的利器。 除此之外，流量问题的排查还可以分析 xDS 内容, 以及istio 官方的命令行工具 istioctl 等等。
