---
title: "CNCF正在筹建通用数据平面API工作组，以制定数据平面的标准API"
date: 2019-05-08T10:12:18+08:00
draft: false
authors: ["敖小剑"]
summary: "CNCF正在筹建通用数据平面API工作组（Universal Data Plane API Working Group / UDPA-WG)，以制定数据平面的标准API，为L4/L7数据平面配置提供事实上的标准，初始成员将包括 Envoy 和 gRPC 项目的代表。"
tags: ["envoy","xds"]
categories: ["service mesh"]
keywords: ["service mesh","istio","服务网格","envoy","xds","数据平面"]
---

## 背景

昨日得到的消息，CNCF正在筹建通用数据平面API工作组（Universal Data Plane API Working Group / UDPA-WG)，以制定数据平面的标准API，为L4/L7数据平面配置提供事实上的标准，初始成员将包括 Envoy 和 gRPC 项目的代表。

目前还处于非常早期的筹备阶段，具体内容可以见下面的文档：

https://docs.google.com/document/d/1y-H-pQ2mmhBPX_U9pP3mMMUbEpZskxBdEbwd5KlivY4/edit#heading=h.fdi15bvpmxen

方便起见，我将目前文档的内容搬运出来并简单翻译如下：

## 文档内容

### 目标

通用数据平面API工作组（Universal Data Plane API Working Group/UDPA-WG）的目标是将对数据平面代理和负载均衡器的通用控制和配置API感兴趣的行业各方聚集在一起。

### 愿景

通用数据平面API（UDPA）的愿景在 https://blog.envoyproxy.io/the-universal-data-plane-api-d15cec7a 中阐述。我们将寻求一套API，为L4/L7数据平面配置提供事实上的标准，类似于 OpenFlow 在SDN L2 /L3/L4 中所扮演的角色。

API 以 proto3 的规范方式定义，并通过定义良好的稳定API版本控制策略从现有的 Envoy xDS API 逐步演变。 API将涵盖服务发现，负载均衡分配，路由发现，监听器配置，安全发现，负载报告，健康检查委派等。

我们将发展和塑造 API 以支持客户端旁视（lookaside）负载均衡（例如 gRPC-LB），Envoy之外的数据平面代理，硬件LB，移动客户端等。我们将努力尽可能地与供应商和实现无关，同时不回归支持已投入生产中的UDPA的项目（Envoy＆gRPC-LB，到目前为止）。

> We will strive to be vendor and implementation agnostic to the degree possible while not regressing on support for projects that have committed to UDPA in production (Envoy & gRPC-LB so far).
>
> 后半句的没能理解在说什么，稍后更新……

### 成员

初始成员将包括 Envoy 和 gRPC 项目的代表。这将包括来自 谷歌 和 Lyft 的维护者，以及微软和亚马逊的成员。我们正在征求数据平面代理社区更广泛的对初始成员资格的额外兴趣，因为我们认为真正的通用API应该反映各种各样的项目，组织和个人。

我们希望工作组保持小规模，并紧密关注有效平衡增量API，同时追求长期战略演变。我们将每两周举行一次Zoom会议，并通过TBD邮件列表进行沟通。

## 解释

上面文档中提到的几个内容：

### 现有的 Envoy xDS API

Universal Data Plane API 的介绍和设想见Matt Klein 的博客文章 [The universal data plane API](https://blog.envoyproxy.io/the-universal-data-plane-api-d15cec7a)，发表于2017-09-06。也可以看 servermesher 网站翻译的中文版本 [Service Mesh中的通用数据平面API设计](http://www.servicemesher.com/blog/the-universal-data-plane-api/)。这个博客阐述了 xDS API 诞生的想法/设计和从v1到v2版本的演进

Envoy xDS API最新的定义请见：https://github.com/envoyproxy/data-plane-api

### 稳定的API版本控制策略

见文档 [Stable Envoy API versioning](https://docs.google.com/document/d/1xeVvJ6KjFBkNjVspPbY_PwEDHC7XPi0J5p1SqUXcCl8/edit#heading=h.c0uts5ftkk58) : 这个文档提供了解决Envoy API中稳定性问题的设计方案，以及有关API当前状态的一些背景，考虑的替代方案以及Envoy API中未来方向的讨论。（文档有点长）

### client-side lookaside load balancing

介绍见 https://grpc.io/blog/loadbalancing/ 中的 “Lookaside Load Balancing” 一节。

注意：旁视（lookaside）负载平衡器也称为外部（external）负载平衡器或单臂（one-arm）负载平衡器

使用c时，负载均衡的智能在特殊的LB服务器中实现。客户端查询旁视LB，LB响应最合适服务器给客户端使用。保持服务器状态和LB算法的实现在旁视LB中实现。 请注意，客户端可能会选择在LB中实现的复杂算法之上实现简单算法。 gRPC使用该模型定义客户端和LB之间的通信协议。

下图说明了这种方法。 客户端从旁视LB (#1)获取至少一个地址。 然后客户端使用此地址生成RPC (#2)，服务器将负载报告发送到LB (#3)。 旁视LB与其他基础设施通信，例如名称解析，服务发现等 (#4)。

![img](https://grpc.io/img/image_2.png)

## 分析

之前 servicemesher 社区在多次讨论 servicemesh 市场竞争时，都在笑说：Envoy 才是真正的赢家。

不仅仅在于 Envoy 表现稳定、使用广泛、顺利从CNCF毕业，也在于 Envoy 的 xDS v2 API，已经成为数据平面的事实标准。而这一次CNCF组织通用数据平面API工作组，准备基于 xDS v2 API 制定官方标准，可以说是水到渠成。

我目前唯一担心的是：Bueyant会不会参与进来？Linkerd2 会不会选择放弃现在使用的私有API而遵循新标准？
