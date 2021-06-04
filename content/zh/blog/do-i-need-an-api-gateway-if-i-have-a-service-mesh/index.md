---
author: "Christian Posta"
date: "2020-02-07T10:42:00+08:00"
draft: false
image: "/images/blog/006tKfTcly1g1g1acjx5aj30rr0kukjl.jpg"
translator: "[马若飞](https://github.com/malphi)"
reviewer:  ["罗广明"]
reviewerlink:  ["https://github.com/GuangmingLuo"]
title: "使用了 Service Mesh 后我还需要 API 网关吗"
description: "本文对 API 网关和 Service Mesh 进行了对比，指出了它们之间的异同。"
categories: ["service mesh"]
tags: ["service mesh"]
type: "post"
avatar: "/images/profile/default.jpg"
---

本文为翻译文章，[点击查看原文](https://blog.christianposta.com/microservices/do-i-need-an-api-gateway-if-i-have-a-service-mesh/)。

## 编者按

如文章标题所示，本文通过对 Service Mesh 技术和 API 网关的对比，着重分析了两者的功能重合点和分歧点，解答了开发者的困惑，为如果进行技术选型和落地提供了指导思路。

## 前言

这篇文章也许无法打破缠绕在 API 网关和服务网格周围的喧嚣。即便已经是 2020 年了，围绕这些话题仍然会存在大量的疑虑。我撰写此文是为了给出真实而具体的解释，以帮助大家理清它们之间的差异、重叠以及适用场景。如果你不同意我觉得我在添乱，或者想请我喝杯啤酒，欢迎随时在 Twitter 上@我（@christianposta）。

> **第一个曝光：** 我在 [Solo.io](https://solo.io/) 这家公司工作，公司的业务聚焦于今天我们要讨论的主题。我提前说明一下以免你会有“你的观点是有偏见的”的反应。每个人的观点都有偏见。但可以肯定的是，我在 Solo.io 工作是因为我想看到这些想法被付诸实施并推向市场，而不是与之相反。
>
> **第二个曝光：** 我正在写一本有关服务网格的书，名为《Istio in Action》，这花了我很多时间。在本文中，不可否认我是站在 Istio 的角度来讨论“服务网格”的，但如果我指的是更普遍的服务网格的概念时，我会特别指出。

## 为什么会有另一个关于此话题的博客？

有大量关于当前主题的文章。我们看过[“API 网关用于南北流量，而服务网格用于东西流量”](https://aspenmesh.io/api-gateway-vs-service-mesh/)。还有人写了[“API 网关用于管理业务功能，而服务网格用于服务到服务通信”](https://medium.com/microservices-in-practice/service-mesh-vs-api-gateway-a6d814b9bf56)。[API 网关具有服务网格不具备的特定功能](https://blog.getambassador.io/api-gateway-vs-service-mesh-104c01fa4784)，其中一些可能不再适用。另一方面，有些人[更接近我的思考方式](https://developer.ibm.com/apiconnect/2018/11/13/service-mesh-vs-api-management/)。

然而，市场中仍存在明显的困惑。

> 我也希望看到人们如何看待不同方法之间权衡的严肃讨论。例如，服务网格和 API 网关之间的职责/主张存在重叠。人们对选择感到困惑和不知所措。
>
>— Andrew Clay Shafer 雷启理 （@littleidea）
>
>June 12, 2019

## 困惑是什么

大约一年前，我写了一篇[关于 API 网关身份危机](https://blog.christianposta.com/microservices/api-gateways-are-going-through-an-identity-crisis/)的文章，评估了 API 管理 Kubernetes Ingress 和 API 网关（带有相关定义）的差异。在那篇文章的最后，我试图解释服务网格是如何应对这些功能的，但是没有详细说明它们如何不同，以及什么时候使用它们。我强烈推荐[阅读这篇文章](https://blog.christianposta.com/microservices/api-gateways-are-going-through-an-identity-crisis/)，因为在某些方面，它是“第一部分”，本文作为“第二部分”。

我认为产生混淆的原因如下：

- 技术使用上存在重叠（代理）
- 功能上存在重叠（流量控制，路由，指标收集，安全/策略增强等）
- “服务网格”可替代 API 管理的理念
- 服务网格能力的误解
- 一些服务网格有自己的网关

最后一点尤其使人困惑。

如果服务网格仅仅是针对东西流量（边界内），那么为什么有一些服务网格，如 Istio 所说，[有一个 Ingress 网关](https://istio.io/docs/reference/config/networking/gateway/)针对南北流量（并且是网格的一部分）？例如下面来自 Istio Ingress 网关的文档：

> 网关描述了一个运行在网格边缘的负载均衡器，它接收传入或传出的 HTTP/TCP 连接。

我们的 API 不是 HTTP 吗？如果我们通过 Istio 的网关将 HTTP 请求引入集群/网格中（顺便说一句，这基于强大的 [Envoy 代理](https://www.envoyproxy.io/) 项目），这还不够吗？

## 假设

当我们提到“服务网格”时，将假定是指 Istio 和 Istio 的网关。选择这个场景是因为它最能说明重叠和混淆。其他服务网格[也有网关](https://www.consul.io/docs/connect/mesh_gateway.html)，而有些还[没有显式网关](https://linkerd.io/2/tasks/using-ingress/)。当然你的情况也许会有所不同。

## 它们的重叠在哪里

业务的第一个步骤是识别 API 网关和服务网格功能看上去重叠的区域。两者都处理应用程序流量，所以重叠应该不足为奇。下面的清单列举了一些重叠的功能：

- 遥测数据收集
- 分布式追踪
- 服务发现
- 负载均衡
- TLS 终止/开始
- JWT 校验
- 请求路由
- 流量切分
- 金丝雀发布
- 流量镜像
- 速率控制

好吧，它们确实有重叠。那么你需要一个？还是两个？还是都不需要？

## 它们的分叉点在哪里

服务网格运行在比 API 网关更低的级别，并在架构中所有单个服务上运行。服务网格为服务客户提供关于架构拓扑的“更多细节”（包括客户端负载均衡、服务发现、请求路由），应该实现的弹性机制（超时、重试、熔断），应该收集的遥测（度量、跟踪）和参与的安全流（mTLS、RBAC）。所有这些实现细节通常由某个 sidecar（请考虑 [Envoy](https://www.envoyproxy.io/)）提供给应用程序，但它们不必这样做。请参阅我在 ServiceMeshCon 有关服务网格数据平面演化的演讲。

下面的话引自 [API 身份危机](https://blog.christianposta.com/microservices/api-gateways-are-going-through-an-identity-crisis/)：

> 服务网格的目标是通过在 L7 上透明地操作来解决任何服务/应用程序中列举的问题。换句话说，服务网格希望接入到服务中（而不是到服务中编写代码）。

**结论：** 服务网格为服务/客户端提供了更多关于架构其余部分实现的细节/保真度。

![img](https://blog.christianposta.com/images/mesh-details.png)

另一方面，API 网关则扮演着不同的角色：“抽象细节”和解耦实现。API 网关提供了跨应用程序架构中所有服务的内聚抽象——作为一个整体，为特定的 API 解决了一些边缘/边界问题。

![img](https://blog.christianposta.com/images/abstract-api.png)

无论服务网格是否存在，API 网关都存在于应用程序/服务之上，并为其他部分提供抽象。它们做的事情包括聚合 API、抽象 API 和用不同的实现方式暴露它们，并基于用户在边缘添加更复杂的零信任安全策略。应用程序架构边界上的问题与边界内的问题不同。

![img](https://blog.christianposta.com/images/infra-layers.png)

## 边界问题与服务到服务的挑战不同

在微服务/云原生架构的边界上，API 网关提供了服务网格无法在同等程度上解决的三个主要能力：

- 边界解耦
- 严格控制数据的进出
- 桥接安全信任域

让我们看看：

### 边界解耦

API 网关的核心功能是为边界外的客户端提供稳定的 API 接口。从 [Chris Richardson 的微服务模式一书](https://microservices.io/book)中，我们可以将“API 网关模式”改写为：

> 显式地简化一组 API / 微服务的调用
>
> 为一组特定的用户、客户端或消费者模拟“应用程序”的内聚 API。
>
> 这里的关键是 API 网关，当它实现时，它将作为应用程序架构的单一入口点，成为客户端的 API

来自 [API 网关身份危机](https://blog.christianposta.com/microservices/api-gateways-are-going-through-an-identity-crisis/) 一文中 API 网关的实现案例：

- [Solo.io Gloo](https://gloo.solo.io/)
- [Spring Cloud Gateway](http://spring.io/projects/spring-cloud-gateway)
- [Netflix Zuul](https://github.com/Netflix/zuul)
- [IBM-Strongloop Loopback/Microgateway](https://strongloop.com/)

从功能上看，API 网关需要支持什么？企业在现实的用例中会看到哪些需要 API 网关（服务网格不太适合）的情况：

- 请求/响应转换
- 应用协议转换如 REST/SOAP/XSLT
- 错误/速率定制响应
- 直接响应
- 对 API/代理管道的精确控制
- API 聚合/分组

让我们挨个来看。

#### 请求/响应传输

作为在 API 网关上暴露 API 的一部分，您可能希望隐藏后端 API 实现的细节。这可能是改变请求内容、删除/添加标头、将标头放入正文的一些组合，反之亦然。当后端服务对 API 进行更改时，或者当客户端不能像提供方那样快速更新时，这提供了一个很好的从客户端解耦的点。

#### 应用协议转换

许多企业在技术上进行了投入，如基于 HTTP、SOAP 的 XML，或基于 HTTP 的 JSON。他们可能希望使用更严格的、特定于客户端的 API 来公开这些 API，并继续保持互操作性。此外，服务提供者可能希望利用新的 RPC 机制（如 gRPC）或流协议（如 rSocket）。

#### 错误/速率定制响应

转换来自上游服务的请求是 API 网关的一项重要功能，定制来自网关本身的响应也是如此。采用 API 网关的虚拟 API 进行请求/响应/错误处理的客户端也希望网关自定义其响应以适应该模型。

#### 直接响应

当客户端（受信任的或恶意的）请求不可用的资源，或由于某种原因被阻止上行时，最好能够终止代理并使用预先屏蔽的响应返回。

#### 对 API/代理管道的精确控制

没有一种方法可以满足所有代理的期望。API 网关应该能够改变应用其功能的顺序（速率限制、authz/n、路由、转换等），并在出现问题时提供一种调试方法。

#### API 聚合

在多个服务上公开一个抽象常常伴随着将多个 API 混合成一个 API 的期望。类似于 GraphQL 的东西可以满足这个需求。

正如您所看到的，在客户端和提供服务者之间提供一个强大的解耦点涉及的不仅仅是允许 HTTP 通信进入集群这么简单。

## 严格控制什么可以进入/离开服务

API 网关的另一个重要功能是“控制”哪些数据/请求允许进入应用架构，哪些数据/响应允许流出。这意味着，网关需要对进入或发出的请求有深入的理解。例如，一个常见的场景是 Web 应用程序防火墙防止 SQL 注入攻击。另一种是“数据丢失预防”技术，用于在请求 PCI-DSS/HIPPA/GDPR 时阻止 SSN 或 PII 被返回。边界是帮助实现这些策略的天然位置。

同样，定义和实施这些功能并不像允许 HTTP 通信流进入集群那么简单。

## 定制安全/桥接信任域

API 网关提供的最后一个主要功能是边缘安全性。这涉及到向存在于应用程序架构之外的用户和服务提供身份和范围策略，从而限制对特定服务和业务功能的访问。这与前面的部分相关。

一个常见的例子是能够绑定到 OAuth/SSO 流，包括 Open ID Connect。这些“标准”的挑战在于，它们可能没有得到充分实施，也可能没有得到正确实施。API 网关需要一种方法来灵活地适应这些环境以及提供定制。

在许多企业中，已经存在身份/信任/认证机制，API 网关的很大一部分是为了向后兼容而进行本地集成。虽然出现了 [SPIFEE](https://spiffe.io/) 这样的新标准，但企业需要一段时间才能落地，与此同时，API 网关（甚至是针对在其下一代架构上运行的应用程序的网关）是一个艰难的要求。同样，你可以检视并说这也和上面提到的变换/解耦点有关。

## 怎样落地其中一个/另一个/两者/两者都不？

在之前的一篇博客中，我概述了一些[采用这种技术的挑战（API 网关和服务网格）](https://blog.christianposta.com/challenges-of-adopting-service-mesh-in-enterprise-organizations/)，并给出了关于如何最好地应用这种技术的提示。

重申一下：从边缘开始。这是架构中熟悉的一部分。也要考虑选择最合适的。自从我们引入了云基础设施和云原生应用架构以来，假设（编者注：文章开始所说的假设）已经发生了变化。例如，如果您打算采用 Kubernetes，我强烈建议您考虑使用从头开始构建的应用程序网络技术（例如，检查 [Envoy 代理](https://www.envoyproxy.io/)和已经被提升和转移的应用程序网络技术）。例如，在 [Solo.io](https://www.solo.io/)，我们已经为此建立了一个名为 Gloo 的开源项目。

你需要一个服务网格吗？如果您正在部署到云平台，有多种类型的语言/框架来实现您的工作负载，并构建一个微服务架构，那么您可能需要一个。选择也很多。我做过各种比较和对比的演讲，最近的是 [OSCON 演讲](https://www.slideshare.net/ceposta/navigating-mesh-istio-connect-and-linkerd)。请随意[参考](http://twitter.com/christianposta)并找到最合适你的。

## 结论

是的，API 网关在功能上与服务网格有重叠。它们在使用的技术方面也可能有重叠（例如，Envoy）。但是，它们的角色有很大的不同，理解这一点可以在部署微服务架构和发现无意的假设时为您省去很多麻烦。
