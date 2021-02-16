---
title: "服务网格的未来Part 1：服务网格架构是必然趋势并愈加重要"
date: 2018-10-29T16:11:07+08:00
draft: false
image: "/images/blog/006tNbRwly1fwp6rmelcaj31jk15ox5m.jpg"
author: "[Stephen McPolin & Venil Noronha](https://blogs.vmware.com/opensource/author/opensourceteam/)"
translator: "[马若飞](https://github.com/malphi)"
reviewer:  ["宋净超"]
reviewerlink:  ["https://jimmysong.io"]
originallink: "https://blogs.vmware.com/opensource/2018/10/16/service-mesh-architectures-inevitable/"
description: "本文来自VMware开源小组，通过分析服务网格的优势，阐述了其未来的发展情况。"
tags: ["service mesh"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格"]
type: "post"
avatar: "/images/profile/default.jpg"
---

当[Istio 1.0](https://istio.io/)在几个月前发布时，[TechCrunch](https://techcrunch.com/2018/07/31/the-open-source-istio-service-mesh-for-microservices-hits-version-1-0/)称它为“可能是目前最重要的开源项目之一”。它并不是完美的(在本系列的第2部分会有详细介绍)，但是这个版本标志着服务网格架构开发的一个重要里程碑。

尽管对Istio的发布给予了关注，但是，在开源社区服务网格还是不为人知。在这两篇文章中，我们首先提供一个窗口让读者了解服务网格的功能，然后在第二部分，展望在不久的会有何收获。

关于服务网格，有一件重要的事情需要知道：那就是一旦微服务开始流行起来，服务网格基本上就变得不可避免了。这是因为本质上，它们运行并作为平台来解决服务之间通信的日益复杂的挑战。

它们是这样工作的：假设你有一个微服务用来在客户数据库中查找支付方式，另一个来处理支付流程。如果你想确保信息不会泄露，或者你要将客户信息关联到正确的支付处理程序，那么你需要对它们之间的通信进行加密。服务网格可以处理加密而不需要任何一个服务知道如何加密。

服务网格的作用远不止于此。总的来说，它们负责广泛的核心通信，包括：

- 可观测性——在服务之间提供日志和度量数据
- 发现——使服务连接在一起能够彼此发现
- 通信——建立通信策略、方法和安全
- 认证——建立服务和通信的访问权限
- 平台支持——提供跨多个后端（Azure、AWS等）和编排（Kubernetes、nginx等）的能力

你可以看到它对开发人员的吸引力——在每次构建微服务时，服务网格会处理掉他们不愿处理的所有事情。对系统管理员和部署团队来说也是福音：他们不必为想把需要的功能构建到特定的微服务而与开发人员讨价还价。而且，至少在理论上客户也会从中受益，因为他们可以更快地部署为市场定制的服务。

考虑到这些优势，服务网格做到这一点将成为必然。一开始人们创造自己的通信网络。不久后公共的模式产生。统一的方法被整合在一起最终形成了平台解决方案。

两年前谷歌开源了自己的服务网格Istio。它不是第一个也不是最成熟的服务网格，但它是增长最快的，1.0版本的发布标志着服务网格开启了新的篇章。

再次引用TechCrunch的文章：“如果你不看好服务网络，这可以理解，的确有些人不看好他”。尽管目前情况是这样，但因为上述原因，我们认为这种情况很可能会改变。这就是为什么我们VMware花了大量的时间和精力在服务网格的开发上。

在姊妹篇的第2部分，将讲述如何在VMware如何开发开源的服务网格，并描述我们认为架构在成熟后所面临的主要问题。

请继续在[Open Source Blog](https://blogs.vmware.com/opensource/)关注我们的服务网格系列的第二部分 ，并在Twitter上关注我们（@vmwopensource）。
