---
title: "微服务通信的设计模式"
date: 2018-11-27T19:29:05+08:00
draft: false
image: "/images/blog/006tNbRwly1fxmupzfpxaj31420u07wl.jpg"
author: "[Rajesh Bhojwani](https://dzone.com/users/468979/rajesh.bhojwani.html)"
translator: "[马若飞](https://github.com/malphi)"
reviewer: ["宋净超"]
reviewerlink: ["https://jimmysong.io"]
originallink: "https://dzone.com/articles/design-patterns-for-microservice-communication"
description: "本文详细的介绍了同步和异步模式下微服务间的通信模式。"
tags: ["microservice"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","微服务"]
type: "post"
avatar: "/images/profile/default.jpg"
---

本文为翻译文章，[点击查看原文](https://dzone.com/users/468979/rajesh.bhojwani.html)。

在我的上一篇博客中，我谈到了[微服务的设计模式](https://dzone.com/articles/design-patterns-for-microservices)。现在我想更深入地探讨微服务架构中最重要的模式：微服务之间的相互通信。我仍然记得我们过去开发单一应用时通讯是一项艰巨的任务。在那时我们必须小心的设计数据库表和对象模型映射之间的关系。而现在在微服务中，我们已经将它们分解为独立的服务，并创建网格来彼此通信。让我们来谈谈迄今为止为解决这个问题而发展起来的所有通信方式和模式。

许多架构师已经将微服务之间的通信划分为同步和异步两种模式。让我们一个一个来介绍。

## 同步模式

当我们说到同步时，意思是客户端向服务端发出请求并等待其响应。线程将被阻塞，直到它接收到返回。实现同步通信最主要的协议是HTTP。HTTP可以通过REST或SOAP实现。现在REST在微服务方面发展迅速并超越了SOAP。对我而言两者都很好用。

现在让我们讨论同步模式中的不同的工作流、用例，我们面临的问题以及如何去解决。

1. 先从一个简单的例子开始。你需要一个服务A来调用服务B并等待实时数据的响应。这是实现同步的一个很好的选择，因为不会涉及到下游服务。如果使用多个实例，除了负载均衡之外，你不需要为这个用例实现任何复杂的设计模式。

   ![sync flow](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/design-patterns-for-microservice-communication/006tNbRwly1fxlg5e91x1j30fc04yt8l.jpg)

2. 现在让我们把它变得更复杂一点。服务A为实时数据调用多个下游服务，如服务B、服务C和服务D。

- 服务B、服务C和服务D都必须按顺序调用——当服务相互依赖以检索数据，或者是有一个事件序列的功能需要被执行，就会出现这种情况。

- 服务B、服务C和服务D可以并行调用——这种场景被使用在服务彼此独立或服务A可能扮演协调者（Orchestrator）角色时。

  ![sync flow2](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/design-patterns-for-microservice-communication/006tNbRwly1fxlgbk5vfbj30g609rwei.jpg)

这会为通信带来复杂性。让我们一个一个地讨论。

### 紧密耦合

服务A将与服务B、C和D耦合。它必须知道每个服务的端点（endpoint）和凭据（credentials）。

**解决方案**： [服务发现模式](https://www.rajeshbhojwani.co.in/2018/11/design-patterns-for-microservices.html) 就是用来解决这类问题的。它通过提供查询功能来帮助分离消费者和生产者应用。服务B、C和D可以将它们自己注册为服务。服务发现可以在服务端也可以在客户端实现。对于服务端，有AWS ALB和NGINX，它们接受来自客户端的请求，发现服务并将请求路由到指定位置。

对于客户端，有Spring Eureka发现服务。使用Eureka的真正好处是它在客户端缓存了可用的服务信息，所以即使Eureka服务器宕机了一段时间，它也不会成为单点故障。除了Eureka，etcd和consul等其他服务发现工具也得到了广泛的应用。

### 分布式系统

如果服务B，C，D有多个实例，它们需要知道如何负载均衡。

**解决方案**：负载均衡通常与服务发现携手出现。对于服务器负载平衡，可以使用AWS ALB，对于客户端可以使用Ribbon或Eureka。

### 验证/过滤/处理协议

如果服务B、C和D需要被保护并验证身份，我们只需要过滤这些服务的某些请求，如果服务A和其他服务使用不同的协议。

**解决方案**：[API 网关模式（gateway）](http://www.rajeshbhojwani.co.in/2018/11/design-patterns-for-microservices.html) 有助于解决这些问题。它可以处理身份验证、过滤和将协议从AMQP转换为HTTP或其他协议。它还可以查看分布式日志、监控和分布式跟踪等可观测的指标（metrics）。Apigee、Zuul和Kong就是一些这样的工具。请注意，如果服务B、C和D是可管理的API的一部分，我建议使用这种模式，否则使用API网关就太重了。下面将要读到的服务网格是它的替代解决方案。

### 处理失败

如果服务B、C或D宕机，服务A仍然有某些功能来响应客户端请求，就必须相应地对其进行设计。另一个问题是：假设服务B宕机，所有请求仍然在调用服务B，并且由于它没有响应而耗尽了资源，这会使整个系统宕机，服务A也无法向C和D发送请求了。

**解决方案**：[熔断器（Circuit Breaker）](http://www.rajeshbhojwani.co.in/2018/11/design-patterns-for-microservices.html) 和 [隔板（bulkhead） ](https://docs.microsoft.com/en-us/azure/architecture/patterns/bulkhead)模式有助于解决这些问题。熔断器识别下游服务是否停机了一段时间，并断开开关以避免向其发送调用请求。它将在定义的时间段之后再次尝试检查，如果服务已经恢复则关闭开关以继续对其进行调用。这确实有助于避免网络阻塞和耗尽资源。隔板模式有助于隔离用于服务的资源，并避免级联故障。Spring Cloud Hystrix就是做这样的工作，它适用于断路器和隔板模式。

### 微服务间网络通信

[API 网关](http://www.rajeshbhojwani.co.in/2018/11/design-patterns-for-microservices.html) 通常用于管理API，它处理来自ui或其他消费者的请求，并对多个微服务进行下游调用并作出响应。但是，当一个微服务想要调用同组中的另一个微服务时，API网关就没有必要了，它并不是为了这个目的而设计的。最终，独立的微服务将负责进行网络通信、安全验证、处理超时、处理故障、负载平衡、服务发现、监控和日志记录。对于微服务来说开销太大。

**解决方案**：服务网格模式有助于处理此类NFRs。它可以卸载我们前面讨论的所有网络功能。这样，微服务就不会直接调用其他微服务，而是通过服务网格，它将处理所有的通信。这种模式的美妙之处在于，你可以专注于用任何语言（如Java、NodeJS或Python）编写业务逻辑，而不必担心这些语言是否支持所有的网络功能。Istio和Linkerd解决了这些需求。我唯一不喜欢Istio的地方是它目前仅限于Kubernetes。

## 异步模式

当我们谈到异步通信时，它意味着客户端调用服务器，接收到请求的确认，然后忘记它。服务器将处理请求并完成。

现在让我们讨论一下什么时候需要异步。如果你的应用读操作很多，那么同步可能非常适合，尤其是在需要实时数据时。但是，当你处理大量写操作而又不能丢失数据记录时，你可能希望选择异步操作，因为如果下游系统宕机，你继续向其发送同步的调用，你将丢失请求和业务交易。经验法则是永远不要对实时数据读取使用异步，也永远不要对关键的业务交易写操作使用同步，除非你在写后立即需要数据。你需要在数据可用性和数据的强一致性之间进行选择。

有几种不同的方式可以实现异步：

### 消息

在这种方式中，生产者将消息发送到消息代理，而消费者可以监听代理来接收消息并相应地处理它。在消息处理中有两种模式：一对一和一对多。我们讨论了同步带来的一些复杂性，但是在消息传递中，默认情况下就会消除一些复杂性。例如，服务发现变得无关紧要，因为消费者和生产者都只与消息代理对话。负载均衡是通过扩展消息系统来处理的。失败处理是内建的，主要由message broker负责。RabbitMQ、ActiveMQ和Kafka是云平台中最流行的消息传递解决方案。

![msg flow](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/design-patterns-for-microservice-communication/006tNbRwly1fxlhh1zzvuj30kj0coaa7.jpg)

### 事件驱动

事件驱动方式看起来类似于消息传递，但它的用途不同。它不会发送消息，而是将事件细节连同负载（payload）一起发送到消息代理。消费者将确定事件是什么，以及如何对此作出响应。这会更加松散的耦合。有下面几种类型的负载可以被传递：

- 全负载 —— 这将包含与消费者采取进一步行动所需的事件相关的所有数据。然而，这使得它的耦合更加紧密。
- 资源 URL —— 这是一个指向代表事件的资源的URL。
- 仅事件 —— 不会发送负载，消费者将基于事件名称知道如何从其他源（如数据库或队列）检索相关数据。

![event flow](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/design-patterns-for-microservice-communication/006tNbRwly1fxlhpapghaj30ll0a8mx7.jpg)

还有其他一些方式，比如编排（choreography），但我个人并不喜欢。它太复杂几乎无法实现，只能通过同步方式来完成。

以上就是本博客的全部内容。请让我知道你在微服务通信方面的经验。
