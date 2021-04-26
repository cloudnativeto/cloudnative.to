---
title: "Istio Mixer Cache工作原理与源码分析part1－基本概念"
date: 2018-06-07T19:16:21+08:00
draft: false
image: "/images/blog/00704eQkgy1fs2u1psyn2j30rs0kuqdj.jpg"
author: "敖小剑"
authorlink: "https://skyao.io"
originallink: "https://skyao.io/post/201804-istio-mixer-cache-concepts/"
description: "本系列文章将详细介绍Istio中Mixer Cache的工作原理，为了避免空谈，将引入广大程序员同学喜闻乐见的源码分析环节，并结合Mixer的接口API，详细展现Mixer Cache的各种细节。"
tags: ["istio","source code"]
categories: ["istio"]
keywords: ["service mesh","istio","源码解析"]
type: "post"
avatar: "/images/profile/default.jpg"
---

## 前言

本系列文章将详细介绍Istio中Mixer Cache的工作原理，为了避免空谈，将引入广大程序员同学喜闻乐见的源码分析环节，并结合Mixer的接口API，详细展现Mixer Cache的各种细节。

> 预警：Mixer Cache系列文章除了本文讲述概念比较简单外，其它文章会包含大量复杂和繁琐的细节，包括设计／实现／API等，适合追求深度的同学。

阅读本系列文章前，请确保对Service Mesh和Istio有基本的认知，临时上车的同学请自觉补课：

- [Service Mesh：下一代微服务](https://skyao.io/publication/service-mesh-next-generation-microservice/): Service Mesh介绍
- [服务网格新生代-Istio](https://skyao.io/publication/istio-introduction/)：Istio介绍

此外如果对Mixer职责和设计不熟悉的同学，请先阅读下文（本文可以理解为是此文的番外篇）：

- [Service Mesh架构反思：数据平面和控制平面的界线该如何划定？](https://skyao.io/post/201804-servicemesh-architecture-introspection/)

在这篇文章中，出于对Istio性能的担忧和疑虑，我们探讨了Mixer的架构设计，工作原理，并猜测了Mixer的设计初衷。期间，我们介绍到，为了保证运行时性能，避免每次请求都远程访问Mixer，Istio特意为Mixer增加了缓存。当时出于篇幅考虑，我们没有深入到缓存的细节，现在将在这个系列文章中就这一点深入展开。

在展开代码实现细节之前，我们先介绍和Mixer Cache相关的基本概念。

## 属性

属性（attribute）是Istio中非常一个关键设计，对于Mixer更是特别重要，可以说Mixer的所有功能都是建立在属性这个核心概念之上。

搬运一段官方文档的介绍：

> Istio使用 *属性* 来控制在服务网格中运行的服务的运行时行为。属性是具有名称和类型的元数据片段，用以描述入口和出口流量，以及这些流量所属的环境。Istio属性携带特定信息片段，例如API请求的错误代码，API请求的延迟或TCP连接的原始IP地址。

属性的形式如下：

```ini
request.path: xyz/abc
request.size: 234
request.time: 12:34:56.789 04/17/2017
source.ip: 192.168.0.1
target.service: example
```

## 属性词汇

需要特别强调的是：**Istio中可以使用的属性是固定的**，而不是随意设定的，在这一点上，和一般系统中的类似设计有根本性的差异。

> 每个给定的Istio部署有固定的能够理解的属性词汇。这个特定的词汇由当前部署中正在使用的属性生产者集合决定。Istio中首要的属性生产者是Envoy，然后特定的Mixer适配器和服务也会产生属性。

这些将被Istio使用的属性集合，被称为属性词汇，总数大概是50个，详细列表可以参看文档：

- [Attribute Vocabulary](https://istio.io/docs/reference/config/mixer/attribute-vocabulary.html)：来自Istio官方文档中的Reference

## 引用属性

引用属性（Referenced Attributes）是在Mixer Cache的设计和实现中引入的一个非常特别的概念。

> 特别提醒：要理解Mixer Cache，必须深刻理解Referenced Attritutes。

### 什么是引用属性？

这个需要从Envoy和Mixer之间的Check方法说起：

```c++
rpc Check(CheckRequest) returns (CheckResponse)
```

在CheckRequest中，Envoy会提交所有的Attribute，而在CheckResponse的应答中，PreconditionResult 表示前置条件检查的结果：

| 字段                     | 类型                                                         | 描述                                                         |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| status                   | [google.rpc.Status](https://skyao.io/post/201804-istio-mixer-cache-concepts/#google.rpc.Status) | 状态码OK表示所有前置条件均满足。任何其它状态码表示不是所有的前置条件都满足，并且在detail中描述为什么。 |
| validDuration            | [google.protobuf.Duration](https://developers.google.com/protocol-buffers/docs/reference/google.protobuf#duration) | 时间量，在此期间这个结果可以认为是有效的                     |
| validUseCount            | int32                                                        | 可使用的次数，在此期间这个结果可以认为是有效的               |
| attributes               | CompressedAttributes                                         | mixer返回的属性。返回的切确属性集合由mixer配置的adapter决定。这些属性用于传送新属性，这些新属性是Mixer根据输入的属性集合和它的配置派生的。 |
| **referencedAttributes** | ReferencedAttributes                                         | **在匹配条件并生成结果的过程中使用到的全部属性集合。**       |

“在匹配条件并生成结果的过程中使用到的全部属性集合”是什么意思呢？我们给个例子：

- 假定envoy提交的请求中有5个属性，”a=1,b=2,c=3,e=0,f=0”
- 假定mixer中有三个adapter，每个adapter只使用提交属性中的一个属性a/b/c

如下图所示，mixer会在CheckResponse中返回referencedAttributes字段，内容为”a,b,c”，以此表明这三个属性是mixer的adapter在实际的处理过程中使用到的属性：

![img](https://skyao.io/post/201804-istio-mixer-cache-concepts/images/referenced-attributes.jpg)

Envoy在收到CheckResponse时，就可以从referencedAttributes字段的值中得知： 原来提交上去的”a=1,b=2,c=3,e=0,f=0”这样一个5个属性的集合，实际adapter使用到的只有”a,b,c”。

### 引用属性的作用

为什么envoy要这么关心哪些属性被adapter使用了？以至于需要在交互的过程中，特意让mixer收集这些使用过的属性并明确在CheckResponse中返回给Envoy？

这是因为Mixer Cache的需要。为了缓存Mixer的结果，避免每次请求都发起一次envoy对mixer的调用，istio在envoy中增加了mixer cache。而要让缓存工作，则必须在每次请求中想办法得到一个有效的key，将调用结果作为value存放起来。

现在关键点就来了：key要如何设计？

最简单的方式，自然是将请求中所有的属性都作为key的组成部分，直接做一个简单的hash，得到的值作为key。但是这个方案不可行的地方在于，请求中可能提交的属性大概有二十个上下，有些属性的值变化非常频繁，取值范围也很大，典型如request.id这样每次请求都会给出一个全局唯一值。如果直接将所有属性都作为key的组成部分，那么很可能每次算出来的key都是一个唯一值，这样缓存也就失去意义了。

因此，不能将全部属性都作为key，那么，挑选部分属性如何？只计算部分我们判断为有必要被adapter使用的属性来计算key。但是，等等，我们会立马反应出来：这违背了mixer adapter的设计原则。

- adapter是独立于envoy
- envoy不应该知道有哪些adapter的存在
- 更不应该知道这些adapter使用了哪些属性

因此，在envoy试图计算key时，就面临两难的境地：

1. envoy无法预计哪些属性是adapter需要的
2. envoy也不能将所有的属性都作为key

那怎么办，mixer cache可是必须要加的。只能见招拆招了，思路倒是直白，容易理解：

1. 谁可以切确的知道哪些属性被adapter使用过？

   当然是被调用过的adapter自己了，每个adapter在执行完成后，都可以给出自己使用属性集合，mixer只要做一个简单收集就可以拿到这个信息。

2. mixer知道了，怎么告之envoy？

   不是有个现成的response嘛，将前面收集到的属性集合通过response传递回envoy就是了。

搞定！现在再重新看回前面给出的这个图片，就很容易理解了。

![img](https://skyao.io/post/201804-istio-mixer-cache-concepts/images/referenced-attributes.jpg)

## 下一步

在介绍完基本概念之后，我们将在下一篇文章中开始讲解mixer cache的工作原理，然后在更后面的章节中深入实现细节。
