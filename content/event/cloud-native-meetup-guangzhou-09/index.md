---
title: "云原生社区 meetup 第九期广州站"
event: "云原生社区 meetup 第九期广州站"
event_url: "https://3372087382093.huodongxing.com/event/1666917529511"
location: 广东广州
address:
  street: 广州市天河区体育东路116号财富广场东塔35楼路演空间
  city: 广州
  region: 广东
  postcode: ''
  country: 中国
summary: '本次活动关注云原生实践。'
abstract: ''

date: 2022-09-25T13:00:00+08:00
date_end: 2022-09-25T18:00:00+08:00
all_day: false
publishDate: 2022-09-26T12:00:00+08:00

authors: ["马景贺", "戴翔", "张善友", "王琼"]
tags: ["Dapr","Envoy","容器"]
featured: false
image:
  caption: '图片来源: [云原生社区](https://cloudnative.to)'
  focal_point: Right

url_code: ''
url_pdf: ''
url_slides: 'https://github.com/cloudnativeto/academy/tree/master/meetup/09-guangzhou'
url_video: 'https://space.bilibili.com/515485124/channel/collectiondetail?sid=745291'

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

### 云原生应用安全应该从哪几个方向切入？

讲师：马景贺

个人介绍：

极狐(GitLab)DevOps 技术布道师，LFAPAC 开源布道师，CDF ambassador。关注在云原生和 DevSecOps 领域。

议题大纲：

云原生发展的过程中，安全不应该是成为被忽视的一环。云原生应用程序的安全防护体系建立应该是多方位的，要满足从静态到动态，从源码到上线，同时还要注意镜像以及部署文件的安全。需要将这些手段结合起来，与研发流程打通，构建安全研发闭环，从而保证云原生应用程序的安全。

听众收益：

  1. 镜像 & IaC 安全扫描
  2. 源代码安全审计（防止泄漏）
  3. 常规的安全检测手段（SAST、DAST、Fuzzing Testing 等）
  4. 漏洞管理 & 安全的研发闭环构建

### 基于硬件卸载的云原生网关连接平衡实现

讲师：戴翔

个人介绍：

Intel云原生工程师，从事云原生行业多年，深耕开源，Dapr/Thanos/Golangci-lint Maintainer， 目前专注于服务网格领域。 GH: daixiang0

议题大纲：

Envoy 是为单一服务和应用程序设计的高性能 C++ 分布式代理，也是为大型微服务“服务网格”架构设计的通信总线和“通用数据平面”。基于对 NGINX、HAProxy、硬件负载均衡器和云负载均衡器等解决方案的学习，Envoy 与每个应用程序一起运行，并通过以与平台无关的方式提供通用功能来抽象网络。当基础设施中的所有服务流量都通过 Envoy 网格流动时，通过一致的可观察性来可视化问题区域、调整整体性能并在一个地方添加底层特性变得很容易。在本次演讲中，我们将介绍 Envoy 中的线程模型和连接平衡状态，展示使用 PCI 硬件来平衡每个线程的连接，以及它获得的出色性能。

听众收益：

了解当多个客户端连接产生大流量时，Envoy 会因为连接平衡性差而获得较大的尾部延迟。借助核心级别的负载均衡，Envoy 将减少尾部延迟，占用更少的资源来处理更多的请求，从而为用户提供降本增效的双重保障。这可以卸载到硬件负载平衡器，显示结合软件效率和硬件的方向。

### Dapr助力开发云原生应用

讲师：张善友

个人介绍：

从事.NET技术开发二十余年，认证 CKAD专家， 曾在腾讯工作12年，2018年创立深圳友浩达科技，专注于云原生方面的解决方案咨询。目前在深圳市友浩达科技担任首席架构师，被评为微软最有价值专家MVP， 华为云MVP，腾讯云TVP

议题大纲：

  1. .NET云原生案例
  2. Dapr 介绍
  3. Dapr助力云原生应用开发
     1. 服务治理：服务调用、弹性、API网关 和 服务网格
     2. 发布订阅 改造实时服务
     3. 可观测性 日志、分布式追踪、指标采集

听众收益：

  1. 了解一种新型的多运行时架构以及开源项目Dapr
  2. 了解如何一套代码如何同时适配虚拟机和容器，适配不同的云环境
  3. 深入Dapr在实际项目中的工程实践

### 容器云调度优化及实践

讲师：王琼

个人介绍：

目前就职于YY直播，担任高级SRE运维工程师，负责YY直播容器云。10年的工作经验，6年以上的容器相关平台经验，在云原生领域持续深耕，曾在多家公司主导并落地云原生技术和企业容器化改造，致力于打造稳定高效的容器云平台，目前负责YY直播容器云的迭代更新以及新技术落地

议题大纲：

  1. YY直播容器云介绍
  2. 业务资源使用画像实现
  3. 基于节点实际负载调度
  4. 基于节点实际负载二次调度
  5. 通过virtual kubelet实现集群峰值弹性能力

听众收益：

大规模容器化落地遇到的问题及挑战如何应对突发流量，实现集群的峰值弹性能力如何引进云原生技术，并在生产环境中落地及整合
