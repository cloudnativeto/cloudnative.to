---
title: "Knative 1.0 发布了！"
date: 2021-11-08T06:37:00+08:00
summary: "今天我们发布了 Knative 1.0，达到了一个重要的里程碑，这要归功于 600 多名开发者的贡献和合作。"
authors: ["Knative"]
translators: ["宋净超"]
categories: ["serverless"]
tags: ["knative", "serverless"]
---

作者：[Carlos Santana ](https://twitter.com/csantanapr)(IBM)、[Omer Bensaadon ](https://twitter.com/omer_bensaadon)(VMware)、[Maria Cruz ](https://twitter.com/marianarra_)(Google)，原文发布于 [Knative 官方博客](https://knative.dev/blog/articles/knative-1.0/)。

今天我们发布了 Knative 1.0，达到了一个重要的里程碑，这要归功于 600 多名开发者的贡献和合作。Knative 项目是由谷歌在 2018 年 7 月发布的，并与 VMWare、IBM、Red Hat 和 SAP 紧密合作开发的。在过去 3 年中，Knative 已经成为 [Kubernetes 上最广泛安装的无服务器层](https://www.cncf.io/wp-content/uploads/2020/11/CNCF_Survey_Report_2020.pdf)。

## 最新动态

如果你没有密切关注 Knative 的发展，自从我们在 2018 年 7 月首次发布以来，已经有很多变化。

除了无数的错误修复、稳定性和性能增强之外，我们的社区还按时间顺序进行了以下改进：

- 支持多个 HTTP 路由层（包括 Istio、Contour、Kourier 和 Ambassador）
- 支持多个存储层的事件概念与常见的订阅方法（包括 Kafka、GCP PubSub 和 RabbitMQ）
- “鸭子类型 " 的抽象，允许处理具有共同字段（如 status.conditions 和 status.address）的任意 Kubernetes 资源
- 支持额外功能插件的[命令行客户端](https://knative.dev/docs/client/install-kn/)
- 6 周一次的定期发布流程
- 支持 HTTP/2、gRPC 和 WebSockets
- Broker 和触发器，以简化事件的发布和订阅，同时将生产者和消费者解耦
- 支持事件组件向非 Knative 组件传递，包括集群外组件或主机上的特定 URL
- 支持自动提供 TLS 证书（通过 DNS 或 HTTP01 挑战）
- 为活动目的地定制交付选项，包括对无法交付的信息进行重试和 dead-letter 排队
- 对 Broker 和 Channel 的事件追踪支持，以改善调试工作
- 由 Knative Build 催生的 [Tekton 项目](https://tekton.dev/)
- 并行和序列组件，用于编纂某些复合事件的工作流程
- 事件源的文档以及如何贡献说明，目前涵盖了大约 40 个不同的事件源
- “Hitless" 的升级，在小版本发布之间没有放弃的请求
- 重新设计服务的 API，以匹配部署、CronJob 等使用的 PodTemplateSpec，以简化 Kubernetes 用户的使用
- 支持将事件目的地地址注入 PodTemplateSpec 的对象中
- 支持基于并发量或 RPS 的水平 Pod 自动扩展
- 使用领导者选举片的控制平面组件的高可用性
- 一个帮助管理员安装 Knative 的 Operator
- 快速入门，供开发者在本地试用 Knative
- 使用 DomainMapping 简化服务的管理和发布

## 1.0 意味着什么？

Knative 是由许多组件组成的，这些组件的版本是一起分布的。这些组件有不同的成熟度，从“实验性 " 到“已经 GA”(Generally Available)。我们仍然希望保持版本的同步，因此决定将所有的组件转移到 1.0 版本。GA 级别会单独标记组件。

### 为什么要一次把所有的组件移到 1.0？

两个原因：一个是面向用户的，一个是面向贡献者的。主要是面向用户的原因是，它给用户提供了一个单一的数字，让他们在了解他们所安装的东西和哪些东西可以一起使用时，可以挂在上面。次要的面向贡献者的原因是，我们所有的基础设施都是为了管理一个单一的版本号而设计的，更新它以支持多个版本号似乎不是很好地利用时间。

### 一个组件既是“1.0" 又是“Beta”岂不是很混乱吗？

除非我们等待与 Knative 有关的所有事情都完成，否则我们总会有一些组件或功能处于 alpha 或 beta 状态。虽然这种情况有时会沿着组件的边界发生，但它也可能发生在一个组件内部，所以版本号不能作为“GA 与否 " 的唯一指标。(这种情况也发生在其他项目上，如 Kubernetes，以及 Serving 或 Eventing 中的特定功能）。

展望未来，该项目将清楚地了解各种组件或功能的成熟度，并将功能沿着 GA 或退役的路线移动。

## 了解更多

Knative 指导委员会成员 Ville Aikas 是[本周谷歌 Kubernetes 播客的嘉宾](https://kubernetespodcast.com/episode/166-knative-1.0/)，他讲述了该项目创建的故事以及它的 1.0 之旅。你也可以参加 [11 月 17 日的 Knative 社区聚会](https://calendar.google.com/calendar/u/0/r/eventedit/NnAycjJyZmdlMTF1b2FuOGJzZjZ1dXA0aTZfMjAyMTExMjRUMTczMDAwWiBrbmF0aXZlLnRlYW1fOXE4M2JnMDdxczViOXJyc2xwNWpvcjRsNnNAZw?tab=mc)，届时 Ville 将谈论项目的最新变化。

## 参与其中

Knative 社区随时欢迎新成员的加入。[加入 Knative Slack 空间](https://slack.knative.dev/)，在熟悉项目的过程中提出问题并排除故障。最后，在 Knative 网站上找到所有的[项目文档](https://knative.dev/docs/)，并[在 GitHub 上为该项目做出贡献](https://github.com/knative)。

## 感谢我们的贡献者

实现这一里程碑确实是一个社区的努力–我们不能不感谢一些帮助我们走到今天的人。感谢…

- 支持 Knative 的公司，包括：
  - 谷歌（他们还赞助了我们的网站和测试基础设施，并每月举办社区聚会）
  - IBM
  - 红帽
  - SAP
  - TriggerMesh
  - VMWare
  - [以及更多](https://knative.teststats.cncf.io/d/5/companies-table?orgId=1&var-period_name=Last_decade&var-metric=contributions)
- 我们的[技术监督委员会](https://github.com/knative/community/blob/main/TECH-OVERSIGHT-COMMITTEE.md)、[指导委员会](https://github.com/knative/community/blob/main/STEERING-COMMITTEE.md)和[商标委员会](https://github.com/knative/community/blob/main/TRADEMARK-COMMITTEE.md)的成员
- 所有 Knative 的贡献者，过去和现在的
