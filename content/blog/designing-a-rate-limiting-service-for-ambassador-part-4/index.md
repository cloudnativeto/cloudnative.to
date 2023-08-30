---
title: "速率限制系列 part4—为 Ambassador API 网关设计速率限制服务"
date: 2018-07-11T15:32:40+08:00
draft: false
authors: ["Daniel Bryant"]
translators: ["戴佳顺"]
summary: "先前关于速率限制文章主要描述如何构建并部署基于 Java 的速率限制服务，该服务可以和开源的 Ambassador API 网关以及 Kubernetes 集成。大家或许会疑惑怎么样才能更好地设计速率限制服务，尤其是如何保证 Ambassador 以及其底层的 Envoy 代理的灵活性？这篇文章将给大家启发。"
tags: ["微服务"]
categories: ["service mesh"]
keywords: ["service mesh","速率限制","分布式系统"]
---

本文为翻译文章，[点击查看原文](https://blog.getambassador.io/designing-a-rate-limiting-service-for-ambassador-f460e9fabedb)。

[先前](https://blog.getambassador.io/rate-limiting-a-useful-tool-with-distributed-systems-6be2b1a4f5f4)关于速率限制文章主要描述如何构建并部署基于 Java 的速率限制服务，该服务可以和开源的 Ambassador API 网关以及 Kubernetes 集成（文章的[第 1 部分](/blog/rate-limiting-a-useful-tool-with-distributed-systems-part1)和[第 2 部分](/blog/rate-limiting-for-api-gateway-daniel-bryant-part2)请见这里）。大家或许会疑惑怎么样才能更好地设计速率限制服务，尤其是如何保证 Ambassador 以及其底层的 Envoy 代理的灵活性？这篇文章将给大家启发。

## 设置场景

如果你还没有阅读这个系列的第 3 部分“[基于 Ambassador API 网关实现 Java 速率限制服务](/blog/implementing-a-java-rate-limiting-service-for-the-ambassador-api-gateway-part3)”，我建议你先阅读（文章的[第 1 部分](/blog/rate-limiting-a-useful-tool-with-distributed-systems-part1)和[第 2 部分](/blog/rate-limiting-for-api-gateway-daniel-bryant-part2)请见这里）。其中最关键的是[Ambassador API 网关](https://www.getambassador.io/reference/services/rate-limit-service)，其就像其底层使用的[Envoy 代理](https://www.envoyproxy.io/docs/envoy/latest/api-v1/route_config/rate_limits)一样，通过请求另一个服务来决定一个请求的速率是否需要被限制。这是关注点分离（和单一原则）设计的良好实现。同时由于 Ambassador 可作为 Kubernetes 原生 API 网关，因此你可以很方便将 rate limiter 部署为 Kubernetes 基础服务，用来管理平台的容错特性，同时其也很容易进行扩展。

下文假设你已成功将 Ambassador 部署进 Kubernetes 集群，同时也根据我先前文章中所描述的那样完成速率限制服务部署。以下是基于 Java 开发的速率限制服务其所使用的 Kubernetes 配置文件：

```bash
---
apiVersion: v1
kind: Service
metadata:
  name: ratelimiter
  annotations:
    getambassador.io/config: |
      ---
      apiVersion: ambassador/v0
      kind: RateLimitService
      name: ratelimiter_svc
      service: "ratelimiter:50051"
  labels:
    app: ratelimiter
spec:
  type: ClusterIP
  selector:
    app: ratelimiter
  ports:
  - protocol: TCP
    port: 50051
    name: http
---
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: ratelimiter
  labels:
    app: ratelimiter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ratelimiter
  template:
    metadata:
      labels:
        app: ratelimiter
    spec:
      containers:
      - name: ratelimiter
        image: danielbryantuk/ratelimiter:0.3
        ports:
        - containerPort: 50051
```

## 描述符（descriptor）

Ambassador 中速率限制功能的灵活性主要通过在 Kubernetes 配置上指定描述符和请求头实现，这些参数会被传递到速率限制服务实例中。以下文为例，首先看一下先前文章中探讨过的 my shopfront 应用程序的 Ambassador 配置：

```bash
---
apiVersion: v1
kind: Service
metadata:
  labels:
    service: ambassador
  name: ambassador
  annotations:
    getambassador.io/config: |
      ---
      apiVersion: ambassador/v0
      kind:  Mapping
      name:  shopfront_stable
      prefix: /shopfront/
      service: shopfront:8010
      rate_limits:
        - descriptor: Example descriptor
          headers:
            - "X-MyHeader"
        - descriptor: Y header descriptor
          headers:
            - "Y-MyHeader"
```

可以看到在 rate_limits 配置中有两个 YAML 元素，每个元素都有不同的描述符和请求头。根据[Ambassador 速率限制](https://www.getambassador.io/user-guide/rate-limiting-tutorial#2-configure-ambassador-mappings)文档中所述，当请求头在配置中定义，并出现在请求元数据中，其才能被速率限制。比如说：

- 如果访问 shopfront 的请求没有包含请求头，其就不符合速率限制条件（即不会对在 Ambassador 的其他配置中所定义的速率限制服务生效）
- 通过请求头“X-MyHeader:123”向 shopfront 服务发出的请求可能受到速率限制。速率限制服务将接收与“X-MyHeader”请求头相匹配的 rate_limits 元素所关联的描述符信息，并以“generic_key”为名，这里值为“Example descriptor”。因此，速率限制服务将收到如下请求元数据：[{“generic_key”,“Example descriptor”},{“X-MyHeader”,”123”}]
- 通过请求头“Y-MyHeader:ABC”向 shopfront 服务发出的请求可能受到速率限制。速率限制服务将接收与“Y-MyHeader”请求头相匹配的 rate_limits 元素所关联的描述符信息，并以“generic_key”为名，这里值为“Y header descriptor”。因此，速率限制服务将收到如下请求元数据：[{“generic_key”,“Y header descriptor”},{“Y-MyHeader”,”ABC”}]

是否进行速率限制是由速率限制服务决定的，该服务只需在 Envoy 的[ratelimit.proto](https://github.com/envoyproxy/envoy/blob/master/source/common/ratelimit/ratelimit.proto) gRPC 接口中返回的适当值：OK, OVER_LIMIT 或 UNKNOWN 即可。根据上文描述，你可以在两个地方添加包含描述符和请求头的请求元数据，使其可在速率限制服务中使用：可以在部署时添加到 Ambassador Kubernetes 配置中；或在程序运行时添加。

## 速率限制服务元数据样例

举个例子。假设你的企业已经创建了一个移动应用程序，该程序通过 Ambassador API 网关与后端服务进行通信，并且你希望对普通用户和测试用户使用不同的规则进行速率限制，同时你也希望对未认证用户也这么进行。你可以在请求头中访问 UserID 和 UserType 数据：

```bash
---
apiVersion: v1
kind: Service
metadata:
  labels:
    service: BackendService
  name: BackendService
  annotations:
    getambassador.io/config: |
      ---
      apiVersion: ambassador/v0
      kind:  Mapping
      name:  backend_app
      prefix: /app/
      service: backend_app:8010
      rate_limits:
        - descriptor: Mobile app ingress - authenticated
          headers:
            -"UserID"
            -"UserType"
        - descriptor: Mobile app ingress - unauthenticated
```

任何包含请求头“UserID”和“UserType”的请求都将被转发到速率限制服务，同时请求也包含（generic_key）描述符“Mobile app ingress - authenticated”。未包含请求头的请求会被第二个描述符捕获，并被转发到只包含（generic_key）描述符“Mobile app ingress - unauthenticated”的速率限制服务中。你可以通过任意语言的算法实现上述速率限制功能。

## 结论

如果你正在考虑[inspiration](https://eng.lyft.com/announcing-ratelimit-c2e8f3182555)，或[现成可用的 Ambassador 限速服务](https://github.com/lyft/ratelimit)，请务必留心 Envoy 文档和 Lyft GitHub 库。尤其是 Lyft 参考 Envoy 所实现的[速率限制](https://github.com/lyft/ratelimit)方案非常实用，它既可作为可插拔的解决方案，也可以作为解决方案的指南用于在自定义速率限制服务中实现配置加载和运行时加载。

你可以在先前文章“[基于 Ambassador API 网关实现 Java 速率限制服务](https://blog.getambassador.io/implementing-a-java-rate-limiting-service-for-the-ambassador-api-gateway-e09d542455da)”中找到有关在 Kubernetes 中安装 Ambassador API 网关和配置速率限制的教程。同样，欢迎你在[Ambassador Gitter](https://gitter.im/datawire/ambassador)提问。
