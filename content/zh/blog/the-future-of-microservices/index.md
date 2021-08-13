---
title: "微服务的未来——更多层抽象"
description: "在进入微服务时代的十年里，思考一下我们已经走到了哪一步，以及我们还需要解决哪些问题是很有意思的。"
author: "[Charles Humble](https://thenewstack.io/the-future-of-microservices-more-abstractions/)"
translator: "[宋净超（Jimmy Song）](https://jimmysong.io)"
image: "images/blog/future-microservices.jpg"
categories: ["其他"]
tags: ["microservices"]
date: 2021-08-13T17:05:42+08:00
type: "post"
---

本文译自 [The Future of Microservices? More Abstractions](https://thenewstack.io/the-future-of-microservices-more-abstractions/)，作者是的主编 Container Solutions 的主编 Charles Humble。

[微服务](https://thenewstack.io/category/microservices/)是在 10 年前出现的，是软件融合进化的例子之一。虽然这个词可以归功于软件咨询公司 [Thoughtworks](https://www.thoughtworks.com/) 的 [James Lewis](https://twitter.com/boicy) 和 Martin Fowler，[Adrian Cockcroft](https://www.linkedin.com/in/adriancockcroft/) 也曾提出类似的想法。但当时在 Netflix 和许多硅谷的其他公司，如亚马逊、Google 和 eBay 等公司大致在相同的时间内独立搭建了或多或少相同的架构模式。

在这个词诞生后的十年里，我们看到了 Kubernetes、服务网格和无服务器的兴起，我们也开始看到微服务被应用到了前端。除了可以横向扩展，微服务还可以让开发人员更快地部署代码，有利于组件的可替换性而不是可维护性。

无论好坏，对许多人来说，微服务已经成为默认的架构选择。对于拥有自主团队和松散耦合系统的组织来说，微服务可以很好地工作，但它们带来了所有分布式系统都无法逃避的复杂性。

“我坚决认为公共云比私有云和数据中心更好，这些好处是一目了然的。在许多情况下，是恐惧让人们畏缩不前。“独立技术顾问 [Sam Newman](https://www.linkedin.com/in/samnewman/) 告诉 The New Stack，他的 [Building Microservices](https://samnewman.io/books/building_microservices_2nd_edition/) 一书的第二版将在今年 8 月出版。“但是对于微服务，事情将比这复杂得多的多。”

考虑到这一点，在进入微服务时代的十年里，思考一下我们已经走到了哪一步，以及我们还需要解决哪些问题是很有意思的。

## 盘点：部署和运行时间

现在有各种各样成熟的、设计良好的微服务框架，涵盖了大多数语言的基础知识，在 JVM 上有大量的选择，包括 [Spring Boot](https://spring.io/projects/spring-boot)、[Dropwizard](https://www.dropwizard.io/en/latest/)、[Helidon](https://helidon.io/#/)、[Lagom](https://www.lagomframework.com/)、[Micronaut](https://micronaut.io/) 和 [Quarkus](https://quarkus.io/)，同时还有 [Go kit](https://github.com/go-kit/kit)（Go）、[Flask](https://flask.palletsprojects.com/en/2.0.x/) 和 [Falcon](https://falconframework.org/)（Python）、[Node.js](https://nodejs.org/en/)（JavaScript）等选择。

同样地，好的监控工具也比比皆是。[OpenTelemetry](https://thenewstack.io/getting-started-with-opentelemetry-for-java/) 的出现尤其重要。它由 OpenTracing 和 OpenCensus 合并而成，拥有广泛的供应商和语言支持，为分布式遥测数据提供标准化。这意味着开发人员只需要对他们的代码进行一次检测，然后就可以交换和改变监控工具，比较相互竞争的解决方案，甚至在生产中为不同的需求运行多个不同的监控解决方案。

然而，当我们看向部署和运行时，情况就变得有点模糊了。Kubernetes 已经或多或少地成为微服务的代名词，它的复杂性不断增加，促使云原生咨询公司 [Container Solutions](https://www.container-solutions.com/) 的首席科学家 [Adrian Mouat](https://twitter.com/adrianmouat) [猜测](https://blog.container-solutions.com/10-predictions-for-the-future-of-computing)我们将看到它的竞争对手出现。

“值得注意的是，这种复杂性不仅仅是隐藏在引擎盖下。“Mouat 说：“它正在溢出到界面上，影响到用户。“黑进 kubectl 运行并得到一个演示并运行仍然相当容易。但是，运行生产应用程序并弄清楚如何安全地暴露它们需要了解大量不同的功能，这不可避免地导致 YAML 文件比大多数微服务源代码还要长。”

Newman 总结了一个基本挑战：“Kubernetes 对开发者并不友好。我们仍然没有一个好的、可靠的、类似 [Heroku](https://www.heroku.com/) 的抽象，在 Kubernetes 之上被广泛使用，这让我感到震惊。”

[Spotify](https://www.spotify.com/) 的工程总监 [Pia Nilsson](https://www.linkedin.com/in/pia-nilsson-02b47b1/) 曾 [谈到](https://engineering.atspotify.com/2021/05/18/a-product-story-the-lessons-of-backstage-and-spotifys-autonomous-culture/)，这家快速扩张的公司的新工程师平均需要 60 天才能合并他们的第 10 个 pull request。作为回应，该公司建立了一个[开发者门户网站](https://thenewstack.io/design-a-better-kubernetes-experience-for-developers/) [Backstage](https://engineering.atspotify.com/2020/09/24/cloud-native-computing-foundation-accepts-backstage-as-a-sandbox-project/)，现在是 [云原生计算基金会](https://cncf.io/?utm_content=inline-mention)的一个[沙盒项目](https://backstage.io/)。

[Netflix](https://about.netflix.com/) 非常重视 DevEx—— 该公司为开发者铺设的 “道路”—— 利用它来帮助 [加速](https://www.infoq.com/presentations/devex-netflix-graphql/) [GraphQL](https://graphql.org/) 等新技术的 [采用](https://www.infoq.com/presentations/devex-netflix-graphql/)。同样，我们已经看到了内部建设和通过 [Humanitec](https://humanitec.com/) 等供应商建设的 [开发者平台](https://info.container-solutions.com/the-rise-of-the-internal-developer-platform)的崛起。 [Ambassador Labs](https://www.getambassador.io/) 有一个相关的 [开发者控制平面](https://www.getambassador.io/developer-control-plane/)的概念 —— 它的网站声称，“使开发者能够控制和配置整个云开发循环，以便更快地发布软件”。

> “Kubernetes 对开发者并不友好。我们仍然没有一个好的、可靠的、类似 [Heroku](https://www.heroku.com/) 的抽象，在 Kubernetes 之上被广泛使用，这让我感到震惊。” ——Sam Newman， Building Microservices 作者

Ambassador Labs 的开发者关系总监 [Daniel Bryant](https://www.linkedin.com/in/danielbryantuk) 告诉 The New Stack：“如果你看看 [Airbnb](https://www.airbnb.com/)、[Shopify](https://www.shopify.com/) 和 [Lunar](https://tech.lunar.app/) 等公司正在做什么，它们之间有一个明显的共同点。他们正在为他们的开发者创建一个类似于 Heroku 的 CLI，这样，像’创建新的微服务’这样的命令就会产生一些支架，插入 CI，插入管道，插入可观察性。问题是，你向开发者展示的抽象是什么，以便他们获得所需的可见性，同时也使他们所需的要求变得清晰？”

Bryant 特继续说：“开发者需要指定某些操作特性：这是一个内存大的服务；这个服务需要低延迟；这个服务需要非常接近那个服务。目前，你通过启动 Kubernetes 和编写大量的 YAML 来做到这一点。那里的抽象并不完全正确，特别是当你引入其他部署机制时，如[无服务器](https://thenewstack.io/category/serverless/)和[低代码 / 无代码](https://thenewstack.io/how-low-code-can-help-enterprise-software-development/)。

“我想知道谁能通过平台暴露出正确的抽象概念，然后让工程师决定如何打包他们的代码 —— 但他们打包的方式是一样的，而平台暴露出一些传统上属于运维的属性。”

## 开放应用模型（OAM）

其他几个关于 Kubernetes 的倡议也值得跟踪。由[微软和阿里云](https://thenewstack.io/open-application-model-build-the-next-generation-of-cloud-native-applications/)联合创建的[开放应用模型](https://oam.dev/)（OAM）是一个描述应用的规范，将应用定义与集群的操作细节分开。因此，它使应用程序开发人员能够专注于其应用程序的关键要素，而不是其部署地点的操作细节。

[Crossplane](https://crossplane.io/) 是 [OAM](https://thenewstack.io/oam-the-kubernetes-application-model-bridging-development-and-deployment/) 的 Kubernetes 特定实现。它可以被企业用来在各种基础设施和云供应商之间建立和运维一个内部平台即服务（PaaS），这使得它在多云环境中特别有用，比如在那些兼并和收购越来越常见的大型企业中。

虽然 OAM 试图将部署细节的责任从编写服务代码中分离出来，但服务网格旨在通过一个专门的基础设施层将服务间通信的责任从个人开发者那里转移出来，该层侧重于使用代理管理服务间的通信。不幸的是，它们也有复杂性的问题，而且还可能引入相当大的性能开销。

因此，到目前为止，许多在生产中成功实施服务网格的案例都是在那些非常精通技术的初创公司。在 [2020 年与 InfoQ 的 Wes Reisz 的播客中](https://www.infoq.com/podcasts/monolith-microservices/?)，Newman 建议在选择之前等待 6 个月，他告诉 The New Stack，他仍然给出同样的建议。

“就该技术栈的权重、管理、影响以及性能带来的影响而言，它们的现实情况是非常可怕的，“Newman 说。“对有一些组织说，如果没有它们，有些事情是不可能完成的，[Monzo 就是一个很好的例子](https://monzo.com/blog/2019/04/03/deploying-envoy-proxy) —— 在一个组织中，你有一个异构的技术栈，你需要做大规模的双向 TLS，我可以看到它的价值。但在我看来，它仍然是 “概念很好，执行不力”。我想，我们可能会在很长时间内仍这样说。”

## 隐藏服务网格

有一件事可能会发生，至少对企业客户来说，性能问题往往不是那么尖锐，那就是服务网格被推到平台的更深处，并在很大程度上对开发者隐藏。例如，[红帽 OpenShift](https://www.openshift.com/try?utm_content=inline-mention) [将 Istio 整合到平台层](https://www.openshift.com/blog/istio-on-openshift-in-2020)，还有多个类似的计划，将服务网格与公有云平台更紧密地整合在一起，如 [AWS App Mesh](https://aws.amazon.com/app-mesh/?aws-app-mesh-blogs.sort-by=item.additionalFields.createdDate&aws-app-mesh-blogs.sort-order=desc&whats-new-cards.sort-by=item.additionalFields.postDateTime&whats-new-cards.sort-order=desc) 和 [Google Cloud Platform Traffic Director](https://cloud.google.com/traffic-director)。

关于服务网格的工作还在继续，以减少其所带来的网络开销。[Cilium](https://cilium.io/) 团队的工作很有希望，它利用 Linux 内核中的 [eBPF](https://ebpf.io/) 功能来实现它所说的 “非常有效的网络、策略执行和负载均衡功能”。

> 我认为现在我们需要为其他人提供领域驱动设计（DDD）。因为即使是普通的开发者而不是架构师，也需要对如何确定实体的范围和边界有一定的了解，这其中有很多是回到了良好的 API 设计上。——Daniel Bryant，开发者关系总监，Ambassador Labs

但另一种可能性是，我们可能完全转向不同的运行时。[Leading Edge Forum](https://leadingedgeforum.com/) 的顾问 [Simon Wardley](https://www.linkedin.com/in/simonwardley/) [认为](https://acloudguru.com/blog/engineering/simon-wardley-is-a-big-fan-of-containers-despite-what-you-might-think)，函数即服务（Faas）/ 无服务器将最终取代 Kubernetes，成为分布式应用事实上的标准运行时，我们也看到了一些真实的生产实例，比如 [BBC](https://www.bbc.com/)，它的大部分在线架构已经从之前的 LAMP 堆栈 [直接转向了 AWS 上的 Lambda](https://www.infoq.com/podcasts/bbc-aws-lambda-react-cicd/)。

“我认为 FaaS 是一个管理部署的伟大抽象，“Newman 说。“作为一个对开发者友好的部署软件的抽象，它是自 Heroku 以来我们拥有的最好的东西。我确实认为目前的实现方式很差，但他们会改进。但他们只处理了在一次在一个地方执行一件任务。这并没有解决更大的网络系统的抽象问题”。

作为一个例子，Newman 引用了[微软 Azure](https://azure.microsoft.com/) 的 [Durable Functions](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview?tabs=csharp)，它通过响应式扩展提供了类似于连续性的东西，允许开发者在无服务器环境中建立有状态的工作流和函数。但是，虽然部署抽象可能会有所改善，但如果想象你可以完全抽象出编写分布式系统的复杂性，那就太天真了。

“你不能假设你说的东西就在那里，“Newman 说。“你不能假设数据会神奇地从一个时间点瞬时传送到另一个时间点。因为它不是这样的。而且，再多的抽象也无法解决这个基本问题。”

## 自主团队的架构

另一个仍然具有挑战性的领域与整个系统架构有关，以及围绕团队组织和结构的相关问题。正如 [IBM](https://www.ibm.com/cloud?utm_content=logo-sponsorpage&utm_source=thenewstack&utm_medium=website&utm_campaign=platform) 的全球开发者 leader [Holly Cummins](https://www.linkedin.com/in/holly-k-cummins) 在 [云原生是关于文化而不是容器](https://cloudnative.to/cloud-native-culture-not-container/) 一文中指出的，“即使有适当的自主团队，系统级的考虑也不会消失”。

Eric Evans 的《[领域驱动设计》](https://www.amazon.com/gp/product/0321125215/ref=as_li_tl?ie=UTF8&camp=1789&creative=9325&creativeASIN=0321125215&linkCode=as2&tag=martinfowlerc-20)是微服务运动的基石，任何软件架构师都应该阅读，Bryant 说。但他更进一步说：

“我认为现在我们需要为我们其他人提供 DDD，“他告诉 The New Stack。“因为即使是普通的开发者而不是架构师，也需要对如何确定实体和边界的范围有一定的了解，其中很多都要回到良好的 API 设计。一旦你理解了耦合和内聚的重要性，关注点和边界的分离，无论你处理的是什么抽象（模块、类、服务、应用），你都会自然而然地跳到这个齿轮上。”

Newman 的 Building Microservices 一书的第二版即将推出，该书介绍了很多这些概念，并考虑到了下一代服务。

在更新这本书时，Newman 告诉 The New Stack，“我想多谈一点耦合性。我想多谈一点内聚力。我想更多地谈论信息隐藏，这对我来说是现在最重要的事情。

“我认为，即使人们掌握了分布式系统方面的知识，他们也没有掌握一个事实，即从根本上说，微服务只是模块化架构的一种形式。然而，很多创建微服务的人对什么是模块化架构或如何进行模块化毫无概念。”

Newman 在新书中还引入了自 2014 年第一版出版以来出现的一些组织思维的变化。他特别引用了马修・斯凯尔顿（Matthew Skelton）和曼努埃尔・派斯（Manuel Pais）关于如何组织业务和技术团队以实现快速流动的极具影响力的作品[《团队拓扑（Team Topologies）》](https://teamtopologies.com/book)，以及尼科尔・福斯格伦（Nicole Forsgren）、杰兹・汉伯（Jez Humble）和吉恩・金（Gene Kim）的[《加速（Accelerate）》](https://itrevolution.com/accelerate-book/)一书，该书探讨了精益管理和 DevOps 原则背后的科学。

修订过程不仅揭示了有多少关于微服务的新知识可以分享，而且这些知识是如何不断积累的。

“这本书可以让你广泛了解什么是微服务以及它对软件开发的影响，“Newman 说。“我发现我在向人们推荐，哦，你应该读那本书的第四章。现在我会说这个，而不是那个。我不想在推荐自己的书上一直含糊其辞。这就是为什么我写了第二版：因为我希望它是好的、准确的。”
