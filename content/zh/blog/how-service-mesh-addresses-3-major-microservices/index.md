---
title: "Service Mesh 如何解决微服务中的3个主要挑战"
date: 2018-07-28T17:11:16+08:00
draft: false
image: "/images/blog/006tKfTcgy1ftpp63o2m2j31ji15okjm.jpg"
author: "[Zach Jory](https://twitter.com/zjory)"
translator: "[李昕阳](https://darrenxyli.com/)"
reviewer:  ["宋净超"]
reviewerlink:  ["https://jimmysong.io"]
originallink: "https://dzone.com/articles/how-service-mesh-addresses-3-major-microservices-c"
description: "本文讲述的是企业在实施微服务时遇到的挑战，以及如何使用Service Mesh应对这些挑战。"
tags: ["service mesh","microservices"]
categories: ["service mesh"]
keywords: ["service mesh"]
type: "post"
avatar: "/images/profile/default.jpg"
---

本文为翻译文章，[点击查看原文](https://dzone.com/articles/how-service-mesh-addresses-3-major-microservices-c)。

**我们都知道微服务会增加复杂性。 了解服务网络如何解决这一问题和其他挑战。**

我最近正在阅读 Dimensional Research 撰写的[全球微服务趋势报告](https://go.lightstep.com/global-microservices-trends-report-2018)，在阅读的同时，我个人也认为“服务网络可以帮助解决这个问题。”所以我将阐述这3个挑战以及服务网格是如何解决它们。报告中引用的受访者表明微服务正在得到广泛采用。同样清楚的是，除了微服务带来的无数好处之外，同样也带来了一些严峻的挑战。报告显示：

- 91％的企业**正在使用**微服务或有计划使用
- 99％的用户认为在使用微服务时遇到了**挑战**

## 微服务主要的挑战

该报告指出了公司面临的一系列挑战。

![](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/how-service-mesh-addresses-3-major-microservices/855e972fly1fto3iki07wj20zh0d9404.jpg)

大量公司既面临着技术上的挑战，同时也面临着组织结构上的挑战。而我将专注于能够用服务网格解决的技术挑战，但值得注意的是，服务网格所做的一件事就是带来一致性，因此可以在团队之间实现相同的愿景，从而减少对某些技能的需求。

## 每个额外的微服务都会增加运维的难度

如果没有服务网格，这句话将成为现实！服务网格可以通过 API 提供监控，可伸缩性和高可用性，而不是通过分离设备。这种灵活的框架消除了与现代应用相关的操作复杂性。基础设施服务传统上是通过分离设备实现的，这意味着需要到达实际的设备来获得服务。因为每个设备的唯一性，导致为每个设备提供监控，扩展和高可用性有很高的难度。服务网格通过 API 在计算集群内部提供这些服务，不需要任何其他设备。实现服务网格意味着添加新的微服务不必增加复杂性。

## 识别性能问题的根本原因更加困难

服务网格工具箱为您提供了一些有助于解决此问题的方法：

### 分布式跟踪

跟踪为不同的微服务提供服务依赖性分析，并在请求穿梭于多个微服务时跟踪此请求。它也是识别性能瓶颈和放大特定请求以定义诸如哪些微服务导致请求延迟或哪些服务产生错误之类的事情的好方法。

### 指标的集合

通过服务网格能够获得的另一个有用的功能是收集指标的能力。指标是在各个时间维度上了解应用程序中发生了什么，以及何时它们是健康的或者不健康的关键。服务网格可以从网格中收集遥测数据，并为每一跳产生一致的指标。这样可以更轻松地快速解决问题，并在将来构建更具弹性的应用程序。

![](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/how-service-mesh-addresses-3-major-microservices/855e972fly1ftobpzbxnzj20rl0b2mya.jpg)

## 不同的开发语言和框架

报告受访者指出的另一个主要挑战是在多语言世界中维护分布式架构的挑战。当从单体服务到微服务的转变时，许多公司都面临着一个现实就是，他们必须使用不同的语言和工具来让系统工作起来。大型企业尤其受此影响，因为他们拥有许多大型分布式团队。服务网格通过提供编程语言不可知性来提供一致性，这解决了多语言世界中的不一致性，其中不同的团队（每个团队都有自己的微服务）可能使用不同的编程语言和框架。网格还提供了统一的、覆盖整个应用程序的观测点，用于将可见性和控制性引入应用程序，同时将服务间的通信从隐含的基础架构领域移出到一个可以轻松查看，监视，管理和控制的位置。

![](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/how-service-mesh-addresses-3-major-microservices/855e972fly1ftobqt0wv7j20ry0ce0uc.jpg)

微服务很酷，但服务网格使得它更酷。如果您正处于微服务的路途中并且发现难以应付基础架构挑战，那么服务网格可能是正确的答案。如果您对如何充分利用服务网格有任何疑问，请告诉我们，我们的工程团队随时可以与您交流。
