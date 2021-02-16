---
title: "Service Mesh安全：用Istio应对攻击"
date: 2018-06-07T19:27:19+08:00
draft: false
image: "/images/blog/00704eQkgy1fs2ua9kohvj30rs0kub29.jpg"
author: "Zach Jory"
translator: "[崔秀龙](https://blog.fleeto.us)"
authorlink: "https://aspenmesh.io/2018/06/service-mesh-security-addressing-attack-vectors-with-istio/"
originallink: "https://aspenmesh.io/2018/06/service-mesh-security-addressing-attack-vectors-with-istio/"
description: "把单体应用拆分为微服务的过程中，会引入一个风险就是——可能的受攻击面积变大了。从前单体应用中通过函数调用完成的通信，现在都要通过网络完成。提高安全性从而避免这个问题带来的安全影响，是微服务之路上必须要着重考虑的问题。"
tags: ["istio"]
categories: ["service mesh"]
keywords: ["service mesh","istio","安全"]
type: "post"
avatar: "/images/profile/default.jpg"
---

本文为翻译文章，[点击查看原文](https://aspenmesh.io/2018/06/service-mesh-security-addressing-attack-vectors-with-istio/)。

把单体应用拆分为微服务之后，会得到不少好处，例如稳定性的提高、持续运行时间的增长以及更好的故障隔离等。然而把大应用拆分为小服务的过程中，也会引入一个风险就是——可能的受攻击面积变大了。从前单体应用中通过函数调用完成的通信，现在都要通过网络完成。提高安全性从而避免这个问题带来的安全影响，是微服务之路上必须要着重考虑的问题。

Aspen Mesh 的基础是一个开源软件：[Istio](https://istio.io/)，他的关键能力之一就是为微服务提供安全性和策略控制方面的支持。Istio 为 Service Mesh 增加了很多安全特性，但是这并不是说微服务的安全工作就结束了。网络安全策略也是需要着重考虑的问题（推荐阅读：[In the land of microservices, the network is the king(maker)](https://medium.com/lightspeed-venture-partners/in-the-land-of-microservices-the-network-is-the-king-maker-37de7ec4119a)），结合网络策略，可以检测和应对针对服务网格基础设施的攻击，从而解决各种安全威胁。

后面的内容将会看看 Istio 所能够解决的问题，其中包含边缘通信的流量控制、网格内通信加密以及 7 层策略控制等。

## 边缘通信安全

针对不当进入网格的流量，Istio 加入了一个用来进行监控和防范的安全层。Istio 以 Ingress Controller 的形式和 Kubernetes 进行了集成，并完成了 Ingress 的负载均衡任务。用户可以用 Ingress Rule 的方式加入安全控制。可以通过监控来了解进入网格的流量，并通过路由规则来管理非法的边缘通信。

要保证只有认证用户通过，Istio 的 RBAC（基于角色的访问控制）提供了有弹性的、可定制的访问控制，这种能力在网格内提供了 namespace、service 以及服务方法一级的控制能力。RBAC 引擎监控和跟进 RBAC 策略的变更，在运行时根据 RBAC 策略，根据请求的上下文对请求进行鉴权，最后返回鉴权结果。

## 通信加密

边缘通信的安全是个好的开始，但是如果有恶意份子突破了边缘之后，Istio 还为服务之间的通信提供了双向 TLS 认证能力。网格能够对请求和响应进行自动的加密和解密，开发人员就无需在此投入精力了。这个功能还通过对连接的优先复用，减少了连接过程中的运算消耗。

除了客户端和服务器之间的认证和鉴权能力之外，还让用户能够理解和管理服务间的通信和加密。Istio 把证书和密钥自动分发给服务，代理使用这些输入来给流量进行加密（提供双向 TLS），并周期性的进行证书轮转，从而降低证书暴露造成的威胁。可以利用 TLS 来确认 Istio 中的通信双方的服务实例都是合法的，从而防止中间人攻击。

Istio 使用 Citadel 来进行密钥管理和认证控制，简化了 TLS 过程。他让用户能够保护流量，同时给每个服务提供基于身份的验证和授权功能。

## 策略控制和执行

Istio 给用户在应用级执行策略的能力。对于服务路由、重试、断路以及安全来说，在这一层进行控制是非常恰当的。Istio 为用户提供了黑白名单功能来来对服务进行准入的控制。

Istio Mixer 可以把扩展集成进系统，用户用标准化的表达式语言来来声明网络以及服务行为方面的约束策略。这样做的好处是，可以用通用 API 在服务边缘来缓存策略的决策结果，如果下游的策略系统出现故障，网络还能保持运行。

Istio 解决了一些微服务特定的关键问题。例如只允许被批准的服务间通信，加密通信防止通信过程中的入侵，执行应用范围内的策略等。当然还有很多其他方式可以实现这些能力，Mesh 的好处在于将这些能力融会贯通，让用户使用一致的稳定的方式来完成这些任务。

Aspen Mesh 中正在做一些新的功能，在 Istio 中为用户提供更好的安全能力。近期我们会在博客上发点东西，所以请关注 [Aspen Mesh 博客](https://aspenmesh.io/blog/)。

---

译文原地址：https://blog.fleeto.us/post/service-mesh-security-addressing-attack-vectors-with-istio/
