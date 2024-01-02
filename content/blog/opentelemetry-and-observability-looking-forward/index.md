---
title: "OpenTelemetry 与可观测性：展望未来"
summary: "本文展望 2024 年可观测性的发展。"
authors: ["TheNewStack"]
translators: ["云原生社区"]
categories: ["可观测性"]
tags: ["可观测性","OpenTelemetry"]
date: 2024-01-02T08:00:00+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://thenewstack.io/opentelemetry-and-observability-looking-forward/
---

本文译自：[OpenTelemetry and Observability: Looking Forward](https://thenewstack.io/opentelemetry-and-observability-looking-forward/)

让我们探讨一些令人兴奋的趋势，考虑到我们期待 2024 年会有什么样的可观测性发展。

随着年底的临近，现在是一个停下来思考的好时机。2023 年对于 OpenTelemetry 来说是一个里程碑，因为其三个基本信号，跟踪、度量和日志，都达到了稳定版本。这一成就标志着[OpenTelemetry](https://thenewstack.io/opentelemetry-gaining-traction-from-companies-and-vendors/)最初愿景的实现，即提供一个基于标准的框架，用于仪器化和收集可观测性数据。

让我们抓住这个机会，探讨一下我们所见证的一些令人兴奋的趋势，深入研究创新的产品和用例，并在期待 2024 年的到来时深思熟虑地考虑可观测性的不断演变。

## 度量标准的崭露头角

尽管 OpenTelemetry 关于度量的规范在 2022 年 5 月被宣布为稳定版本，但今年看到了其被广泛采用。以下是一些从业者的文章：

- 由 VMware 的 Matthew Kocher 和 Carson Long 撰写的文章，标题为“[体验报告：在 Cloud Foundry 中采用 OpenTelemetry 进行度量](https://opentelemetry.io/blog/2023/cloud-foundry/)”。
- 我们自己的 Matheus Nogueira 撰写的文章，标题为“[在你的 Go 应用程序中添加 OpenTelemetry 度量](https://tracetest.io/blog/adding-opentelemetry-metrics-in-your-go-app)”。

展望 2024 年，可以预期会看到类似的日志运动和采用。

## 关注在负载测试中使用分布式跟踪

2023 年，两个领先的负载测试工具，[Grafana k6](https://k6.io/)和[Artillery.io](https://artillery.io/)，都添加了对 OpenTelemetry 的支持。

- Grafana k6 [引入了跟踪](https://github.com/grafana/xk6-distributed-tracing)功能，使性能工程师能够在[负载测试](https://thenewstack.io/trace-based-testing-the-next-step-in-observability/)期间识别系统瓶颈或故障。
- Artillery.io 随后也[添加了度量和分布式跟踪](https://www.artillery.io/blog/introducing-opentelemetry-support)，提供了对系统性能更详细的分析。

Tracetest 利用了 k6 测试中暴露的功能，以[启用基于跟踪的负载测试](https://docs.tracetest.io/tools-and-integrations/k6)，在运行测试时进行深入的断言。我们已经看到许多客户广泛使用了这个功能，比如[Sigma Software](https://tracetest.io/case-studies/how-sigma-software-built-load-testing-for-their-microservices-with-k6-tracetest)。在 2024 年，Tracetest 团队将考虑将这一能力添加到[Artillery.io](http://artillery.io/)和其他负载测试工具中。

## OpenTelemetry 的支持和用例扩展

越来越多的供应商正在采用 OpenTelemetry 标准，以支持典型但非常重要的遥测数据分析之外的行动。

- 一些公司，比如[Tyk 正在仪器化其 API 网关，以原生支持 OpenTelemetry](https://opentelemetry.io/blog/2023/tyk-api-gateway/)。
- 终端用户正在发现 OpenTelemetry 的新用例，比如[使用分布式跟踪来观察你的 CI/CD 流水线](https://thenewstack.io/how-to-observe-your-ci-cd-pipelines-with-opentelemetry/)。
- [Tracetest](https://tracetest.io/)利用分布式跟踪数据进行集成和端到端测试。

## 强调 OpenTelemetry 收集器

[OpenTelemetry 收集器](https://thenewstack.io/how-adobe-uses-opentelemetry-collector/)位于 OpenTelemetry 世界的中心，接收来自应用程序的信号，处理和转换这些信号，然后将它们导出到任意数量的后端系统。随着对 OpenTelemetry 的集成和供应商支持的扩展，对这个集中式收集器的需求和要求也在增加。

2023 年引入了 OpenTelemetry Transformation Language (OTTL)，增强了 OpenTelemetry 收集器处理和转换传入信号的能力。

在 Tracetest 中，我们能够利用[在过滤器处理器中使用 OTTL](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md)的能力，改进了我们从输出大量遥测数据的生产环境中收集跟踪数据的方式。这一变化对[OpenTelemetry 收集器的过滤器处理器](https://tracetest.io/blog/opentelemetry-collectors-new-filter-processor)使 Tracetest 适用于在高负载环境中运行测试，包括生产环境。

## 无处不在的可观测性

在最近的讨论中，我们发现了一种客户中不断增长的趋势，即“无处不在的可观测性”方法。这些公司不仅限于由网站可靠性工程师和 DevOps 传统使用，还包括了每个人，包括开发人员和测试人员，参与到可观测性中。这种转变重新定义

了可观测性，使其从生产问题的一种反应性工具变成了在开发和测试中都有益的一种主动工具。

[Honeycomb](https://www.honeycomb.io/)强调了[在开发过程中使用可观测性](https://www.honeycomb.io/blog/observability-driven-development)，而像[Digma.ai](http://digma.ai/)和 Tracetest 这样的工具正在推动这一前进。

## 浏览器

OpenTelemetry 的主要作用一直局限于仪器化后端系统，而基于开放标准的浏览器仪器化仍然是实验性的，进展缓慢。正在努力改进和标准化这种仪器化。

- [Uzufly](https://tracetest.io/case-studies/how-uzufly-built-end-to-end-testing-serverless-web-app-with-distributed-traces)在这方面脱颖而出。它使用现有的客户端仪器化来构建测试。展望未来，它的雄心是扩展基于跟踪的测试，以覆盖浏览器内部发起的前端操作所进行的测试。

这将实现前端和后端的全面端到端测试。请关注 2024 年更多关于这个主题的信息！

## 2023 已经过去

告别 2023，我们怀着热情期待 2024 年的到来。OpenTelemetry 具有势头，得到了标准和广泛采用的支持，推动了其增长。新的一年承诺带来令人兴奋的发展，围绕 OpenTelemetry 出现了创新的产品和用例。我迫不及待地想看到 2024 年将揭示的进步和创新。愿 OpenTelemetry 长存！