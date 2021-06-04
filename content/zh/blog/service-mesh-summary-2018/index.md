---
title: "Service Mesh的2018年度总结"
date: 2019-02-18T22:49:28+08:00
draft: false
image: "/images/blog/006tKfTcly1g0avw2aq99j31an0u0u0y.jpg"
author: "ServiceMesher"
authorlink: "https://github.com/skyao/servicemesh2018"
originallink: "https://github.com/skyao/servicemesh2018/blob/master/summary.md"
description: "Service Mesh 2018年度总结。"
tags: ["service mesh"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格"]
type: "post"
avatar: "/images/profile/default.jpg"
---

## 前言

在2017年年底，在Service Mesh刚刚兴起之时，应InfoQ的邀请撰写过一篇名为 ["Service Mesh年度总结：群雄逐鹿烽烟起"](https://skyao.io/publication/201801-service-mesh-2017-summary/) 的文章，对2017年Service Mesh的发展做了一次年度回顾。当时正是Service Mesh技术方兴未艾，各家产品你争我夺之时，一片欣欣向荣的气象。

时隔一年，江湖风云变幻。再次有幸收到InfoQ的邀请，继续进行Service Mesh 2018年的年度总结。本次年度总结将由来自聚集国内ServiceMesh爱好者的 [ServiceMesher 社区](http://www.servicemesher.com/) 的多位嘉宾共襄盛举，希望能为 Service Mesh 2018年的发展做一个系统而全面的总结。

> 备注：为了不重复去年年度总结的内容，我们将直接从2018年初开始本次年度总结，如果您想了解 service mesh 在2018年前的发展历程，请先参阅2017年年度总结。

为了更有成效的完成总结，我们将以问答的方式来让下文中陆续出场的各个Service Mesh产品和解决方案提供自己的答案，问题很简单：**在2018年，做了什么？**

考虑到在2018年，Service Mesh在国内大热，有多家公司推出自己的Service Mesh产品和方案，因此本次Servicemesh 2018 年度总结我们将分为国际篇和国内篇。

## 国际篇

2018年，Service Mesh市场的主要竞争者还是2017年底的出场的几位重量级选手：Linkerd、Envoy、Istio、Conduit等。

### Istio

首先来看 Istio，这是 Service Mesh 市场当之无愧的头号网红。

2018年对于Istio来说是蓄势待发的一年，这一年Istio接连发布了 0.5、0.6、0.7、0.8 和 1.0 版本。

到2018年7月31日 1.0 GA 时，Istio其实已经陆续开发了近两年。1.0版本对Istio来说是一个重要的里程碑，官方宣称所有的核心功能现在都可以用于生产。1.0版本的到来也意味着其基本架构和API逐渐稳定，那些锐意创新的企业可以开始试用。

我们以GitHub上的star数量的角度来看一下 Istio 在2018年的受欢迎程度，下图显示的是Istio的GitHub star数量随时间变化曲线。可以看到在2018年，Istio 的star数量增长了大概一万颗，目前已经接近15000颗星，其增长趋势非常平稳。

我们来按照时间顺序回顾一下2018年Istio的几个重要版本的发布情况，以便对Istio这个目前最受关注的Service Mesh项目在2018年的发展有深入了解：

- 2018年1月31日，Istio发布0.5.0版本：支持Sidecar自动注入（需要 Kubernetes 1.9及以上版本），加强RBAC支持，尝试修改通信规则。
- 2018年3月1日，Istio发布0.6.0版本：支持发送自定义Envoy配置给Proxy，支持基于Redis的速率限制，容许为检查和报告分别设置Mixer集群，提供正式的存活以及就绪检测功能。
- 2018年3月29日，Istio发布0.7.0版本：只包含问题修复和性能提升，没有新的功能。初步支持 v1alpha3 版本的流量管理功能。
- 2018年6月1日，**Istio发布0.8.0版本**：在之前三个平淡无奇的小版本发布之后，Istio 迎来了2018年第一个重大版本0.8.0，这也是 Istio 第一个LTS（长期支持）版本，这个版本带来了大量的更新，架构方面也做了很多改进，主要有：v1alpha3 版本的流量管理功能就绪；缺省使用 Envoy 的 ADS API 进行配置发送；新增 Istio Gateway模型，不再支持Kubernetes Ingress；支持Helm 安装；支持按需安装Mixer和Citadel模块。另外原有的 API 都经过了重构，CRD 的名字全部更改。
- 2018年7月31日，**Istio发布1.0.0版本**：这是社区期待已久的版本，也是 Istio 的重要里程碑。不过相对0.8.0版本，主要是修复错误和提高性能，新功能不多。

进入2018年下半年之后，Istio的开发进度明显放缓，1.1版本的发布多次推迟，直到2018年结束也未能发布（备注：直到本文截稿日的2019年2月10日，Istio最新的版本是1.1-snapshot5）。在1.0版本发布之后的6个月时间，Istio只是以平均每个月一个Patch版本的方式陆续发布了1.0.1到1.0.5总共5个Patch版本，这些Patch版本都只有错误修复和性能改善，未带来新的特性。

简单总结 Istio 2018年的发布情况：Istio在上半年通过0.5.0/0.6.0/0.7.0三个小版本陆续进行了小改，在0.8.0版本中进行了唯一一次大改，然后年中发布了2018年最重要的里程碑1.0.0版本，接着是长达6个月的修整期，最后带着迟迟未能发布1.1版本的小遗憾平淡的结束2018年。

与产品演进和版本发布的平淡相比，Istio在市场和社区的接受程度方面表现非常火爆，成为2018年最热门的项目之一，也在各种技术会议上成为备受关注的技术新星。尤其在 Kubernetes社区，更是被视为有望继Kubernetes成功之后的下一个现象级产品。

目前各主流云平台也纷纷提供对Istio的支持：

- NetApp：2018年9月17日宣布收购成立仅3年的云原生创业公司[Stackpoint](https://stackpoint.io/)，Stackpoint Cloud 支持创建和管理安全、多云、多region的Istio Service Mesh。
- GKE：作为Istio的主要推动力量，Google自然不遗余力的支持Istio。在2018年7月Istio 1.0发布之后，Google Kubernetes Engine就提供了对Istio的支持。
- IBM Cloud Kubernetes Service：Istio作为一个开源项目，IBM主要关注流量路由、版本控制和A/B测试方面，Google专注于安全和遥测（来自[IBM云计算CTO讲述Istio项目的起源、分工及目标](http://www.servicemesher.com/blog/istio-aims-to-be-the-mesh-plumbing-for-containerized-microservices/)），IBM Cloud 于 2018 年中已提供 Istio 试用。
- [Maistra](https://maistra.io/)：2018年9月，Red Hat的OpenShift Service Mesh技术预览版上线，基于Istio。Red Hat是Istio项目的早期采用者和贡献者，希望将Istio正式成为OpenShift平台的一部分。Red Hat为OpenShift上的Istio开始了一个技术预览计划，为现有的OpenShift Container Platform客户提供在其OpenShift集群上部署和使用Istio平台的能力，为此Red Hat创建了一个名为Maistra的社区项目。

在市场一片红红火火之时，我们不得不指出，到2018年底，Istio 依然在几个关键领域上未能给出足够令人满意的答案，典型如性能、稳定性，Istio 的 1.0 版本并不是一个有足够生产强度的稳定版本。Istio 在2018年交出的答案，对于对Istio抱有非常大期待的 Service Mesh 社区来说，是远远不够的。这直接导致 Istio 目前在生产落地上陷入尴尬境地：虽然试水 Istio 的公司非常多，但是真正大规模的实践很少。

Istio 的2018年年度总结：如期发布了1.0版本，顺利完成了市场布局，扩大了己方阵营，压制了所有竞争对手。

2018年的 Istio 的表现不可谓不成功，但是离社区的期待依然有非常大的距离：关键在于未能真正实现大规模普及。如何打破这一叫好不叫座的僵局，实现真正意义上的生产落地，证明自己，将会是 Istio 2019年面临的最大挑战。

### Envoy

相比网红 Istio 在社区的红红火火和产品发布的疲软，另一位重量级选手 Envoy 则是完全不同的表现风格：低调，务实，稳扎稳打，堪称实力派。

在2017年的总结中，我们称Envoy为"波澜不惊的Envoy"，以下这段内容援引自2017年的年度总结：

> 在功能方面，由于定位在数据平面，因此Envoy无需考虑太多，很多工作在Istio的控制平面完成就好，Envoy从此专心于将数据平面做好，完善各种细节。在市场方面，Envoy和Linkerd性质不同，不存在生存和发展的战略选择，也没有正面对抗生死大敌的巨大压力。Envoy在2017年有条不紊地陆续发布了1.2、1.3、1.4和1.5版本，稳步地完善自身，表现非常稳健。

在2018年，Envoy也是同样的波澜不惊，上面这段总结几乎可以一字不变的继续在2018年沿用：只要简单的将版本号变成1.6.0、1.7.0、1.8.0和1.9.0即可。

[![Stargazers over time](https://starcharts.herokuapp.com/envoyproxy/envoy.svg)](https://starcharts.herokuapp.com/istio/istio)

这是Envoy Github Star的情况。总数7800（只有Istio的一半），其中2018年大致增加了5000个Star，而且增长趋势异常的平稳。

我们再来细看一下2018年Envoy的版本发布情况，这次我们换个特别的角度，关注一个细节：Envoy每次版本发布时，都会在Release Note中列出本版本包含的变更列表，非常细致，所以很长很长，每次都是三四页的样子。我们同时简单计算了一下每次发布包含的commit数量，整体情况如下：

- 2018年5月20日，Envoy发布1.6.0版本：包含392个commit，Release Note 长达四页
- 2018年6月21日，Envoy发布1.7.0版本：包含468个commit，Release Note 长达四页。这个版本是配套Istio 1.0版本作为 Production Ready 的 Service mesh 解决方案。全面支持RBAC鉴权模型, TLS&JWT加密，网络通信安全性有极大提升。
- 2018年10月4日，Envoy发布1.8.0版本：包含425个commit，Release Note 长达三页
- 2018年12月21日，Envoy发布1.9.0版本：包含414个commit，Release Note 长达三页

如果有兴趣去浏览Envoy在这几次版本发布时的Release Note，就可以发现Envoy在2018年中数量惊人的各种细微改进。我们也可以简单计算一下，Envoy全年四个版本大概1800次commit，考虑到Envoy在2018年并没有大规模的架构改动和特别大的新特性支持，这些commit基本都是各种完善、改进和补充。不得不惊叹于Envoy在这种细致之处刻意打磨的精神，毕竟"细节才是魔鬼"。

Envoy的稳健和成熟，在2018年带来了丰硕成果：

- 被越来越多企业使用，不仅仅稳稳占据Istio官配Sidecar的位置，而且在网络代理、负载均衡器、网关等领域开始占据传统产品的领地，如nginx、kong。
- 被 Istio 之外的多个公司的 Service Mesh 框架项目采用，如AWS的App Mesh, F5的Aspen Mesh, 微软的 Service Frabric Mesh，国内包括腾讯Tecent Service Mesh，阿里的Dubbo Mesh。**Envoy明显有成为 Service Mesh 的数据平面标准的趋势**。
- Envoy的xDS API，已经成为Service Mesh数据平面API的事实标准。

Envoy在2018年的成功，还体现在社区开始出现基于Envoy的衍生产品：

- Ambassador：构建于envoy之上的API Gateway，紧追着envoy的新版本，支持与Istio集成，可作为service mesh架构中的ingress gateway。
- Gloo：基于Envoy的Hybrid App Gateway，可作为Kubernetes  ingress controller 和API gateway，来自 [solo.io](https://solo.io)。
- Rotor：Envoy的轻量级控制平面，来自Turbine Labs（由于Turbine Labs的公司变动，这个项目已经不再维护）。
- Contour：基于Envoy的Kubernetes Ingress Controller，来自 Heptio 公司

在2017年的总结中，我们对Envoy的评价是：

> Envoy随后收获了属于它的殊荣：
>
> - 2017年9月14日，Envoy加入CNCF，成为CNCF的第二个Service Mesh项目。
>
> 可谓名至实归，水到渠成。作为一个无需承载一家公司未来的开源项目，Envoy在2017年的表现，无可挑剔。

而在2018年，Envoy继续稳健发展，一边伴随Istio一起成长，一边在各个领域开疆扩土。Envoy的成功故事在延续，并再次收获属于它的殊荣：

- 2018年11月28日，CNCF宣布Envoy毕业，成为继Kubernetes和Prometheus后，第三个孵化成熟的CNCF项目。

同样的名至实归，同样的水到渠成，Envoy在2018年的表现，同样的无可挑剔。

Envoy 的2018年年度总结，对这位低调的实力派选手，我们的评价只有一个字：稳！

### Buoyant Linkerd系列

作为 Service Mesh 的先驱，Linkerd 和 Linkerd 背后的初创公司 Buoyant 在过去两年间的故事可谓波澜起伏，面对出身豪门的网红 Istio ，Buoyant 在2017年便被逼入绝境，2018年的 Buoyant 几乎是以悲剧英雄的形象在进行各种突围尝试，寻找生路。

#### Linkerd 1.×

Linkerd的2018年，是突围的一年，作为定义Service Mesh概念的先驱，其Github Star数量在2017年底就已经被Istio超越，虽然一直有平稳增长，已经无力与Istio一较高下了。下面按照时间顺序整理一下 Linkerd1.x 版本在2018年之中的几个关键节点。

- 2018年5月1日，在持续了几个月对1.3.x版本的修修补补之后，发布了1.4.0版本，其中使用了最新版本的Finagle和Netty组件，尝试降低在大规模应用的情况下的内存占用，并开始在可观察性方面的持续改进；
- 2018年6月，宣布成立Linkerd + GraalVM工作组。尝试使用GraalVM提高Linkerd的性能。据笔者观察，其讨论到9月就已经再无更新，并且并未产生可发布的任何进展；
- 2018年7月14日发布的1.4.5中，提供了对[Open J9 JVM](https://www.eclipse.org/openj9/)的支持，声称可能降低40%的内存占用以及大幅降低p99延迟；
- 2018年10月3日，发布了1.5.0，其中有一项很值得注意的变更：Istio特性被标记为deprecated。事实上在[8月份的讨论](https://github.com/linkerd/linkerd/issues/2092)中，已经有人提出，在Linkerd 1.1.1版本之后，对Istio的支持并未进步，同时也没有明确迹象表明有用户对Linkerd数据平面结合Istio控制平面的方案感兴趣，因此Linkerd开始逐步停止对Istio的支持。

可以看到，2018年中，Linkerd的Istio Sidecar方案和GraalVM性能优化方案均已无疾而终，目前硕果仅存的是Open J9 JVM的优化版本，其测试版本还在继续发行。

#### Conduit

而诞生于2017年底的Conduit，形势稍微乐观一点，但是根据Github star的观察，表现也仅是优于同门的Linkerd，和Istio相比，仍然不在同一数量级，其更新频度非常高，基本做到每周更新，呈现了一种小步快跑的态势。当然，这种快速更新的最重要原因应该就是其相对稚嫩的状态，和成熟的Linkerd相比，Conduit还只是刚刚起步，下面也根据Release情况看看2018年里 Conduit 项目的进展：

- 2018年2月1日，发布Conduit v0.2.0，提供了TCP和HTTP的支持；
- 2018年2月21日，发布v0.3，宣布进入Alpha阶段，为负载均衡功能提供了负载感知的能力；
- 2018年4月17日，发布v0.4.0，提供了对MySQL和SMTP的透明支持能力；
- 2018年6月5日，发布v0.4.2，支持全部Kubernetes Workload；
- 2018年7月6日，发布最后一个Conduit版本，v0.5.0，提供了Web Socket支持，加入自动TLS支持，更名为Linkerd 2.0；

#### Linkerd 2.×

很明显，在2018年年中，Buoyant 意识到继续同时支撑 Linkerd1.x 和 Conduit 两条产品线已经不合时宜。而且 Linkerd1.x 的硬伤太过明显：

- 基于Scala/JVM的数据平面，在性能和资源消耗方面，对阵基于 c++ 而且表现异常成熟稳重的 Envoy，毫无优势。在2018年针对 Linkerd 1.× 的各种性能优化无疾而终之后，答案已经很明显：Linkerd 1.× 已经不再适合继续用来作为数据平面。
- 相对 Istio 强大的控制平面，Linkerd 1.x 在控制平面上的缺失成为关键弱点。尤其 Linkerd 1.x 晦涩难懂的 dtab 规则，面对 Envoy 的 xDS API，在设计和使用上都存在代差。
- 而以 Linkerd 为数据平面去结合 Istio 控制平面的设想，在经过一年多的尝试后无奈的发现：这个方案根本没有市场。

因此，合并产品线，放弃 Linkerd 1.×，将力量集中到 Conduit 这个未来方案就成为自然选择。而 Linkerd 原有的市场品牌和号召力，还有 CNCF 项目的地位也应该保留，因此，Buoyant 选择了在2018年7月，在 Conduit 发布 v0.5.0 时将 Conduit 更名为 Linkerd 2.0。

Linkerd 2.x 版本的目标则具有很明确的针对性：提供一个轻量级、低难度、支持范围有限的Service Mesh方案，9月份宣布GA并得到客户采用，证明这一策略还是行之有效的。

- 2018年9月18日，Linkerd 2.0宣布被WePay、Hush、Studyo以及JustFootball采用，进入GA阶段；
- 2018年12月6日，Linkerd 2.1发布，推出了路由级的遥测能力。更重要的是，提出了Service Profile的概念，这一概念以服务为中心，将服务相关的大量CRD聚合成统一一个，对服务网格的管理无疑是一个强大助益。

2018年底提出的Service Profile概念，虽然只是一个雏形，目前仅提供了一点监控方面的功能，但是其Roadmap中指出，日后将会把大量特性集成到Service Profile之中，笔者认为相对于Istio的Mixer适配器模型来说，这一概念能够极大的降低运维工作难度工作量，并有效的简化服务网格的管理工作。

在 Istio 封锁了 Service Mesh 的门之后，经过一年摸索和碰壁，Linkerd2发现了Service Profile的这扇窗，可以说是尚存希望。

#### 对Buoyant的总结

作为 Service Mesh 的业界先驱，Buoyant 在早期有非常大的贡献和成就，但是在 Istio/Envoy 发起的强力攻势面前，几乎没有招架之力。2018年，如果不是 Istio 因为自身原因在产品发展上表现疲软留给了 Buoyant 一线生机，Buoyant 几乎无立足之地。

回顾2017年和2018年 Buoyant 的表现，笔者的看法是 Buoyant 的问题主要体现在对竞争对手和对自己的认知都不够清晰，导致在产品策略上接连犯错：

- 在 Istio 出来之前，面对 Envoy，Linkerd 1.× 系列的劣势就很明显，只是 Linkerd 作为市场上第一个 Service Mesh 类产品，光环太盛，遮挡了社区和客户的视线，但是 Buoyant 自己不应该迷失。面对强力竞争对手，未能及时反思并调整布局，这是 Buoyant 犯下的第一个错误。没能意识到自身的不足，导致后面在数据平面上始终被 Envoy 遥遥领先。
- 在 Istio 出来之后，在原有数据平面对阵 Envoy 已经存在劣势的前提下，控制平面也出现代差，还有 Google 和 IBM 站台导致原来面对 Envoy 的市场宣传和社区支持的优势也荡然无存。此时 Buoyant 就应该彻底反省并给出全新方案，但是 Buoyant 当时的选择是让 Linkerd 作为数据平面去兼容 Istio，而未能在控制平面上及时发力。
- 2017年底，Conduit 的推出本来是一步好棋，2017年年底和2018年年初 Istio 表现糟糕，甚至有些混乱，Conduit 的推出也符合社区希望存在良性竞争的心态。然而 Conduit 的数据平面采用 Rust 语言，虽然性能表现卓越，但是过于小众，导致来自开源社区的 contributor 数量极其稀少，根本无法从社区借力。
- 2018年，在推出 Conduit 之后，迟迟不肯放弃 Linkerd 1.×，直到2018年年中才在各种尝试无效之后最终选择放弃 Linkerd 1.×。其实这个决定，本可以在更早的时间点做出。

由于 Envoy 在数据平面上的优越表现，和 Buoyant 在产品策略上的接连失误，使得2018年的 Linkerd 1.× 、Conduit 、Linkerd 2.× 一直都 Envoy 的阴影中苦苦追赶，始终无法在控制平面上对 Istio 形成实质性威胁。

2018年对 Buoyant 及旗下的Linkerd系统的总结是：犹豫太多，决心下的太晚，新产品缺乏吸引力足够大的亮点，前景很不乐观。

2019年，对 Buoyant 来说，很有可能是生死存亡的一年，用我们熟悉的一句话说：留给 Buoyant 的时间已经不多了。

### 其他产品

在前面的内容中，我们用了很多的篇幅来总结 Buoyant 面对 Istio + Envoy 组合的种种应对之策，而这个话题，对于任何希望出现在 Service Mesh 市场的玩家来说，都是一个避无可避的问题。

接下里我们将列出，在 Istio、Envoy 和 Linkerd系列这些主要竞争者之外，Service Mesh 市场上陆陆续续出现的来自各家公司的参与者：

- Nginmesh：来自大名鼎鼎的nginx，在2017年9月nginx对外宣布了这一产品，是一款适配Istio的service mesh方案，使用NGINX作为sidecar替换Envoy。但nginx在Nginmesh上的态度摇摆不定：在2017年下半年发布了3个小版本之后就停止开发。2018年重新启动，接连发了几个小版本，但是在2018年7月发布0.7.1版本之后，再次停止开发。

  总结：Envoy 是座大山，是条鸿沟，在数据平面试图正面挑战 Envoy，需要非常大的努力和投入。这本是一个非常严肃的话题，而 nginmesh 一直摇摆不定没有持续投入，在勤勉的 Envoy 面前不会有机会的。

- Consul Connect：Consul来自HashiCorp公司，主要功能是服务注册和服务发现，基于Golang和Raft协议。在2018年6月26日发布的Consul 1.2版本中，提供了新的Connect功能，能够将现有的Consul集群自动转变为Service Mesh。亮点是可以提供自动的双向TLS加密通信以及基于唯一标识的权限控制。

  总结：Consul 的方案，一直以来社区都没啥反馈。不好评价，让时间说话吧。

- kong：在2017年就有传闻说kong有意service mesh，但一直不见kong的明确动作。在2018年9月，kong宣布1.0发布之后kong将转型为服务控制平台，支持Service Mesh。关于kong到底会不会投身service mesh的悬念也就一直贯穿整个2018年度，直到12月21日，kong 1.0 GA发布时才明确给出：kong可以部署为独立的service mesh proxy，开箱即用的提供service mesh的关键功能，并集成有 Prometheus、Zipkin，支持健康检查，金丝雀发布和蓝绿部署等。

  总结：Kong作为一个从API网关演变而来的 service mesh 产品，背靠成熟的OpenResty，虽然相对 istio + envoy 在功能性上稍显不足，不过胜在简单、可扩展性强，比较适合中小型团队以及以前 kong 的老用户试水 service mesh。考虑到 kong 社区比较活跃，也许能走出一条和 Istio 不同的道路。

- AWS App Mesh：AWS APP Mesh是AWS今年在re:Invent 2018大会上发布的一款新服务，旨在解决在AWS上运行的微服务的监控和控制问题。它主要标准化了微服务之间的通信流程，为用户提供了端到端的可视化界面，并且帮助用户应用实现高可用。App Mesh 使用开源的 Envoy 作为网络代理，这也使得它可以兼容一些开源的微服务监控工具。用户可以在 AWS ECS 和 Amazon EKS 上使用 App Mesh。从官网放出的流程图可以看出，App Mesh 是对标 Istio。目前App Mesh提供公开预览。

  总结：AWS APP Mesh 的选择，和 Buoyant 的 Linkerd 系列完全相反，选择 Envoy 作为数据平面，从而避免和 Istio 在数据平面进行竞争，毕竟 Envoy 珠玉在前，而数据平面又是最为考验技术底蕴和细节完善，费时费力。AWS APP Mesh 可以集中精力主攻控制平面，趁 Istio 还未完全成熟之时，依托AWS 完善的体系力求在 Service Mesh 领域有自己的一席之地。AWS APP Mesh 支持客户在 EC2 和 Kubernetes 环境下同时部署应用并能实现相互访问，一旦成熟，将有可能是一个大卖点。

- Aspen Mesh：来自大名鼎鼎的F5 Networks公司，基于Istio构建，定位企业级服务网格，口号是”Service Mesh Made Easy”。Aspen Mesh项目据说启动非常之早，在2017年5月Istio发布0.1版本不久之后就开始组建团队进行开发，但是一直以来都非常低调，外界了解到的信息不多。在2018年9月，Aspen Mesh 1.0发布，基于Istio 1.0。注意这不是一个开源项目，但是可以在Aspen Mesh的官方网站上申请免费试用。

  总结：这代表着 Service Mesh 市场上的另外一种玩法，依托 Istio 进行订制和扩展，提供企业级服务。如果 Istio 能如预期的实现目标，成为新一代微服务，成为连接云和应用的桥梁，则未来很可能会有更多的公司加入这一行列。

- SuperGloo：这是由初创公司 solo.io 发起的开源项目，作为一款服务网格编排平台，目前可以管理Consul、Linkerd和Istio，SuperGloo的目标是在降低服务网格的复杂性的同时最大化采纳服务网格的收益，SuperGloo帮助用户快速获得服务网格的经验，接管服务网格中的一些关键功能，统一了Ingress 流量（南北向）和网格流量（东西向）的管理，为自由组合任何服务网格和Ingress打开了大门。

  总结：这是一个令人瞠目结舌的疯狂想法，在服务网格还在努力证明自己能行，我们这些先行者还在努力试图说服更多的人接受这一新鲜事物时，SuperGloo 又往前大大的迈进了一步。服务网格编排，我们暂时无法评论说这是高瞻远瞩，还是脑洞大开，还是留给时间和市场吧，或许2019年我们再次进行年度总结时形势能明朗一些。

从社区的角度，我们希望有更多的参与者进Service Mesh市场，以推动Service Mesh的健康发展。但是实际情况是，在Istio的光辉之下，新晋产品的发展前景都不太客观，是和Istio全面对抗？还是另辟蹊径寻找适合自己的生存空间？是每个产品都要面对的问题。

### 国际篇小结

Envoy 和 Linkerd 都可以说是目前 Service Mesh 产品的先驱，然而在刚刚过去的2018年中，其处境差距却不啻云泥：Istio借力Envoy，凭借其强大的号召能力和优秀的总体设计，干净利落的将Linkerd打落尘埃。然而Istio在占领Service Mesh的注意力聚焦之后，在整个2018年中，其发布进度表现出令人印象深刻的拖沓。

Service Mesh这一技术的广阔前景，加上Istio的疲弱表现，吸引了更多对此技术具有强烈需求或相关技术储备的竞争者出现，除了 AWS 、 F5这样的公有云方案，以及Consul、Kong等同类软件解决方案，还出现了Solo.io这样的更加激进的跨云方案加入战团。

Service Mesh技术的浪潮已将业界席卷其中，然而这一年来，角逐者有增无减，2019年里，Istio仍是关键——除非Istio能够做出符合顶尖项目的水准，否则，Service Mesh技术很可能会以多极化、市场细分的形式落地。

## 国内篇

2018年，国内在Service Mesh方面也投入了很大的力量，包括蚂蚁金服、腾讯、阿里、华为、微博等都研发了自己的Service Mesh产品。这里简单介绍一下它们的技术选型及在2018年所做的工作。

### 蚂蚁金服 SOFAMesh+SOFAMosn

蚂蚁金服是目前国内 Service Mesh 领域的领头羊，高度认可 Service Mesh 的前景，脚踏实地的在准备 Service Mesh 的大规模落地，决心和投入都非常大。

蚂蚁金服的Service Mesh解决方案目前主要有两个产品组成：

- [SOFAMesh](http://github.com/alipay/sofa-mesh)项目：蚂蚁金服 Service Mesh 的控制平面，跟随社区，Fork 自 Istio，保持同步更新。在Istio体系和框架内进行功能补充/扩展/增强/改进，立足于探索并解决 Istio 生产落地，尤其是大规模落地中遇到的实际问题，包括对各种RPC通讯协议的支持，对单进程多服务的传统SOA服务的支持。为了满足公有云上对客户提供 Service Mesh 托管服务，还提供了多租户的支持。
- [SOFAMosn](http://github.com/alipay/sofa-mosn)项目：蚂蚁金服新型基础设施和中间件的底层网络通用解决方案，可以有多种产品形态，2017年底启动，基于Golang开发。在蚂蚁金服 Service Mesh 中承担数据平面的角色，和 SOFAMesh 项目配合使用，兼容 Istio 体系。此外 SOFAMosn 还将用于 Ingress / API Gateway / Serverless Function Gateway 等场景，以及Message Mesh等其他形态的Mesh，成为蚂蚁金服未来Mesh网络的核心组件。

以上两个产品都已经于2018年7月在 GitHub 开源。

经过2018年的开发和小规模落地使用，目前 SOFAMosn 和 SOFAMesh 项目都已经基本成型，2019年即将在蚂蚁金服大规模落地，支撑蚂蚁金服上云的战略目标。其中SOFAMesh还将在蚂蚁金融云上以 Service Mesh 托管服务的形式为客户提供支持，充分结合云和Service Mesh的优势。

### 新浪微博WeiboMesh

WeiboMesh 是微博内部跨语言服务化解决方案，目前已经在微博多条业务线上得到广泛使用，这其中不乏热搜、话题等核心项目。 2018 年 WeiboMesh 核心方向是从内部场景提炼实际业务需求，推动大规模业务低成本接入 Mesh 体系，其主要工作包括：

- 强化了管理端口，提供了基于不同维度的 Mesh 管理方式（维护调试、服务管理/Mesh 注册中心等）
- 优化，并丰富了 Mesh 控制平面的功能，提供了 Tracing、熔断，限流等功能
- 提供 HTTPMesh 方案，支持 HTTP 与 RPC 服务之间的交互，进一步降低接入门槛
- 支持了基于 MC 协议的 CacheService，在资源服务化方面迈出重要一步
- 提供了 Python、C++ 语言的支持

### 华为Mesher与ASM

Mesher基于华为开源的ServiceComb，ServiceComb是一个java与go语言的微服务编程框架， 在2017年底加入的Mesher补充完善了微服务解决方案。

在生产中得到了验证后， 华为在8月份开源了Mesher，以完善ServiceComb开源生态。从发展目标来看，Mesher并不只支持Kubernetes， 而是支持任意的基础设施，包括容器，虚拟机等。并且让ServiceComb支持异构的注册中心管理，可以统一的在一个service center中发现不同基础设施，不同数据中心的微服务，以此来更好的支持混合云场景。

华为云 Istio 团队在 Istio 生态上投入了很大力量，并基于 Istio 发布了自己的ASM（Application Service Mesh），ASM深度集成华为云容器服务CCE(Cloud Container Engine)，提供非侵入的智能流量治理解决方案，包括负载均衡、熔端、限流等多种治理能力。内置金丝雀、蓝绿等多种灰度发布流程，提供一站式自动化的发布管理。基于无侵入的监控数据采集，整合华为云APM能力，提供实时流量拓扑、调用链等服务性能监控和运行诊断，构建全景的服务运行视图。ASM于2018年8月对外公测。

### 阿里Dubbo Mesh

Dubbo Mesh为阿里自研的服务化框架Dubbo的Service Mesh组件，其技术选型为：

- 数据平面选型Envoy。Envoy所定义的、被广泛接受的xDS协议能够很好地体现了Dubbo对Service Mesh具有“规范化”作用的理解。
- 控制平面选型Istio的Pilot组件。以Istio目前的架构设计和结合阿里巴巴集团已有软件资产的现状，其整体并不足以承载起对Service Mesh的要求。然而，其中的Pilot组件的平台抽象设计、对Envoy xDS协议的实现能很好地加速Service Mesh在阿里巴巴集团生产环境的落地。

接下来，Dubbo Mesh将进一步组合阿里巴巴集团已开源出来的各种组件去增强其监管控能力。比如，通过将Sentinel的能力纳入到Dubbo Mesh，能很好地补全限流、降级和熔断的能力。

### 腾讯Tencent Service Mesh

腾讯service mesh属于腾讯内部的下一代微服务技术中台，在腾讯内部业务如广告平台等得到充分的验证，并随腾讯云微服务平台（TSF）于2018年6月上线内测，随后在9月集成了Istio 1.0并发布了里程碑版本，产品将于2019年1月全面公测。

产品技术选型上，控制面选用了集百家之长的istio，数据面则选用了成熟稳定的高性能边缘代理envoy。

在开源之上，腾讯云根据业务现状及客户诉求做了以下扩展及改造：

- 支持多计算平台集成。能支持虚拟机，物理机的服务自动接入Service Mesh
- 支持多服务框架互通。能同时支持SpringCloud与Service Mesh业务进行互通
- 支持分布式服务寻址。业务可以通过服务名直接接入Service Mesh框架

### Service Mesh衍生产品

除了完整的Service Mesh产品之外，国内也出现了一些基于Istio的外围项目，如：

- Naftis：小米武汉研发中心推出的管理Istio任务的Dashboard，用Istio治理服务时须通过istioctl或kubectl，这种方式可能存在一些问题。Naftis通过任务模板的方式来帮助用户更轻松地执行Istio任务。用户可以在 Naftis中定义自己的任务模板，并通过填充变量来构造单个或多个任务实例，从而完成各种服务治理功能。
- Istio-ui：Istio的简易UI，它是jukylin的个人项目，其初衷是线上几百个istio配置文件管理会很麻烦，而官方和社区并没有给出解决方案。在此基础上，结合当前服务环境，增加了校验，注入，模板等功能。

### 国内篇小结

从上面的介绍可以看到，国内在 Service Mesh 领域上和国际靠的很近。

技术社区方面，在Service Mesh诞生不久，国内就出现了 Service Mesh 的爱好者、交流社区、布道师，诞生了 [ServiceMesher](http://www.servicemesher.com) 这样专业而专注的垂直技术社区，极大的促进了 Service Mesh 技术在国内技术社区的普及和发展。以InfoQ为代表的技术媒体也对 Service Mesh 这一新兴技术给予了高度关注，在 QCon/ArchSummit 等国内顶级技术峰会上经常可以看到 Service Mesh 相关的演讲主题。

在产品方面，以蚂蚁金服、新浪微博、华为、阿里、腾讯等公司为代表的国内互联网公司，以多种方式给出了符合自身特点的 Service Mesh 产品，思路和打法各有不同。

具体说，在数据平面上有三种流派：

1. 选择 Envoy，如腾讯Tencent Service Mesh、阿里Dubbo Mesh
2. 自行开发，如新浪微博WeiboMesh、华为Mesher
3. 也是自行开发，但是和 Envoy 或者说 Istio 兼容，如蚂蚁金服SOFAMosn

其中，自行开发的数据平面，无一例外的选择了Golang语言，这一点上倒是容易理解：c/c++直接用Envoy；Java、Scala等由于JVM的原因，在资源消耗上不太适合，Linkerd前车之鉴；Rust之类又实在太小众，同样Conduit前车之鉴。

Golang在各方面比较均衡，成为c/c++之外数据平面的最佳编程语言选择。只是，如前所述，Envoy 的优越表现使得 Service Mesh 数据平面的竞争过早的偏向 Envoy，而 Buoyant 在数据平面编程语言的选择上，先有过于保守的Scala，后是过于激进的Rust，错失各方均衡的Golang，令人叹息。

在控制平面上，也是三种流派：

1. 自行开发，如新浪微博WeiboMesh、华为Mesher
2. 依托Istio进行扩展和订制，如蚂蚁金服SOFAMesh，华为ASM
3. 只重用 Istio 的 Pilot 组件，将 Pilot 从 Istio 中剥离出来配合 Envoy 使用，弃用 Mixer 和 Citadel。如腾讯Tencent Service Mesh、阿里Dubbo Mesh。这个选项的存在，一方面和国内 Kubernetes 普及程度不高而 Istio 目前基本绑定 Kubernetes 平台有关，另一方面也是对 Istio 中 Mixer、Citadel 两大组件的质疑。

2018年国内 Service Mesh 的发展情况，总体上说是多方参与，各种落地和探索，技术社区反应热烈，对于一个新兴技术而言已经是非常理想的状态。当然受限于 Service Mesh 的发展阶段，目前还远没有达到全面普及的程度，还有待于当前 Service Mesh 产品的进一步成熟与完善。

## 总结

Service Mesh 在2018年虽未能如预期的全面走向成熟，未能如Service Mesh 爱好者们所期待的成为 "the year of  Service Mesh" ，但是整体上 Service Mesh 的发展势头还算不错：Envoy、Istio日渐成熟，Linkerd 2.× 也在推进，而国内也出现了多个产品，其中蚂蚁金服、华为等的投入还非常可观。对 Service Mesh 来说，2018年是蓄势待发的一年。

回顾2017年的年度总结，在结尾处展望2018年 Service Mesh 的发展时，这样写到：

> 2018年对Service Mesh而言，必然不是一帆风顺，必然是充满荆棘和坎坷的。如何实现从技术理念到产品落地，如何实实在在地解决实践中遇到的各种问题，将会是这一年中至关重要的事情。

今天，我们回顾2018年的 Service Mesh，会发现的确如去年预期的，2018年 Service Mesh 市场上的几个主要产品，都还在产品落地和生产实践上努力探索。只是这个过程，比我们预期的要慢一些，遇到的问题也比预期的要多一些，以至于在2018年结束时，我们未能看到一个梦寐以求的完美答案，而不得不将对 Service Mesh 的美好期许，留待2019。

2019年的Service Mesh，将会继续充满艰辛和痛苦，将需要更多的努力与执着。落地，落地，落地，将会是2019年 Service Mesh 的主旋律。我们满怀希望，我们拭目以待！
