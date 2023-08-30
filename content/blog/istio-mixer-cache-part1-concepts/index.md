---
title: "Istio Mixer Cache 工作原理与源码分析 part1－基本概念"
date: 2018-06-07T19:16:21+08:00
draft: false
authors: ["敖小剑"]
summary: "本系列文章将详细介绍 Istio 中 Mixer Cache 的工作原理，为了避免空谈，将引入广大程序员同学喜闻乐见的源码分析环节，并结合 Mixer 的接口 API，详细展现 Mixer Cache 的各种细节。"
tags: ["istio","source code"]
categories: ["istio"]
keywords: ["service mesh","istio","源码解析"]
---

## 前言

本系列文章将详细介绍 Istio 中 Mixer Cache 的工作原理，为了避免空谈，将引入广大程序员同学喜闻乐见的源码分析环节，并结合 Mixer 的接口 API，详细展现 Mixer Cache 的各种细节。

> 预警：Mixer Cache 系列文章除了本文讲述概念比较简单外，其它文章会包含大量复杂和繁琐的细节，包括设计／实现／API 等，适合追求深度的同学。

阅读本系列文章前，请确保对 Service Mesh 和 Istio 有基本的认知，临时上车的同学请自觉补课：

- [Service Mesh：下一代微服务](https://skyao.io/publication/service-mesh-next-generation-microservice/): Service Mesh 介绍
- [服务网格新生代-Istio](https://skyao.io/publication/istio-introduction/)：Istio 介绍

此外如果对 Mixer 职责和设计不熟悉的同学，请先阅读下文（本文可以理解为是此文的番外篇）：

- [Service Mesh 架构反思：数据平面和控制平面的界线该如何划定？](https://skyao.io/post/201804-servicemesh-architecture-introspection/)

在这篇文章中，出于对 Istio 性能的担忧和疑虑，我们探讨了 Mixer 的架构设计，工作原理，并猜测了 Mixer 的设计初衷。期间，我们介绍到，为了保证运行时性能，避免每次请求都远程访问 Mixer，Istio 特意为 Mixer 增加了缓存。当时出于篇幅考虑，我们没有深入到缓存的细节，现在将在这个系列文章中就这一点深入展开。

在展开代码实现细节之前，我们先介绍和 Mixer Cache 相关的基本概念。

## 属性

属性（attribute）是 Istio 中非常一个关键设计，对于 Mixer 更是特别重要，可以说 Mixer 的所有功能都是建立在属性这个核心概念之上。

搬运一段官方文档的介绍：

> Istio 使用 *属性* 来控制在服务网格中运行的服务的运行时行为。属性是具有名称和类型的元数据片段，用以描述入口和出口流量，以及这些流量所属的环境。Istio 属性携带特定信息片段，例如 API 请求的错误代码，API 请求的延迟或 TCP 连接的原始 IP 地址。

属性的形式如下：

```ini
request.path: xyz/abc
request.size: 234
request.time: 12:34:56.789 04/17/2017
source.ip: 192.168.0.1
target.service: example
```

## 属性词汇

需要特别强调的是：**Istio 中可以使用的属性是固定的**，而不是随意设定的，在这一点上，和一般系统中的类似设计有根本性的差异。

> 每个给定的 Istio 部署有固定的能够理解的属性词汇。这个特定的词汇由当前部署中正在使用的属性生产者集合决定。Istio 中首要的属性生产者是 Envoy，然后特定的 Mixer 适配器和服务也会产生属性。

这些将被 Istio 使用的属性集合，被称为属性词汇，总数大概是 50 个，详细列表可以参看文档：

- [Attribute Vocabulary](https://istio.io/docs/reference/config/mixer/attribute-vocabulary.html)：来自 Istio 官方文档中的 Reference

## 引用属性

引用属性（Referenced Attributes）是在 Mixer Cache 的设计和实现中引入的一个非常特别的概念。

> 特别提醒：要理解 Mixer Cache，必须深刻理解 Referenced Attritutes。

### 什么是引用属性？

这个需要从 Envoy 和 Mixer 之间的 Check 方法说起：

```c++
rpc Check(CheckRequest) returns (CheckResponse)
```

在 CheckRequest 中，Envoy 会提交所有的 Attribute，而在 CheckResponse 的应答中，PreconditionResult 表示前置条件检查的结果：

| 字段                     | 类型                                                         | 描述                                                         |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| status                   | [google.rpc.Status](https://skyao.io/post/201804-istio-mixer-cache-concepts/#google.rpc.Status) | 状态码 OK 表示所有前置条件均满足。任何其它状态码表示不是所有的前置条件都满足，并且在 detail 中描述为什么。 |
| validDuration            | [google.protobuf.Duration](https://developers.google.com/protocol-buffers/docs/reference/google.protobuf#duration) | 时间量，在此期间这个结果可以认为是有效的                     |
| validUseCount            | int32                                                        | 可使用的次数，在此期间这个结果可以认为是有效的               |
| attributes               | CompressedAttributes                                         | mixer 返回的属性。返回的切确属性集合由 mixer 配置的 adapter 决定。这些属性用于传送新属性，这些新属性是 Mixer 根据输入的属性集合和它的配置派生的。 |
| **referencedAttributes** | ReferencedAttributes                                         | **在匹配条件并生成结果的过程中使用到的全部属性集合。**       |

“在匹配条件并生成结果的过程中使用到的全部属性集合”是什么意思呢？我们给个例子：

- 假定 envoy 提交的请求中有 5 个属性，”a=1,b=2,c=3,e=0,f=0”
- 假定 mixer 中有三个 adapter，每个 adapter 只使用提交属性中的一个属性 a/b/c

如下图所示，mixer 会在 CheckResponse 中返回 referencedAttributes 字段，内容为”a,b,c”，以此表明这三个属性是 mixer 的 adapter 在实际的处理过程中使用到的属性：

![img](https://skyao.io/post/201804-istio-mixer-cache-concepts/images/referenced-attributes.jpg)

Envoy 在收到 CheckResponse 时，就可以从 referencedAttributes 字段的值中得知：原来提交上去的”a=1,b=2,c=3,e=0,f=0”这样一个 5 个属性的集合，实际 adapter 使用到的只有”a,b,c”。

### 引用属性的作用

为什么 envoy 要这么关心哪些属性被 adapter 使用了？以至于需要在交互的过程中，特意让 mixer 收集这些使用过的属性并明确在 CheckResponse 中返回给 Envoy？

这是因为 Mixer Cache 的需要。为了缓存 Mixer 的结果，避免每次请求都发起一次 envoy 对 mixer 的调用，istio 在 envoy 中增加了 mixer cache。而要让缓存工作，则必须在每次请求中想办法得到一个有效的 key，将调用结果作为 value 存放起来。

现在关键点就来了：key 要如何设计？

最简单的方式，自然是将请求中所有的属性都作为 key 的组成部分，直接做一个简单的 hash，得到的值作为 key。但是这个方案不可行的地方在于，请求中可能提交的属性大概有二十个上下，有些属性的值变化非常频繁，取值范围也很大，典型如 request.id 这样每次请求都会给出一个全局唯一值。如果直接将所有属性都作为 key 的组成部分，那么很可能每次算出来的 key 都是一个唯一值，这样缓存也就失去意义了。

因此，不能将全部属性都作为 key，那么，挑选部分属性如何？只计算部分我们判断为有必要被 adapter 使用的属性来计算 key。但是，等等，我们会立马反应出来：这违背了 mixer adapter 的设计原则。

- adapter 是独立于 envoy
- envoy 不应该知道有哪些 adapter 的存在
- 更不应该知道这些 adapter 使用了哪些属性

因此，在 envoy 试图计算 key 时，就面临两难的境地：

1. envoy 无法预计哪些属性是 adapter 需要的
2. envoy 也不能将所有的属性都作为 key

那怎么办，mixer cache 可是必须要加的。只能见招拆招了，思路倒是直白，容易理解：

1. 谁可以切确的知道哪些属性被 adapter 使用过？

   当然是被调用过的 adapter 自己了，每个 adapter 在执行完成后，都可以给出自己使用属性集合，mixer 只要做一个简单收集就可以拿到这个信息。

2. mixer 知道了，怎么告之 envoy？

   不是有个现成的 response 嘛，将前面收集到的属性集合通过 response 传递回 envoy 就是了。

搞定！现在再重新看回前面给出的这个图片，就很容易理解了。

![img](https://skyao.io/post/201804-istio-mixer-cache-concepts/images/referenced-attributes.jpg)

## 下一步

在介绍完基本概念之后，我们将在下一篇文章中开始讲解 mixer cache 的工作原理，然后在更后面的章节中深入实现细节。
