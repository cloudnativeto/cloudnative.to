---
title: "Istio 1.19 发布——支持 Gateway API 并改进了 Ambient Mesh 部署模型"
summary: "Istio 1.19 发布了，支持 Kubernetes Gateway API，并改进了 Ambient Mesh 部署模型。本次发布还包括安全配置增强和虚拟机和多集群体验的简化。欢迎提供升级过程中的反馈。"
authors: ["Istio"]
translators: ["宋净超"]
categories: ["Istio"]
tags: ["Istio","Service Mesh"]
date: 2023-09-06T09:03:00+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://istio.io/latest/news/releases/1.19.x/announcing-1.19/
---

本文译自：<https://istio.io/latest/news/releases/1.19.x/announcing-1.19/>

Istio 1.19 发布了，支持 Kubernetes Gateway API，并改进了 Ambient Mesh 部署模型。本次发布还包括安全配置增强和虚拟机和多集群体验的简化。欢迎提供升级过程中的反馈。

---

我们很高兴地宣布 Istio 1.19 的发布。这是 2023 年的第三个 Istio 发布版本。我们要感谢整个 Istio 社区帮助发布 1.19.0 版本。我们要感谢这个版本的发布经理，`Microsoft` 的 `Kalya Subramanian`，`DaoCloud` 的 `Xiaopeng Han`，以及 `Google` 的 `Aryan Gupta`。发布经理们要特别感谢测试和发布工作组负责人 Eric Van Norman (IBM) 在整个发布周期中的帮助和指导。我们还要感谢 Istio 工作组的维护者和更广泛的 Istio 社区，在发布过程中及时提供反馈、审查、社区测试以及为确保及时发布的所有支持。

Istio 官方支持 Kubernetes 版本 `1.25` 到 `1.28`。

## 新功能

### Gateway API

Kubernetes [Gateway API](http://gateway-api.org/) 是一个旨在将一组丰富的服务网络 API（类似于 Istio VirtualService 和 Gateway）引入 Kubernetes 的倡议。

在此版本中，与 Gateway API v0.8.0 版本一起，正式添加了 [service mesh 支持](https://gateway-api.sigs.k8s.io/blog/2023/0829-mesh-support/)！这是 Kubernetes 生态系统中广泛社区努力的结果，并具有多个符合实现（包括 Istio）。

查看 [mesh 文档](https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/#mesh-traffic) 开始使用。与任何实验性功能一样，非常感谢您的反馈。

除了网格流量之外，使用该 API 进行入口流量的用法 [已经进入 beta 版](https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/#configuring-a-gateway)，并且将很快成为 GA。

### Ambient Mesh

在此版本周期中，团队一直在努力改进 [Ambient Mesh](https://istio.io/latest/docs/ops/ambient/)，这是一种新的 Istio 部署模型，可替代以前的 sidecar 模型。如果您还没有听说过 Ambient Mesh，请查看 [介绍博客文章](https://istio.io/latest/blog/2022/introducing-ambient-mesh/)。

在此版本中，已添加了对 `ServiceEntry`、`WorkloadEntry`、`PeerAuthentication` 和 DNS 代理的支持。此外，还进行了一些错误修复和可靠性改进。

请注意，本次发布中，Ambient Mesh 仍处于 alpha 特性阶段。您的反馈对推动 Ambient Mesh 走向 Beta 至关重要，请尝试并告诉我们您的想法！

### 其他改进

为了进一步简化 `Virtual Machine` 和 `Multicluster` 的体验，现在在 `WorkloadEntry` 资源中，地址字段是可选的。

我们还增强了安全配置。例如，您可以为 Istio 入口网关的 TLS 设置配置 `OPTIONAL_MUTUAL`，这允许可选使用和验证客户端证书。此外，您还可以通过 `MeshConfig` 配置您喜欢的用于非 Istio mTLS 流量的密码套件。
