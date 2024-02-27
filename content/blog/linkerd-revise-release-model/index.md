---
title: "Linkerd 服务网格的发布模式变更： 开源版只提供 Edge 版本，稳定版需付费使用"
summary: "本文介绍了 Buoyant 公司对 Linkerd 服务网格的发布模式的调整，以及其对企业用户的影响。"
authors: ["云原生社区"]
categories: ["Service Mesh"]
tags: ["Linkerd","开源","服务网格","Buoyant"]
date: 2024-02-27T09:05:42+08:00
---

Linkerd 是一个开源的服务网格项目，由 Buoyant 公司创建并维护。服务 网格是一种云原生技术，可以为微服务架构提供统一的网络层，实现服务间的安全、可观测和可控的通信。 Linkerd 以其轻量、快速和易用的特点，赢得了许多 开发者和企业的青睐。

然而，Buoyant 公司最近宣布了一个重大的变化，即从 5 月开始，如果用户想要 下载和运行 Linkerd 的最新 稳定版本，就必须使用 Buoyant 的 商业分发版，即 Buoyant Enterprise for Linkerd（BEL）。**BEL 是一个面向企业的 Linkerd 分发版，对于个人和 50 人以下的 企业免费使用，对于 50 人以上的企业，在生产环境中使用则需要付费。**

这一变化意味着，Linkerd 的 开源版本将只提供 Edge 版本，即每 10 天左右发布一次的预发布版本，用于测试新功能，但可能存在一些不兼容的变化。而 稳定版本，即经过充分测试和优化的版本，将只在 BEL 中提供。

Buoyant 公司的 CEO William Morgan 在接受 The New Stack 的采访时解释了这一变化的原因，他表示，这是为了确保 Linkerd 为 企业用户提供顺畅的运行体验。他说，打包发布版本的工作非常耗费资源，甚至比维护和推进核心软件本身还要困难。他将这种做法比作 Red Hat 对 Linux 的运作方式，即提供 Fedora 作为早期发布版，同时维护其 核心 Linux 产品，即 Red Hat Enterprise Linux（RHEL）供 商业客户使用。

“如果你想要我们投入到稳定版本的工作，这主要是围绕着不仅仅是测试，还有在后续版本中最小化变化的工作，这是非常艰难的工作，需要世界领先的分布式系统专家的投入，”Morgan 说，“那么，这就是黑暗的、专有的一面。”

除了 Linkerd 的 核心功能外， BEL 还提供了一些额外的 专有工具，如动态的区域感知负载均衡器、用于 Linkerd 安装和升级的 Kubernetes Operator，以及一套用于管理授权策略的工具。BEL 的 企业版价格为每月每集群 2000 美元，不过对于非营利组织、高容量使用场景和其他特殊需求，也有一些折扣。

Linkerd 的 开源项目由 Cloud Native Computing Foundation（CNCF）管理， 版权由 Linkerd 的作者本身持有。Linkerd 采用 Apache 2.0 许可证。

Linkerd 的最新版本 2.15，于本周发布，包括了一些新的功能。其中之一是 “ 网格扩展”，它可以让用户将非 Kubernetes 的工作负载，如来自 虚拟机或裸机服务器的工作负载，通过使用基于 Rust 的微代理，纳入到服务 网格中。

我们将继续关注 Linkerd 的发展，以及它对云原生社区的影响。
