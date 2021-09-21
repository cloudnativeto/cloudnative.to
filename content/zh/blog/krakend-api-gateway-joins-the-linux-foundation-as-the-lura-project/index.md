---
title: "KrakenD API 网关更名为 Lura 项目并宣布加入了 Linux 基金会"
description: "这是一个 Go 语言编写的开源 API 网关，与其他 API 网关最主要的区别是它本身也是以微服务和无状态的方式工作。"
author: "[Mike Melanson](https://thenewstack.io/krakend-api-gateway-joins-the-linux-foundation-as-the-lura-project/)"
translator: "[宋净超（Jimmy Song）](https://jimmysong.io)"
image: "images/blog/lura.jpg"
categories: ["其他"]
tags: ["API Gateway"]
date: 2021-05-18T12:03:00+08:00
type: "post"
---

## 关于 Lura 项目

近日，[Lura 项目](https://www.luraproject.org/)，原名为 KrakenD 的开源框架，加入了 [Linux 基金会](https://training.linuxfoundation.org/training/course-catalog/)，根据一份新闻声明，“它将是唯一一个在中立、开放论坛中托管的企业级 API 网关”。

[KrakenD API 网关](https://www.krakend.io/)的联合创始人兼首席执行官 [Albert Lombarte](https://www.linkedin.com/in/alombarte/) 说，该项目现在每月活跃在 100 多万台服务器上。转到 Linux 基金会后，将技术放在了第一位，而不是企业公司的需求。

“我们是真正的开源信徒，我们相信开源是这个项目的归宿，“Lombarte 说。“我们已经看到，技术与 API 网关玩得不好，所采取的做法不是技术的最佳做法，“而是为了营销或销售产品的需要，为了锁定客户。“而我们希望能解放这一点，“他指出。

KrakenD API 网关建立在现在被称为 Lura 项目的基础上，Lombarte 解释说，KrakenD 是一个有主见的实现，即它注重速度而不是其他功能。Lura 是一个构建 API 网关的框架，可以根据企业的需求进行定制。它是为速度和可扩展性而设计的。Lombarte 说，Lura 用 Go 语言构建，是一个无状态、高性能的 API 网关框架，为云原生和内部设置而设计，无状态是一个区别点。

“如果你采取传统的 API 网关，你会发现配置是存储在数据库上的。我们没有任何形式的数据库，所以所有的配置都在一个静态的配置文件中，“Lombarte 说。" **如果你想改变网关的状态，你必须重新部署另一个版本的网关。它就像今天任何公司的任何微服务一样工作。这就是我们和有状态网关的主要区别。**”

此外，有状态网关的问题是可扩展性，Lombarte 说。“因为它们通常连接到一个数据库，而这个数据库是唯一的真实数据来源，所有的节点都需要协调。因此，如果你去找大客户，他们无法正常扩展，因为他们有一个瓶颈，那就是数据库。我们节点甚至不互相通信，所以它们可以线性地扩展到无限大。”

Lura 的另一个区别点是，其 API 网关超越了传统的 API 网关，**作为多个微服务的聚合器发挥作用，而不是简单地作为一个扩展的代理**。Lombarte 说，市场上的所有 API 网关都只是 “中间有共享关注点的代理”，API 调用到达一个单一的后端服务。相反，Lura 允许聚集许多后端服务，可以通过调用它创建的单一 API 端点到达，而且这些后端服务中的每一个实际上也可以提供不同的 API 类型。

“当你广泛地谈论 API 网关时，人们通常会想到 API 网关将授权请求，也许还有速率限制。这是每个人对 API 网关的理解，但这只是用其他东西进行代理，“Lombarte 说。“我们所做的是，我们创建一个新的 API，所以你不再消费你的后台，你在消费我们的 API 网关。这就像前端的一个后端。**我们比市场上任何其他 API 网关更接近 GraphQL**"。

Lombarte 说，如果你正在寻找这些强调速度的功能，那么 KrakenD 可能是正确的选择，但如果你需要专注于其他功能，那么 Lura 就可以帮助建立你需要的功能。他说，只需 20 到 30 行代码，你就可以使用 Lura 建立并运行一个 API 网关。eBay 和 Mail.ru 是目前使用 Lura 的两个大机构的例子。他说，这项技术提供了速度和无限的线性可扩展性，但也允许他们根据自己的需要定制 API 网关。

## 未来计划

在 Lura 捐赠给 Linux 基金会之后，Lombarte 说，Lura 2.0 预计将在不久的将来发布，路线图中的新功能是支持 GraphQL 和能够用自定义插件进一步扩展该项目。