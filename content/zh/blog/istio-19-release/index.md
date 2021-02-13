---
title: "Istio 1.9 发布"
description: "北京时间 2021 年 2 月 10 日晨，Istio 1.9 发布，这是 2021 年的第一个版本。"
image: "images/blog/istio-pilot-banner.jpeg"
categories: ["Service Mesh"]
tags: ["Istio"]
author: "[Istio 团队](https://istio.io/latest/news/releases/1.9.x/announcing-1.9/)"
translator: "[Jimmy Song](https://jimmysong.io)"
date: 2021-02-10T10:03:00+08:00
type: "post"
avatar: "/images/profile/default.jpg"
profile: "Istio 是当前最流行的服务网格项目之一。"
---

本文为翻译文章，[点击查看原文](https://istio.io/latest/news/releases/1.9.x/announcing-1.9/)。

Istio 1.9 版本的重点是改善用户在生产中运行 Istio 的 Day2 操作。在用户体验工作组收集到的反馈意见的基础上，我们希望改善用户的稳定性和整体升级体验。稳定性的一个关键是明确 Istio 核心 API 和功能发布的功能状态，并增强它们的稳定性，使用户能够放心使用 Istio 的这些功能，这是 1.9 版本的另一个重点。

请关注我们的博客，了解我们的 2021 年路线图，我们将在那里展示我们对持续改善 Day 2 体验的关注。

感谢我们的用户参与了用户体验调查和共鸣会，帮助我们确保 Istio 1.9 是迄今为止最稳定的版本。

这是 2021 年的第一个 Istio 版本。我们要感谢整个 Istio 社区，特别是发布经理 [Shamsher Ansari](https://github.com/shamsher31)（Red Hat）、[Steven Landlow](https://github.com/stevenctl)（Google）和 [Jacob Delgado](https://github.com/jacob-delgado)（Aspen Mesh），感谢他们帮助我们发布 Istio 1.9.0。

Istio 1.9.0 正式支持 Kubernetes 1.17.0 至 1.20.x 版本。

以下是本次发布的一些亮点。

## 虚拟机集成（Beta）

使运行在虚拟机中的工作负载能够成为 Istio 服务网格的一部分，能够应用一致的策略，并跨容器和虚拟机收集遥测数据，一直是 Istio 社区的重点。我们一直在持续改进 VM 集成的稳定性、测试和文档，并很高兴地宣布，在 Istio 1.9 中，我们已将此功能推进到 Beta 版。

以下是支持文档的列表，您可以按照这些文档轻松地在 Istio 服务网格集成虚拟机。

- [开始虚拟机安装](https://istio.io/latest/docs/setup/install/virtual-machine/)
- [虚拟机架构](https://istio.io/latest/docs/ops/deployment/vm-architecture/)，了解 Istio 虚拟机集成的高层架构。
- [调试虚拟机](https://istio.io/latest/docs/ops/diagnostic-tools/virtual-machines/)，了解更多有关虚拟机故障排除问题的信息。
- [包含虚拟机的 Bookinfo](https://istio.io/latest/docs/examples/virtual-machines/)，了解更多关于连接虚拟机工作负载和 Kubernetes 工作负载的信息。

## 请求分类（Beta）

Istio 继续使网格遥测收集更可配置。在此次发布的版本中，请求分类已升级为 Beta 版。该功能使用户能够更精确地了解和监控服务网格中的流量。

## Kubernetes Service API 支持（Alpha）

自 Istio 1.6 以来，配置 Istio 以使用 [Kubernetes Service API](https://kubernetes-sigs.github.io/service-apis/) 暴露服务一直是一个活跃的开发领域，我们很高兴地宣布在 1.9 中作为 Alpha 支持这些 API。使用这些 API 有利于用户在支持这些 API 的其他服务网格之间迁移。要试用它们，请查看 [Service API 的入门文档](https://istio.io/latest/docs/tasks/traffic-management/ingress/service-apis/)。

我们渴望与 Kubernetes 社区，特别是 [Kubernetes SIG-NETWORK](https://github.com/kubernetes/community/tree/master/sig-network) 小组合作，在即将发布的版本中开发这些 CRD，以帮助统一和提升跨生态系统的 Ingress 功能。

## 与外部授权系统的整合（Experimental）

授权策略现在支持 [CUSTOM 动作](https://istio.io/latest/docs/reference/config/security/authorization-policy/#AuthorizationPolicy-Action)的实验性功能，允许用户更容易地与外部授权系统（如 OPA、OAuth2 等）集成。

我们很快就会发布一篇关于这个功能的博客，但现在你可以根据[我们的文档](https://istio.io/latest/docs/tasks/security/authorization/authz-custom)来使用这个功能。如果你现在正在使用 [Envoy Filter](https://istio.io/latest/docs/reference/config/networking/envoy-filter/) API 与外部授权系统集成，我们建议你尝试一下这个功能，并给我们反馈！

## 使用 gcr.io 镜像 Docker Hub

为了防止我们的用户受到 Docker Hub 的[限速政策](https://istio.io/latest/blog/2020/docker-rate-limit/)的影响，我们现在将所有的镜像发布在 `gcr.io/istio-release` 镜像仓库上。您可以在安装步骤中选择性地将仓库设置为 `gcr.io/istio-release`，以绕过与 Docker hub 下载镜像失败相关的问题。请注意，Docker hub 仍然是 Istio 安装的默认 hub。

## istioctl 更新

我们继续对 istioctl 工具进行重大改进，以提高用户的故障排除和调试能力。主要功能包括：

- 一个新的 `verify-install` 命令，通知用户任何安装配置错误。
- `analyze` 子命令现在可以检查是否使用了过时的或 alpha 级的[注释](https://istio.io/latest/docs/reference/config/annotations/)。

## 加入 Istio 社区

我们将于 2021 年 2 月 22 至 26 日举办首届聚焦于 Istio 的会议 ——[IstioCon](https://events.istio.io/istiocon-2021/)，请注册并加入我们，了解 Istio 社区、路线图和用户采用历程。您也可以加入我们的 [社区会议](https://github.com/istio/community#community-meeting)，该会议于太平洋标准时间（PST）每月第四个星期四上午 10 点举行，以提供反馈并获得项目更新。

您也可以加入 [Discuss Istio](https://discuss.istio.io/) 参与讨论，或者加入我们的 [Slack](https://slack.istio.io/)。

您想参与其中吗？寻找并加入我们的[工作组](https://github.com/istio/community/blob/master/WORKING-GROUPS.md)，帮助改进 Istio。