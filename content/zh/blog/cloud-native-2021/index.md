---
title: “寒武纪大爆发” 之后的云原生，2021 年走向何处？
description: "本文为应 CSDN《云原生人物志》栏目专访，知微见著，窥见云原生价值与趋势。"
author: "[宋净超（Jimmy Song）](https://jimmysong.io)"
image: "images/blog/2021.jpg"
categories: ["cloud native"]
tags: ["cloud native"]
date: 2021-01-28T11:03:00+08:00
type: "post"
avatar: "/images/profile/jimmysong.jpg"
profile: "云原生社区创始人，[Tetrate](https://tetrate.io) 布道师。"
---

很荣幸收到 CSDN 的邀请，接受” 云原生人物志 “专栏采访，其实我从 2017 年起就已经在撰写 [Kubernetes 和云原生年度总结和新年展望](https://jimmysong.io/kubernetes-handbook/appendix/kubernetes-and-cloud-native-summary-in-2017-and-outlook-for-2018.html)，今天在此聊抒己见，欢迎大家讨论和指正。

## 云原生在演进

云原生是一种行为方式和设计理念，究其本质，凡是能够提高云上资源利用率和应用交付效率的行为或方式都是云原生的。云计算的发展史就是一部云原生化的历史。Kubernetes 开启了云原生 1.0 的序幕，服务网格 Istio 的出现，引领了后 Kubernetes 时代的微服务，serverless 的再次兴起，使得**云原生从基础设施层不断向应用架构层挺进**，我们正处于一个云原生 2.0 的新时代。

## 业界动向

最近国内的一些云厂商，如阿里云、腾讯云、华为云陆续发布了各自的云原生相关的架构和实践白皮书。

- 2020 年 7，中国信通院发布了《云原生产业白皮书（2020）》。
- 2020 年 12 月 20 日，在腾讯 2020 Techo Park 开发者大会上，腾讯云正式发布了《云原生最佳实践路线图》，同时发布的还有一份 3 万多字的《腾讯云原生路线图手册》。
- 2020 年 12 月 23 日，阿里云原生实战峰会上发布了《云原生架构白皮书》。
- 2020 年 12 月 30 日，华为云在深圳的 TechWave 云原生 2.0 技术峰会上联合 Forrester 发布了《云原生白皮书：拥抱云原生优先战略》。
- 2021 年初，阿里巴巴达摩院发布 2021 十大科技趋势，其中将 “云原生重塑 IT 技术体系” 作为 2021 年技术预测之一。

## 云原生项目的 “寒武纪大爆发”

云原生已历经” 寒武纪大爆发 “，标志是从 2018 年 Kubernetes 毕业 后走向深耕路线。云原生领域的开源项目层出不穷，令人眼花缭乱，见我收集的 Awesome Cloud Native。

![](https://tva1.sinaimg.cn/large/008eGmZEly1gn37vq5g81j30q906dmyk.jpg)

2020 年 CNCF 共接纳了 35 个项目加入基金会，并且有多个项目毕业或晋级，CNCF 托管的项目总数达到了 80 多个。

![](https://tva1.sinaimg.cn/large/008eGmZEly1gn37weeu5lj30q90ivalh.jpg)

图片来自 CNCF 年度报告 2020

## 云原生之争实际上是标准之争

PC 端操作系统 Windows 占据上风，移动端是 iOS 和 Android，服务器端是 Linux，而云计算商用分布式操作系统呢？答案是 Kubernetes。

2020 年 Kubernete 宣布将[在 v1.20 版本之后弃用 Docker](https://blog.csdn.net/csdnnews/article/details/110520682)，实际上 Docker 本来就不是 Kubernetes 中默认和唯一的的容器运行时了，实际上只要是支持 CRI（Container Runtime Interface）或 OCI（Open Container Initiative）标准的容器运行时都可以在 Kubernetes 中运行。如下图所示，容器，英文是 container，也是集装箱的意思，其实集装箱不止一种型号，根据运送的货物的不同特性可以制定了多种集装箱类型。而这个容器类型是标准只能是由 Kubernetes 来定，否则只能是削足适履。

![](https://tva1.sinaimg.cn/large/008eGmZEly1gn38p94t5sj30q90enq52.jpg)

Kubernetes 统一了云上的资源对象制定和调度的标准，只要在其标准之上开发 CRD 和 Operator 即可。但是这也仅限于单个应用的管理，如何管理复杂的多集群和混合云环境，如何管理应用间流量，如何如何保证调用链的安全？以 Istio 为代表的服务网格就是为了解决这个问题。

## 云原生趋势：云上应用管理

Kubernetes 奠定了云原生基础设施的基础，随着而来的监控、存储、AI、大数据等技术的迁移，从单个应用层面来说已经日趋成熟，而在**使用云原生架构尤其是对云上应用的管理**，而在异构环境、多集群、混合云等已成为常态的情况下，**如何对云上的应用进行管理，成为棘手的事情**。

Kubernetes 以其开创新的声明式 API 和调节器模式，奠定了云原生的基础。我们看到 Google 的项目 Anthos，Azure 的 Arc，AWS 最近开源的 EKS-D，它们都是着重在混合云管理，让云无处不在。另外，服务网格（Service Mesh）经过两年的推广和发酵，将会看到越来越多的应用。

## 云原生与开源社区

目前**企业云原生化转型最缺乏的东西 —— 套路和组合拳**。对于基础软件，企业往往会选择开源项目并根据自身需求进行改造，而云原生的开源项目又有很多，企业不是没有选择，而是选择太多，以致于无从下手。就像下面教你如何画猫头鹰的示例。我们可以将企业的云原生化的愿景想象成是这只猫头鹰，这些开源项目就像步骤一中圆，你可能想当然的认为只要用了 Kubernetes 就是云原生了，这就像画了两个圆，而剩余部分没有人教你如何完成。

![](https://tva1.sinaimg.cn/large/008eGmZEly1gn37vqshfnj30q90hh44y.jpg)

开源社区的核心是面向开发者，就是向开发者灌输如何来画好这只 “猫头鹰” 的。开源不意味着免费和做慈善，使用开源也是有代价的。**开源社区存在的意义是平衡开发者、终端用户及供应商之间的共同利益**，而一个中立的开源社区有利于发挥开源的生态优势。

近年来随着云原生大热，在美国诞生了大量该领域的初创公司，他们基于 AWS、谷歌云、Azure 等提供各种云原生的解决方案，从每次 KubeCon 的赞助商规模上就可以窥知一二。国内该领域的公司目前还不多，而云原生终端用户社区的公司规模上依然跟国外的公司数量有不小的差距。

云原生社区就是在这样的背景下于 2020 年初由我发起，开始筹备并在 5 月 12 号正式成立，致力于推广云原生技术，构建开发者生态。云原生社区采取 SIG（特别兴趣小组）和 WG（工作组）的组织形式，基于开源项目和不同的专业领域构建研讨组，与厂商合作定期举办线下 meetup，并邀请社区的专家们定期在 B 站的云原生学院进行直播。

## 总结

开源应该关注的是终端用户和开发者生态，用 Apache Way 来说就是 “社区大于代码”，没有社区的项目是难以长久的。因此我们可以看到国内一些云厂商开源项目之后也会积极投入运营，举行各种各样的活动。我们看到在云原生的推广过程中，CNCF 起到的相当大的作用，2020 年国内也有类似的基金会成立，我们希望看到更多中立的基金会和社区的成立，更多的厂商参与其中，为终端用户提供更佳的解决方案。

最后感谢 CSDN 宋慧编辑和 「CSDN 云计算」的邀请。

往期报道见：

- [梁胜：做开源项目的贡献者没有意义](https://blog.csdn.net/csdnnews/article/details/112293560)
- [华为云 CTO 张宇昕：云原生已经进入深水区](https://blog.csdn.net/FL63Zv9Zou86950w/article/details/110433443)
- [APISIX 温铭：开源的本质是要拿开发者的杠杆](https://blog.csdn.net/csdnnews/article/details/110508201)

## 个人介绍

在我的职业生涯里先后从事过 Java 开发、大数据运维、DevOps、开源管理等工作，个人爱好是研究并推广开源技术及理念，摄影和旅行。目前在企业级服务网格初创公司 Tetrate 担任 Developer Advocate，同时作为中立的云原生终端用户社区 —— 云原生社区（Cloud Native Community）的负责人。

我的整个职业生涯都是与开源息息相关的，渊源可以追溯到大学时期。大学时我就开始使用 Linux 系统（Ubuntu）学习，刚进入职场的时候面向的也是 Hadoop 的开源生态及各种开源中间件，2015 起开始接触 Docker，2016 年开始进入云原生领域，2017 年开始写 Kubernetes 领域的第一本开源中文电子书《[Kubernetes Handbook——Kubernetes 中文指南 / 云原生应用架构实践手册](https://github.com/rootsongjc/kubernetes-handbook)》，本书直到如今仍在更新，2018 年在蚂蚁集团做开源管理及服务网格社区 ServiceMesher，2020 年加入基于 Istio、Envoy 和 Apache SkyWalking 等开源项目而构建企业级服务网格的初创公司 Tetrate。

