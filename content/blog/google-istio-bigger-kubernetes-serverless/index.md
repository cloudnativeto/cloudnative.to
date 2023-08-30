---
title: "Google 加持 Istio：这可能比 Kubernetes 和 Serverless 产生更大影响力"
date: 2018-08-20T16:14:16+08:00
draft: false
authors: ["Cilium"]
translators: ["甄中元"]
summary: "Google Cloud 采用了 Istio 服务网格技术来管理微服务，这可能比 Kubernetes 和无服务器产生更大的影响。你可以在任何你喜欢的云提供商之间自由迁移，且使你上云之路更加平稳。一旦人们熟悉了 Kubernetes 和 Istio 的管理和编排方式，上云就不会变得可怕了。"
tags: ["service mesh","istio","serverless"]
categories: ["service mesh"]
keywords: ["service mesh"]
---

![](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/google-istio-bigger-kubernetes-serverless/00704eQkly1fug8z3tpgcj30lc0ao44a.jpg)

本文为翻译文章，[点击查看原文](https://diginomica.com/2018/08/03/google-istio-bigger-kubernetes-serverless/)。

Google Cloud 采用了 Istio 服务网格技术来管理微服务，这可能比 Kubernetes 和无服务器产生更大的影响。

随着现代数字计算基础设施的不断发展，新的自动化层加速了创新和提升了适应性。一旦实现容器化微服务几秒之内部署一个新功能成为可能。那么 Kubernetes 和类似工具的出现增加了一层业务流程，以便大规模协调容器部署。在基础设施中一个功能很容易抽象成为一个满足需求的 serverless 模型。现在，正在形成一个称为“service mesh”的新层，以便在所有这些功能中添加服务间治理、管理和通信功能。8 月 1 号一个名为 Istio 的 service mesh 的新开源框架 1.0 版本发布生产版本，像之前的 Kubernetes 一样，由谷歌以及 IBM 支持。

## 比 Kubernetes 更有价值

您可能没有听说过 Istio，但如果您进行任何形式的敏捷数字开发或运维工作，您很快就会知道 Istio。Google 云计算 CTO（UrsHölzle）上周告诉我，他预计 service mesh 将会被普遍采用：“我希望看到的是，在两年后 90％的 Kubernetes 用户将会使用 Istio。Istio 与 Kubernetes 提供的产品非常吻合，几乎感觉就像 Kubernetes 的下一次迭代。这是由同一个团队完成的，Istio 和 Kubernetes 的功能能够很好的互补。”

Hölzle 没有明确地说 Istio 一定会比 Kubernetes 更大，但他非常确信 Istio 会和 Kubernetes 具有一样大的应用前景，甚至超过 Kubernetes。

## Istio、Kubernetes 和 Serverless

在某种程度上，Hölzle 的信心源于谷歌决定将 Istio 标准化为其云服务平台（[Cloud Services Platform ](https://cloudplatform.googleblog.com/2018/07/cloud-services-platform-bringing-the-best-of-the-cloud-to-you.html)）的管理层，该服务于上周在 Cloud Next 会议上宣布。这与上周推出的另外两个新项目同时启动。一个是[Knative](https://www.infoq.com/news/2018/07/knative-kubernetes-serverless)—一个基于 Kubernetes 的开源框架，用于构建、部署和管理 serverless 工作负载，正如 Kurt Marko 本周早些时候在他的[Cloud Next 文章](https://diginomica.com/2018/07/30/google-cloud-platform-removes-barriers-between-it-business/)中所解释的那样，“Knative 不仅仅是一个 serverless 的容器包装器，而是一个容器化应用的开发框架“。另一个是谷歌 GKE（Google Kubernetes Engine）私有云版本，是云供应商的容器管理工具。结合 Istio 的管理层，这实际上意味着组织可以从私有云到公有云使用 CSP 管理整个 IT 基础架构中的容器生态系统和 serverless。

Istio 是 Google、IBM 和 Lyft 共同努力在一年多前推出的一项开放式技术框架，用于连接、保护、管理和监控云的服务网络。这三家公司都贡献了他们单独开发的现有技术。

## 减轻企业上云难度

Hölzle 认为，Istio 将加速企业采用公有云，因为它可以在私有化部署和云之间实现更高的同质化：“公司决定将所有内容（包括他们不想重写的旧代码）移至 Istio，去包装旧代码而不去重写它这是非常合理的。我们相信 GKE 私有化部署将带领更多客户深入云技术。因为它与现代云思维非常融合，它保留了它们的地址以及何时何地去迁移的选择机会。你可以在任何你喜欢的云提供商之间自由迁移，且使你上云之路更加平稳。一旦人们熟悉了 Kubernetes 和 Istio 的管理和编排方式，上云就不会变得可怕了。”

Hölzle 认为 BigQuery 这样的云原生功能将继续为它们提供最终结果。与此同时，它依靠思科等合作伙伴提供 GKE 和 Knative 的私有化版本，而不是成为该技术本身的直销商。

## 合作伙伴和开发者

合作伙伴还将发现 Istio 有助于他们从硬件产品转向安全等领域的软件和服务云转型。Hölzle 认为：“许多合作伙伴正在转向销售软件和销售服务，这是进入该领域的理想切入点。如果您是正在使用 Istio 的服务安全提供商，将服务从本地迁移到云将不受影响，只有位置发生变化了。在当前模型中，如果您是本地提供商，所有 API 都不同，所有需要回答的问题都是新的，您可能会失去现任状态，因为您无法轻松移植到云端”。

开发人员也需要得到说服。但谷歌开发者关系部副总裁亚当·塞利格曼认为，他对 Istio 为他们开放的东西感到很兴奋：“使用 Istio 不需要大量的重新编程。现有的应用程序、功能和服务可以使用 Istio 进行流量路由，并立即看到当前各维度的运行状态。你将没有使用 Istio 的应用程序加入 Istio，你会获得以前无法获得的所有可见性。我认为这会刺激很多开发人员，加速 Istio 被采用的速度。我认为开发人员需要接受 SLO（服务级别目标）监控、金丝雀部署、流量控制、A/B 测试甚至多变量测试等技术培训。”

## 我的见解

Istio 不是唯一实现 service mesh 的技术框架，linkerd—由 Buoyant 支持的开源项目，早于 Istio，已经投入生产。但谷歌、IBM 和思科等重量级合作伙伴给 Istio 带来了比 Bouyant 对 linkerd 更大的支持。最后，重要的是服务网格的原则而不是具体的实现。一直存在着反对过度使用微服务的争论，因为你拥有的自主服务越多，管理它们就越复杂。在 Istio 的支持下，Google 正在验证解决这个棘手问题的微服务架构，以便所有这些松散耦合的端点可以合理地协调以产生有用的业务成果。这似乎应该是云计算发展中非常重要的进展。
