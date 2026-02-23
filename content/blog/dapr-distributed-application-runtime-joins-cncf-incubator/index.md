---
title: "Dapr（分布式应用运行时）加入 CNCF 孵化器"
translators: ["敖小剑"]
date: 2021-11-04T02:37:00+08:00
summary: "CNCF 技术监督委员会（TOC）已经投票决定接受 Dapr 作为 CNCF 的孵化项目。"
authors: ["CNCF"]
categories: ["云原生"]
tags: ["Dapr", "CNCF"]
---

## 编者按

本文英文原文发布在 CNCF 官方博客 [Dapr (Distributed Application Runtime) joins CNCF Incubator](https://www.cncf.io/blog/2021/11/03/dapr-distributed-application-runtime-joins-cncf-incubator/) 上，译者敖小剑，宋净超参与了审校。另外云原生社区中也成立了 [Dapr 小组](https://cloudnative.jimmysong.io/community/sig/)，欢迎各位爱好者加入。

## 正文

CNCF [技术监督委员会](https://github.com/cncf/toc)（TOC）已经投票决定接受 Dapr 作为 CNCF 的孵化项目。

[Dapr](https://dapr.io/) 是一套使开发者能够轻松编写分布式应用的 API。无论是在 Kubernetes 还是其他环境中，Dapr 都是以 Sidecar 进程运行在应用程序旁边，为开发者提供了一套形式为 pub/sub、状态管理、秘密管理、事件触发器和服务间调用的安全而可靠的原语。在 Dapr 的帮助下，开发人员可以专注于构建业务逻辑而不是基础设施。

Dapr 维护者和指导委员会成员 Mark Fussell 说：“我听到开发者说 Dapr 如何缩短了他们在 Kubernetes 和其他托管平台上构建可扩展的分布式应用的时间，并解决了他们的业务需求，这对我产生了巨大的鼓舞。现在，随着 Dapr 成为 CNCF 的一部分，开发人员能够更容易地构建、使用和采纳云原生技术。”

该项目于 2019 年在微软创建。随着时间的推移，许多社区成员加入该项目并做出贡献，扩展并帮助它在 2021 年 2 月达到了稳定的 1.0 版本。今天，Dapr 技术指导委员会管理该项目，其代表来自阿里巴巴、英特尔和微软。

Dapr 维护者和指导委员会成员 Yaron Schneider 说：“我最自豪的是日益壮大的 Dapr 社区为项目贡献了新的 API 和构建块。我们在项目的 20 多个仓库中都有贡献，从我们的开发者工具和 SDK 到运行时本身。看到开发者来到这个项目并提出新的 API，帮助解决分布式系统的挑战，这是 Dapr 社区的重要成就。”

Dapr 和多个 CNCF 项目集成。例如，使用 gRPC 进行内部 sidecar 通信，为 ACL 创建 SPIFFIE 身份，以 OpenTelemetry 格式发出遥测数据，使用 Prometheus 进行指标收集，利用 CloudEvents 作为 pub/sub 消息格式，并使用 Operator 在 Kubernetes 上原生运行。

该项目被阿里云、Legentic、Tdcare、腾讯、Swoop Funding、Man Group、Zeiss [等组织](https://github.com/dapr/community/blob/master/ADOPTERS.md)在生产中使用。采用者在所有主流云供应商以及企业内部环境上运行 Dapr。

前阿里巴巴云的资深技术专家李响说：“在阿里云，我们相信 Dapr 将引领微服务开发的方向。通过采用 Dapr，我们的客户可以更快地建立可移植的、强大的分布式系统。”

Ignition 集团的首席数字化转型官 Russell Stather 说：“使用 Dapr 可以在不改变其他任何东西的情况下轻易的引入新的基础设施。它改变了我们的业务。”

蔡司的首席架构师 Kai Walter 说：“在我们的多云环境中，Dapr 给了我们需要的灵活性。它提供了一个抽象层，使开发人员能够专注于手头的业务案例。”

主要组件：

- **Dapr sidecar**：在应用程序旁边运行，包含面向开发者的 API。
- **CLI 和 SDK**：构成项目的开发者工具体验。
- **Components-contrib 仓库**：开发者可以扩展 Dapr，以集成和支持各种云服务和开源技术。

显著的里程碑：

- 15100 个 GitHub Star
- 1940 个 Pull Request
- 3703 个问题
- 1300 个贡献者
- 14 次发布，目前稳定版 v1.4
- 2600 万次 Docker 拉取

CNCF 首席技术官 Chris Aniszczyk 说：“分布式应用和微服务构成了容器和云原生的基础，但编写可扩展和可靠的分布式应用是非常困难的。Dapr 与其他 CNCF 项目集成的很好，并提供最佳实践，开发人员可以使用任何语言或框架在上面构建。我们很高兴欢迎 Dapr 加入 CNCF 并努力培养他们的社区。”

Dapr 项目的路线图包括增加新的配置 API，使开发者更容易管理其应用程序的配置，并在配置发生变化时得到通知；以及一个查询 API，使开发者更容易查询和过滤 Dapr 状态存储数据。此外，该项目正在寻求增加对基于 gRPC 和 WASM 的组件的支持，这将支持状态存储、pub/sub broker、binding 和其他 Dapr 组件的动态发现。最后，Dapr 社区还在讨论新的并发性 API，以解锁领导者选举等场景。

作为由 CNCF 托管的项目，Dapr 是与其技术利益相一致的中立基金会的一部分，也是更大的 Linux 基金会的一部分，后者提供管理、营销支持和社区推广。Dapr 加入了孵化技术的行列：Argo, Buildpacks, Cilium, CloudEvents, CNI, Contour, Cortex, CRI-O, Crossplane, Dragonfly, emissary-ingress, Falco, Flagger, Flux, gRPC, KEDA, KubeEdge, Longhorn, NATS, Notary, OpenTelemetry, Operator Framework, SPIFFE, SPIRE, 和 Thanos。关于每个级别的成熟度要求，请访问 [CNCF 的毕业标准](https://github.com/cncf/toc/blob/master/process/graduation_criteria.adoc)。
