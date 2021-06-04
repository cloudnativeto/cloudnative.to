---
title: "Linkerd 2.0 GA版本发布"
date: 2018-09-19T10:18:54+08:00
draft: false
image: "/images/blog/00704eQkgy1fven1sgw0kj32pa210am1.jpg"
author: "Kristen Evans"
authorlink: "https://www.cncf.io/author/kevans/"
translator: "[宋净超](https://jimmysong.io)"
originallink: "https://www.cncf.io/blog/2018/09/18/linkerd-2-0-in-general-availability/"
description: "Linkerd 2.0版本为Linkerd带来了性能、资源消耗和易用性方面的显着改进。它还将项目从集群范围的service mesh转换为可组合的service sidecar，旨在为开发人员和服务所有者提供在云原生环境中成功所需的关键工具。"
tags: ["linkerd","service mesh"]
categories: ["Service Mesh"]
keywords: ["service mesh","服务网格","linkerd"]
type: "post"
avatar: "/images/profile/default.jpg"
---

![Linkerd](006tNbRwgy1fven4mbx0kj30db02xmxa.jpg)

本文为翻译文章，[点击查看原文](https://www.cncf.io/blog/2018/09/18/linkerd-2-0-in-general-availability/)。

今天，[云原生计算基金会](https://www.cncf.io/)（CNCF）和[Linkerd的维护者](https://linkerd.io/)很高兴地宣布Linkerd 2.0 GA发布。

2.0版本为Linkerd带来了性能、资源消耗和易用性方面的显着改进。它还将项目从集群范围的service mesh转换为可组合的 *service sidecar* ，旨在为开发人员和服务所有者提供在云原生环境中成功所需的关键工具。

2016年，Linkerd [由Buoyant](https://www.cncf.io/blog/2017/01/23/linkerd-project-joins-cloud-native-computing-foundation/)创始人William Morgan和Oliver Gould发布，[于2017年初捐献给CNCF](https://www.cncf.io/blog/2017/01/23/linkerd-project-joins-cloud-native-computing-foundation/)。从那时起，该项目经历了快速增长，现在为全球各种应用程序生态系统提供支持，从卫星成像到支付处理再到人类基因组计划。

Linkerd 2.0的service sidecar设计使开发人员和服务所有者能够在他们的服务上运行Linkerd，提供自动可观察性、可靠性和运行时诊断，而无需更改配置或代码。通过提供轻量级的增量路径来获得平台范围的遥测、安全性和可靠性的传统service mesh功能，service sidecar方法还降低了平台所有者和系统架构师的风险。

## 值得注意的发布亮点

- 独立的“service sidecar”设计，无需集群范围的安装即可增强单一服务。
- 集群范围service mesh的增量路径，跨多个服务的service sidecar链接成为service mesh。
- 安装过程零配置，零代码更改。
- 自动Grafana仪表板和Prometheus监控服务“黄金指标”。
- 服务之间的自动TLS，包括证书生成和分发。
- Rust中完整的代理重写，在延迟，吞吐量和资源消耗方面产生了数量级的改进。

## Service Sidecar、Service Owner和Service Ops

“随着2.0发布，社区重点关注’service ops’的概念，即服务所有者不仅负责构建服务，还负责部署服务、维护服务，如果服务中断会所有者要在凌晨3点醒来， “Linkerd的核心维护者，Buoyant的首席技术官Oliver Gould说道。“服务所有者是我们正在构建的所有这些平台技术的最终客户，我们希望直接满足他们的需求。”

云原生计算基金会首席运营官Chris Aniszczyk表示：“自从Linkerd加入CNCF以来，我们已经看到Linkerd以惊人的速度增长，现在它每天处理数十亿的生产请求。” “从1.0到2.0的迁移路径是服务和平台所有者协同工作的重大进步，我们期待看到它如何更深入地集成到云原生用户社区中。”

该项目的贡献者和最终用户社区现在涵盖了数十个组织，包括Salesforce、Walmart、Comcast、CreditKarma、PayPal、WePay和Buoyant。

“在Linkerd 2.0之前，对于服务我所拥有的只是我的公共API的统计数据。现在，我可以在一个非常精细的层面上看到每项服务的表现，“Studyo的首席技术官兼联合创始人Pascal Bourque说道，Studyo为学校设计的任务和项目管理软件。“它可以无痛安装事实甚至更好。“

“在我们重新部署一项关键服务并转向Linkerd 2.0来诊断问题后，我们遇到了不稳定和延迟的问题，”专注于化妆品的社交商业公司Hush的CTO和联合创始人Will King说。“能够看到实时的请求和响应非常有用，远远超出我们的预期。我们现在使用Linkerd 2.0 tap进行所有容器服务调试。“

## 加入社区

Linkerd 2.0可以[在GitHub上下载](https://github.com/linkerd/linkerd2)，社区欢迎[新用户+贡献者](https://linkerd.io/2/getting-started/)。可以在[Slack](https://linkerd.slack.com/messages)、[Twitter](https://twitter.com/linkerd)和[邮件列表](https://lists.cncf.io/g/cncf-linkerd-users/topics)联系到Linkerd核心维护团队，也可以通过云原生社区的聚会和其他活动中联络。
