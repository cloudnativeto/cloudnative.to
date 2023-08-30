---
title: "全面进化：Kubernetes CRD 1.16 GA 前瞻"
authors: ["Min Kim"]
date: 2019-08-29T16:43:58+08:00
draft: false
summary: "本文以社区 CRD 维护者的角度前瞻 1.16CRD 的 GA 进化主要的革新与应对。"
tags: ["CRD","kubernetes"]
categories: ["kubernetes"]
keywords: ["kubernetes","CRD"]
---

> 作者：Min Kim(yue9944882)，Kubernetes 社区 CRD 维护者，蚂蚁金服高级研发工程师。Kubernetes 1.16 扩展性 GA Sprint 迭代组成员，主要负责 CRD OpenAPI 聚合发布相关特性。

随着近段时间以 CRD（CustomResourceDefinition）的形式扩展 Kubernetes 火爆起来，在开源社区涌现了许许多多用 CRD 作为平台构建应用的成功开源项目。整个社区对 CRD 的积极拥抱其实是远在维护者们的期望之外的。然而经过 5 个 release 的洗礼，CRD 从最开始的实验性项目渐渐变得清晰了起来，社区对 CRD 模型提出的许许多多建议或者挑战，将在本次 1.16 的版本得到完整的解决和回应。CRD 的 GA 计划从 1.14 版本开始斩露萌芽到 Kubenretes 1.16 全力冲刺的研发周期中，主要过程是来自谷歌和红帽的工程师在执行，还有少数的社区志愿者。

通过本篇文章，作者将通过梳理 CRD 的 GA 进化中的主要革新点，同时结合 CRD 面临的问题/缺陷进而推导出其中的联系/因果，在最后还会对 CRD 未来面临的问题和挑战进行分析。希望读者可以通过本篇文章对 CRD 的正负面有个立体的认识，也借此抛砖引玉提出如何在复杂场景下强化使用 CRD 的未来议题。

## GA 版本 CRD 主要带来的革新

### 总览

大的方向上，一言蔽之 CRD 模型的进化之路是支持所承载的用户资源（CR）__可持续演进发展__之路，其中又主要分为两个路线：

- 从“无结构化”进化到“强结构化”
- 从“无版本化”进化到“多版本化”

在结构化的 CRD 中，为了在简单的 CRD 的 Yaml 中定义出一套结构化的模型，我们首先借助了 OpenAPI 语法力量来描述模型的结构，并在此基础上再推动 CRD 全面向已经成熟的内建原生 API 模型多版本机制（包括 Defaulting，Validating，多版本 Round-Tripping）靠拢。最直观来看，在 GA 的模型定义层面上，最大的变化是删除了 CRD 的 Spec 中顶层的模型描述相关定义，以此推动用户全面使用多版本的 CRD，这也是与 Kubernetes 原生模型实现同步的第一步，同时 GA 版本带来的其他特性大多是为了给用户更好的使用多版本 CRD 提供配套的基础设施。

### CRD Defaulting/Pruning 支持

在 CRD 的 GA 计划中，把 Defaulting/Pruning 结对放在同一个条目中是因为这两者孪生对应对模型字段的增加和删除两种变更。深入一步讲，Defaulting/Pruning 的意义是为了让用户对 CRD 的模型变更加平滑：

- __Defaulting__：为 CRD 添加一个新字段的时候，由于数据面（即 Etcd 存储）中存量的数据并没有该字段，会使得从 APIServer 中读取到的对象该字段初始值为 Go 语言中的“零值”。除非在用户改动 Controller 的处理逻辑在其中添加对应“零值”的处理分支，这往往会导致一个正在运行的控制面 Controller 出现问题。Defaulting 的支持允许你在 CRD 定义“如果该字段从数据面读出时不存在，默认设为何值”，这对于模型的新字段变更是非常有帮助的。
- __Pruning__：用户在为 CRD 删除一个字段的时候，由于数据面中存量的数据已经存在了该字段，会使得从 APIServer 读出的实际对象仍然拥有该值。这和用户希望变更 CRD 的模型删除某个字段的意图是相悖的。那么设置 Pruning 可以帮助你在字段删除后保持存储数据面和 API 层面的一致。顺带一提的是，对于原生内置的 Kubernetes 模型，APIServer 在从 Etcd 数据面读取数据后反序列化成对象时，使用的是“非严格”的 Json/Yaml 序列化器，所以可以天然将模型中不认识的字段过滤掉。

### CRD Webhook Conversion 支持

除非你可以迫使用户在版本间进行迁移，多版本的 CRD 往往被要求可以同时服务多个版本的模型。比如在同一个集群中，一个用户 1 可能正在使用 v1beta1 版本的模型运行他的应用操作资源 A，而另一个用户 2 也同时正在使用最新 v1 的模型运行他的应用操作资源 A，如果 v1 模型比 v1beta1 模型新增/迁移了一个字段，那么用户 1 的写操作自然不会存在该字段，而用户 2 在通过写操作为该字段赋值时，很有可能会被用户 1 的写操作将该字段再次抹除。这个典型的问题场景，我们在社区叫做 Multi-Version Round-Tripping。解决这个问题也是整个 Kubernetes 社区 SIG API-Machinery 工作组的核心问题之一。那么如果保证这两个用户对这多版本的模型进行的读写都成功呢？Kubernetes 的解法是在资源真正落入数据面之前进行版本之间的转化（Conversion），并确认统一其中一个版本为数据面存储使用的版本。对于原生的 Kubernetes 资源，转化的实现是一系列 Go 语言的函数，那么对 CRD 而言，我们解决多版本转化的办法是通过为该资源植入一个 Conversion Webhook，这个 Conversion Webhook 的功能只有一个，就是告诉 Kubernetes 集群如何将这个 CRD 承载的多个版本的模型之间进行转化。

### 进一步的 CRD OpenAPI Schema 集成

目前 OpenAPI 的标准规范主要涵盖 v2 和 v3 两个版本，v2 标准只能用来描述非常简单模型定义远不能满足 Kubernetes 的模型，而 v3 标准远过于复杂适配成本极高，并且和 v2 标准不完全向后兼容。事实上目前行业内几乎没有对 OpenAPIv3 的标准的完整适配，这也是 OpenAPIv3 最大的痛点。又由于在 Go 语言生态中没有理想的 OpenAPIv3 标准库，所以目前 CRD 对 OpenAPI 语法的适配其实走到了一个非常尴尬的阶段，他完整的适配了 OpenAPIv2 标准，又只取了 OpenAPIv3 标准中大概不到 30% 的语法支持，这也是 CRD 在未来后 GA 迭代周期中主要需要解决的问题之一。本次 CRD 的 GA 发布中，加强了对 OpenAPIv3 语法的支持，包括 anyOf,oneOf,allOf 以及 nullable 关键字的适配。这些关键字的支持将帮助用户表达出更复杂的模型层次结构。

### CRD 子资源支持正式毕业

子资源相对来讲是是目前 CRD 的比较稳定的功能之一，尽管在 1.16 版本中宣布毕业，但是其实之前的版本的子资源以及趋于稳定，通过支持 Status 子资源，用户结合资源的 Generation 资源在自定义的控制器 Controller 中有效判断出定义（Spec）的变更和状态（Status）的变更。如果用户需要使用更加自定义的子资源比如类似 pod/logs，pod/exec，社区推荐使用 APIServer Aggregation 的方式进行扩展，详请参考近期从孵化器毕业的 [kubernetes-sigs/apiserver-builder-alpha](https://github.com/kubernetes-sigs/apiserver-builder-alpha) 项目。

## 更加复杂场景下的 CRD 使用

### 如何通过 CRD 部署“数据密集型”资源？

众所周知，CRD 的后端目前存储是 Etcd，Etcd 有可靠的可用性和读写性能，但是目前在数据容量上尚不能满足大型企业对存储大量数据的支持，目前主要解法有两种：

- 单独编译（Stand-alone）并且部署提供 CRD 服务的 [apiextension-apiserver](https://github.com/kubernetes/apiextensions-apiserver)，再以 AA（APIServer Aggregation 的方式）接入集群，通过这样可以将 CRD 的存储隔离到一个独立的 Etcd 集群，从而隔绝对”Kubernetes 主 APIServer“的影响。
- 通过使用 Rancher 研发的 Etcd-on-SQL 适配库[KINE](https://github.com/ibuildthecloud/kine)将自定义资源直接转移到 SQL 存储上。目前 KINE 已经具体高可用部署以及适配 Etcd Watch/Txn接口的能力，并且已在K3S的集成测试得到了完整验证也通过CNCF一致性测试。目前在Rancher正在考虑将KINE捐赠给Kubernetes社区发展有望成为行业标准。对Kubernetes适配MySQL感兴趣的开发者可以考虑通过[官方提供的 Example](https://github.com/kubernetes-sigs/apiserver-builder-alpha#examples)进行 PoC 演练。

### 如何通过 CRD 生成其他语言的客户端？

CRD 的 GA 演进中重要的一环是 OpenAPI 发布能力的强化，通过对集群访问`/openapi/v2`或者`/openapi/v3（研发中）`的 API 可以完整下载到包括用户 CRD 的完整 OpenAPI 文档。通过结合使用 OpenAPI 代码生成器 [OpenAPITools/openapi-generator](https://github.com/OpenAPITools/openapi-generator)，我们可以定制地为自己的 CRD 生成各种语言各式各样的客户端 SDK，值得一提的是官方的异构语言 SDK 都是通过 OpenAPI 文档生成得到的。对于生成 Java 客户端感兴趣的朋友可以参考[这篇文档](https://github.com/kubernetes-client/java/blob/master/docs/generate-model-from-third-party-resources.md)，进行 PoC 实验。

