---
title: "SOFAStack Cloud Native Workshop"
event: "KubeCon China 2019 同场活动"
event_url: 'https://www.lfasiallc.com/events/kubecon-cloudnativecon-china-2019/co-located-events/#sofastack-cloud-native-workshop'
location: 中国上海
address:
  street: 国际会展中心
  city: 上海
  region: 上海
  postcode: ''
  country: 中国
summary: '这是 KubeCon 第一次在中国举办，蚂蚁集团参与了同场活动，进行了 SOFAStack 云原生动手实验。'
abstract: 'SOFAStack 参与的 KubeCon China 的同场活动，由蚂蚁集团支持。'

date: '2018-06-24T10:00:00+08:00'
#date_end: '2018-06-24T18:00:00+08:00'
all_day: true
publishDate: '2018-06-24T20:00:00+08:00'

authors: ["敖小剑","章耿","董一韬","宋国恒","曹杰","俞仁杰","陈龙"]
tags: ["SOFAStack","KubeCon"]
featured: false
image:
  caption: '图片来源: [云原生社区](https://cloudnative.to)'
  focal_point: Right

#links:
#  - icon: twitter
#    icon_pack: fab
#    name: Follow
#    url: https://twitter.com/jimmysongio
url_code: ''
url_pdf: ''
url_slides: ''
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

SOFAStack（Scalable Open Financial Architecture Stack）是蚂蚁集团自主研发并开源的金融级分布式架构，包含了构建金融级云原生架构所需的各个组件，是在金融场景里锤炼出来的最佳实践。SOFAStack 官方网站：<https://www.sofastack.tech/>

参加此次 Meetup 您将获得：

- 基于 SOFAStack 快速构建微服务
- 金融场景下的分布式事务最佳实践
- 基于 Kubernetes 的云原生部署体验
- 云上的 Service Mesh 基本使用场景体验
- 基于 Serverless 轻松构建云上应用

如何注册：此活动须提前注册。请将 SOFAStack Cloud Native Workshop 添加到您 KubeCon + CloudNativeCon + Open Source Summit 的[注册表](https://www.lfasiallc.com/events/kubecon-cloudnativecon-china-2019/register/)里。您可以使用 `KCCN19COMATF` 折扣码获取 KubeCon 半价门票！

如果对此活动有任何疑问，请发送邮件至 [jingchao.sjc@antfin.com](mailto:jingchao.sjc@antfin.com)。

### 活动详情

**9:00 - 9:20 开场演讲 SOFAStack 云原生开源体系介绍 by 余淮**

**9:20 - 10:10 使用 SOFAStack 快速构建微服务 by 玄北**

基于 SOFA 技术栈构建微服务应用。通过本 workshop ，您可以了解在 SOFA 体系中如何上报应用监控数据、服务链路数据以及发布及订阅服务。

**10:15 - 11:05 SOFABoot 动态模块实践 by 卫恒**

在本 workshop 中，您可以基于 SOFADashboard 的 ARK 管控能力来实现 SOFAArk 提供的合并部署和动态模块推送的功能。

**11:10 - 12:00 使用 Seata 保障支付一致性 by 屹远**

微服务架构下，分布式事务问题是一个业界难题。通过本workshop，您可以了解到分布式架构下，分布式事务问题产生的背景，以及常见的分布式事务解决方案；并亲身体验到如何使用开源分布式事务框架Seata的AT模式、TCC模式解决业务数据的最终一致性问题。

**12:00 - 13:00 午餐时间**

**13:00 - 13:30 蚂蚁集团的云原生探索与实践 by 首仁**

**13:30 - 14:40 通过 Serverless 快速上云 by 隐秀**

作为云原生技术前进方向之一，Serverless 架构让您进一步提高资源利用率，更专注于业务研发。通过我们的 workshop，您可以体验到快速创建 Serveless 应用、根据业务请求秒级 0-1-N 自动伸缩、通过日志查看器快速排错、按时间触发应用等产品新功能。

**14:50 - 16:00 使用 CloudMesh 轻松实践 Service Mesh by 敖小剑**

Service Mesh 将服务间通信能力下沉到基础设施，让应用解耦并轻量化。但 Service Mesh 本身的复杂度依然存在，CloudMesh 通过将 Service Mesh 托管在云上，使得您可以轻松的实践 Service Mesh 技术。通过我们的 workshop，您可以快速部署应用到 CloudMesh ，对服务进行访问，通过监控查看流量，体验服务治理、Sidecar管理和对服务的新版本进行灰度发布等实用功能。