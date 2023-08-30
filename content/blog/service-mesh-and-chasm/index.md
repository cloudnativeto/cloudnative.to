---
title: "鸿沟前的服务网格—Istio 1.1 新特性预览"
date: 2019-03-19T10:41:25+08:00
draft: false
authors: ["崔秀龙"]
summary: "Istio 1.1 新特性概览。"
tags: ["istio"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","istio"]
---

## 引子

这几天拜读了灵雀云出品的一篇文章：[《从“鸿沟理论”看云原生》](http://dockone.io/article/8666)，其中有两段关于 Istio 的陈述，我深感赞同：

- 在 Control Plane，Istio 是最具光环的明星级项目。它正在引领 Service Mesh 创造出一个全新的市场，不过从传播周期看现在还没有跨过技术鸿沟，处于 Early adopters 阶段。
- 在开源领域，并不存在对 Istio 有实质性威胁的竞品。可能在经历了 Kubernetes 之后，以及 Istio 早期迅猛的发展和在社区中巨大的影响力之下，很少有开源项目愿意在 Control Plane 和 Istio 正面交锋。

按照我对 Istio 的理解，正如该文所说，正处于鸿沟一侧，正是从早期采用者到早期大众之间关键阶段。然而这一系统的情况又比较特殊，Service Mesh 的饼，虽说是 Linkerd 画出来的，然而真正把饼变大的，正是 Istio。Istio 画了硕大无朋的饼之后，就步步泥潭，功能薄弱、进度拖沓，让包括我在内的众多用户大摇其头。然而，画饼的另一面，就是挖坑——Istio 放出的漫天卫星，极大的吊起了各种用户的胃口，可以说是用先声夺人的方式，强行提高了门槛，要想赶超 Istio，首先就要接班，完成 Istio 的各种承诺，才能满足用户心目中对 Service Mesh 的“基本”期待。

## Istio 1.1

Istio 自然还是在努力的完成满足早期用户要求的基础上，加强对早期大众的吸引。自 2018 年 7 月发布 1.0 之后，经过近 8 个月的漫长等待，千呼万唤的 1.1 又做出了什么样的变化，来帮助 Istio 来达成这样的目标呢？下面会介绍一些我所关注的 Istio 1.1 新特性。

### 缺省关闭 Mixer 策略检查

从 Istio 的早期版本开始，关于如何关闭 Mixer 策略检查的讨论就没有停止过，现在社区已经达成共识，绝大多数场景中，对性能的需求，其重要性是大于对预检功能的需求的，因此 1.1 版本中，缺省安装会关闭 Mixer 的这一功能。

### 缺省开放 Egress 通信

新增 `global.outboundTrafficPolicy.mode` 参数，用于定制 Egress 通信的缺省行为，目前的缺省值为 `ALLOW_ANY`，即允许全部 Egress 通信。

### 新增 Sidecar 资源

目前版本中，Sidecar 会包含整个网格内的服务信息，在 1.1 中，新建了 Sidecar 资源，通过对这一 CRD 的配置，不但能够限制 Sidecar 的相关服务的数量，从而降低资源占用，提高传播效率；还能方便的对 Sidecar 的代理行为做出更多的精细控制——例如对 Ingress 场景中的被代理端点的配置能力。

### ExportTo

多个路由管理对象加入了这一字段，用于指定该资源的生效范围。

### 路由的区域感知能力

新增了对 AZ/Region 等的区域感知能力，降低跨区请求造成的性能损耗。

### 对 TCP 服务提供鉴权支持

在既有的 HTTP/gRPC 之外，又为 TCP 服务提供了 RBAC 功能。

### 引入 SDS 完成证书流程

弃用原有的 Citadel->Secret->Sidecar 的证书流程，改用 Secret Discovery Service 完成。从而降低了安全风险，并且更新证书也无需重新启动了。
