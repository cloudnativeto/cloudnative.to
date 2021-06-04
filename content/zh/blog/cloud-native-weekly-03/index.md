---
title: "云原生生态周报（Cloud Native Weekly）第3期"
date: 2019-05-07T15:12:53+08:00
draft: false
image: "/images/blog/006tNc79ly1g2cdisc93uj313z0u0qv6.jpg"
author: "云原生编辑部"
description: "这是 Cloud Native 周报第3期。"
tags: ["cloud native"]
categories: ["云原生"]
keywords: ["service mesh","服务网格","云原生","cloud native"]
type: "post"
avatar: "/images/profile/default.jpg"
---

> *摘要：* Docker Hub遭入侵，19万账号被泄露；Java 8 终于开始提供良好的容器支持；Snyk 年度安全报告出炉，容器安全问题形势空前严峻。

# 业界要闻

1. [**Docker Hub遭入侵，19万账号被泄露**](https://www.cnbeta.com/articles/tech/841873.htm) **:** 4月25日Docker官方邮件曝露，因为Hub的一个数据库收到非授权访问，影响了约19万用户的用户名和哈希后的密码，以及用户自动构建的Github和Bitbucket Token。Docker公司建议用户修改其登录密码。如果您在公有云上的应用依赖于来自 Docker Hub的镜像，我们强烈建议您登录容器服务控制台更新相应的docker login信息或kubernetes secret。此外，阿里云容器镜像服务[企业版](https://promotion.aliyun.com/ntms/act/acree.html)提供网络访问控制、独享OSS Bucket加密存储等安全加固功能，最大程度保障您的镜像仓库的安全。
2. [**Java 8 终于开始提供良好的容器支持**](https://blog.softwaremill.com/docker-support-in-new-java-8-finally-fd595df0ca54)**：**长久以来，容器 和 Java 就像一对“欢喜冤家”。一方面，容器技术的“不可变基础设施”特性为开发者带来了无比宝贵的依赖与环境一致性保证；但另一方面， Linux 容器通过 Cgroups 对应用进行资源限制的方式跟所有依赖于 JVM 进行资源分配的编程语言都产生了本质的冲突。而就在上周，最近发布的OpenJDK 镜像 **openjdk:8u212-jdk** 终于能够让 Java 8 运行时在容器里面为应用分配出合理的 CPU 数目和堆栈大小了。自此，发布 Java 容器应用的痛苦经历，可能要一去不复返了。
3. **Snyk 年度安全报告出炉，容器安全问题形势空前严峻：**知名开源安全厂商 Snyk 在年初发布了 2019 年度安全报告。报告中指出：“随着容器技术在2019年继续在IT环境中爆发式增长，针对容器安全的威胁正在迅猛增加，**任何一家企业现在都必须比以往更加重视**[**容器镜像安全**](https://help.aliyun.com/document_detail/60751.html)**，并将此作为企业的首要任务**”。报告详情，请[点击此处查看全文](https://snyk.io/opensourcesecurity-2019/)。

# 上游重要进展

Kubernetes 项目

1. **Kubernetes 集群联邦 v1（Federation v1） 正式宣布废弃。**K8s 社区近日宣布将 Federation v1 代码库正式废弃。Federation v1 即 Kubernetes 项目原“集群联邦”特性，旨在通过一个统一的入口管理多个 Kubernetes 集群。**但是，这个特性逐步被设计成了在多个 Kubernetes 集群之上构建一个 “Federation 层”的方式来实现**，从而背离了 Kubernetes 项目的设计初衷。最终，在 RedHat、CoreOS、Google 等多位社区成员的推动下，社区开始全面拥抱 [Federation v2](https://github.com/kubernetes-sigs/federation-v2)：**一个完全旁路控制、以 K8s API 为核心的多集群管理方案。**
2. [**Kubernetes 1.15 进入发布节奏** ](https://github.com/kubernetes/sig-release/tree/master/releases/release-1.15)K8s 1.15 发布进入日程，5 月30 日即将 Code Freeze（即：不接受任何功能性 PR）。
3. [**[KEP\] Ephemeral Containers KEP 合并，进入编码阶段**](https://github.com/kubernetes/enhancements/pull/958)。
   Ephemeral container 旨在通过在 Pod 里启动一个临时容器的方式，来为用户提供对Pod和容器应用进行debug和trouble shooting的能力。**这种通过“容器设计模式”而非 SSH 等传统手段解决运维难题的思路，对于“不可变基础设施”的重要性不言而喻，**阿里巴巴在“全站云化”过程中也采用了同样的设计来解决类似问题。在上游完成该功能的编码实现后，会通过 kubectl debug 命令方便用户直接使用。

Knative 项目

1. **Knative 逐步弃用原 Build 项目。**按照计划，Tektoncd/Pipeline 子项目已经在 v0.2.0 时移除了对 Build 的依赖。最近，Knative Serving v1beta1 也移除了对 Build 的依赖，目前，社区已经开始制定弃用 Build 的确切方式并通知到 knative 开发者社区。
2. [**knative 正在考虑为事件触发（Trigger）引入更高级的规则和策略。**](https://github.com/knative/eventing/issues/930) 社区正在就 Advanced Filtering 设计一个 提案。该提案提议基于 [CEL](https://github.com/google/cel-spec/blob/9cdb3682ba04109d2e03d9b048986bae113bf36f/doc/intro.md) （Google 维护的一种表达式语言）来进行事件的过滤。具体来说，Trigger 的 filter 字段会增加一个 Spec 字段，然后在 Spec 字段下使用 CEL 语法完成对事件的过滤规则定义。

Istio/Envoy 项目

1. [**Istio 1.1.4本周正式发布**](https://istio.io/about/notes/1.1.4/)，其中一个重要的功能是更改了Pilot的默认行为，对出口流量的控制变化。除了之前通过Service Entry与配置特定范围IP段来支持访问外部服务，新版本中通过设置环境变量PILOT_ENABLE_FALLTHROUGH_ROUTE允许Envoy代理将请求传递给未在网格内部配置的服务。更多可以参考[Istio流量管理实践](https://yq.aliyun.com/articles/655489?source_type=cnvol_429_wenzhang)系列文章。
2. [**Envoy正通过ORCA改善负载均衡的精准度**](https://github.com/envoyproxy/envoy/issues/6614)。 
   目前Envoy可以用于进行负载均衡决策的信息主要是权重和连接数等信息，为了能让Envoy的负载均衡更加精准需要为Envoy提供更多的决策因素。比如本地和远程机器的负载情况、CPU、内存等信息，更复杂的还可以利用应用程序特定的指标信息来进行决策，比如队列长度。而ORCA的目的是定义Envoy和上游代理之间传递这些信息的标准。该功能的提出者希望ORCA可以成为Universal Data Plane API (UDPA)。
3. [**Envoy正引入RPC去代替共享内存机制以便提高统计模块的的扩展性**](https://github.com/envoyproxy/envoy/pull/5910)。 
   Envoy当下通过共享内存的方式来保存stats数据的这种方式存在很多局限性，比如需要限制stats使用固定的内存大小，当有大量集群的时候没办法扩展。这给他升级stats子系统的架构带来了不少的阻碍。因此他希望可以通过将stats数据以堆内存的方式来保存，然后通过RPC在新老进程中传递。
4. [**Envoy正在xDS协议中增加VHDS协议减小动态路由信息的更新粒度**](https://github.com/envoyproxy/envoy/pull/6552)。 
   现状是，Envoy中的路由配置是通过RDS来动态更新的，但是RDS的粒度太粗了，包含了一个Listener下所有的路由配置信息。由于一个Listener下面可能会有多个服务，每一个服务对应一个Virtual Host，因此在更新路由的时候，如果只是其中一个Virtual Host更新了，那么会导致所有的路由配置都重新下发而导致通讯负荷偏重。引入VHDS就是为了只下发变化的路由信息，从而将更新的路由配置信息量缩小。

Containerd 项目

1. [**Non-root**](https://github.com/containerd/containerd/pull/3148)[**用户运行**](https://github.com/containerd/containerd/pull/3148)[ **containerd**](https://github.com/containerd/containerd/pull/3148)**：** 近日，社区正在尝试实现无需root权限就可以运行containerd的能力。在这种场景下，用户可以提前准备好容器所需要的 rootfs ，但是 containerd 服务端在清理容器时依然会尝试去 unmount rootfs，对于没有 root 权限的 containerd 进程而言，该步骤必定会失败（mount 操作必须要有 root 权限）。目前 Pivotal 的工程师正在解决这个问题，这种 non-root 模式可以为解决云上安全问题提供新的思路，

# 开源项目推荐

1. **本周，我们向您推荐** [**kubeCDN**](https://github.com/ilhaan/kubeCDN) **项目**。
   kubeCDN 项目是一个基于Kubernetes 实现的自托管 CDN 方案，只要将它部署在分布在不同地域（Region） 的 Kubernetes 集群上，你就拥有了一个跨地域进行内容分发的 CDN 网络。而更重要的是，通过 kubeCDN，用户不再需要第三方的内容分发网络，从而重新控制了原本就属于自己的从服务器到用户设备的数据流。kubeCDN 目前只是一个个人项目**，但是这里体现出来的思想确实至关重要的：在不久的未来，每一朵云、每一个数据中心里都会布满 Kubernetes 项目，这将会成为未来云时代基础设施的“第一假设”。** 推荐你阅读 [InfoQ 的解读文章](https://www.infoq.cn/article/trfu-uB4FPhAB4uLvL4R?utm_source=tuicool&utm_medium=referral)来进一步了解 kubeCND。

# 本周阅读推荐

- 《Knative 入门——构建基于Kubernetes的现代化Serviceless应用》中文版，这是一本O’Reilly 出品的免费电子书，已经由 servicemesher 社区组织完成翻译。提供 [在线阅读](http://www.servicemesher.com/getting-started-with-knative/) 和 [PDF下载](http://t.cn/EaB8g6d)
- 信通院发起的云原生产业联盟出具《云原生技术实践白皮书》，白皮书系统性地梳理了云原生概念、关键技术、应用场景、发展趋势及实践案例。[PDF链接](https://files.alicdn.com/tpsservice/dd44ce32c783473b595382cad5857ef5.pdf)
- 《[阿里云 PB 级 Kubernetes 日志平台建设实践](https://www.infoq.cn/article/7642QHo6vmZvQxFw9)》Kubernetes 近两年来发展十分迅速，已经成为容器编排领域的事实标准，但是 Kubernetes 中日志采集相对困难。本文来自InfoQ记者的采访，文中谈及了如何让使用者专注在“分析”上，远离琐碎的工作。
- 《[Istio Observability with Go, gRPC, and Protocol Buffers-based Microservices](https://programmaticponderings.com/2019/04/17/istio-observability-with-go-grpc-and-protocol-buffers-based-microservices/)》，这是一篇很长的博文，介绍可以与Istio相适配的观测性组件，用实际的例子演示了如何对以Go语言、Protobuf和gRPC为基础的微服务框架进行全面的观测。如果你还对Prometheus、Grafana、Jaeger和Kiali这几个组件感到既熟悉又陌生，并且好奇如何把它们组合在一起使用来提升微服务的可观测性，这个博客的内容应该会对你很有帮助。
- 《[云原生的新思考：为什么说容器已经无处不在了？](https://www.infoq.cn/article/hhk37_UC1FgJFCQyIk7c)》这篇文章在对云原生技术总结的同时，对未来应用趋势走向进行了展望。“云原生不但可以很好的支持互联网应用，也在深刻影响着新的计算架构、新的智能数据应用。以容器、服务网格、微服务、Serverless 为代表的云原生技术，带来一种全新的方式来构建应用。”

名词解释：KEP - Kubernetes Enhancement Proposal， 即 Kubernetes 上游设计文档

------

本周报由阿里巴巴容器平台联合蚂蚁金服共同发布

本周作者：张磊，临石，浔鸣，天千，至简，傅伟，汤志敏， 王夕宁
责任编辑：木环
