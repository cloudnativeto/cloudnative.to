---
title: "为什么我们决定从新开始我们的NGINX Gateway Fabric"
summary: "Gateway API已经正式GA，您可能好奇作为社区的一个重要实现，F5 NGINX是如何决策和发展该项目的。F5的产品管理总监 Brian Ehlert以及首席软件工程师Matthew Yacobucci将在本文中为您阐述NGINX Gateway Fabric项目及其未来的目标。"
authors: ["Brian Ehlert","Matthew Yacobucci"]
translators: ["林静"]
categories: ["Kubernetes","Gateway API","NGINX"]
tags: ["NGINX","Gateway API","Kubernetes"]
date: 2023-11-08T15:33:00+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://www.nginx.com/blog/why-we-decided-to-start-fresh-with-our-nginx-gateway-fabric/
---

译者注：
本文译自：<https://www.nginx.com/blog/why-we-decided-to-start-fresh-with-our-nginx-gateway-fabric/>

Gateway API已经正式GA，您可能好奇作为社区的一个重要实现，F5 NGINX是如何决策和发展该项目的。F5的产品管理总监 Brian Ehlert以及首席软件工程师Matthew Yacobucci将在本文中为您阐述[NGINX Gateway Fabric](https://github.com/nginxinc/nginx-gateway-fabric)项目状态，以及未来的目标。

---

在 Kubernetes Ingress 控制器的世界里，NGINX 已经非常成功地运行了。NGINX Ingress Controller 被广泛部署用于商业 Kubernetes 生产用例，同时也作为开源版本进行开发和维护。因此，你可能会认为，当 Kubernetes 网络（Gateway API）出现重大改进时，我们会继续做一件好事，并在我们现有的 Ingress 产品中实现它。

相反，我们选择了一条不同的道路。看到新的 Gateway API 的惊人可能性，以及我们完全重新构想如何在 Kubernetes 中处理连接的机会，我们意识到将 Gateway API 实现硬塞到我们现有的 Ingress 产品中将限制这种无限的未来。

这就是为什么我们决定推出我们自己的网关 API 项目——[NGINX Gateway Fabric](https://github.com/nginxinc/nginx-gateway-fabric)。该项目是开源的，将透明和协作地运作。我们很高兴能与外部贡献者合作，并与他人分享这段旅程，因为我们希望创造一些特别而独特的东西。

## 我们如何做出网关 API 决策

虽然围绕 Gateway API 创建一个全新项目的决定来自乐观和兴奋，但本质上它是基于健全的业务和产品战略逻辑。

Kubernetes 的长期追随者可能已经知道 NGINX Ingress Controller 的开源和商业版本。两者分别在数据平面部署了 NGINX 开源和 NGINX  Plus商业反向代理，他们都是经过实战考验的 NGINX 数据平面。在 Kubernetes 之前，NGINX 的数据平面已经非常适合负载均衡和反向代理。在Kubernetes 中，我们的 Ingress 控制器可实现相同类型的关键请求路由和应用程序交付任务。

NGINX 以构建轻量级、高性能、经过良好测试并准备好应对苛刻环境的商业产品而自豪。因此，Kubernetes Ingress Controller的产品策略反映了我们的反向代理产品策略——为更简单的用例制作一个强大的开源产品，并为关键业务应用程序环境中的生产 Ingress Controller制作一个具有附加特性和功能的商业产品。该策略在 Ingress Controller领域奏效，部分原因是 Ingress Controller缺乏标准化，并且需要大量的自定义资源定义 （CRD） 来提供负载均衡和反向代理等高级功能，开发人员和架构师在 Kubernetes 之外的网络产品中享受这些功能。

我们的客户依赖并信任 NGINX Ingress Controller，商业版本已经具有 Gateway API 旨在解决的许多关键高级功能。此外，NGINX 很早就参与了 Gateway API 项目，我们认识到 Gateway API 生态系统需要几年时间才能完全成熟。（事实上，Gateway API 的许多规范都在不断发展，例如 GAMMA 规范，以使其能够更好地与服务网格集成)。

但我们认为，将 beta 级Gateway API 规范硬塞给 NGINX Ingress Controller 会给成熟的企业级 Ingress 控制器带来不必要的不确定性和复杂性。我们在商业上销售的任何东西都必须稳定、可靠，并且 100% 准备好生产。Gateway API 解决方案也将实现这一目标，但这个过程仍然只是开始。

## 我们对 NGINX Gateway Fabric 的目标

借助 NGINX Gateway Fabric，我们的主要目标是创建一个经得起时间考验的产品，就像 NGINX Plus 和 NGINX 开源一样。为了达到我们愿意将Gateway API 项目标记为“面向未来”的地步，我们意识到我们需要尝试其数据和控制平面的架构选择。例如，我们可能需要研究不同的方法来管理第 4 层和第 7 层连接或最小化外部依赖关系。这种实验最好在一张白纸上进行，没有历史先例和要求。虽然我们使用久经考验的 NGINX 数据平面作为 NGINX 网关结构的基础组件，但我们对除此之外的新想法持开放态度。

我们还希望为 Gateway API 资源提供全面的、与供应商无关的配置互操作性。与现有的Kubernetes Ingress 范式相比，Gateway API 最大的改进之一是它标准化了服务网络的许多元素。从理论上讲，这种标准化应该会带来一个更美好的未来，许多Gateway API 资源可以轻松交互和连接。

然而，构建这一未来的关键是抛弃特定于供应商的 CRD（这可能导致供应商锁定）。在必须支持专为入口控制领域设计的 CRD 的混合产品中，这可能会变得非常具有挑战性。在将互操作性作为首要关注点的开源项目中，这更容易。为了摒弃紧密链接的 CRD，我们需要构建一些只关注 Gateway API 及其组成 API 的新表面东西。

## 加入我们的Gateway API 之旅

我们仍处于非常早期的阶段。只有少数项目和产品实现了Gateway API 规范，并且大多数项目和产品选择将其嵌入到现有项目和产品中。

这意味着这是一个充满机遇的时期——开始一个新项目的最佳时机。我们完全以开放方式运行 NGINX Gateway Fabric 项目，具有透明的决策和项目治理。由于该项目是用 Go 编写的，因此我们邀请庞大的 Gopher 社区提出建议、开始提交 PR 和/或向我们提出想法。

Gateway API 可能会改变整个 Kubernetes 格局。可能不再需要整类产品，且新产品可能也会出现。Gateway API 提供了如此丰富的可能性，老实说，我们不知道最终会走向何方——但我们真的很期待它的旅程。一起来旅行吧，会很有趣！

您可以从以下方面开始：

- 以贡献者身份加入项目
- 在实验室中尝试实施
- 测试和提供反馈

要加入该项目，请访问 GitHub 上的 [NGINX Gateway Fabric](https://github.com/nginxinc/nginx-gateway-fabric)。

如果您想与我们的专家就此项目和其他 NGINX 项目进行实时聊天，请前往 [KubeCon North America 2023 ](https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/)的 NGINX 展台！NGINX 是 F5 的一部分，很荣幸成为今年 KubeCon NA 的白金赞助商，我们希望在那里见到你！
