---
title: "REST 的替代者：Envoy+gRPC-Web"
date: 2019-01-28T14:20:33+08:00
draft: false
authors: ["Luc Perkins"]
translators: ["李琪"]
summary: "本文为大家推荐的是一种 REST 的替代方案 Envoy + gRPC-Web。"
tags: ["envoy","grpc-web","grpc"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","envoy","grpc-web"]
---

本文为翻译文章，[点击查看原文](https://blog.envoyproxy.io/envoy-and-grpc-web-a-fresh-new-alternative-to-rest-6504ce7eb880)。

[gRPC-Web](https://www.npmjs.com/package/grpc-web)作为 gRPC 的 JavaScript 客户端库，使 Web 应用可以不用自定义 HTTP 服务器为中介，直接通过 Envoy 与 gRPC 服务交互。经过了约两年的活跃开发，上周（2018 年 10 月底，译者注）gRPC 团队在 CNCF 博客宣布 gRPC-Web 的 GA 版本正式发布。

自从在[Improbable engineering blog](https://improbable.io/games/blog)读到了[这篇博文](https://improbable.io/games/blog/grpc-web-moving-past-restjson-towards-type-safe-web-apis)，我个人就对 gRPC-Web 很感兴趣。之前一直很看好 gRPC 的性能、可拓展性和 IDL（接口描述语言）驱动的服务交互方式，而且特别想在服务调用链中去掉 REST 部分。我很高兴 gRPC-Web 发布正式版本，它在 Web 开发领域开辟了新的方式。

我觉得 gRPC-Web 的优势就是自 Web 端向下构建了完整的端到端 gRPC 服务架构。在以前，如果你想让 web 端与 gRPC 服务交互，就必须自己开发 REST 接口处理 HTTP 和 gRPC 之间的转换。而使用 gRPC-Web，我们不再需要自己写额外的 HTTP 接口，可以直接用[Protocol Buffers](https://developers.google.com/protocol-buffers/)封装所有数据接口（这里借用了 Envoy，在下文我会详细解释）。

## REST 方式

下图展示了基于 gRPC 服务架构构建 Web App 的两种方式。左边是传统的 REST 方式。右边是 gRPC-Web 方式。

![](005UD0i6ly1fzl31y3zjdj31jk0drdib.jpg)

左图所示，REST API 只是作为 Web App 和后端 gRPC 服务的连接点。在大部分场景下，REST 服务就是简单的将 HTTP 调用转换成 gRPC 调用。

举个例子：客户端需要验证服务于是用`POST`请求提交 JSON 数据到 HTTP 服务器的`/auth`。然后 HTTP 端把 JSON 数据转换成 Protobuf 消息 `AuthRequest`，并将消息发送给 gRPC 认证服务，最后从 gRPC 服务获取到 `AuthResponse` 响应并将其转换成 JSON 数据返回给前端。正如我在[CNCF 博客](https://www.cncf.io/newsroom/blog/)中[文章](https://www.cncf.io/blog/2018/10/24/grpc-web-is-going-ga/)中说的一样，这种方法本身并没有错，它是一种解决方案，而且很多开发者都用的很好，如果它能满足你，你可以继续这样用。

更好的方案：如果可以去掉 HTTP 中介我们会少做很多工作（试想一下，JavaScript 端直接发送`AuthRequest`消息给 gRPC 服务并获得 `AuthResponse` 响应）。这意味着我们不需要关心 HTTP 状态码、JSON 解析和 HTTP 服务本身带来的部署和管理问题。

上图右半部分是使用 gRPC-Web 的替代方案。它的架构更加清晰，一个 protocol 贯穿整个 gRPC 服务调用的始终。不再有额外的 HTTP 逻辑，所有的数据接口都在 `.proto` 文件中定义。整个调用过程就是客户端向 gRPC 服务发送 Protobuf 消息并从服务获取 Protobuf 消息。

我们仅需要一个组件就能达到这种比较好的效果。

## Envoy 所扮演的角色

这里必须承认，我之前讲 gRPC-Web 直接调用 gRPC 服务的这种说法不是完全正确的。使用 gRPC-Web 的客户端调用仍然需要转换成对于 gRPC 友好的调用。Envoy 填补了这个角色。同时 Envoy 也是 gRPC-Web 内置的默认服务网关。

下图中展示了 Envoy 结合 gRPC-Web 使用。图中 Web App 调用了一个 gRPC 服务，该服务又依赖另外两个 gRPC 服务。Envoy 将 HTTP/1.1 请求转换成 HTTP/2 请求。底层其实还是需要进行 HTTP 协议的转换，但客户端和服务端都不需要考虑 HTTP 层的问题。

![](005UD0i6ly1fzl32s48tnj31ep0lemyf.jpg)

gRPC-Web 明显优于 REST，因为它只需开发者创建一个 Envoy 并做一些基础配置，而不需要自己创建转换层。

## Envoy 示例配置

```yaml
static_resources:
  listeners:
  - name: listener_0
    address:
      socket_address: { address: 0.0.0.0, port_value: 8080 }
    filter_chains:
    - filters:
      - name: envoy.http_connection_manager
        config:
          codec_type: auto
          stat_prefix: ingress_http
          route_config:
            name: local_route
            virtual_hosts:
            - name: local_service
              domains: ["*"]
              routes:
              - match:
                  prefix: "/”
                route:
                  cluster: auth_service
              cors:
                allow_origin:
                - "*"
                allow_methods: GET, PUT, DELETE, POST, OPTIONS
                allow_headers: keep-alive,user-agent,cache-control,content-type,content-transfer-encoding,x-accept-content-transfer-encoding,x-accept-response-streaming,x-user-agent,x-grpc-web
                max_age: "1728000"
                expose_headers: grpc-status,grpc-message
                enabled: true
          http_filters:
          - name: envoy.grpc_web
          - name: envoy.cors
          - name: envoy.router
  clusters:
  - name: auth_service
    connect_timeout: 0.25s
    type: logical_dns
    http2_protocol_options: {}
    lb_policy: round_robin
    hosts:
socket_address:
  address: auth-server
  port_value: 9090
```

总的来讲它就是 Envoy 最基本的 HTTP 配置，只是有一点点区别：

- 一点 gRPC-Web 必须的自定义头部：`x-grpc-web`，`grpc-status` 和 `grpc-message` （JavaScript 会自动处理它们）
- 内置的`envoy.grpc_web`HTTP 过滤器用来完成繁杂的 gRPC-Web 代理工作
- 在`auth_service`配置中指定`http2_protocol_options: {}`来获取HTTP/2的链接

你只需要写一点 YAML 配置就可以从额外的 HTTP 适配工作中解脱出来。你不用关心 HTTP 与 gRPC 的方法映射问题，也不用去 StackOverflow 找 HTTP 的哪个状态码对应 gRPC 的哪个状态码，更不需要将 Proto 消息包装成 JSON。

## 新方式

gRPC-Web + Envoy 为 web 开发提供了一种全新的方式，它能保证 Protocol Buffers 和 gRPC 的类型安全还规避了 HTTP+REST 中的很多常见问题。我推荐大家在自己的下一个项目中试试它。
