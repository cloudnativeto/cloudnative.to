---
title: "服务网格的未来Part 2：Istio 1.0之后何去何从？"
date: 2018-11-01T20:10:14+08:00
draft: false
image: "/images/blog/006tNbRwly1fwstnltjbgj31ji15ox6q.jpg"
author: "[Stephen McPolin & Venil Noronha](https://blogs.vmware.com/opensource/author/opensourceteam/)"
translator: "[陈冬](https://github.com/shaobai)"
reviewer:  ["宋净超"]
reviewerlink:  ["https://jimmysong.io"]
originallink: "https://blogs.vmware.com/opensource/2018/10/23/service-mesh-whats-next"
description: "本文通过分析服务网格的优势，阐述了其未来的发展情况。"
tags: ["servcie mesh"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格"]
type: "post"
avatar: "/images/profile/default.jpg"
---

本文为翻译文章，[点击查看原文](https://blogs.vmware.com/opensource/2018/10/23/service-mesh-whats-next)。

在服务网格系列的第一部分中，我们认为服务网格是微服务体系架构发展的必然和有益的结果。随着 Istio 1.0 的发布，我们在服务网格领域已经经过了一个重要的里程碑，在这个重要的的时间节点上，我们需要思考服务网格的未来将如何发展。

在 VMware 我们非常愿意花时间和精力支持开源的服务网格架构。我们已经成为 Istio 和 Envoy（Istio 用来动态控制微服务的特定的开源服务代理）的贡献成员。我们在改善网络方面投入了大量的精力，同时在其他领域贡献力量。

我们考虑到几乎每个 Istio 的演示目前都是基于一个单一的示例。保加利亚的一位 VMware 同事目前正在构建一个全新的 Istio 演示示例，用于演示如何在封闭字幕等服务之间管理视频质量，并演示 Istio 在微服务环境中的动态路由的能力。

因为我们认为服务网格是有价值的，而且可以一直存在，所以我们一只在寻求将 VMware 自己的世界级系统管理工具集与服务网格框架进行集成。这里有一个很好的例子，我们最近创建了一个适配器，将 Istio metrics 导出到 VMware 的 Wavefront 监测和分析工具中。如果我们能够将微服务中的更多信息合并到我们的系统管理工具中，我们相信这些工具能够更好的管理系统。

![](006tNbRwgy1fwp4etrgwvj30sg0iz782.jpg)

从我们的角度来看，这样的工作是为了扩大微服务生态系统。然而，服务网格平台本身还不够完善。比如说，Istio 是一个复杂的软件，当它不能正常工作时很难调试。当它在工作，它能很好的帮助你监测你的微服务是否正常运行。当它不能正常工作，又很难弄清楚它为什么不能工作。这种复杂度已被社区中被广泛理解的，并且我们一直在花时间和精力思考如何克服这种复杂性，但目前我们还没有解决这个问题。

目前服务网格平台刚开始处理多集群情况。如果你将应用部署在单集群上，可以使用 Istio 和 Envoy 这样的应用管理他们。但是当你希望将单集群扩展到多集群，并让服务在集群边界上进行通信（从安全的角度来看是一个好想法），那这将是一个挑战。社区理解 Istio 这样的情况，于我们而言，正在逐步改进设计以支持多集群管理。

至此，我们正在关注一个新的提议，来自 Google 的 Knative。从根本上说，这是基于 Google 的“函数即服务”概念，从 Kubernetes 和 Istio 中衍生出来的。在不久的将来，它将向 Istio 提出更多的需求，但是目前还不清楚这些需求从何而来。例如，“事件”对于 Istio 来说是一个完全陌生的概念，但是对于处理临时数据还是必要的。Knative 则增加了这方面的组件，并推向 Istio 的下层。

现在，我们只是在看到 Space—Knative 推出了大约一个半月，并且还有很多问题没有解决，在我们决定如何应对这些问题之前，我们也在寻求新的变革。因此，现在还有很多的事情要做，同时也有很多需要关注的地方。但是可以肯定的是，服务网格会有持续发展。

请继续在 [Open Source Blog](https://blogs.vmware.com/opensource/) 关注我们对服务网格系列后续的更新，并在Twitter上关注我们（@vmwopensource）。
