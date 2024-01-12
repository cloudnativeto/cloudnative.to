---
title: "OpenTelemetry 的最新进展及其对可观测性的影响"
summary: "OpenTelemetry 是一个标准化观测性和遥测数据格式的项目，支持多种工具的互操作。本文介绍了该项目的新特性，如新的转换语言、日志支持和自动化修复能力。"
authors: ["TheNewStack"]
translators: ["云原生社区"]
categories: ["可观测性"]
tags: ["可观测性","OpenTelemetry"]
date: 2024-01-12T08:00:00+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://thenewstack.com/why-the-latest-advances-in-opentelemetry-are-significant
---

本文译自 [Why the Latest Advances in OpenTelemetry Are Significant](https://thenewstack.io/why-the-latest-advances-in-opentelemetry-are-significant/)。

摘要：OpenTelemetry 是一个标准化观测性和遥测数据格式的项目，支持多种工具的互操作。本文介绍了该项目的新特性，如新的转换语言、日志支持和自动化修复能力。

---

今年，在[云原生计算基金会（Cloud Native Computing Foundation）](https://cncf.io/?utm_content=inline-mention)中，一个备受关注的项目是[OpenTelemetry](https://thenewstack.io/observability-in-2024-more-opentelemetry-less-confusion/)和[OpenTelemetry Collector](https://thenewstack.io/how-the-opentelemetry-collector-scales-observability/)。这个项目是观测领域的一个非常令人兴奋的运动，旨在跨行业合作，达成观测和遥测的标准数据格式。

这本身就非常重要，因为它允许多个观测和分析工具进行互操作，而以前的团队如果想要一个工具与另一个工具进行互操作，就必须多次转换数据。随着观测领域围绕人工智能/机器学习的炒作，公司更有可能从一个系统中存储和查看数据，然后在另一个系统中进行机器学习模型的训练。

更棒的是，由于行业供应商和个人在[OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)上合作，这个项目继续不断发展。它是一个标准化的代理和遥测收集器，提供高吞吐量的遥测数据收集和分析。该收集器已经支持跟踪和度量数据一段时间了，但直到去年的[KubeCon Detroit 2022](https://thenewstack.io/kubeconcloudnativecon-2022-rolls-into-detroit/)，社区才吸纳了 OpenLogs 项目，并开始实施日志收集和分析功能。现在，日志支持已经完全成熟。

在接下来的部分中，我将分享一些关于这个项目的新特性以及它们对社区的重要性。

## 1. 新的转换语言

我发现许多代理的语法使得进行有意义的转换非常困难，需要使用一些奇怪的 YAML 或 TOML。Otel Collector 仍然依赖于 YAML 格式，但它的新转换语言允许使用基于函数的语句，执行起来非常快速，可以管理复杂性。查看一些[语法示例](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/README.md)。

## 2. 日志正式发布

在大约一年的开发时间内，日志收集和分析现在已经正式发布。该实施有一些收集日志的方法：

- 首先，它作为一个独立的代理运行，并从文件系统收集日志。它可以直接发送到最终目的地，也可以转发到以收集器模式运行的 OpenTelemetry Collector，可以即时计算日志指标。
- 其次，存在许多日志 SDK，可以直接在应用程序中实施，并将日志发送到中央收集器或直接发送到最终目的地，这有助于减少磁盘 IO 的影响。

## 3. 自动仪器成熟度

自动仪器是自动将应用程序连接到发出跟踪和度量数据而无需或仅需进行最少代码更改的能力。Java 和.Net 得到了全面支持，其他语言正处于不同开发和发布阶段。这个功能是一些专有解决方案展示出来的特色，因为它通过减少开发人员的时间来降低部署复杂性，现在它将同样强大的功能带到了 OpenTelemetry 生态系统中。

## 4. 语义约定

这一点非常重要，并且正在从 ElasticSearch 向 OpenTelemetry 项目捐赠 ECS（Elastic Common Schema）而受益。规范化日志和遥测结构具有挑战性，因为似乎几乎每个人都以稍微不同的格式生成遥测数据；但要能够分析、创建警报并以人性化的方式呈现数据，所有遥测字段都需要以某种方式映射。如果每个人和每个系统都略有不同，那么在创建可重用的仪表板和组件方面就会出现挑战。现在，软件供应商可以负责在多个平台上创建仪表板，合理地确保数据将以多个平台上的正确格式进行发送。与此同时，我们管理大量遥测数据的人可以通过使用众所周知的字段名称来提高摄取和查询效率，并且在大多数客户发送的内容依赖于这些字段名称时，可以提供更高级的功能，同时减少计算资源和内存开销。

完整的架构仍然需要一段时间才能最终确定，但逐步正在批准这些约定。例如，在 KubeCon 上，他们宣布了 HTTP 架构的最终确定。

## 5. 插件框架和生态系统

生态系统正在不断成熟。可扩展性框架允许自定义任何摄取管道

的任何阶段。有越来越多的接收器用于各种系统，处理器具有越来越先进的功能，目标也在增加。我特别对新版本的 OpenSearch 扩展感到兴奋，它可以发送预打包在简化的遥测或 ECS 格式中的日志数据。

从开发者的角度来看，我发现模式和内部“p”消息模式的结构非常周到，内置了 protobuf。它在功能自由度和最小复杂度之间有一个良好的平衡。

## 6. 社区合作

这对于 CNCF 社区来说并不是很新鲜，但这个项目的速度和影响体现了 CNCF 社区哲学的精神。竞争公司正在共同努力，使计算的一部分变得更好、更容易，以造福我们其他人。有些人可能担心去除供应商锁定会导致客户离开，或者共享代码可能泄漏专有 IP。

然而，在遥测领域，代理和收集器的核心架构通常是已解决的问题。那么为什么不制作一些遵循惯例并在各个平台上运行的东西，以便公司不再必须维护代理代码，其中 80% 都是重复的呢？这使公司可以在互操作性和创新可以通过这个框架传递的专有处理器方面共同开发插件。好处也延伸到所有运营商和软件供应商。借助标准化的 Otel Collector SDK，供应商可以创建一个单一的集成来为其应用程序添加遥测，并极大简化了收集过程，试图让所有主要的观测提供商为你的应用程序实施支持。

运营商也从“随处收集”和“随处发送”的理念中受益。通过标准的配置文件格式简化了设置，减少了新系统的引入复杂性。我还怀疑，许多日志系统的运营商在观测数据的语义约定项目减少了许多问题后，将大大减少字段映射的基数问题。

## 总结

向所有项目贡献者和社区成员表示衷心的“感谢”！这里有太多人要列出来了，但你可以在[GitHub 上的 OpenTelemetry 项目](https://github.com/open-telemetry/community/blob/main/community-members.md)上找到他们。

OpenTelemetry 和 OpenTelemetry Collector 的功能和未来路径正在以极快的速度前进，过去一年是 CNCF 组合中贡献第二多的项目，仅次于 Kubernetes。有这么多贡献者保持组织和合作，成熟度将继续加速。这将有望通过增加互操作性并简化仪表系统的仪器化过程来促进观测领域的创新。
