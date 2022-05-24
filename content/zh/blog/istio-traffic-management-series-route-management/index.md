---
title: "浅析 Istio——流量治理之路由管理"
date: 2022-05-23T12:00:00+08:00
draft: false
image: "/images/blog/pexels-tobi-620337.jpg"
author: "李运田"
authorlink: "https://zhaohuabing.com"
description: "作者在本文将和大家一起探讨下 Istio 的路由管理，介绍使用 Istio 灰度发布的过程中，有哪些需要注意的地方。"
tags: ["Istio","金丝雀发布"]
categories: ["service mesh"]
keywords: ["Kubernetes","service mesh","金丝雀发布"]
type: "post"
avatar: "/images/profile/liyuntian.jpg"
profile: "中国移动云能力中心软件开发工程师，专注于云原生、Istio、微服务、Spring Cloud 等领域。"
---

## 前言

本文将和大家一起探讨下 Istio 的路由管理，介绍使用 Istio 灰度发布的过程中，有哪些需要注意的地方。

流量治理用于控制服务之间的流量和接口调用。Istio 可以通过服务级别的配置，实现蓝绿发布、灰度发布以及百分比流量策略发布等，Istio 还可以实现诸如故障注入、熔断限流、超时重试等流量治理功能。 那么 Istio 如何具有如此强大的功能，它的路由管理是如何实现的，生产中使用 Istio 需要注意的要点有哪些呢？

## Istio 为什么可以实现流量治理

Istio 中路由策略的转发处理都是通过 Envoy 实现，Envoy 作为 Sidecar 和每个服务容器部署在同一个 pod 中，Sidecar 在注入到 pod 之后，将原有服务调用从源容器 -> 目标容器的通信方式改变为源容器 -> Sidecar (源端) -> Sidecar (目的端) -> 目的容器，只要我们配置了正确的流量策略，通过 pilot 与 Envoy 之间建立的长连接，Envoy 可以实时获取最新的网络路由策略，这样 Envoy 接管了流入流出用户服务的流量，持有流量策略。并且 Istio 会自动探测 kubernetes 集群的 services 和 endpoints，从而可以获取 services 与 endpoints 之间的关系，Envoy 配置里既有流量策略，又有 endpoints 自然可以实现流量的转发处理。

Envoy 可代理的流量包括从服务网格外部到其内部运行的服务，服务网格内部之间的服务，以及服务网格内部到外部的服务。下图展示了 Istio 完整的路由管理。

![Istio路由管理](Istio-route-management.jpg)

1. 客户端在特定端口上发出请求；
2. 在集群内部，请求被路由到 Istio ingressgateway 服务所监听的端口上；
3. 在 Istio ingressgateway 上会配置 Gateway 资源和 VirtualService 资源定义。Gateway 会配置端口、协议以及相关安全证书，VirtualService 的路由配置信息用于找到正确的服务；
4. Istio ingressgateway 服务根据路由配置信息将请求路由到对应的应用服务上；
5. 应用服务配置 VirtualService 与 DestinationRule 策略，通过 Envoy 进行服务调用；
6. 外部服务可以通过 ServiceEntry 资源和 VirtualService 资源进行服务访问；

从上面的介绍中我们看出 Istio 功能的强大，下面举一个例子介绍下 Istio 是如何通过劫持流量实现路由管理的。

## Istio 如何实现路由管理

下面以 Bookinfo 为例介绍下 Istio 中的路由管理，给需要部署 Bookinfo 的 namespace 打上 `istio-injection=enabled` 标签，通过几个 kubectl apply 命令就可以完成 Bookinfo 的部署。

Bookinfo 应用分为四个单独的微服务：productpage、details、ratings、reviews，其中 reviews 微服务有 3 个版本 v1、v2、v3。

![BookInfo](BookInfo.jpg)

从图中我们可以看到 Bookinfo 中的几个微服务是由不同的语言编写的，不用像 springcloud 服务治理一样局限在 java 语言中；这些服务对 Istio 无依赖关系，用户不用修改各个服务的代码，实现服务治理无侵入；

Reviews 服务具有多个版本，通过配置 VirtualService 和 DestinationRule 可以轻松实现流量分发、管理。

这里我们以 Productpage 服务调用 Reviews 服务的流程为例讲述下注入 Sidecar 后，流量是如何根据 VirtualService 配置的路由规则实现流量流转的。

我们对 Reviews 的 VirtualService 进行配置，设置流量按照权重百分比进行转发，最终得到的 Envoy 里 reviews 的 route 配置信息如下：

```yaml
"route": {
    "weighted_clusters": {
        "clusters": [
             {
              "name": "outbound|80|v1|reviews.bookinfo.svc.cluster.local",
              "weight": 66
             },
             {
              "name": "outbound|80|v2|reviews.bookinfo.svc.cluster.local",
              "weight": 23
             },
             {
              "name": "outbound|80|v3|reviews.bookinfo.svc.cluster.local",
              "weight": 11
             }
        ]
    }
}
```
下面讲述下 Product 服务是如何按照设置的权重调用 Reviews 服务。

![Product服务调用Reviews服务](Product-reviews.jpg)

1.Productpage 发起对 Reviews 的调用：http://reviews:9080/reviews
2. 请求被 pod 的 iptable 规则拦截，转发到 15001 固定端口，这里注入 Sidecar 的 pod 里的 iptable 规则均是通过 Istio-init container 进行修改的
3. Envoy 的 Virtual Listener 在 15001 端口上监听，收到了该请求
4. 请求被 Virtual Listener 根据原目标 IP 和端口转发到 0.0.0.0_9080 这个 listener
5. 根据 0.0.0.0_9080 listener 的 filter 配置，该请求采用 9080 route 进行分发。在这里我们看到有个特殊的 9080 route，在此应用中 9080 route 对应了 3 个 virtual host，分别是 details、ratings 和 reviews，服务会根据 host name 来对请求进行路由分发
6. 9080 route 的配置中，host name 为 reviews:9080 请求对应的 cluster 如上面的三个版本，通过权重从 v1\v2\v3 选择一个 outbound|9080|v1|reviews.default.svc.cluster.local
7. outbound|9080|v1|reviews.default.svc.cluster.local cluster 为动态资源，通过 eds 查询得到其 endpoint 为 192.168.206.21:9080，如果 kubernetes 中的服务信息有变化，会通过 XDS 进行配置的下发，保证信息一致
8. 请求被转发到 Reviews 服务所在的 pod，被 iptable 规则拦截，转发到 15001 端口。
9. Envoy 的 Virtual Listener 在 15001 端口上监听，收到了该请求。
10. 请求被 Virtual Listener 根据请求原目标地址 IP（192.168.206.21）和端口（9080）转发到 192.168.206.21_9080 这个 listener。
11. 根据 192.168.206.21_9080 listener 的 http_connection_manager filter 配置，该请求对应的 cluster 为 inbound|9080|v1|reviews.default.svc.cluster.local 。
12. inbound|9080|v1|reviews.default.svc.cluster.local cluster 配置的 host 为 127.0.0.1:9080。
13. 请求被转发到 127.0.0.1:9080，即 Reviews 服务进行处理。

通过以上处理，Productpage 服务便可以调用 Reviews 服务，实现路由策略按照配置进行管理分发，Reviews 服务返回值给 Productpage 服务同样需要再走一次类似的链路，由此可见引入了新的技术，虽然简化了流量治理的流程，但是却增加了网络的压力，目前在这块也有相关 eBPF 的技术实现，通过一键开启 eBPF 代替 iptables，实现 Istio 的加速，具体实现原理可研究下[一行代码：开启 eBPF，代替 iptables，加速 Istio](https://mp.weixin.qq.com/s/Kvz4g0lPf74CnjjpClHhEA)。

### Istio 路由管理配置

Istio 中的路由管理包含以下几种常见的配置：

Gateway：为 HTTP/TCP 流量配置负载均衡器，用在网格的入口 / 出口，以处理应用程序的入口 / 出口流量

VirtualService：Istio 服务网格中定义的路由规则，控制流量路由到 service 的规则

DestinationRule：配置将流量转发到实际工作负载时所使用的策略、标签

ServiceEntry：配置将外部服务添加到 Istio 网格内，以便对外部服务进行服务治理

Sidecar：用于配置进出网格的流量信息，可针对流量进行更精细的配置

下面将逐一介绍各个配置。

#### Gateway 配置资源

Istio 中的网关分为入口网关和出口网关，Istio 使用入口网关和出口网关来管理入站和出站流量，用户可以通过配置来管理进入或流出 Istio 的流量，Istio 的网关是一个独立的 Envoy 代理。

Gateway 用于为 HTTP/TCP 流量配置负载均衡器，并不管该负载均衡器将在哪里运行。网格中可以存在任意数量的 Gateway，并且多个不同的 Gateway 实现可以共存。通过在 Gateway 上绑定 VirtualService 的方式，可以使用标准的 Istio 规则来控制进入 Gateway 的 HTTP 和 TCP 流量。

在使用 Istio 进行灰度发布的应用中，基本上都是通过 Istio ingressgateway 接管所有入口流量，根据部署的集群是共享 kubernetes 集群还是产品独享的 kubernetes 集群，使用方法略有不同，主要体现在部署的 Istio 是单租户版本还是多租户版本。通过配置 Gateway 进行入口流量的管理。下面举一个简单的 Gateway 例子说明。

```yaml
apiVersion: networking.Istio.io/v1alpha3
kind: Gateway
metadata:
  name: admin-gateway
spec:
  selector:
    Istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "admin-console.cmecloud.cn"
        - "admin-order.cmecloud.cn"
```

selector.Istio 配置 Gateway 的 ingressgateway 控制器服务，如果是单租户版本，那么这个 selector.Istio 就是默认的 Istio-system 里的 ingressgateway 控制器服务；如果是多租户版本，那么会绑定在每个 namespace 的 ingressgateway 控制器服务，selector.Istio 就是当前 Gateway 所在 namespace 里的 ingressgateway 控制器服务，注意这里的 ingressgateway 控制器服务其实就是一个独立的 Envoy。

servers 字段主要包含以下几个包括：

1. port 描述这个 Gateway 对外开放的端口
2. hosts 描述 Gateway 对外发布的域名地址，支持左侧通配符来进行模糊匹配。

#### VirtualService 配置资源

Kubernetes Service 只能实现简单的流量负载均衡，虚拟服务 VirtualService 基于 Kubernetes Service，在原本 Kubernetes Service 的功能之上，提供了更加丰富的路由控制，包括 HTTP Header，负载百分比等，Istio 建议为每个服务都创建默认路由，在访问某服务的时候，如果没有特定的路由规则，则使用默认的路由规则来访问指定的子集，以此来确保服务在默认情况下的行为稳定性。

下面演示下 Gateway 在接受到请求后，如何根据请求所附带的信息进行灰度发布，当请求的 header 里包含 group=test 标签时，就会访问 admin-xx 服务的新版本 v1，否则就会访问 admin-xx 服务的旧版本 v2。我们在进行产品的灰度发布时，通过在请求 header 中加上标签 group=test 来验证新版本的功能，当新功能验证通过后，便可以下线所有的旧版本服务。

```yaml
apiVersion: networking.Istio.io/v1alpha3
kind: VirtualService
metadata:
  name: admin-xx
spec:
  hosts:
  - "admin-console.cmecloud.cn"
  gateways:
  - admin-gateway
  http:
  - match:
      - headers:
          cookie:
            regex: ^(.*)?group=test(.*)?$
    route:
      - destination:
          host: admin-xx
          subset: v1
  - route:
    - destination:
        host: admin-xx
        subset: v2
```

下面介绍下关键配置：

hosts 表示接收请求的主机。它可以是一个 DNS、IP 地址或 kubernetes 里的服务名。

http 字段的下级成员是一个数组，代表多条路由规则。在进行灰度发布时，会存在多版本的情况，可以针对不同的版本进行流量分配。

上述介绍的是一种比较简单的灰度发布导流情况，后面我们将介绍一些比较复杂的灰度发布情况，在介绍 VirtualService 的时候，我们看到 destination.subset 配置，这个是什么用处呢？

#### DestinationRule 配置资源

Istio 可以通过流量特征来完成对后端服务的选择，它的流量控制功能会根据每次访问产生的流量进行判断，根据判断结果来选择一个后端服务响应本次请求，这种同服务不同组别的后端被称为子集（Subset）。

通过 Destination Rule 规则或者子集中规定的流量策略进行访问，这些 Destination Rule 中的 subset 用于 VirtualService 的路由规则设置中，可以将流量导向服务的某些特定版本。

我们继续查看上个 VirtualService 所对应的 Destination Rule 信息。

```yaml
apiVersion: networking.Istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: admin-xx
spec:
  host: admin-xx
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

host 代表 Kubernetes 中的 Service 资源，或者一个 ServiceEntry 定义的外部服务。

subsets 是标签选择器，用来区分 host 不同的版本。

#### ServiceEntry 配置资源

Istio 服务网格内部会维护一个与平台无关的服务注册表，当服务网格内的服务需要访问外部服务时，需要使用 ServiceEntry 来向服务注册表里添加服务。

通过 ServiceEntry 可以把外部的其他服务纳入 Istio 服务网格中，并且可以对外部的服务进行监控、治理等，目前在工作中用的较少，不做过多讲解。

#### Sidecar 配置资源

我们知道 Istio 网格中的服务都会注入 Sidecar，Sidecar 通过 Envoy 配置进行流量的流入 inbound 和流出 outbound 控制，Sidecar 配置资源描述了 Sidecar 代理的配置，Sidecar 代理控制与其连接工作负载的 inbound 和 outbound 通信。默认情况下，Istio 将为网格中的所有 Sidecar 代理服务，使其具有到达网格中每个工作负载所需的必要配置，并在与工作负载关联的所有端口上接收流量，Sidecar 通过配置可以调整流入流出的规则。

工作中，在目前各产品的灰度使用中，还没用过 Sidecar，在此也不过多介绍 Sidecar。

## 灰度发布实践

下面将介绍灰度发布实践。

### 产品灰度发布实践经验

由于 Istio 使用简单，功能强大，Istio 在灰度发布中应用的越来越多，基于 Istio 可以实现全链路灰度发布，节约了大量的人力成本，研发人员也不用熬夜加班进行产品变更，根据灰度发布过程中服务调用关系，主要包含以下两种情况：

对单一服务进行灰度升级，通过在灰度版本的 header 里添加一些标志，把部分流量导入灰度版本测试灰度版本服务的正确性。

对有调用关系的服务进行灰度升级，比如下面的服务要实现灰度发布，a 服务调用 b 服务，a 服务的灰度版本为 A 服务，b 服务的灰度版本为 B 服务，当从前端发来一个请求为灰度版本的请求时，后面调用的服务都必须是灰度版本的服务，目前 springcloud 服务的调用基本都是基于 Feign 实现，上游服务 request header 里的信息默认情况下是无法传给下游服务的，具体原因可参考我以前写的一个文章[基于蓝绿发布的 Bg-Gray 头部改造中 Feign 中获取不到头部问题](https://ecloud.10086.cn/api/query/developer/user/home.html?ticket=ST-7179-Jhem0Myd4NmqdlwEK4He-cas01.example.org#L2FwaS9xdWVyeS9kZXZlbG9wZXIvYmxvZy9ibG9nZGV0YWlsLmh0bWw/YmxvZ19pZD01NmE4NTc2ZDg2OGE0YTJmOWM1MDhhMWM1OWVhNTc5Yw==)，这样就导致灰度版本 A 调用下游服务时，无法根据 header 里的信息判断是调用灰度版本还是旧版本。这里给的一个解决方法需要根据上述文章进行相关改造，使得上游 request 里的 header 可以传递给下游服务。当然还有其他解决方法，比如可以对下游服务定义不同的 hostname 来进行区分等。以上这些方法的主要目的就是让上游服务可以区分出下游服务哪个是旧版本，哪个是灰度版本。

![对有调用关系的服务进行灰度升级](Grayscale-upgrade-services.jpg)

因为各个产品基本都是部署在共享 kubernetes 里，所以部署的 Istio ingressgateway 都是多租户版本，即在各个产品的 namespace 里部署各自独立的 Istio ingressgateway，部署方式一样，下面总结下产品在做灰度发布时的一些实战经验。

1. 在共享 kubernetes 集群里做灰度发布，暴露方式有两种，一是基于 SLB，需要提前申请 SLB VIP，申请完后，会分配一个 ecloud.10086.cn/slb-svc.UniqueID 进行 IP 地址的绑定；二是通过 NodePort，这个在创建 Istio ingressgateway 的时候，配置分配给各产品 Port 即可

2. 根据需求在各产品的 namespace 里按照《Istio 安装部署手册 01 - 共享 K8s 版本.docx》进行 Istio ingressgateway 的创建，如创建中有问题，可联系相关人员支撑

3. 提网络策略工单，进行相关网络策略、防火墙策略的打通

4. 在各自产品的 namespace 下安装 Istio ingressgateway，并正确配置好 Gateway、VirtualService、DestinationRule，这里建议各配置里的 service name 与 host name 尽量保持一致，避免出现一些奇怪的问题

5. 若出现流量没有按照灰度策略分发，则需要从 SLB VIP、网络策略、Istio 网关及配置逐个排查保证各个环节都不出问题，这样才能保障产品灰度成功

### 拥抱更强大的灰度方案

前面介绍了比较简单的在 header 加上标签实现灰度发布的方法，后面介绍下 Istio 在灰度发布中更强大的一些功能。我们仍然以上面介绍的产品灰度方案为例，通过修改 VirtualService 的路由策略，实现更强大的灰度方案，用例中仅展示 spec.http 部分的配置。

#### 流量切分实现灰度

1. 根据流量权重进行切分

```yaml
spec:
  http:
  - route:
    - destination:
        host: admin-xx
        subset: v1
	  weight: 5
  - route:
    - destination:
        host: admin-xx
        subset: v2
	  weight: 95
```

通过上述配置，请求中会有 5% 的流量切到新版本 v1，其他 95% 的流量流向旧版本 v2，通过修改 v1、v2 的权重可以调节新旧版本流量占用的百分比。当新版本测试通过后，通过修改 VirtualService 的策略，可以实现所有流量流向新版本。

2. 根据请求浏览器的进行切分

```yaml
spec:
  http:
  - match:
    - headers:
        User-Agent:
          regex: ".*Firefox/.*"
    route:
    - destination:
        host: admin-xx
        subset: v1
  - route:
    - destination:
        host: admin-xx
        subset: v2
```

通过上述配置，当使用 Firefox 进行访问时，流量会切到新版本 v1，其他流量流向旧版本 v2。

3. 根据用户源 IP 进行流量切分

```yaml
spec:
  http:
  - match:
    - headers:
        X-Real-IP:
          regex: ".*192.168.3.*"
    route:
    - destination:
        host: admin-xx
        subset: v2
  - route:
    - destination:
        host: admin-xx
        subset: v2
```

通过上述配置，当请求的源 IP 地址为 192.168.3.* 时，流量会切到新版本 v1，其他流量流向旧版本 v2。

#### 多条件进行流量切分

1. 多条件与进行流量切分

```yaml
spec:
  http:
  - match:
    - headers:
        user:
          exact: test
        User-Agent:
          regex: ".*Chrome/.*"
    route:
    - destination:
        host: admin-xx
        subset: v1
  - route:
    - destination:
        host: admin-xx
        subset: v2
```

通过上述配置，当请求的 header 里包含 user=test，并且访问的浏览器是 Chrome 时，流量会切到新版本 v1，其他流量流向旧版本 v2。

2. 多条件或进行流量切分

```yaml
spec:
  http:
  - match:
    - headers:
        user:
          exact: test
	- headers:
        User-Agent:
          regex: ".*Chrome/.*"
    route:
    - destination:
        host: admin-xx
        subset: v1
  - route:
    - destination:
        host: admin-xx
        subset: v2
```

通过上述配置，当请求的 header 里包含 user=test，或者访问的浏览器是 Chrome 时，流量会切到新版本 v1，其他流量流向旧版本 v2。

我们认为不同的产品实现灰度应该根据自己的产品特性选择不同的灰度方案，根据产品选择各自的流量策略，实现产品按照流量百分比、使用人群的性质、使用的设备不同等进行流量的切分，真正体现灰度发布的作用，使产品既能平滑升级，又能保证质量。
