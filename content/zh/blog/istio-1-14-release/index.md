---
title: "Istio 1.14 发布"
description: "这是 Istio 在 2022 年发布的第二个版本。"
author: "[Istio 社区](https://istio.io/latest/news/releases/1.14.x/announcing-1.14/)"
image: "images/blog/istio14.jpg"
categories: ["Istio"]
tags: ["Istio"]
date: 2022-06-02T08:03:00+08:00
type: "post"
---

端午节前夕，Istio 1.14 发布。

这是 2022 年的第二个 Istio 版本。我们要感谢整个 Istio 社区对 Istio 1.14.0 发布的帮助。特别感谢发布经理 Lei Tang（谷歌）和 Greg Hanson（Solo.io），以及测试和发布工作组负责人 Eric Van Norman（IBM）的持续帮助和指导。

Istio 1.14.0 正式支持 Kubernetes 1.21 至 1.24 版本。

以下是该版本的一些亮点。

### 对 SPIRE 运行时的支持

SPIRE 是 SPIFFE 规范的一个生产就绪的实现，它提供可插拔的多因子验证和 SPIFFE 联邦。我们使用 Envoy SDS API 对与外部证书颁发机构的集成方式进行了修改，以实现对 SPIRE 的支持。感谢惠普企业的团队对这项工作的贡献！SPIRE 通过使用不同的认证机制的组合，实现了强认证身份的引入。它为在 Kubernetes、AWS、GCP、Azure、Docker 中运行的工作负载提供了各种节点和工作负载证明，并通过面向插件的架构，它还可以使用自定义证明。该项目与定制的密钥管理系统有一个可插拔的集成，用于存储 CA 私钥，并通过上游证书机构插件实现与现有 PKI 的集成。SPIRE 实现了 SPIFFE 联邦，使工作负载能够通过 Federation API 以可配置和灵活的方式信任不同信任域中的对等体。

更多信息，请查看惠普企业和 Solo.io 团队的 [文档](https://istio.io/latest/docs/ops/integrations/spire/) 和这个 [视频](https://www.youtube.com/watch?v=WOPoNqfrhb4)。

### 添加自动 SNI 支持

一些服务器要求在请求中包含 SNI。这项新功能可以自动配置 SNI，而无需用户手动配置或使用 EnvoyFilter 资源。欲了解更多信息，请查看 [PR 38604](https://github.com/istio/istio/pull/38604) 和 [PR 38238](https://github.com/istio/istio/pull/38238)。

### 增加对配置 Istio 工作负载的 TLS 版本的支持

TLS 版本对安全很重要。这项新功能增加了对配置 Istio 工作负载的最小 TLS 版本的支持。欲了解更多信息，请查看 [文档](https://istio.io/latest/docs/tasks/security/tls-configuration/workload-min-tls-version/)。

### 遥测改进

我们对 [Telemetry API](https://istio.io/latest/docs/tasks/observability/telemetry/) 进行了一系列改进，包括支持 OpenTelemetry 访问记录、基于 `WorkloadMode` 的过滤等。

### 升级到 1.14

当你升级时，我们希望听到你的声音！请花几分钟时间填写这个简短的 [调查](https://forms.gle/yEtCbt45FZ3VoDT5A)，让我们了解我们做的怎么样。

你也可以在 [Discuss Istio](https://discuss.istio.io/) 加入对话，或者加入我们的 Slack。你想直接为 Istio 做出贡献吗？找到并加入我们的工作组，帮助我们改进。

### IstioCon 总结

IstioCon 今年是第二届会议，于 4 月 25-29 日举行。我们有近 4000 名注册参与者，满意度为 4.5/5。会议以英文和中文举行，有来自世界各地 120 个国家的人加入。在 2022 年 4 月，即会议召开的当月，istio.io 上 81% 的用户是第一次访问。我们将在 [events.istio.io](https://events.istio.io/) 上分享更详细的活动报告。

### CNCF 新闻

我们很高兴看到我们宣布将 [Istio 捐献给 CNCF](https://istio.io/latest/blog/2022/istio-has-applied-to-join-the-cncf/) 后的反应。我们正在努力开发应用程序，希望在未来几个月内有更多的内容可以分享。
