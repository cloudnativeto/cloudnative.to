---
title: "全面进化：Kubernetes CRD 1.16 GA前瞻"
author: "Min Kim"
authorlink: "https://github.com/yue9944882"
date: 2019-08-29T16:43:58+08:00
draft: false
image: "/images/blog/crd-ga.jpg"
description: "本文以社区CRD维护者的角度前瞻1.16CRD的GA进化主要的革新与应对。"
tags: ["CRD","kubernetes"]
categories: ["kubernetes"]
keywords: ["kubernetes","CRD"]
type: "post"
avatar: "/images/profile/default.jpg"
---

> 作者: Min Kim(yue9944882)，Kubernetes社区CRD维护者，蚂蚁金服高级研发工程师。Kubernetes 1.16扩展性GA Sprint迭代组成员，主要负责CRD OpenAPI聚合发布相关特性。

随着近段时间以CRD（CustomResourceDefinition）的形式扩展Kubernetes火爆起来，在开源社区涌现了许许多多用CRD作为平台构建应用的成功开源项目。整个社区对CRD的积极拥抱其实是远在维护者们的期望之外的。然而经过5个release的洗礼，CRD从最开始的实验性项目渐渐变得清晰了起来，社区对CRD模型提出的许许多多建议或者挑战，将在本次1.16的版本得到完整的解决和回应。CRD的GA计划从1.14版本开始斩露萌芽到Kubenretes 1.16全力冲刺的研发周期中，主要过程是来自谷歌和红帽的工程师在执行，还有少数的社区志愿者。

通过本篇文章，作者将通过梳理CRD的GA进化中的主要革新点，同时结合CRD面临的问题/缺陷进而推导出其中的联系/因果，在最后还会对CRD未来面临的问题和挑战进行分析。希望读者可以通过本篇文章对CRD的正负面有个立体的认识，也借此抛砖引玉提出如何在复杂场景下强化使用CRD的未来议题。

## GA版本CRD主要带来的革新

### 总览

大的方向上，一言蔽之CRD模型的进化之路是支持所承载的用户资源（CR）__可持续演进发展__之路，其中又主要分为两个路线：

- 从“无结构化”进化到“强结构化”
- 从“无版本化”进化到“多版本化”

在结构化的CRD中，为了在简单的CRD的Yaml中定义出一套结构化的模型，我们首先借助了OpenAPI语法力量来描述模型的结构，并在此基础上再推动CRD全面向已经成熟的内建原生API模型多版本机制（包括Defaulting，Validating，多版本Round-Tripping）靠拢。最直观来看，在GA的模型定义层面上，最大的变化是删除了CRD的Spec中顶层的模型描述相关定义，以此推动用户全面使用多版本的CRD，这也是与Kubernetes原生模型实现同步的第一步，同时GA版本带来的其他特性大多是为了给用户更好的使用多版本CRD提供配套的基础设施。

### CRD Defaulting/Pruning 支持

在CRD的GA计划中，把Defaulting/Pruning结对放在同一个条目中是因为这两者孪生对应对模型字段的增加和删除两种变更。深入一步讲，Defaulting/Pruning的意义是为了让用户对CRD的模型变更加平滑：

- __Defaulting__：为CRD添加一个新字段的时候，由于数据面（即Etcd存储）中存量的数据并没有该字段，会使得从APIServer中读取到的对象该字段初始值为Go语言中的“零值”。除非在用户改动Controller的处理逻辑在其中添加对应“零值”的处理分支，这往往会导致一个正在运行的控制面Controller出现问题。Defaulting的支持允许你在CRD定义“如果该字段从数据面读出时不存在，默认设为何值”，这对于模型的新字段变更是非常有帮助的。
- __Pruning__：用户在为CRD删除一个字段的时候，由于数据面中存量的数据已经存在了该字段，会使得从APIServer读出的实际对象仍然拥有该值。这和用户希望变更CRD的模型删除某个字段的意图是相悖的。那么设置Pruning可以帮助你在字段删除后保持存储数据面和API层面的一致。顺带一提的是，对于原生内置的Kubernetes模型，APIServer在从Etcd数据面读取数据后反序列化成对象时，使用的是“非严格”的Json/Yaml序列化器，所以可以天然将模型中不认识的字段过滤掉。

### CRD Webhook Conversion 支持

除非你可以迫使用户在版本间进行迁移，多版本的CRD往往被要求可以同时服务多个版本的模型。比如在同一个集群中，一个用户1可能正在使用v1beta1版本的模型运行他的应用操作资源A，而另一个用户2也同时正在使用最新v1的模型运行他的应用操作资源A，如果v1模型比v1beta1模型新增/迁移了一个字段，那么用户1的写操作自然不会存在该字段，而用户2在通过写操作为该字段赋值时，很有可能会被用户1的写操作将该字段再次抹除。这个典型的问题场景，我们在社区叫做Multi-Version Round-Tripping。解决这个问题也是整个Kubernetes社区SIG API-Machinery工作组的核心问题之一。那么如果保证这两个用户对这多版本的模型进行的读写都成功呢？Kubernetes的解法是在资源真正落入数据面之前进行版本之间的转化（Conversion），并确认统一其中一个版本为数据面存储使用的版本。对于原生的Kubernetes资源，转化的实现是一系列Go语言的函数，那么对CRD而言，我们解决多版本转化的办法是通过为该资源植入一个Conversion Webhook，这个Conversion Webhook的功能只有一个，就是告诉Kubernetes集群如何将这个CRD承载的多个版本的模型之间进行转化。

### 进一步的CRD OpenAPI Schema集成

目前OpenAPI的标准规范主要涵盖v2和v3两个版本，v2标准只能用来描述非常简单模型定义远不能满足Kubernetes的模型，而v3标准远过于复杂适配成本极高，并且和v2标准不完全向后兼容。事实上目前行业内几乎没有对OpenAPIv3的标准的完整适配，这也是OpenAPIv3最大的痛点。又由于在Go语言生态中没有理想的OpenAPIv3标准库，所以目前CRD对OpenAPI语法的适配其实走到了一个非常尴尬的阶段，他完整的适配了OpenAPIv2标准，又只取了OpenAPIv3标准中大概不到30%的语法支持，这也是CRD在未来后GA迭代周期中主要需要解决的问题之一。本次CRD的GA发布中，加强了对OpenAPIv3语法的支持，包括anyOf,oneOf,allOf以及nullable关键字的适配。这些关键字的支持将帮助用户表达出更复杂的模型层次结构。

### CRD子资源支持正式毕业

子资源相对来讲是是目前CRD的比较稳定的功能之一，尽管在1.16版本中宣布毕业，但是其实之前的版本的子资源以及趋于稳定，通过支持Status子资源，用户结合资源的Generation资源在自定义的控制器Controller中有效判断出定义（Spec）的变更和状态（Status）的变更。如果用户需要使用更加自定义的子资源比如类似pod/logs，pod/exec，社区推荐使用APIServer Aggregation的方式进行扩展，详请参考近期从孵化器毕业的 [kubernetes-sigs/apiserver-builder-alpha](https://github.com/kubernetes-sigs/apiserver-builder-alpha) 项目。

## 更加复杂场景下的CRD使用

### 如何通过CRD部署“数据密集型”资源？

众所周知，CRD的后端目前存储是Etcd，Etcd有可靠的可用性和读写性能，但是目前在数据容量上尚不能满足大型企业对存储大量数据的支持，目前主要解法有两种：

- 单独编译（Stand-alone）并且部署提供CRD服务的 [apiextension-apiserver](https://github.com/kubernetes/apiextensions-apiserver)，再以AA（APIServer Aggregation的方式）接入集群，通过这样可以将CRD的存储隔离到一个独立的Etcd集群，从而隔绝对”Kubernetes主APIServer“的影响。
- 通过使用Rancher研发的Etcd-on-SQL适配库[KINE](https://github.com/ibuildthecloud/kine)将自定义资源直接转移到SQL存储上。目前KINE已经具体高可用部署以及适配Etcd Watch/Txn接口的能力，并且已在K3S的集成测试得到了完整验证也通过CNCF一致性测试。目前在Rancher正在考虑将KINE捐赠给Kubernetes社区发展有望成为行业标准。对Kubernetes适配MySQL感兴趣的开发者可以考虑通过[官方提供的Example](https://github.com/kubernetes-sigs/apiserver-builder-alpha#examples)进行PoC演练。

### 如何通过CRD生成其他语言的客户端？

CRD的GA演进中重要的一环是OpenAPI发布能力的强化，通过对集群访问`/openapi/v2`或者`/openapi/v3（研发中）`的API可以完整下载到包括用户CRD的完整OpenAPI文档。通过结合使用OpenAPI代码生成器 [OpenAPITools/openapi-generator](https://github.com/OpenAPITools/openapi-generator)，我们可以定制地为自己的CRD生成各种语言各式各样的客户端SDK，值得一提的是官方的异构语言SDK都是通过OpenAPI文档生成得到的。对于生成Java客户端感兴趣的朋友可以参考[这篇文档](https://github.com/kubernetes-client/java/blob/master/docs/generate-model-from-third-party-resources.md)，进行PoC实验。

