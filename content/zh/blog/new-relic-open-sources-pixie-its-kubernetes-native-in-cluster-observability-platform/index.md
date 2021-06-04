---
title: "New Relic 开源 Pixie，其 Kubernetes 原生集群内观察平台"
date: 2021-05-06T02:04:05+08:00
draft: false
image: "/images/blog/pixie.jpg"
author: "[Steven J. Vaughan-Nichols](https://www.zdnet.com/article/new-relic-open-sources-pixie-its-kubernetes-native-in-cluster-observability-platform/)"
translator: "[宋净超（Jimmy Song）](https://jimmysong.io)"
description: "想知道你的 Kubernetes 集群中到底发生了什么？刚刚成为云原生计算基金会项目的 Pixie 可以提供帮助。"
tags: ["可观察性","New Relic","Pixie"]
categories: ["可观察性"]
keywords: ["可观察性"]
type: "post"
---

本文译自 ZDNet 的文章 [New Relic open sources Pixie, its Kubernetes-native in-cluster observability platform](https://www.zdnet.com/article/new-relic-open-sources-pixie-its-kubernetes-native-in-cluster-observability-platform/)，译者[宋净超](https://jimmysong.io)。

---

好消息是，云计算、[Kubernetes](https://kubernetes.io/) 和云原生计算结合在一起，使软件开发比以前更快、更强大。坏消息是，保持对所有这些的关注比以往任何时候都更难。这就是为什么 [New Relic](https://newrelic.com/) 将其 Kubernetes 原生集群内观察平台 [Pixie](http://px.dev/) 作为一个新的开源项目，在 [Apache 2.0 许可](https://www.apache.org/licenses/LICENSE-2.0)下贡献给[云原生计算基金会（CNCF）的](https://www.cncf.io/)原因，这是一个好消息。

Pixie 是一个新的云原生应用程序的可观察性平台。有了它，开发人员可以通过一个 shell 命令看到他们应用程序的所有指标、事件、日志和追踪。有了 Pixie，你不需要添加度量（instrumentation ）代码，设置临时仪表板，或将数据移出集群，就能看到正在发生的事情。这将为你节省宝贵的时间，这样你就可以致力于建立更好的软件，而不是用更好的方法来监控它。

该程序作为一组 Kubernetes 服务部署在被监控的集群内。简而言之，Pixie 是一个原生的 Kubernetes 程序。它的 Pixie 边缘模块（PEM）被部署为 DaemonSet。在你的集群内，PEM 利用 Pixie 的 [eBPF](https://lwn.net/Articles/740157/) 程序来收集网络事务和系统指标，而不需要修改代码。

[亚马逊网络服务（AWS）](https://aws.amazon.com/)可观察性服务总经理 Mark Carter 补充说：“有了 [eBPF](https://newrelic.com/blog/best-practices/what-is-ebpf)，即 Pixie 平台支持的 Linux 中的新度量能力，开发和运维可以利用一种新的可观察性的超级力量。”

这是非常方便的。正如 New Relic 总裁 Bill Staples 在博客中所说。“这些[云原生环境](https://newrelic.com/blog/nerd-life/open-source-observability-pixie)的动态、分布式性质[带来了一系列新的可观察性挑战](https://newrelic.com/blog/nerd-life/open-source-observability-pixie)。我们相信开源的、社区驱动是解决这些挑战的最好方法”。因此，通过使用 [OpenTelemetry 作为度量化标准](https://opensource.newrelic.com/projects/open-telemetry)，分析和故障排除都变得更加容易。

Staples 继续说道。“通过一个命令，你可以点亮你的整个云环境并立即获得遥测数据。我们相信所有的开发者都应该获得这种惊人的开发者体验，它可以减少观察的摩擦，节省宝贵的时间以用来开发更好的软件。为了实现这一目标，我们还将 Pixie 的大部分工程资源投入到这个开源项目中。”

展望未来，New Relic 公司 Pixie 和 New Relic 开源部总经理、最近收购的 [Pixie 实验室](https://pixielabs.ai/)的首席执行官兼联合创始人 Zain Asgar 说，“开源是 New Relic 和 Pixie 的决定性价值，这就是为什么我们正在用 OpenTelemetry 对我们的可观察性产品进行标准化，并正在将 Pixie 作为一个开源项目进行贡献。我们已经亲眼看到了开放治理对开源项目的积极影响，我们期待着通过我们在 CNCF 的 [新] 白金会员资格，在全行业范围内支持这一倡议。”

[Pixie 开源现在也将在 AWS 上运行](https://aws.amazon.com/blogs/opensource/gathering-insights-on-kubernetes-applications-services-and-network-traffic-with-pixie)，作为 OpenTelemetry 项目的一个安全的、可生产的、由 AWS 支持的发行版。

CNCF 总经理 Priyanka Sharma 欢迎 New Relic 加入该组织。“我们很高兴欢迎 New Relic 成为白金会员和 Zain Asgar 加入我们的董事会。Zain 和 New Relic 对推进我们的使命和支持我们的社区的承诺将有很大的帮助。我们特别期待着他们在可观察性方面细致入微的专业知识和观点”。