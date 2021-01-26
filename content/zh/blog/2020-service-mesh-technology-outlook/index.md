---
title: "2020 年 Service Mesh 技术展望"
date: 2020-02-02T10:36:06+08:00
draft: false
image: "/images/blog/006tKfTcgy1ftpp63o2m2j31ji15okjm.jpg"
author: "罗广明"
authorlink: "https://guangmingluo.github.io/guangmingluo.io/"
description: "本文由 ServiceMesher 社区治理委员与业界知名大牛针对 Service Mesh 技术发表的看法汇总而成。"
tags: ["service mesh"]
categories: ["service mesh"]
keywords: ["service mesh","istio"] 
type: "post"
avatar: "/images/profile/luoguangming.jpg"
profile: "百度云原生技术专家、云原生技术布道师，ServiceMesher 社区管委会成员，Istio Handbook 作者之一，对 Spring Cloud、Istio 以及微服务中间件有深入研究。"
---

## 背景

有[外文](<https://thenewstack.io/the-top-3-service-mesh-developments-in-2020/>)指出，2020 年 Service Mesh 技术将有以下三大发展：

- 快速增长的服务网格需求；
- Istio 很难被打败，很可能成为服务网格技术的事实标准；
- 出现更多的服务网格用例，WebAssembly 将带来新的可能。

针对 Service Mesh 技术，ServiceMesher 社区治理委员会成员在 2020 新年伊始发表了他们各自的看法，并邀请云原生与服务网格领域业界大牛抒发各自的见解，汇总成文，希望能给读者们带来一些思考和启发。

## 正文

### 宋净超（蚂蚁金服）

用一句话概括 Service Mesh 近几年的发展——道阻且长，行则将至。这几年来我一直在探寻云原生之道，从容器、Kubernetes 再到 Service Mesh，从底层的基础设施到越来越趋向于业务层面，Service Mesh 肯定不是云原生的终极形式，其复杂性依然很高，且业界标准也尚未形成，它的发展也远没有同期的 Kubernetes 那么顺利，但是很多人都已意识到了服务网格价值，现在它正在远离最初市场宣传时的喧嚣，走向真正的落地。

### 罗广明（百度）

据了解，2020 年的 Kubecon EU 的提案中，很少有涉及服务网格落地场景，由此来看，服务网格技术离大规模生产落地还有很远的路要走。当前 Istio 架构体现出来的性能问题迟迟没有得到优化，使用原生的 Istio 大规模上生产还不太靠谱，有的公司选择将 mixer 功能下层至自研的数据面，有的公司通过向容器注入探针解决可观察性。总的来看，在当前服务网格部分落地场景中，大多都是基于 Istio 和 envoy，但对其或多或少都有改动，以满足公有云/私有云的需求。

此外，在 Service Mesh 落地的过程中，现有传统微服务应用（Spring Cloud/Dubbo 应用）如何平滑迁移到 Service Mesh，也是一个至关重要的话题。“双模微服务”的互联互通、共同治理有望成为 2020 年服务网格落地的关键技术之一，这也是国内几家典型云厂商力求打造的亮点产品。

### 马若飞（FreeWheel）

我个人认为 Service Mesh 想要真正发展成熟并大规模落地还有很长的一段路要走。一方面业界基于微服务构建的一系列服务治理框架和产品相当稳定和成熟，在功能上和 Service Mesh 有很多重合的地方，使得开发者对 Service Mesh 的需求并不迫切；另一方面，目前 Service Mesh 领域产品的成熟度还有待提高，冒险迁移过于激进，也容易面临兼容性的问题，这也制约了 Service Mesh 的落地。

从近半年厂商的动作来看，主要方向是提供托管的控制平面，并整合成熟的数据面（如 Envoy）；同时提供多环境支持（如多云、混合云、VM 等）。这也和目前应用复杂多样的的部署现状有关，厂商的目的是先让你上云，再 Mesh 化。这也是一个相对稳妥且折中的方案。我司作为一个重度使用 AWS 服务的公司，选择了 AWS App Mesh 托管服务作为 mesh 的解决方案，使得和现有服务能更容易的整合，减少维护和迁移成本。

### 邱世达  (BoCloud)

目前来看，Kubernetes 已经逐步在企业中落地，服务上云已然是大势所趋。而随着云计算基础设施层的日益完备，在可以预见的未来，应用层服务治理必然成为新的焦点，也是在大规模微服务场景下必须要解决的问题。在 Service Mesh 领域，Istio 无疑是明星项目，除了具备一定自研能力的科技公司会定制开发自己的服务治理工具，大多数中小型企业通常会选择以 Istio 为代表的开源服务治理方案进行初步试水。实践过程中遇到问题并不可怕，我认为这反而是一种正向推动力，作为一种良性反馈，能更加积极地促使 Service Mesh 技术趋于成熟和稳定。拥抱服务网格，拥抱云原生，让我们期待 Service Mesh 在新的一年取得更大的发展！

### 孙海洲（中国科学院计算技术研究所）

对于 Service Mesh 来说，2019 年是极不平凡的一年，也是从观望走向生产落地的一年。在这一年里，以 Istio 为代表的 Service Mesh 开始加快发布周期，可以看到社区从以优雅架构到开始追求性能。最近社区里大家积极地参与到 Istio 文档的本地化工作中。在业界可以看到国内各个大厂开始有所举动，蚂蚁在双十一的成功大规模落地为 Service Mesh 走向生产打下了坚实的基础，同时也为大家提供了很多宝贵的经验，腾讯、百度、华为等云服务提供商也都纷纷发布相关的产品。关于 Service Mesh  的图书在今年也出版了几本，社区多次组织线下的 Service Mesh Meetup 场场爆满，可见大家对 Service Mesh  的热情与日俱增。2020年应该可以看到会有更多的 Service Mesh  的成功落地，但是当前还有很多企业还处于过渡时期，如何更好更便捷地解决向云原生迁移依赖值得关注。Service Mesh  社区的推广和布道工作依然任重而道远，需要我们更加积极努力地投入到 Service Mesh  事业中去。

### 赵化冰（中兴通讯）

在 2019 年里，我看到的一个有趣的现象是出现了各种各样的开源 Service Mesh 项目，基于开源 Service Mesh 项目的初创公司，以及各大云厂商的闭源 Service Mesh 实现。和 2018 年大部分项目围绕 Istio 搭建生态有所不同（至少大部分项目声称自己兼容 Istio），2019年整个 Service Mesh 生态出现了百花齐放，百家争鸣的趋势。这也许和 Istio 项目的进度有一定关系。Istio 在项目最开始发布时搭建了一个非常漂亮的架构，但实际开发的进展较慢。目前 Mixer V2 还没有能够正式发布（处于 alpha 版本）， 其安全模型也在近期进行了较大的变动，导致除了流量管控之外的其他功能基本无法在生产中使用；除此之外，Istio 对于非 Kubernetes 环境的支持也非常有限。所有这些因素在一定程度上给其他 Service Mesh 项目留出了较大的发展空间。

在 Service Mesh 的不同实现纷纷涌现的情况下，要最大化利用 Service Mesh 提供了服务通信和管控能力，必须统一 Service Mesh 的标准接口。通过一个标准北向接口，对 Service Mesh 提供的流量控制，安全策略，拓扑信息、性能指标等基本能力进行组合，并加以创新，可以创建大量端到端的高附加值业务，例如支持业务平滑升级的灰度发布，测试微服务系统健壮性的混沌测试，微服务的监控系统等等。而采用一个标准的南向接口，则可以构建一个良好的数据面代理生态，甚至可能将一些传统的硬件代理设备纳入 Service Mesh 控制面进行统一管理。

在 2020 年里，我希望 Istio 项目在 telemetry 和 security 方面取得更多实际性的进展，并出现更多的商用案例。希望能够制定一个 Service Mesh 的标准接口,或者出现一个足够强大的事实标准，并看到建立在标准北向接口上的更多应用，这是 Service Mesh 的核心价值所在，也许会成为 Service Mesh 的下一个热点。

### 钟华（腾讯云）

还记得 2019 年初，我们对打磨半年之久的 Istio 新版本翘首以盼，大家对 Istio 的高度抽象模型褒贬不一，社区里偶尔会看到朋友问「到底有没有公司在生产环境落地了 Istio？」

在过去的一年里，Istio 持续发力，核心功能迭代更加稳定，发布了四个子版本，同时也更注重用户体验的优化。各大云厂商在 2019 年陆续实现了对 Istio 的支持，业界也出现了越来越多的 Service Mesh 生产实践，其中典型的是蚂蚁双十一大规模落地案例；笔者所在的腾讯云 TKE Mesh 团队，支持了数十个团队的 Service Mesh 改造过程，其中不乏一些场景复杂、体量庞大的核心系统。

Service Mesh 技术前景广阔，但远未成熟。展望 2020， 作为 Service Mesh 头号玩家的， Istio 还会持续快速发展，我个人很期待的一些演进： 支持 webassembly 扩展的数据面，真正生产可用的 Mixer V2，更易安装和运维的单体控制面 istiod，更容易理解和操纵的用户接口，以及提升 Istio 自身的可观测性。

Service Mesh 技术本质上是各种最佳实践的组合运用。Istio 试图运用精巧的模型，去联结各种平台、观测系统和用户应用。未来的 Istio，一定会更加复杂，这些「复杂」的目的，是让用户能更「简单」地使用 Service Mesh 领域的最佳实践。

### William Morgan

> Buoyant CEO, author of Linkerd，the originator of the concept `Service Mesh`.

今天的服务网格处于有点不幸的状态：虽然有真实和重要的价值，但市场营销已经超过了技术本身。云供应商特别利用服务网格作为区分他们的容器产品的一种方式，而由此产生的狂热的市场推广给终端用户带来了实质性的损害。

然而，如果应用正确，服务网格确实能提供一些真正变革性的功能。从 Linkerd 的角度来看，创建服务网格的项目，我们仍然认为最小化服务网格的成本，特别是由复杂性引起的长期运营成本是最重要的。

在2020年，Linkerd 将继续专注于提供“可观察的安全性”的目标，同时最小化复杂性和使用成本 — Linkerd 的超轻、超快 Rust 代理、极简控制平面，以及“少做，而不是多做”的理念已经在这里得到了鲜明的体现。最重要的是，Linkerd 对开放治理和中立基础的承诺将确保 Linkerd 将继续成为一个为所有工程师服务的项目，而不是为某个特定云供应商的客户服务。

### Christian Posta

> Field CTO at solo.io, author Istio in Action and Microservices for Java Developers, open-source enthusiast, cloud application development, committer @ Apache, Serverless, Cloud, Integration, Kubernetes, Docker, Istio, Envoy blogger, blog <https://blog.christianposta.com/>.

#### 回顾2019

- 更多的Service Mesh产品发布了！API/软件网络领域的每个人都正在实践自己的服务网格。我认为这对市场来说是一件好事，因为它表明这是有价值的，并且应该探索不同的实现方式。这也将指引我们在未来殊途同归。
- 越来越多的组织参与到服务网格技术中（从去年的架构讨论开始）可用性是关键！像linkerd这样的网格技术展示了如何简化使用和操作，其他产品也注意到了这一点，并尝试提高它们的可用性。
- Istio已经持续的进行定期发布，这证明了它开始走向稳定并具有可预测性。
- Consul推出了和consul模型无缝结合的L7路由特性。
- 不可忽视，虽然更多的人开始着手服务网格技术的实践，但依然有很多争议：
  - 谁来支持？
  - 多租户支持的不好
  - 对现有应用不总是透明的
  - VM+容器支持不够好
  - 暴露什么样的API给用户

#### 2020年展望

服务网格在2019年引领了潮流，我期待它能变得更加强大。2020年，会有更多的组织落地服务网格，继续与现有的网格技术集成，如Istio和其他产品：

- 多网格的存在！虽然现在已经有很多网格实现，但最终还是会收敛的。然而，有趣的是，我不认为融合会像kubernetes那样发生（我们都落在一件事情上）。我怀疑总会有多种服务网格实现会成为主流。每个云提供商都有自己的托管网格产品，这可能与本地网格不同。因此，多集群和网格的多分布将成为主要的部署实现。
- Web assembly正在流行：它提供了一种在类似Envoy这样的代理中安全地运行用户代码的方法，我们将很快看到服务网格和API网关，如istio和gloo对它提供支持。Web assembly将允许用户/供应商/组织提供功能模块，用以定制化代理并改变其默认行为。Web assembly 工具集将开始出现并对其进行管理。对于那些努力将服务网格集成到现有环境并维护组织兼容性的人来说，这将是令人兴奋的。
- 优化服务网格数据平面：去年我在第一个ServiceMeshCon演讲（PPT：<https://www.slideshare.net/ceposta/the-truth-about-the-service-mesh-data-plane>）讨论了如何在服务网格数据平面进行调优，就像直接运行你的代码一样。作为代理，和共享的代理。例如，gRPC最近增加了对[xDS API](https://github.com/grpc/proposal/pull/170)的支持， CNCF也有一个工作组来帮助将这个“通用数据平面API”标准化以用于其他用途：<https://github.com/cncf/udpa>。

