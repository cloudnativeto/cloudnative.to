---
title: "Tetrate 开源 GetIstio：简单、安全、企业级的 Istio 发行版"
description: "GetIstio 为用户提供了安装和升级 Istio 的最简单方法。"
author: "[宋净超（Jimmy Song）](https://jimmysong.io)"
image: "images/blog/getistio.jpg"
categories: ["Service Mesh"]
tags: ["Istio","GetIstio"]
date: 2021-02-23T17:03:00+08:00
type: "post"
avatar: "/images/profile/jimmysong.jpg"
profile: "Tetrate 布道师，云原生社区创始人。"
---

Istio 是云原生世界中最受欢迎、[发展最迅速的开源项目](https://octoverse.github.com/2019/)之一；虽然这种增长充分说明了用户从 Istio 中获得的价值，但其快速的发布节奏对于用户来说也是一种挑战，因为他们可能要同时管理多个不同版本的 Istio 集群，并为云平台手动配置 CA 证书。

### 概述

我们今天推出了一个名为 GetIstio 的新开源项目，为用户提供了安装和升级 Istio 的最简单方法。GetIstio 提供了一个经过审核的 Istio 上游发行版–Istio 的强化镜像，并提供持续的支持，安装、管理和升级更加简单。它将与云原生和流行的 on-prem 证书管理器（如 AWS ACM、Venafi 等）进行整合。此次发布的内容包括：

- GetIstio CLI，最简单的方式来安装，操作和升级 Istio。GetIstio 提供了一个安全的、经过审核的、上游的 Istio 发行版，经过 AKS、EKS 和 GKE 的测试。
- 免费的 Istio 基础在线课程，现在可以在 [Tetrate 学院](https://academy.tetrate.io/)获得。
- 一个新的社区，汇集了 Istio 和 Envoy 用户和技术合作伙伴。

### GetIstio CLI

GetIstio 是一个集成和生命周期管理 CLI 工具，可确保使用支持和审核的 Istio 版本。企业需要能够控制 Istio 的版本，支持 Istio 的多个版本，在版本之间轻松移动，与云提供商的认证系统集成，并集中配置管理和验证。GetIsio CLI 工具支持这些企业级需求，因为它：

- 强制获取 Istio 的认证版本，并且只允许安装 Istio 的兼容版本。
- 允许在多个 istioctl 版本之间无缝切换。
- 包括符合 FIPS 标准的版本。
- 通过整合多个来源的验证库，提供 Istio 配置验证平台。
- 使用多个云提供商证书管理系统来创建用于签署服务网格管理工作负载的 Istio CA 证书，以及提供与云提供商的多个附加集成点。

### 快速开始

下面的命令获得一个 shell 脚本，下载并安装与脚本检测到的操作系统发行版相对应的 GetIstio 二进制文件（目前支持 macOS 和 Linux）。此外，还下载了最新支持的 Istio 版本。此外，该脚本还将 GetIstio 的位置添加到 PATH 变量中（需要重新登录以获得 PATH 填充）。

```bash
 curl -sL https://tetrate.bintray.com/getistio/download.sh | bash
```

### 参与进来

作为 GetIstio 的一部分，我们还为 Istio、Envoy 和服务网格的开发者、最终用户和技术合作伙伴推出了一个新的社区。社区对所有人开放。GetIstio.io 网站还包括使用 Istio 的[实用教程](/zh/istio-in-practice/)。

如果您想将学习提升到一个新的水平，我们还准备了一个免费的 [Istio 基础知识课程](https://certifications.tetrate.io/)，作为 Tetrate Academy 的一部分。这是一门自学课程，有 8 个模块，包括理论课程，我们在其中解释理论和概念，实践课程，包括实验室和测验，以便您可以检查您的知识。加入我们的周会，提交问题，或者在 Slack 中提问。任何贡献都不会太小，你的意见和贡献很重要！

### GetIstio 订阅

Tetrate 为 GetIstio 提供商业支持，可直接与 Istio 专家联系，优先修复错误并提供 7x24 支持。更多详情请[点击这里](https://www.tetrate.io/getistio)。

### 相关链接

- GetEnvoy：<https://www.getenvoy.io>
- GitHub：<https://github.com/tetratelabs/getistio>
- 加入 [Istio Slack](https://istio.slack.com/) 并搜索 GetIstio 频道与我们联系。
- 获得 “Istio 基础知识 “认证：<https://academy.tetrate.io>
- 获取 Istio 订阅：<https://www.tetrate.io/getistio>