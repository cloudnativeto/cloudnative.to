---
title: "Service Mesh Meetup #2 北京站"
event: "Service Mesh Meetup #2 北京站"
event_url: "http://www.itdks.com/eventlist/detail/2455"
location: 中国北京
address:
  street: 海淀区中关村大街 11 号 e 世界财富中心 A 座 B2
  city: 北京
  region: 北京
  postcode: ''
  country: 中国
summary: '这是第二届 Service Mesh Meetup。'
abstract: ''

date: 2018-07-29T13:00:00+08:00
date_end: 2018-07-29T17:00:00+08:00
all_day: false
publishDate: 2018-07-29T13:00:00+08:00

authors: ["张亮","吴晟","朵晓东","丁振凯"]
tags: ["Service Mesh"]
featured: false
image:
  caption: '图片来源：[云原生社区](https://cloudnative.jimmysong.io)'
  focal_point: Right

#links:
#  - icon: twitter
#    icon_pack: fab
#    name: Follow
#    url: https://twitter.com/jimmysongio
url_code: ''
url_pdf: ''
url_slides: 'https://github.com/servicemesher/meetup-slides'
url_video: ''

# Markdown Slides (optional).
#   Associate this talk with Markdown slides.
#   Simply enter your slide deck's filename without extension.
#   E.g. `slides = "example-slides"` references `content/slides/example-slides.md`.
#   Otherwise, set `slides = ""`.
slides: ''

# Projects (optional).
#   Associate this post with one or more of your projects.
#   Simply enter your project's folder or file name without extension.
#   E.g. `projects = ["internal-project"]` references `content/project/deep-learning/index.md`.
#   Otherwise, set `projects = []`.
projects: []
---

## 讲师与演讲话题

**张亮（京东金融数据研发负责人）：Service Mesh 的延伸 —— 论道 Database Mesh**

个人简介：张亮，京东金融数据研发负责人。热爱开源，目前主导两个开源项目 Elastic-Job 和 Sharding-Sphere(Sharding-JDBC)。擅长以 java 为主分布式架构以及以 Kubernetes 和 Mesos 为主的云平台方向，推崇优雅代码，对如何写出具有展现力的代码有较多研究。2018 年初加入京东金融，现担任数据研发负责人。目前主要精力投入在将 Sharding-Sphere 打造为业界一流的金融级数据解决方案之上。

随着 Service Mesh 概念的推广与普及，云原生、低接入成本以及分布式组件下移等理念，已逐渐被认可。在 Service Mesh 依旧处于高速迭代的发展期的同时，以它的理念为参考，其他的 Mesh 思想也在崭露萌芽。Database Mesh 即是 Service Mesh 的其中一种延伸，虽然理念与 Service Mesh 相近，但数据库与无状态的服务却有着巨大的差别。Database Mesh 与分布式数据库（如 NoSQL 和 NewSQL）的功能范畴并非重叠而是互补，它更加关注数据库之上的中间啮合层。本次将与您一起交流 Database Mesh 的一些思考，以及探讨如何与现有产品相结合，实现更加强大与优雅的云原生数据库解决方案。

---

**吴晟（Apache SkyWalking 创始人）：Observability on Service Mesh —— Apache SkyWalking 6.0**

个人简介：Apache SkyWalking 创始人，PPMC 和 Committer，比特大陆资深技术专家，[Tetrate.io](http://tetrate.io/) Founding Engineer，专注 APM 和自动化运维相关领域。Microsoft MVP。CNCF OpenTracing 标准化委员会成员。Sharding-Sphere PMC 成员。

APM 在传统意义上，都是通过语言探针，对应用性能进行整体分析。但随着 Cloud Native, K8s 容器化之后，以 Istio 为代表的 Service Mesh 的出现，为可观测性和 APM 提供了一种新的选择。SkyWalking 作为传统上提供多语言自动探针的 Apache 开源项目，在 service mesh 的大背景下，也开始从新的角度提供可观测性支持。

SkyWalking 和 Tetrate Inc. Istio 核心团队合作，从 Mixer 接口提取遥感数据，提供 SkyWalking 语言探针一样的功能，展现 service mesh 风格探针的强大力量。之后，也会和更多的 mesh 实现进行合作，深入在此领域的运用。

---

**朵晓东（蚂蚁集团，高级技术专家）：蚂蚁集团开源的 Service Mesh 数据平面 SOFA MOSN 深层揭秘**

个人简介：蚂蚁集团高级技术专家，专注云计算技术及产品。Apache Kylin 创始团队核心成员；蚂蚁金融云 PaaS 创始团队核心成员，Antstack 网络产品负责人；SOFAMesh 创始团队核心成员。

Service Mesh 技术体系在蚂蚁落地过程中，我们意识到 Mesh 结合云原生在多语言，流量调度等各方面的优势，同时面对蚂蚁内部语言体系与运维构架深度融合，7 层流量调度规则方式复杂多样，金融级安全要求等诸多特征带来的问题和挑战，最终选择结合蚂蚁自身情况自研 Golang 版本数据平面 MOSN，同时拥抱开源社区，支持作为 Envoy 替代方案与 Istio 集成工作。本次 session 将从功能、构架、跨语言、安全、性能、开源等多方面分享 Service Mesh 在蚂蚁落地过程中在数据平面的思考和阶段成果。

---

**丁振凯（新浪微博，微博搜索架构师）：微博 Service Mesh 实践 - WeiboMesh**

个人简介：微博搜索架构师，主要负责搜索泛前端架构工作。主导搜索结果和热搜榜峰值应对及稳定性解决方案，以及微服务化方案落地。在 Web 系统架构方面拥有比较丰富的实践和积累。喜欢思考，深究技术本质。去年十一鹿晗关晓彤事件中一不小心成为网红工程师，并成功登上自家热搜榜。

WeiboMesh 源自于微博内部对异构体系服务化的强烈需求以及对历史沉淀的取舍权衡，它没有把历史作为包袱，而是巧妙的结合自身实际情况完成了对 Service Mesh 规范的实现。目前 WeiboMesh 在公司内部已经大规模落地，并且已经开源，WeiboMesh 是非常接地气的 Service Mesh 实现。本次分享主要介绍微博在跨语言服务化面临的问题及 WeiboMesh 方案介绍，并结合业务实例分析 WeiboMesh 的独到之处。
