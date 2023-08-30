---
title: "F5 公司 Aspen Mesh 1.0 发布，基于 Istio 1.0"
date: 2018-09-10T15:18:18+08:00
draft: false
authors: ["宋净超"]
summary: "Aspen Mesh 这家公司隶属于 F5，Aspen Mesh 基于 Istio 1.0 开发，上个周末刚发布了 1.0 版本，可以申请免费试用。"
tags: ["aspen mesh","istio","f5"]
categories: ["service mesh"]
keywords: ["service mesh","aspen mesh","服务网格"]
---

![](0069RVTdgy1fv4a5pt7z6j30ki0fuab3.jpg)

Aspen Mesh 这家公司隶属于 F5，Aspen Mesh 基于 Istio 1.0 开发，这个周末刚发布了 1.0 版本，可以申请免费试用。

Aspen Mesh 对比 Istio 1.0 有如下优势：

- 作为托管的 SaaS 平台
- 丰富的 UI dashboard
- 更多实验特性
- 可获得 Aspen Mesh 工程师团队的支持

Aspen Mesh 对比 Istio 1.0 有如下改进，主要集中在性能和可靠性上：

- 现在可以递增地推出双向 TLS，而无需更新服务的所有客户端
- 在 Kubernetes 中创建 Istio 配置时就已经过验证。这是由 Galley 强制执行的 Kubernetes 准入控制器 webhook
- 针对服务和工作负载的更精确和全面的遥测
- Mixer 现在支持进程外适配器，可以更轻松地与更多的后端集成

想要试用的话可以去[Aspen Mesh 官网](https://aspenmesh.io)上申请。
