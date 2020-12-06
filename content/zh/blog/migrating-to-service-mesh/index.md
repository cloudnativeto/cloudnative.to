---
title: "迁移到服务网格"
description: "本文翻译自 Dariusz Jędrzejczyk 的文章 Migrating to Service Mesh。"
author: "[Dariusz Jędrzejczyk](https://allegro.tech/2020/05/migrating-to-service-mesh.html)"
translator: "[张晓辉](https://atbug.com)"
image: "https://atbug.oss-cn-hangzhou.aliyuncs.com/2020/09/28/cloudmigration.jpg"
categories: ["Service Mesh"]
tags: ["Service Mesh","翻译"]
date: 2020-09-28T16:00:00+08:00
type: "post"
avatar: "https://allegro.tech/img/authors/dariusz.jedrzejczyk.jpg"
profile: "自认为是平台工程师。领导的开发团队负责服务网格、服务发现和提高开发人员在 JVM 上的生产力的库。"
---
本文译自[Migrating to Service Mesh](https://allegro.tech/2020/05/migrating-to-service-mesh.html)。

今年 [Allegro.pl](https://allegro.tech/about-us/) 已满21 岁。该公司在为数以百万计的波兰人提供在线购物服务的同时，还参与了许多技术进步。您可以使用公共云产品，机器学习来打破僵局。即使我们使用的许多技术似乎只是在大肆宣传，但他们的采用依然有可靠的理由的支持。让我告诉你一个我有幸从事的项目的故事。

## 为什么要迁移到服务网格

我不准备对 Service Mesh 的背景知识做过多的讨论，因为已经有大量关于此主题的文章。我曾写过[一篇文章](https://nofluffjobs.com/blog/jakie-korzysci-daje-service-mesh/)（波兰语），专门介绍我们为什么决定从这种方法中收益。

这里只列出我们想要的内容：
* 将通用平台代码从SDK（服务发现、负载均衡、分布式跟踪）中分离
* 将 mTLS 的逻辑从 SDK 和应用程序分离
* 统一服务间通信的访问控制
* 统一服务间流量的 HTTP 层面可观察性

## 系统的复杂性

类似 Allegro.pl 这样的在线市场是一个复杂的野兽。业务的许多部分都按照自己的节奏来演进并使用不同的技术。我们的服务（主要基于 JVM）主要运行在作为本地私有云解决方案的 Mesos/Marathon 上。我们刚刚开始将服务迁移到 Kubernetes。在合理的情况下（并且需要将其与我们的技术栈集成），我们也会使用公有云。一些服务打包在 Docker 中。但是我们的架构不仅仅有微服务。我们还有：
* 必要的一些边缘解决方案（API 网关、边缘代理、前端后端等）
* 外部负载均衡器
* 反向代理
* [分布式消息代理](https://allegro.tech/2019/05/hermes-1-0-released.html)
* 几种运行在虚拟机上的服务
* 用于批处理任务的 Hadoop 集群
* 以及臭名昭著的独立的且仍在运行的 PHP 整体

## 如何迁移到服务网格

旅途始于 2018年底。当时我们评估了现有的解决方案，然后发现大多数技术仅针对 k8s。我们[尝试了](https://envoy-control.readthedocs.io/en/latest/ec_vs_other_software/) [Istio](https://istio.io/)，结果证明仅要求 k8s 容器提供的网络隔离。我们需要一个定制的[控制平面](https://blog.envoyproxy.io/service-mesh-data-plane-vs-control-plane-2774e720f7fc)将所有的东西整合在一起。同时我们使用[Envoy](https://www.envoyproxy.io/)作为最稳定、最先进的 L7 代理，其可以满足我们的需求。Envoy 是用 C++ 开发的，由于其内存管理且没有垃圾收集和许多令人印象深刻的架构决策（例如线程模型），提供了可预测的稳定的延迟。

### 控制平面

我的团队负责为 JVM 开发人员提供接入平台组件的框架。我们在基于 JVM 的语言：Java 和 Kotlin 拥有丰富的经验。同样我们也对 Go 有一定的了解。Envoy 团队提供了控制平面的两种实现：一种是用 Go 编写的，另一种是用 Java 编写的。我们决定用 Kotlin 来编写我们的解决方案，并将其开源。幕后，我们使用了 [java-control-plane](https://github.com/envoyproxy/java-control-plane/) 库，并参与其维护。

我们平台的服务发现是基于 [Hashicorp 的 Consul](https://www.consul.io/)。我们已经使用 Java 编写了与 Consul 高效集成的 [库](https://github.com/allegro/consul-recipes)，我们在项目中使用了该库。我们将其作为我们的控制平面 [envoy-control](https://github.com/allegro/envoy-control)。

因为它使用了一种高级语言，即 Kotlin 和 JVM 生态的工具，我们可以用它做很多有趣的事情，比如使用 [Testcontainers](https://www.testcontainers.org/) 进行可靠性测试。这些测试模拟了几种可能的生产故障，并且可以在笔记本电脑上快速运行。该测试套件替我们节省了**大量**时间。

此外，经过一段时间的 Envoy 和 envoy-control 的维护之后，我们一直认为我们需要一个管理面板。因此我们通过支持服务实现了 GUI 组件来简化操作。从控制中心我们可以：
* 列出服务的所有实例
* 对特定的 Envoy 实例进行故障诊断（获取配置转储、统计信息）
* 更改特定 Envoy 实例的日志级别
* 在 [XDS](https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol) 处理之前获取 envoy-control 的配置快照
* 比较 envoy-control 实例来验证其一致性

### 数据平面

我们平台上的服务通过内部部署组件进行部署，该组件读取位于每个服务仓库根目录下的 YAML 描述文件。部署元数据可用于每个服务的环境，然后由另一个组件（我们称之为 envoy-wrapper）读取。它准备一个基本的 Envoy 配置文件并启动 Envoy。其余部分有 [XDS 协议](https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol)处理，并与 envoy-control 进行通信来连续传输 Envoy 的配置。在发送给 envoy-control 的元数据中，服务列出了它们的依赖关系。列出所需服务限制 Envoy 所需的数据量。某些类似 Hadoop 执行程序的特权服务，需要所有可用的服务的数据，这种情况也会存在。

我们还在使用 Puppet 配置的虚拟机上运行 Envoy。我们使用 Envoy 的[热重启](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/hot_restart.html?highlight=hot%20restart) 能力来提升这些后端服务的能力。

## 状态

当我们使用 Envoy 作为 [sidecar](https://docs.microsoft.com/en-us/azure/architecture/patterns/sidecar) 来启动一个服务时，我们使用取巧的方式来完成服务在 Consul 中的注册。注册使用的是 Envoy 的端口，而不是服务的端口。使用这项技术，我们实现了迁移的第一步-将服务的入口流量转移到 Envoy。

如果有出口流量，事情就不那么容易了。由于缺少容器化的网络隔离，iptables 一直是维护和调试的噩梦。我们为引入 Envoy 作为出口制定了长期的策略。我们决定所有服务都需要将其 SDK 更新为支持使用 Envoy 作为代理的指定的 HTTP 客户端。

这个决定是迁移工作中的非常重要的一步。我们不想破坏现有平台的功能，比如 SDK 中实现的负载均衡。我们希望早日地凸显出 Service Mesh 的价值来引起雪球效应。同时，我们以敏捷的方式引入新的功能。

一个指定的代理是平滑迁移的关键所在。为了处理尚未在 Service Mesh 中实现或需要特定处理类型的特定场景，我们创建了一个特别的 HTTP 客户端拦截器。该拦截器将决定是否代理请求。决策基于一组标志，对于具有高度控制权的部署，我们可以覆盖这些标志并精心部署。

我们尚无法代理流量的一个例子是通过应用程序代码使用 [mTLS](https://en.wikipedia.org/wiki/Mutual_authentication) 的场景。我们不想破坏现有设置提供的安全性。但是，当我们准备就绪时，我们只需要翻转一个标志，然后重新部署，流量便会通过 Envoy。

谈到安全性，为了对 Envoy 进行身份验证，我们不适用 [SDS 进行证书分发](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/ssl#secret-discovery-service-sds)。我们的主机配备了由部署组件提供的证书。我们计划使用这些证书对 Envoy 进行身份验证，使其成为证书所述的服务。这样，我们就可以使用 Envoy 执行的访问规则所施加的权限来限制服务之间的通信。

在撰写本文时，我们有 830 个服务通过 Envoy 接受入口流量。其中将近 500 个通过 Envoy 通信以进行出口流量。上周，我们观察到 Mesh 入口流量的峰值 > 620000 req/s，出口流量 > 230000 req/s。我们可以从 Grafana 看到流量的情况，以了解当时的场景。

[![Service Mesh overview dashboard](https://allegro.tech/img/articles/2020-05-07-migrating-to-service-mesh/envoy_overview_traffic.png)](https://allegro.tech/img/articles/2020-05-07-migrating-to-service-mesh/envoy_overview_traffic.png)

应用程序开发人员可以在专有的 Dashboard 上查看其特定的服务流量特征。如果需要，甚至可以从指标角度研究特定 Envoy 实例。

在此过程中，我们能够保持现有路由解决方案和数据中心之间的负载平衡，包括基于金丝雀发布、特定服务标签、或者 Consul 中实例权重的特定子集。

## 曲折

通过引入代理组件，我们在迁移过程中遇到了许多问题。这里仅列出一部分：
* Envoy 对 HTTP 非常严格。例如，我们需要更新许多位置来使请求头名称不区分大小写
* 我们在许多部署中发现突然增加的 503 错误。原因可能是由于连接超时（否则不会被解释为应用程序级别的问题，只能由客户端重试），或者是我们的服务注册机制中的竞争条件，偶尔发生
* 当我们继承 Hadoop 时，我们开始遇到一个问题，即 Envoy 在接收配置时会卡住，最终无法使用。这是由于进入所谓的“集群预热”状态。当整个服务消失时，就会发生这种情况，在我们的环境中，这并不罕见。[我们更新了以前的提交](https://github.com/envoyproxy/java-control-plane/pull/128)，并[对 java-contraol-plane 做了进一步改进](https://github.com/envoyproxy/java-control-plane/pull/131)来解决我们的特定问题
* 我们还尽早决定鼓励开发人员通过 Envoy 将流量代理到[更多域](https://en.wikipedia.org/wiki/Network_domain)。这里域，我们是指不属于 mesh 但由 DNS（外部或者内部域名）表示的目标。这引起了一些意外，例如 Envoy 不支持 [HTTP CONNECT 方法](https://github.com/envoyproxy/envoy/issues/1451)[^1]或者 [H2 upgrade 机制](https://github.com/envoyproxy/envoy/issues/1451)[^2]
* 我们发现的另一个有趣的问题是在将 Envoy 部署到 PHP 单体应用环境中之后，Envoy 的统计数据被误导。热重启后，gauges 上的还是[来自上一个实例的值](https://github.com/envoyproxy/envoy/issues/10806)

[^1]: 译者注：在 HTTP 协议中，CONNECT 方法可以开启一个客户端与所请求资源之间的双向沟通的通道。它可以用来创建隧道（tunnel）
[^2]: 译者注：为了更方便地部署新协议，HTTP/1.1 引入了 Upgrade 机制，它使得客户端和服务端之间可以借助已有的 HTTP 语法升级到其它协议

## 演进

在复杂的环境中部署 Service Mesh 是一项巨大的变革，数百名应用程序开发人员进行了大量工作。迁移帮助团队减少了技术债务。这种减少是迁移到提供 Service Mesh 支持的最新版本库的副产品。为 k8s 创建的现成的崭新的控制平面非常适合未开发的项目，但是对于许多存在异构技术栈的组织来说，这是无法达到的。Envoy 的主要创建者 Matt Klein 最近在[博客](https://mattklein123.dev/2020/03/15/on-the-state-of-envoy-proxy-control-planes/)中描述了这一事实 。我希望这个故事对您有所帮助，并展示在这种环境下从鸟瞰角度看生产部署的样子。我们接下来要考虑的是将现有服务与 k8s 原生解决方案集成在一起的方法，来为我们的用户提供无缝的体验。我们在稳定和优化我们的控制平面方面进行了大量工作，该控制平面现在在生产中托管了 5000 多个 Envoy 实例，其中一些需要针对 Consul 中注册的近 1000 个服务实例进行配置。我们的愿景以及下一步要做的是，开发人员无需修改库和迁移，就能重新访问分布式跟踪。Envoy 可以做到这一点。

## (最后) 感谢

Envoy 社区提供了大量的支持。我们在需要的时候获得了帮助并且 Pull Request 合并快。Envoy 的更新速度非常快，我们正在提取大量可观察性数据，而且几乎不会对我们的服务间通信带来影响。对[我自己](https://github.com/chemicL/envoy-timeouts)和我有幸一起合作的出色的团队来说，学习经验绝对是无价之宝。我们是应用程序开发人员，但是在整个过程中我们学习了很多的网络和协议知识。我们将继续回馈社区，并期待在评论中听到您使用 Service Mesh 的经历。
