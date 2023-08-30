---
title: "Gateway API v0.8.0: 引入服务网格支持"
summary: "我们非常高兴地宣布 Gateway API 的 v0.8.0 版本发布了！通过此版本，Gateway API 对服务网格的支持已达到实验性状态。我们期待您的反馈！"
authors: ["Kuberentes"]
translators: ["宋净超"]
categories: ["Kubernetes"]
tags: ["Kubernetes","Service Mesh","API Gateway"]
date: 2023-08-30T12:03:00+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://kubernetes.io/blog/2023/08/29/gateway-api-v0-8/
---

本文译自：<https://kubernetes.io/blog/2023/08/29/gateway-api-v0-8/>

***作者：*** Flynn（Buoyant）、John Howard（Google）、Keith Mattix（Microsoft）、Michael Beaumont（Kong）、Mike Morris（独立）、Rob Scott（Google）

我们非常高兴地宣布 Gateway API 的 v0.8.0 版本发布了！通过此版本，Gateway API 对服务网格的支持已达到[实验性状态](https://gateway-api.sigs.k8s.io/geps/overview/#status)。我们期待您的反馈！

我们特别高兴地宣布，Kuma 2.3+、Linkerd 2.14+ 和 Istio 1.16+ 都是 Gateway API 服务网格支持的完全符合实现。

## Gateway API 中的服务网格支持

虽然 Gateway API 最初的重点一直是入口（南北）流量，但很快就清楚，相同的基本路由概念也应适用于服务网格（东西）流量。2022 年，Gateway API 子项目启动了[GAMMA 计划](https://gateway-api.sigs.k8s.io/concepts/gamma/)，这是一个专门的供应商中立工作流，旨在特别研究如何最好地将服务网格支持纳入 Gateway API 资源的框架中，而不需要 Gateway API 的用户重新学习他们了解的有关 API 的一切。

在过去的一年中，GAMMA 深入研究了使用 Gateway API 用于服务网格的挑战和可能的解决方案。最终结果是少量的[增强提案](https://gateway-api.sigs.k8s.io/contributing/enhancement-requests/)，涵盖了许多小时的思考和辩论，并提供了一条最小可行路径，允许使用 Gateway API 用于服务网格。

### 当使用 Gateway API 时，网格路由将如何工作？

您可以在[Gateway API 网格路由文档](https://gateway-api.sigs.k8s.io/concepts/gamma/#how-the-gateway-api-works-for-service-mesh)和[GEP-1426](https://gateway-api.sigs.k8s.io/geps/gep-1426/)中找到所有详细信息，但对于 Gateway API v0.8.0，简短的版本是，现在 HTTPRoute 可以有一个“parentRef”，它是一个服务，而不仅仅是一个网关。我们预计在这个领域使用更多 GEP，因为随着我们对服务网格用例的经验不断增加，绑定到服务使得使用 Gateway API 与服务网格成为可能，但仍有几个有趣的用例难以涵盖。

例如，您可以使用 HTTPRoute 在网格中进行 A-B 测试，如下所示：

任何具有标头 `env: v1` 的 `demo-app` 服务的端口 5000 的请求都将路由到 `demo-app-v1`，而没有该标头的请求都将路由到 `demo-app-v2` - 并且由于这是由服务网格处理而不是入口控制器，因此 A/B 测试可以发生在应用程序的调用图中的任何位置。

如何知道这将是真正的可移植性？

Gateway API 在支持的所有功能上都在持续投资一致性测试，网格也不例外。GAMMA 面临的其中一个挑战是，许多这些测试都与一个给定实现提供入口控制器的想法密切相关。许多服务网格不提供入口控制器，要求符合 GAMMA 标准的网格同时实现入口控制器似乎并不切实际。这导致在 Gateway API *一致性配置文件*上重新开始工作，如[GEP-1709](https://gateway-api.sigs.k8s.io/geps/gep-1709/)所讨论的那样。

一致性配置文件的基本思想是，我们可以定义 Gateway API 的子集，并允许实现选择（并记录）他们符合哪些子集。GAMMA 正在添加一个名为“Mesh”的新配置文件，描述在[GEP-1686](https://gateway-api.sigs.k8s.io/geps/gep-1686/)中，仅检查由 GAMMA 定义的网格功能。此时，Kuma 2.3+、Linkerd 2.14+ 和 Istio 1.16+ 都符合“Mesh”配置文件的标准。

## Gateway API v0.8.0 中还有什么？

这个版本的发布是关于为即将到来的 v1.0 版本做准备，其中 HTTPRoute、Gateway 和 GatewayClass 将毕业为 GA。与此相关的有两个主要更改：CEL 验证和 API 版本更改。

### CEL 验证

第一个重大变化是，Gateway API v0.8.0 是从 webhook 验证向使用内置于 CRD 中的信息的[CEL 验证](https://kubernetes.io/docs/reference/using-api/cel/)的转换的开端。这将根据您使用的 Kubernetes 版本而有所不同：

### Kubernetes 1.25+

CEL 验证得到了完全支持，并且几乎所有验证都是在 CEL 中实现的。（唯一的例外是，标头修饰符过滤器中的标头名称只能进行不区分大小写的验证。有关更多信息，请参见[issue 2277](https://github.com/kubernetes-sigs/gateway-api/issues/2277)。）

我们建议在这些 Kubernetes 版本上*不*使用验证 Webhook。

### Kubernetes 1.23 和 1.24

CEL 验证不受支持，但是 Gateway API v0.8.0 CRD 仍然可以安装。当您升级到 Kubernetes 1.25+ 时，这些 CRD 中包含的验证将自动生效。

我们建议在这些 Kubernetes 版本上继续使用验证 Webhook。

### Kubernetes 1.22 和更早版本

Gateway API 只承诺支持[最新的 5 个 Kubernetes 版本](https://gateway-api.sigs.k8s.io/concepts/versioning/#supported-versions)。因此，这些版本不再受 Gateway API 的支持，不幸的是，Gateway API v0.8.0 不能在它们上安装，因为包含 CEL 验证的 CRD 将被拒绝。

### API 版本更改

随着我们为将 Gateway、GatewayClass 和 HTTPRoute 毕业到 `v1` API 版本从 `v1beta1` 做准备的过程中，我们继续减少了已毕业到 `v1beta1` 的资源的 `v1alpha2` 的使用。有关此更改以及此版本中包含的所有其他内容的更多信息，请参见[v0.8.0 发布说明](https://github.com/kubernetes-sigs/gateway-api/releases/tag/v0.8.0)。

## 如何开始使用 Gateway API？

Gateway API 代表了 Kubernetes 中负载平衡、路由和服务网格 API 的未来。已经有超过 20 个[实现](https://gateway-api.sigs.k8s.io/implementations/)可用（包括入口控制器和服务网格），列表还在不断增长。

如果您有兴趣开始使用 Gateway API，请查看[API 概念文档](https://gateway-api.sigs.k8s.io/concepts/api-overview/)，并查看一些[指南](https://gateway-api.sigs.k8s.io/guides/getting-started/)以尝试使用它。因为这是一个基于 CRD 的 API，所以您可以在任何 Kubernetes 1.23+ 集群上安装最新版本。

如果您特别有兴趣帮助 Gateway API 做出贡献，我们将非常乐意接受！请随时在存储库上[打开新问题](https://github.com/kubernetes-sigs/gateway-api/issues/new/choose)，或加入[讨论](https://github.com/kubernetes-sigs/gateway-api/discussions)。还请查看[社区页面](https://gateway-api.sigs.k8s.io/contributing/community/)，其中包括 Slack 频道和社区会议的链接。我们期待您的到来！

## 更多阅读：

- [GEP-1324](https://gateway-api.sigs.k8s.io/geps/gep-1324/)提供了 GAMMA 目标和一些重要定义的概述。这个 GEP 值得一读，因为它讨论了问题空间。
- [GEP-1426](https://gateway-api.sigs.k8s.io/geps/gep-1426/)定义了如何使用 Gateway API 路由资源（如 HTTPRoute）管理服务网格内的流量。
- [GEP-1686](https://gateway-api.sigs.k8s.io/geps/gep-1686/)在[GEP-1709](https://gateway-api.sigs.k8s.io/geps/gep-1709/)的工作基础上，为声明符合 Gateway API 的服务网格定义了一个*一致性配置文件*。

虽然这些都是[实验性](https://gateway-api.sigs.k8s.io/geps/overview/#status)模式，但请注意，它们可在 [`standard` 发布频道](https://gateway-api.sigs.k8s.io/concepts/versioning/#release-channels-eg-experimental-standard)使用，因为 GAMMA 计划迄今为止不需要引入新的资源或字段。
