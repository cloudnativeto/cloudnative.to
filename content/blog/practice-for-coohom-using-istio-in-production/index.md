---
title: "云端设计平台 Coohom 在生产环境中使用 istio 的经验与实践"
date: 2018-10-25T20:49:29+08:00
draft: false
authors: ["高松"]
summary: "本文是酷家乐的 Coohom 项目使用 Istio 服务网格的实践经验分享。"
tags: ["istio"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","istio","coohom"]
---

## 介绍

自从[istio](https://istio.io/)-1.0.0 在今年发布了正式版以后，[Coohom](https://www.coohom.com)项目在生产环境中也开启了使用 istio 来作为服务网格。

本文将会介绍与分享在 Coohom 项目在使用 istio 中的一些实践与经验。

![](007pL7qRgy1fwjfpiwu3fj3050050mwx.jpg)

## Coohom 项目

杭州群核信息技术有限公司成立于 2011 年，公司总部位于浙江杭州，占地面积超过 5000 平方米。[酷家乐](https://www.kujiale.com/)是公司以分布式并行计算和多媒体数据挖掘为技术核心，推出的家居云设计平台，致力于云渲染、云设计、BIM、VR、AR、AI 等技术的研发，实现“所见即所得”体验，5 分钟生成装修方案，10 秒生成效果图，一键生成 VR 方案，于 2013 年正式上线。作为“设计入口”，酷家乐致力于打造一个连接设计师、家居品牌商、装修公司以及业主的强生态平台。

依托于酷家乐快速的云端渲染能力与先进的 3D 设计工具经验，[Coohom](https://www.coohom.com)致力于打造一个让用户拥有自由编辑体验、极致可视化设计的云端设计平台。Coohom 项目作为一个新兴的产品，在架构技术上没有历史包袱，同时 Coohom 自从项目开启时就一直部署运行在 Kubernetes 平台。作为 Coohom 项目的技术积累，我们决定使用服务网格来作为 Coohom 项目的服务治理。

## 为什么使用 istio

由于 istio 是由 Google 所主导的产品，使用 istio 必须在 Kubernetes 平台上。所以对于 Coohom 项目而言，在生产环境使用 istio 之前，Coohom 已经在 Kubernetes 平台上稳定运行了。我们先列一下 istio 提供的功能（服务发现与负载均衡这些 Kubernetes 就已经提供了）：

1. 流量管理：控制服务之间的流量和 API 调用的流向、熔断、灰度发布、A/BTest 都可以在这个功能下完成；
2. 可观察性：istio 可以通过流量梳理出服务间依赖关系，并且进行无侵入的监控（Prometheus）和追踪（Zipkin）；
3. 策略执行：这是 Ops 关心的点，诸如 Quota、限流乃至计费这些策略都可以通过网格来做，与应用代码完全解耦；
4. 服务身份和安全：为网格中的服务提供身份验证，这点在小规模下毫无作用，但在一个巨大的集群上是不可或缺的。

**但是**，这些功能并不是决定使用 istio 的根本原因，基于 Dubbo 或 Spring-Cloud 这两个国内最火的微服务框架不断进行定制开发，同样能够实现上面的功能，真正驱动我们尝试 istio 的原因是：

- 第一：它使用了一种全新的模式（SideCar）进行微服务的管控治理，完全解耦了服务框架与应用代码。业务开发人员不需要对服务框架进行额外的学习，只需要专注于自己的业务。而 istio 这一层则由可以由专门的人或团队深入并管理，这将极大地降低"做好"微服务的成本。
- 第二：istio 来自 GCP（Google Cloud Platform），是 Kubernetes 上的“官方”Service Mesh 解决方案，在 Kubernetes 上一切功能都是开箱即用，不需要改造适配的，深入 istio 并跟进它的社区发展能够大大降低我们重复造轮子的成本。

## Coohom 在 istio 的使用进度

目前 Coohom 在多个地区的生产环境集群内都已经使用了 istio 作为服务网格，对于 istio 目前所提供的功能，Coohom 项目的网络流量管理已经完全交给 istio，并且已经通过 istio 进行灰度发布。对于从 K8S 集群内流出的流量，目前也已经通过 istio 进行管理。

## 从单一 Kubenertes 切换为 Kubernetes+istio

在使用 istio 之前，Coohom 项目就已经一直在 Kubernetes 平台稳定运行了。关于 Coohom 的架构，从技术栈的角度可以简单的分为：

- Node.js egg 应用
- Java Springboot 应用

从网络流量管理的角度去分类，可以分为三类：

- 只接受集群外部流量；
- 只接受集群内部流量；
- 既接受集群外部流量，也接受集群内部流量

在我们的场景里，基本上所有的 Node 应用属于第一类，一部分 Java 应用属于第二类，一部分 Java 应用属于第三类。
为了更清楚的表达，我们这里可以想象一个简单的场景：

![](007pL7qRgy1fwji4ujvtzj30mn0hl3zb.jpg)

从上面的场景我们可以看到，我们有一个页面服务负责渲染并发页面内容到用户的浏览器，用户会从浏览器访问到页面服务和账户服务。
账户服务负责记录用户名，用户密码等相关信息。账户服务同时还会在权限服务内查看用户是否具有相应的权限，并且页面服务同样也会请求账户服务的某些接口。
所以按照我们上面的流量管理的分类法，页面服务属于第一类服务，权限服务属于第二类服务，账户服务则属于第三类服务。
同时，账户服务和权限服务也接了外部的 RDS 作为存储，需要注意的是 RDS 并非在 Kubernetes 集群内部。

那么在过去只用 Kubenretes 时，为了让用户能正确访问到对应的服务，我们需要编写 Kubernetes Ingress:
值得注意的是，由于只有账户服务和页面服务需要暴露给外部访问，所以 Ingress 中只编写了这两个服务的规则。

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: example-ingress
spec:
  rules:
  - host: www.example.com
    http:
      paths:
      - backend:
          serviceName: page-service
          servicePort: 80
        path: /
  - host: www.example.com
    http:
      paths:
      - backend:
          serviceName: account-service
          servicePort: 80
        path: /api/account

```

在接入 istio 体系后，虽然这三个服务在所有 POD 都带有 istio-proxy 作为 sidecar 的情况下依旧可以沿用上面 Kubernetes Ingress 将流量导入到对应的服务。
不过既然用了 istio，我们希望充分利用 istio 的流量管理能力，所以我们先将流量导入到服务这一职责交给 istio VirtualService 去完成。所以在我一开始接入 istio 时，我们将上述 Kubernetes 方案改造成了通过下述方案：

### 入口 Ingress

首先，我们在 istio-system 这个 namespace 下建立 Ingress，将所有 www.example.com 这个 host 下的流量导入到 istio-ingressgateway 中。
这样我们就从集群的流量入口开始将流量管理交付给 istio 来进行管理。

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: istio-ingress
  namespace: istio-system
spec:
  rules:
  - host: www.example.com
    http:
      paths:
      - backend:
          serviceName: istio-ingressgateway
          servicePort: 80
        path: /
```

在交付给 istio 进行管理以后，我们需要将具体的路由 - 服务匹配规则告诉给 istio，这一点可以通过 Gateway+VirtualService 实现。
需要注意的是，下面的服务名都是用的简写，所以必须将这两个文件和对应的服务部署在同一个 Kubernetes namespace 下才行。

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: example-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: example-http
      protocol: HTTP
    hosts:
    - "www.example.com"

---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: example-virtualservice
spec:
  hosts:
  - "www.example.com"
  gateways:
  - example-gateway
  http:
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        port:
          number: 80
        host: page
  - match:
    - uri:
        prefix: /api/account
    route:
    - destination:
        port:
          number: 80
        host: account-service
```

### 外部服务注册

在经过上述的操作以后，重新启动服务实例并且自动注入 istio-proxy 后，我们会发现两个后端的 Java 应用并不能正常启动。经过查询启动日志后发现，无法启动的原因则是因为不能连接到外部 RDS。这是因为我们的所有网络流量都经过 istio 的管控后，所有需要集群外部服务都需要先向 istio 进行注册以后才能被顺利的转发过去。一个非常常见的场景则是通过 TCP 连接的外部 RDS。当然，外部的 HTTP 服务也是同理。

以下是一个向 istio 注册外部 RDS 的例子。

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: mysql-external
  namespace: istio-system
spec:
  hosts:
  - xxxxxxxxxxxx1.mysql.rds.xxxxxx.com
  - xxxxxxxxxxxx2.mysql.rds.xxxxxx.com

  addresses:
  - xxx.xxx.xxx.xxx/24
  ports:
  - name: tcp
    number: 3306
    protocol: tcp
  location: MESH_EXTERNAL
```

### 支持灰度发布

上面 istio-ingress+Gateway+VirtualService 的方案可以替代我们之前只使用 Kubernetes Ingress 的方案，但如果只是停留在这一步的话那么对于 istio 给我们带来的好处可能就不能完全体现。值得一提的是，在上文的 istio-ingress 中我们将 www.example.com 的所有流量导入到了 istio-ingressGateway，通过这一步我们可以在 istio-ingressGateway 的 log 当中查看到所有被转发过来的流量的网络情况，这一点在我们日常的 debug 中非常有用。然而在上述所说的方案中 istio 的能力还并未被完全利用，接下来我将介绍我是如何基于上述方案进行改造以后来进行 Coohom 日常的灰度发布。

还是以上文为例，假设需要同时发布三个服务，并且三个服务都需要进行灰度发布，并且我们对灰度发布有着以下几个需求：

- 最初的灰度发布希望只有内部开发者才能查看，外部用户无法进入灰度。
- 当内部开发者验证完灰度以后，逐渐开发切换新老服务流量的比例。
- 当某个外部用户进入新/老服务，我希望他背后的整个服务链路都是新/老服务

为了支持以上灰度发布的需求，我们有如下工作需要完成：

1. 定义规则告诉 istio，对于一个 Kubernetes service 而言，后续的 Deployment 实例哪些是新服务，哪些是老服务。
2. 重新设计 VirtualService 结构策略，使得整个路由管理满足上述第二第三点需求。
3. 需要设计一个合理的流程，使得当灰度发布完成以后，最终状态能恢复成与初始一致。

### 定义规则

为了使得 istio 可以知道对于某个服务而言新老实例的规则，我们需要用到 DestinationRule，以账户服务为例：

从下文的例子我们可以看到，对于账户服务而言，所有 Pod 中带有 type 为 normal 的标签被分为了 normal 组，所有 type 为 grey 的标签则被分为了 grey 组，
这是用来在后面帮助我们让 istio 知道新老服务的规则，即带有 type:normal 标签的 POD 为老实例，带有 type:grey 标签的 POD 为新实例。这里所有三个服务分类都可以套用该规则，就不再赘述。

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: account-service-dest
spec:
  host: account-service
  subsets:
  - name: normal
    labels:
      type: normal
  - name: grey
    labels:
      type: grey
```

### 重构 VirtualService

前文我们提到，我们在 Kubernetes 平台内将在网络流量所有服务分为三类。之所以这么分，就是因为在这里每一类服务的 VirtualService 的设计不同。
我们先从第一类，只有外部连接的服务说起，即页面服务，下面是页面服务 VirtualService 的例子：

从下文这个例子，我们可以看到对于页面服务而言，他定义了两种规则，对于 headers 带有`end-user:test`的请求，istio 则会将该请求导入到上文我们所提到的
grey 分组，即特定请求进入灰度，而所有其他请求则像之前导入到 normal 分组，即老实例。

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: page-service-external-vsc
spec:
  hosts:
    - "www.example.com"
  gateways:
  - example-gateway
  http:
  - match:
    - headers:
        end-user:
          exact: test
      uri:
        prefix: /
    route:
    - destination:
        port:
          number: 80
        host: page-service
        subset: grey
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        port:
          number: 80
        host: page-service
        subset: normal
```

然后我们再看第二类服务，即权限服务，下面是权限服务的 virtualService 例子：

从下面这个例子我们可以看到，首先在取名方面，上面的 page-service 的 virtualService name 为 xxx-external-vsc，而这里权限服务则名为 xxx-internal-service。这里的 name 对实际效果其实并没有影响，只是我个人对取名的习惯，用来提醒自己这条规则是适用于外部流量还是集群内部流量。
在这里我们定义了一个内部服务的规则，即只有是带有 type:grey 的 POD 实例流过来的流量，才能进入 grey 分组。即满足了我们上述的第三个需求，整个服务链路要么是全部新实例，要么是全部老实例。

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: auth-service-internal-vsc
spec:
  hosts:
  - auth-service
  http:
  - match:
    - sourceLabels:
        type: grey
    route:
    - destination:
        host: auth-service
        subset: grey
  - route:
    - destination:
        host: auth-service
        subset: normal
```

对于我们的第三类服务，即既接收外部流量，同样也接受内部流量的账户服务来说，我们只需要将上文提到的两个 virtualService 结合起来即可：

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: account-service-external-vsc
spec:
  hosts:
    - "www.example.com"
  gateways:
  - example-gateway
  http:
  - match:
    - headers:
        end-user:
          exact: test
      uri:
        prefix: /api/account
    route:
    - destination:
        port:
          number: 80
        host: account-service
        subset: grey
  - match:
    - uri:
        prefix: /api/account
    route:
    - destination:
        port:
          number: 80
        host: account-service
        subset: normal

---

apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: account-service-internal-vsc
spec:
  hosts:
  - "account-service"
  http:
  - match:
    - sourceLabels:
        type: grey
    route:
    - destination:
        host: account-service
        subset: grey
  - route:
    - destination:
        host: account-service
        subset: normal

```

至此，我们就已经完成了灰度发布准备的第一步，也是一大步。当新服务实例发布上去以后，我们在最初通过添加特定的 header 进入新服务，同时保证所有的外部服务只会进入老服务。当内部人员验证完新服务实例在生产环境的表现后，我们需要逐渐开放流量比例将外部的用户流量导入到新服务实例，这一块可以通过更改第一类和第三类服务的 external-vsc 来达到，下面给出一个例子：

下面这个例子则是表现为对于外部流量而言，将会一半进入 grey 分组，一般进入 normal 分组。最终我们可以将 grey 分组的 weigth 变更为 100，而 normal 分组的 weight 变更为 0，即将所有流量导入到 grey 分组，灰度发布完成。

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: page-service-external-vsc
spec:
  hosts:
  - "www.example.com"
  http:
  - route:
    - destination:
        host: page-service
        subset: grey
      weight: 50
    - destination:
        host: page-service
        subset: normal
      weight: 50
```

### 收尾工作

从上述的方案当中，我们将所有服务根据网络流量来源分为三类，并且通过 istio 实现了整个业务的灰度发布。然而整个灰度发布还并没有完全结束，我们还需要一点收尾工作。

考虑整个业务刚开始的状态我们有 3 个 Kubernetes service，3 个 Kubernetes Deployment，每个 Deployment 的 POD 都带有了 type:normal 的标签。
然而现在经过上述方案以后，我们同样有 3 个 Kubernetes service，3 个 Kubernetes Deployment，但是这里每个 Deployment 的 POD 却都带有了 type:grey 的标签。

所以在经过上述灰度发布以后，我们还要状态恢复为初始值，这有利于我们下一次进行灰度发布。由于对于 Coohom 项目，在 CICD 上使用的是 Gitlab-ci，所以我们的自动化灰度发布收尾工作深度绑定了 Gitlab-ci 的脚本，所以这里就不做介绍，各位读者可以根据自身情况量身定制。

## 结语

以上就是目前 Coohom 在 istio 使用上关于灰度发布的一些实践和经验。对于 Coohom 项目而言，在生产环境中使用 istio 是从 istio 正式发布 1.0.0 版本以后才开始的。但是在这之前，我们在内网环境使用 istio 已经将近有半年的时间了，Coohom 在内网中从 istio0.7.1 版本开始使用。内网环境在中长期时间内与生产环境环境架构不一致是反直觉的，一听就不靠谱。然而，恰恰 istio 是对业务完全透明的，它可以看作是基础设施的一部分，所以我们在生产环境使用 istio 之前，在内网环境下先上了 istio，积累了不少经验。
