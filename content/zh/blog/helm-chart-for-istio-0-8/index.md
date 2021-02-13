---
title: "Istio 0.8的Helm Chart解析"
date: 2018-06-04T16:09:57+08:00
draft: false
image: "/images/blog/00704eQkgy1frz88ricvmj30rs0kuq4b.jpg"
author: "崔秀龙"
authorlink: "https://github.com/fleeto"
reviewer:  ["宋净超"]
reviewerlink:  ["https://jimmysong.io"]
description: "本文将带您探究 Istio 0.8 LTS 版本中的 Helm Chart 的安装部署及其结构。"
tags: ["istio","helm","chart"]
categories: ["istio"]
keywords: ["istio","helm chart","helm","istio 0.8"]
type: "post"
avatar: "/images/profile/default.jpg"
---

儿童节期间，拖拉了一个多月的 Istio 0.8 正式发布了，这可能是 Istio 1.0 之前的最后一个 LTS 版本，意义重大。

新版本中，原来的 Kubernetes 安装文件 `install/kubernetes/istio.yaml`，变成了 `install/kubernetes/istio-demo.yaml`，是的，你没看错，这个 LTS 的安装文件名字叫 demo。查看了一下文档，大概察觉到不靠谱的 Istio 发布组的意图了：这个项目的组件相对比较复杂，原有的一些选项是靠 ConfigMap 以及 istioctl 分别调整的，现在通过重新设计的 Helm Chart，安装选项用 values.yml 或者 helm 命令行的方式来进行集中管理了。下面就由看看 Istio 的 Helm Chart 的安装部署及其结构。

## 使用 Helm 安装 Istio

安装包内的 Helm 目录中包含了 Istio 的 Chart，官方提供了两种方法：

- 用 Helm 生成 istio.yaml，然后自行安装。
- 用 Tiller 直接安装。

很明显，两种方法并没有什么本质区别。例如第一个命令：

```sh
helm template install/kubernetes/helm/istio \
    --name istio --namespace  \
    istio-system > $HOME/istio.yaml
```

这里说的是使用 `install/kubernetes/helm/istio` 目录中的 Chart 进行渲染，生成的内容保存到 `$HOME/istio.yaml` 文件之中。而第二个命令

```bash
helm template install/kubernetes/helm/istio \
    --name istio --namespace istio-system \
    --set sidecarInjectorWebhook.enabled=false > $HOME/istio.yaml
```

只是设置了 Chart 中的一个变量 `sidecarInjectorWebhook.enabled` 为 False。从而禁止自动注入属性生效。

我们照猫画虎，看看命令二的结果提交到 Kubernetes 中会发生什么事情。

```bash
helm template install/kubernetes/helm/istio --name istio \
--namespace istio-system --set sidecarInjectorWebhook.enabled=false > $HOME/istio.yaml

kubectl create namespace istio-system
kubectl create -f $HOME/istio.yaml
```

根据不同的网络情况，可能需要几分钟的等待，最后会看到这些 Pod 在运行：

```ini
istio-citadel-ff5696f6f-h4rdz
istio-cleanup-old-ca-rp5p6
istio-egressgateway-58d98d898c-5jnpz
istio-ingress-6fb78f687f-wsl5q
istio-ingressgateway-6bc7c7c4bc-hhrh7
istio-mixer-post-install-d2kl5
istio-pilot-6c5c6b586c-dqv2w
istio-policy-5c7fbb4b9f-xmv6f
istio-statsd-prom-bridge-6dbb7dcc7f-27tx7
istio-telemetry-54b5bf4847-9gpr7
prometheus-586d95b8d9-gb846
```

1. 过去的 istio-ca 现已更名 istio-citadel。
2. istio-cleanup-old-ca 是一个 job，用于清理过去的 Istio 遗留下来的 CA 部署（包括 sa、deploy 以及 svc 三个对象）。
3. istio-mixer-post-install 同样也是一个 job，和上面的 Job 一样，简单的调用 kubectl 创建第三方资源，从而避免了之前的 CDR 需要重复创建的尴尬状况。
4. egressgateway、ingress 以及 ingressgateway，可以看出边缘部分的变动很大，以后会另行发文。
5. 和从前不同，缺省已经打开了监控界面。

### Helm Chart 的安装配置

下面的配置项目，都可以使用 helm 的 `--set key=value` 来设置，可以重复使用，用来设置多个值。

| 选项                               | 说明                                                         | 缺省值                                   |
| ---------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| global.hub                         | 绝大部分镜像所在的镜像库地址                                 | `docker.io/istionightly`                 |
| global.tag                         | Istio 使用的绝大部分镜像的 Tag                               | `circleci-nightly`                       |
| global.proxy.image                 | 指定 Proxy 的镜像名称                                        | `proxyv2`                                |
| global.imagePullPolicy             | 镜像拉取策略                                                 | `IfNotPresent`                           |
| global.controlPlaneSecurityEnabled | 控制面是否启动 mTLS                                          | `false`                                  |
| global.mtls.enabled                | 服务间是否缺省启用 mTLS                                      | `false`                                  |
| global.mtls.mtlsExcludedServices   | 禁用 mTLS 的 FQDN 列表                                       | `- kubernetes.default.svc.cluster.local` |
| global.rbacEnabled                 | 是否创建 RBAC 规则                                           | `true`                                   |
| global.refreshInterval             | Mesh 发现间隔                                                | `10s`                                    |
| global.arch.amd64                  | amd64 架构中的调度策略，0：never；1: least preferred；2：no preference；3：most preferred | `2`                                      |
| global.arch.s390x                  | amd64 架构中的调度策略，0：never；1: least preferred；2：no preference；3：most preferred | `2`                                      |
| global.arch.ppc64le                | amd64 架构中的调度策略，0：never；1: least preferred；2：no preference；3：most preferred | `2`                                      |
| galley.enabled                     | 是否安装 Galley 用于进行服务端的配置验证，需要 1.9 版本以上的 Kubernetes | `false`                                  |

上面的内容来自[官方文档](https://istio.io/docs/setup/kubernetes/helm-install/)，其实这是不符合实际情况的（Istio 用户的日常）。在 `install/kubernetes/helm/istio/values.yaml` 中，包含这一发行版本中的所有的缺省值。可以直接修改或者新建 values.yaml，并在 helm 命令行使用 `-f my-values.yaml` 参数来生成自行定制的 `istio.yaml`

## 解读 Istio Helm Chart 中的模块

打开 Istio 的 Chart 之后，发现其中并没有任何组件的内容，只有两个 Configmap 对象的模板。其安装主体再次很非主流的通过依赖 Chart 的方式实现了完全的模块化。因此这个 Chart 的主体，实际上是 `requirements.yaml`，打开这个文件，会看到规规矩矩的列出很多模块，例如：

```xml
  - name: sidecarInjectorWebhook
    version: 0.8.0
    # repository: file://../sidecarInjectorWebhook
    condition: sidecarInjectorWebhook.enabled
```

这表明在 `sidecarInjectorWebhook` 取值为 `enabled` 的时候，就渲染这一模板。因此这里可以看做是模块的启用停用的控制点。这里列出的模块包括：

| 模块                   | 描述                                        |
| ---------------------- | ------------------------------------------- |
| egressgateway          | 外发流量网关                                |
| galley                 | 在 K8S 服务端验证 Istio 的 CRD 资源的合法性 |
| grafana                | Dashboard                                   |
| ingress                | Ingress Controller                          |
| ingressgateway         | Ingress Gateway                             |
| mixer                  | Mixer                                       |
| pilot                  | Pilot                                       |
| prometheus             | Prometheus                                  |
| security               | 安全相关内容                                |
| servicegraph           | 调用关系图                                  |
| sidecarInjectorWebhook | 自动注入                                    |
| tracing                | Zipkin Jeager 的跟踪服务                    |

下面逐一做一下简要说明

### egressgateway

外发通信的网关。

他的设置保存在 `values.yaml` 的 `egressgateway` 一节中（都是保存在同名分支下，后面不再重复）。部署内容包括：

- Deployment 和 Service：一个 proxy。
- HPA
- RBAC 相关内容

可定制项目包括：

- 服务端口和类型
- HPA 实例数量上下限
- 资源限制

### galley

之前的 istio 版本中，只能通过 istioctl 验证 Istio 相关 CRD 的有效性，这个模块提供一个在服务端验证 CRD 的方法，他的部署内容包含：

- Deployement 和 Service。
- RBAC 相关
- 用于 CRD 校验的 ValidatingWebhookConfiguration 对象。

校验目标包含 Pilot（例如 destinationpolicies 和 routerules） 和 Mixer（例如 memquotas 和 prometheuses） 两类 CRD。

### grafana

一个带有 Istio 定制 Dashboard 的 Grafana 封装。

实际上将其镜像中的 Dashboard 复制出来就可以在其他 Grafana 实例上运行了。

定制内容的 `grafana.ingress.*` 中包含 Ingress 的配置，用于外网访问。

### ingress

Istio 的 Ingress Controller

具体部署内容和 egresscontroller 基本一致。

### ingressgateway

0.8.0 新增功能，为 Ingress 通信提供 Istio rules/destination 等特性。

部署内容和 ingress 类似。

### mixer

Mixer 负责的是遥测和前置检查，他的 Chart 相对比较复杂，部署内容包括：

- 和前面的版本不同，Mixer 的部署分成了两个部分，分别是 Policy 和 Telemetry 两个 Deployment 对象。
- Service 也同样分成两个，其中 telemetry service 多了一个 prometheus 端口
- `crds.yaml` 中包含了 mixer 所支持的所有 crd 定义（例如 memquotas 和 prometheuses）。
- `create-custom-resources-job.yaml` 中包含了用于创建 crd 的 Job 对象。

### pilot

Pilot 承上启下，负责服务发现和向 Proxy 下发配置。除了常规的 Deployment 和 Service 之外，还包含了 `crds.yaml`，用于声明 CRD 资源类型（例如 destinationpolicies 和 routerules）。

### prometheus

这个组件跟前面的 Grafana 类似，也是一个预定义的镜像。这个模板中的 Configmap 就是 Prometheus 的抓取配置，可以直接用到其他的 Prometheus 实例之中。

### security

旧版本中的 Istio-ca

Security 部分的部署内容包括：

- RBAC
- Job：使用 kubectl 清理旧版本 istio-ca 实例。
- Deployment，原 CA。
- Service：开放两个端口，分别服务于 http 和 gRPC。

### servicegraph

Service Graph 支持，和 Grafana 基本一致。

### sidecarInjectorWebhook

这一部分的功能是自动为 K8S 对象注入 Envoy。主要包含：

- Deployment 和 Service
- RBAC 相关
- 一个 `MutatingWebhookConfiguration` 对象，会监听 Pod 的创建事件，用于自动注入。

### tracing

Jeager 的跟踪支持，总体情况跟 Prometheus 和 Grafana 等监控组件类似，配置项和暴露服务方面稍有区别：

- 配置中包含 Jaeger 的环境变量的控制。
- 开启 jaeger 开关，会启用 Jaeger 的几个服务端口。
