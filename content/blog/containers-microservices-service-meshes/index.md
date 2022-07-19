---
authors: ["Jérôme Petazzoni"]
translators: ["罗广明"]
title: "容器、微服务和服务网格简史"
summary: "本文介绍了dotCloud的历史、容器间路由，进而阐述了它与现代服务网格的相同与不同之处，如何实现一个类似的服务网格以及其与Istio的区别。"
categories: ["service mesh","容器","微服务"]
tags: ["istio", "kubernetes"]
date: 2019-06-03T11:20:34+08:00
---

本文为翻译文章，[点击查看原文](https://jpetazzo.github.io/2019/05/17/containers-microservices-service-meshes/)。

## 编者按

本文通过介绍一个构建和运行微服务的平台dotCloud的历史、容器间路由，进而阐述了它与现代服务网格的相同与不同之处；接着介绍了如何实现一个类似的服务网格以及其与Istio的区别；最后引入了SuperGloo的介绍，一个管理和编排大规模服务网格的开源项目。

## 前言

有[许](https://containerjournal.com/2018/12/12/what-is-service-mesh-and-why-do-we-need-it/)[多](https://www.nginx.com/blog/do-i-need-a-service-mesh/)[的](https://www.oreilly.com/ideas/do-you-need-a-service-mesh)[材料](https://www.datawire.io/envoyproxy/service-mesh/)是关于服务网格的，这是另一个。为什么呢？因为我想分享给你们一个观点：有一些人认为服务网格在10年前就已经存在，远早于Docker和Kubernetes这样的容器平台的兴起。我并不是说这个观点比其他观点更好或更差，但是由于服务网格是相当复杂的架构，所以我相信多种观点有助于更好地理解它们。

我将讨论dotCloud平台，这是一个建立在100多个微服务之上的平台，支持数千个运行在容器中的应用程序；我将解释在构建和运行它时所面临的挑战；以及服务网格将如何(或不会)提供帮助。

## dotCloud的历史

我已经写过关于dotCloud平台的历史和它的一些设计选择，但是我没有过多讨论它的网络层。如果你不想跳进我以前的[关于dotCloud的博客](http://jpetazzo.github.io/2017/02/24/from-dotcloud-to-docker/)，所有你需要知道的是，这是一个PaaS平台，它允许用户运行各种应用程序(Java、PHP、Python…)，支持广泛的数据服务(MongoDB, MySQL, Redis,…)和与Heroku类似的工作流：您将把代码推到平台上，平台将负责容器镜像的创建和部署。

我将告诉您流量是如何在dotCloud平台上路由的；不是因为它是特别强大或者其它(我认为这是好的时间!)，主要是因为，如果需要一种方法在一堆微服务或应用程序之间路由通信，dotCloud的设计可以很容易地与今天的工具由一个合适的团队在很短的时间去实现。因此，它将为我们提供一个很好的比较点：“如果我们自己实现它，我们会得到什么”和“如果我们使用现有的服务网格，我们会得到什么”，也就是这个传统的困境 - “构建vs购买”。

## 托管程序的流量路由

部署在dotCloud上的应用程序可以公开HTTP和TCP端点。

**HTTP端点**被动态添加到[Hipache](https://github.com/hipache/hipache)集群的配置中。这与我们今天使用Kubernetes [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)资源和负载均衡器如[Traefik](https://traefik.io/)可以实现的功能类似。

只要域名指向dotCloud的负载均衡器，客户端就可以使用它们的关联域名连接到HTTP端点。这里没有什么特别的。

客户端可以使用指定的主机名(类似于gateway-X.dotcloud.com)和端口号连接到TCP端点。

该主机名将解析为一个“nats”服务器集群(与[NATS](https://nats.io/)没有任何关系)，该集群将把传入的TCP连接路由到正确的容器(或者，在有负载均衡服务的情况下，路由到正确的容器)。

如果您熟悉Kubernetes，这可能会让您想起[NodePort](https://kubernetes.io/docs/concepts/services-networking/service/#NodePort)服务。

dotCloud平台没有与[ClusterIP](https://kubernetes.io/docs/concepts/services-networking/connect-applications-service/)提供相同的服务: 为了简单起见，从平台内部和外部以相同的方式访问服务。

这已经足够简单了，HTTP和TCP路由网格的最初实现可能都是几百行Python代码，使用的算法相当简单(我敢说，相当简单)，但是随着时间的推移，它们不断发展，以处理平台的增长和额外的需求。

它不需要对现有程序代码进行大量重构。[十二因素应用程序](https://12factor.net/)尤其可以直接使用通过环境变量提供的地址信息。

## 它与现代服务网格有何不同?

**可观测性**是有限的。TCP路由网格没有任何度量指标。至于HTTP路由网格，后来的版本提供了详细的HTTP指标，显示错误代码和响应时间；但是现代服务网格的功能远远不止于此，它还提供了与度量收集系统(例如Prometheus)的集成。

可观察性不仅从操作角度(帮助我们排除问题)来看很重要，而且对于交付诸如安全的[blue/green deployment](https://martinfowler.com/bliki/BlueGreenDeployment.html)或[canary deployment](https://martinfowler.com/bliki/CanaryRelease.html)这样的特性也很重要。

**路由效率**也受到限制。在dotCloud路由网格中，所有流量都必须经过一组专用路由节点。这意味着可能跨越几个AZ(可用性区域)边界，并显著增加延迟。我记得对一些代码做过故障排除，这些代码发出100多个SQL请求来显示给定的页面，并为每个请求打开到SQL服务器的新连接。在本地运行时，页面会立即加载，但在dotCloud上运行时，则需要几秒钟，因为每个TCP连接(以及随后的SQL请求)需要几十毫秒才能完成。在这种情况下，使用长连接就可以解决问题了。

现代服务网格做得更好。首先，确保连接在源节点上被路由。逻辑流仍然是“客户端→网格→服务”，但是现在网格在本地运行，而不是在远程节点上，所以“客户端→网格”连接是本地连接，因此非常快(微秒而不是毫秒)。

现代服务网格还实现了更智能的负载均衡算法。通过监控后端健康状况，它们可以在处理速度更快的后端上发送更多的流量，从而提高整体性能。

现代服务网格的**安全**也更强大。dotCloud路由网格完全在EC2 Classic上运行，并且没有加密流量(假设有人设法嗅探到EC2上的网络流量，那么无论如何都会遇到更大的麻烦)。现代服务网格可以透明地保护我们所有的通信，例如通过相互的TLS身份验证以及后续的加密。

## 平台服务的流量路由

好的，我们已经讨论了应用程序如何通信，但是dotCloud平台本身呢?

平台本身由大约100个微服务组成，负责各种功能。其中一些服务接受来自其他服务的请求，而其中一些服务是后台工作服务，它们将连接到其他服务，但不能自己接收连接。无论哪种方式，每个服务都需要知道它需要连接到的地址的端点。

许多高级服务都可以使用上面描述的路由网格。事实上，dotCloud平台的100多个微服务中有很大一部分是作为常规应用程序部署在dotCloud平台上的。但是，少量的底层服务(特别是实现路由网格的服务)需要一些更简单的东西，需要较少的依赖关系(因为它们不能依靠自己来运行；这是一个古老的“先有鸡还是先有蛋”的问题)。

通过直接在几个关键节点上启动容器，而不是依赖于平台的构建器、调度器和运行器服务，部署了这些底层的基本平台服务。如果您想要与现代容器平台进行比较，这就像直接在节点上启动我们的控制平面，使用 `docker run`，而不是让Kubernetes为我们做这件事。这与[kubeadm](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm/)或[bootkube](https://github.com/kubernetes-incubator/bootkube)在加载自托管集群使用[静态pod](https://kubernetes.io/docs/tasks/administer-cluster/static-pod/)相当类似。

这些服务以一种非常简单粗糙的方式对外开放：有一个YAML文件列出了这些服务，将它们的名称映射到它们的地址；这些服务的每个消费者都需要该YAML文件的副本作为其部署的一部分。

一方面，这是非常健壮的，因为它不涉及像Zookeeper那样维护外部键/值对存储(请记住，etcd或Consul在当时并不存在)。另一方面，它使得服务迁移变得困难。每次移动一个服务时，它的所有消费者都需要接收一个更新的YAML文件(并可能重新启动)。不是很方便!

我们最开始的解决方案是让每个消费者都连接到一个本地代理。消费者不需要知道服务的完整地址+端口，只需要知道它的端口号，并通过“localhost”连接。本地代理将处理该连接，并将其路由到实际后端。现在，当一个后端服务需要移动到另一台机器上，或按比例扩容或缩容，不再需要更新它的所有消费者，我们只需要更新所有这些本地代理；我们不再需要重新启动消费者。

（还计划过将流量封装在TLS连接中，并在接收端使用另一个代理来打开TLS并验证证书，而不涉及该接收服务，该服务将被设置为只接受`localhost`上的连接。稍后会详细介绍。)

这与AirBNB的[SmartStack](https://medium.com/airbnb-engineering/smartstack-service-discovery-in-the-cloud-4b8a080de619)非常相似；与之显著不同的是，SmartStack 被实现并部署到生产环境中，而dotCloud的新内部路由网格在dotCloud转向Docker时被搁置。☺

我个人认为SmartStack是诸如Istio、Linkerd、Consul Connect等系统的先驱之一，因为所有这些系统都遵循这种模式:

- 在每个节点上运行代理
- 消费者连接到代理
- 控制平面在后端更改时更新代理的配置
- … 利润!

## 实现一个服务网格

如果我们今天必须实现一个类似的网格，我们可以使用类似的原则。例如，我们可以设置一个内部DNS区域，将服务名称映射到`127.0.0.0/8`空间中的地址。然后在集群的每个节点上运行HAProxy，接受每个服务地址上的连接(在“127.0.0.0/8”子网中)，并将它们转发/负载均衡到适当的后端。HAProxy配置可以由[confd](https://github.com/kelseyhightower/confd)管理，允许在etcd或Consul中存储后端信息，并在需要时自动将更新后的配置推送到HAProxy。

这几乎就是Istio的工作原理！但有一些不同之处:

- Istio使用[Envoy Proxy](https://www.envoyproxy.io/)，而不是HAProxy
- Istio存储后端配置使用Kubernetes API，而不是etcd或Consul
- 服务在内部子网中分配地址（Kubernetes集群 IP 地址），而不是“127.0.0.0/8”
- Istio有一个额外的组件（Citadel）添加客户端和服务器之间的相互TLS认证
- Istio增加了对新功能的支持，如断路，分布式追踪，金丝雀部署…

让我们快速回顾一下这些差异。

### Envoy代理

Envoy代理是由Lyft撰写。它与其他代理（如HAProxy、NGINX、Traefik……）有许多相似之处，但Lyft编写它是因为它们需要当时这些代理中不存在的功能，而且构建一个新的代理比扩展现有代理更有意义。

Envoy可以单独使用。如果有一个给定的服务需要连接到其他服务，可以把它连接到Envoy，然后动态地在Envoy上配置和重新配置其他服务的位置，从而得到很多额外的优雅的功能，比如可观测性。不需使用定制的客户端库，也不用在代码中对请求添加追踪，而是将流量定向到Envoy，让它来收集指标。

但是Envoy也可以用作服务网格的`数据平面`。这意味着现在将由该服务网格的`控制平面`配置Envoy。

### 控制平面

说到控制平面：Istio的实现依赖于Kubernetes API。*这和使用cond没有太大的不同。* cond依赖etcd或Consul来监视数据存储中的一组键值。Istio依赖Kubernetes API来监视一组Kubernetes资源。

*旁白* ：我个人认为阅读这篇文章[Kubernetes API description](https://github.com/kubernetes/community/blob/master/contributors/design-proposals/api-machinery/protobuf.md#proposal-and-motivation)非常有帮助。

> Kubernetes API服务器是一个“dumb server”，它提供对API资源的存储、版本控制、验证、更新和监视语义。

Istio是为与Kubernetes合作而设计的；如果您想在Kubernetes之外使用它，则需要运行Kubernetes API服务器的实例（以及etcd服务作为支持）。

### 服务地址

Istio依赖于Kubernetes对集群ip地址的分配，因此Istio服务获得一个内部地址（不在“127.0.0.0/8”范围内）。

在没有Istio的Kubernetes集群上，前往给定服务的ClusterIP地址的流量被kube-proxy拦截，并发送到该代理的后端。更具体地说，如果您想了解技术细节：kube-proxy通过设置iptables规则（或IPVS负载均衡器，取决于它是如何设置的）来重写连接到集群IP地址的目标IP地址。

Istio安装在Kubernetes集群上之后，任何变化都不会发生，直到通过将 *sidecar* 容器注入到使用者pod中，显式地为给定的消费者甚至整个namespace启用Istio。sidecar将运行一个Envoy实例，并设置一些iptables规则来拦截到其他服务的流量，并将这些流量重定向到Envoy。

结合Kubernetes DNS集成，这意味着我们的代码可以连接到一个服务名，一切都“正常工作”。换句话说，我们的代码将发出一个请求，例如`http://api/v1/users/4242`，`api`被解析至`10.97.105.48`，而一个iptables规则将拦截发送给`10.97.105.48`的连接并且重定向到他们本地Envoy代理，该代理将请求路由到实际的api的后端。唷!

### 其它

Istio还可以使用名为*Citadel*的组件，通过mTLS（双向的TLS）提供端到端加密和身份验证。

*Mixer* ，Envoy的另一个功能组件，可以查询 *每一个* 请求，并对请求做一个ad-hoc决定，该决定取决于各种因素，例如请求头、后端负载…（别担心：有丰富的规则，以确保mixer高度可用，即使它暂时不可用，Envoy可以继续代理流量。）

当然，我提到了可观察性：Envoy在提供分布式追踪的同时收集了大量的度量（metrics）。在微服务架构中，如果单个API请求必须经过微服务A、 B、 C和D，分布式追踪将在进入系统的请求添加一个惟一的标识符，并在流经这些微服务的子请求中保留该标识符，允许收集所有相关的请求调用，它们的延迟等。

## 构建vs.购买

Istio以复杂著称。相比之下，使用我们今天已经拥有的工具，构建像我在本文开头描述的那样的路由网格相对比较简单。那么，构建我们自己的服务网格是否有意义呢?

如果我们有适度一点的需求（比如不需要可观察性，断路器，和其他细节），我们可能想建立自己的服务网格。但是如果我们正在使用Kubernetes，我们甚至可能不需要这样做，因为Kubernetes已经提供了基本的服务发现和负载平衡。

现在，如果我们有高级一点需求，“购买”服务网格可能是更好的选择。（由于Istio是开源的，所以它并不总是“购买”，但是我们仍然需要投入工程师的时间来理解它是如何工作、部署和运行的。）

## Istio vs. Linkerd vs. Consul Connect

到目前为止，我们只讨论了Istio，但它并不是唯一的服务网格。[Linkerd](https://linkerd.io/2/overview/)是另一个流行的选择，还有[Consul Connect](https://learn.hashicorp.com/consult/getting-start-k8s/l7-observability-k8s)。

我们应该选哪一个?

老实说，我也不知道，而且在这一点上，我认为自己的知识不足以帮助任何人做出这个决定。不过你可以参考这些有趣的[文章](https://thenewstack.io/which-service-mesh-should-i-use/)对它们做的[比较](https://medium.com/solo-io/linker-or-istio-6fcd2aad6e42)，甚至它们的[基准测试](https://medium.com/@michael_87395/benchmark-istio-linker-cpu-c36287e32781)。

一种很有潜力的方法是使用[SuperGloo](https://supergloo.solo.io/)这样的工具。SuperGloo提供了一个抽象层来简化和统一服务网格公开的api。我们可以使用SuperGloo提供的更简单的构造，并无缝地从一个服务网格切换到另一个服务网格中，而不是学习各种服务网格的特定api（在我看来，相对复杂）。有点像我们有一个描述HTTP前端和后端的中间配置格式，能够生成NGINX、HAProxy、Traefik、Apache的实际配置…

我在如何通过SuperGloo使用Istio有点涉足，在以后的博客中，我将说明如何使用SuperGloo将Istio或Linkerd添加到现有的集群，以及后者是否持有的承诺，即让我从一个路由网切换到另一个而不需要重写配置。
