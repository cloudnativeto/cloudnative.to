---
weight: 3
title: Istio 大咖说
summary: 本文将为大家介绍 Istio 名称的来历。
date: '2022-07-16T00:00:00+08:00'
type: book
---

《Istio 大咖说》是由企业级服务网格提供商 [Tetrate](https://tetrate.io/) 冠名的以 [Istio](https://istio.io/) 和服务网格为主题的在全球性直播节目《[Istio Weekly](https://github.com/tetratelabs/istio-weekly)》的一部分。《Istio 大咖说》旨在分享 Istio 相关的开源技术及实践，开播于 Istio 开源四周年之际（2021 年 5 月 25 日），本节目定期邀请 Istio 和服务网格领域的专家参加直播与观众互动。

## 资源

- 直播间地址：[Bilibili - 《Istio 大咖说》](https://live.bilibili.com/23095515)
- 历史视频回看：[Bilibili - IstioServiceMesh](https://space.bilibili.com/1698576814)
- 幻灯片归档地址：[GitHub](https://github.com/tetratelabs/istio-weekly/blob/main/istio-big-talk/playlist.md)

## 第一期: Istio 开源四周年回顾与展望

- 时间：2021 年 5 月 25 日晚 8 点
- 嘉宾：马若飞（FreeWheel）
- 嘉宾介绍：《Istio 实战指南》作者、极客时间《Service Mesh 实战》专栏作者、AWS Container Hero
- 视频回放：[《Istio 大咖说》第 1 期：Istio 开源四周年回顾与展望](https://www.bilibili.com/video/BV1jK4y1R7Tk)

想了解 Istio 的来历吗？想知道 Istio 自我救赎般的架构重构吗？想窥探 Istio 开发背后的趣事吗？想一起解读最新版本的新特性吗？北京时间 5 月 25 日晚上 8 点，相约 B 站，让我们一起回顾 Istio 发布四周年的点点滴滴，[B 站直播间](https://live.bilibili.com/23095515)不见不散！

## 第二期：从微服务架构到 Istio ——架构升级实践分享

- 时间：2021 年 6 月 2 日晚 8 点
- 嘉宾：潘天颖（小电科技）
- 嘉宾介绍：小电科技工程师，云原生爱好者，Kubernetes contributor，Apache committer。
- 视频回放：https://www.bilibili.com/video/BV1QQ4y1X7hP/

云原生赛场已经进入了下半场的比拼，Istio 作为服务网格赛道上的明星选手，社区活跃度和用户知名度都位列前茅。但是国内环境下 Istio 的落地实践却并不多。是什么阻碍了 Istio 的落地，到底 Istio 好不好用？到底什么情况下使用 Istio 利大于弊？本次我们将站在企业用户角度上，邀请了潘天颖分享 Istio 在小电科技的完整落地经验，讲述为什么要从传统微服务架构迁移至服务网格架构，其中遇到的困难与解决方法，以及针对 Istio 的改进方案。

### 问答

请问刚参加工作的应届生，工作涉及istio中的envoy，请问应届生应该如何提前学习Envoy？

答：需要多了解下网络知识，还有云原生社区的Envoy中文文档可以学习，也可以参加社区的翻译活动。

------

在 service 特别多的时候，比如几万个 service，sidecar 是否会占用过多内存？如果是的话，可以有什么解决思路？

答：可以通过将应用按业务组进行分组，将相互依赖的应用分开部署到不同的namespace中，然后配置sidecar配置进行配置收拢，使应用只关心特定namespace中的服务配置，个别服务通过网关调用。毕竟很难有应用会依赖几万个svc的。

------

我们想上Istio，请教下有什么坑？Istio1.10版本。建议上吗？架构为 SpringCloud。

答：本次分享应该回答了问题，这里很难回答。

------

请问针对使用dubbo框架开发的应用来说，上Istio有什么建议？老师对aeraki这个项目怎么看？Istio对于支持dubbo以及其它协议这块有什么好的支持方式？

答：可以考虑升级下dubbo 3.0.0，istio目前已经支持dubbo协议，但是由于dubbo数据包attachment在整个数据体的最后，反序列化成本较高，需要关注下性能。还有一点是一般dubbo服务sdk比较难去掉，和 Istio功能重合太大了。不太了解aeraki这个项目。社区可以邀请项目的人来分享。

------

IRA开源吗？

答：这个服务通过istio的configController机制完成，代码量不大，目前还没开源。

------

Mesh外的服务怎么访问Mesh内的服务？走Mesh的Ingess gateway 吗？

答：分享中已经提到，我们通过register-helper sidecar容器，保留了迁移过程中mesh外服务通过注册中心访问网格内服务的能力。完成迁移后可以将该sidecar去掉。当然网格外的服务通过ingress也是能够访问网格内的服务的。

------

请问接入Istio需要开发介入什么操作变更，当前架构为Spring Cloud，注册中心为nacos/eureka，95%应用在Kubernetes上，现在需要用到流量控制，ingress gateway，熔断，限流等功能。

答：如果迁移设计的比较完美，其实可以做到开发零介入。比如我们的实践，大多数java服务只需要引入一个java jar包就可以。这个包中你可以将原来java服务底层的register sdk屏蔽，并且去除loadbalace逻辑，保留上层的接口。减少开发的接入成本，也方便Istio的推广。

------

上网格后springcloud consumer是否需要手动修改每个provider地址为Kubernetes service name?

答：这个建议是要替换的。但是有很多比较优雅的方式，详细见分享。

------

能分享下目前用wasm主要做了哪些事么？稳定性和性能方面怎么样？

答：对流量打标处理，方便后续进行route分发。由于是使用在sidecar而不是ingress上，性能上面并没有问题。稳定性需要使用者来保证了，wasm插件切不可出错，否则会影响所有流量。

------

目前Istio控制面管理不友好，如果不通过自研方案的话有什么推荐么？yaml方面，目前看没有很好的gui配置。

答：社区比较主流的有kiali，如果企业支持，可以参考下一些企业支持版的Istio版本，比如[TSB](https://tetrate.io/tetrate-service-bridge)。

------

什么样的业务或者场景适合上Istio，运维工程师该注意那些点，是否有很好的方案供参考，运维如何和开发配合完善推进上Istio，我们的业务是支付打款相关的，目前是.Net。

答：Istio适不适合其实和业务关系不大，和历史技术架构关系比较大。运维工程师和开发接受Istio架构需要比较大的学习成本。如果对这个有信心，那么并没有大问题。至于.Net还是其他语言关系并不大，毕竟Istio是语言无关的。

## 第三期：如何让 Istio 变得更为高效和智能

- 时间：6 月 9 日（星期三）晚 8 点 - 9 点
- 嘉宾：杨笛航（网易数帆）
- 话题：如何让 Istio 变得更为高效和智能
- 直播回放：https://www.bilibili.com/video/BV18o4y1y75e/

### 讲师简介

杨笛航，Istio 社区成员，网易数帆架构师，负责网易轻舟 Service Mesh 配置管理，并主导 Slime 组件设计与研发，参与网易严选和网易传媒的 Service Mesh 建设。具有三年 Istio 控制面功能拓展和性能优化经验。

Istio 作为当前最火的 Service Mesh 框架，既有大厂背书，也有优秀的设计，及活跃的社区。但是随着 Mixer 组件的移除，我们无法通过扩展 mixer adapter 的方式实现高阶的流量管理功能，Istio 的接口扩展性成为亟待解决的问题。本次直播将分享本次分享将介绍网易自研的智能网格管理器 Slime，借助它，我们实现了配置懒加载，自适应限流，HTTP 插件管理等扩展功能，从而更为高效的使用 Istio。

### 问答

1. Slime 兼容什么版本的 Istio？

   答：1.3 以后的版本都可以，网易内部使用 1.3 和 1.7 版本。

2. 请问对于 Slime 的懒加载功能，在初始的时候是否可能存在 “冷启动”（刚开始 fence 里的服务较少，大多数依赖如果需要从兜底路由拉取需两次代理）。a) 能不能在刚开始的时候在 fence 里把所有 service 都写上（相当于配置信息全量下发），每次被调用到的服务放到 fence 的前面，等几轮全量下发配置之后将 fence 里排在后面的 service，类似于 LRU 算法）删除，这样可不可以减少两次代理的次数。b) 或者在开始前分析最近的流量关系，得到一个初始的 fence 状态。

   答：a) 可以在 fence 里手动配置，也可以当做 SidecarScope 资源来用，例如已经确定了 a 到 b 的调用关系，那么可以使用如下配置作为 a 的 servicefence：

   ```yaml
   apiVersion: microservice.netease.com/v1alpha1
   kind: ServiceFence
   metadata:
     name: a
     namespace: test1
   spec:
     enable: true
     host:
       b.test1.svc.cluster.local:
         stable: {}
   ```

   b) 可以有类似的做法，例如可以开启配置懒加载在测试环境运行一段时间，得到 fence 的初始状态然后放到线上环境去使用。

3. 如果想给 Istio 添加更多的负载均衡策略，能否通过添加 CRD 的方式，或者通过 wasm 拓展 envoy？

   答：Slime 主要是做控制平面的扩展，负载均衡策略可能要通过 Envoy 来扩展。

4. 有什么办法能让两个服务均在网格之中，但在他们双发调用时流量不经过 proxy 而直接访问？

   答：动态修改 iptables。

5. 协议：有什么办法能实现满足支持其他 RPC 协议，如 thrift 和其他私有 RPC？

   答：Envoy 已经支持 Thrift 和 Dubbo 协议，但是不能比较好的路由和流量管理，可以研究下开源项目 Aeraki。

6. 写 SmartLimiter CRD 时，ratelimite 是如何渲染成 EnvoyFilter 的，在数据面要做些什么工作？

   答：EnvoyFilter 的作用是将某一段配置插入到 xds 中的某块位置，实现 ratelimite 的功能就是要把 ratelimite 的相关配置插入到 rds 中 host 级别 /route 级别的 perfilterconfig 中。因而我们可以基于一个固定的模版去渲染 EnvoyFilter。目前自适应限流是基于 envoy 官方的限流插件的，不需要数据面做额外的工作。

7. 第一次访问为什么会走到 global sidecar？

   答：第一次访问还没有服务依赖拓扑，调用者没用被调用者的服务发现和路由信息，需要 global sidecar 作为兜底代理

8. EnvoyFilter 有执行顺序吗，比如设置了 RequestAuthentication 和 AuthorizationPolicy，在 filter 里面有执行顺序吗？

   答：LDS 中的插件次序就是执行顺序。

9. Sidecar 和 应用容器的启动顺序，一定是 sidecar 先启动吗？

   答：在安装时开启 holdApplicationUntilProxyStarts 可以确保 sidecar 容器先启动（Istio 1.7 +）。

## 第四期：如何让 Istio 在大规模生产环境落地

- 分享时间：2021 年 6 月 23 日（周三）晚 8 点到 9 点
- 议题名称：如何让 Istio 在大规模生产环境落地
- 分享嘉宾：陈鹏（百度）
- 回放地址：https://www.bilibili.com/video/BV18M4y1u76t/

### 讲师简介

陈鹏，百度研发工程师，现就职于百度基础架构部云原生团队，主导和参与了服务网格在百度内部多个核心业务的大规模落地，对云原生、Service Mesh、Isito 等方向有深入的研究和实践经验。

### 分享大纲

1. 百度服务治理现状 & Istio 落地挑战
2. 深入解读如何让 Isito 在大规模生产环境落地
3. 实践经验总结 & 思考

通过本次分享你将了解当前 Isito 落地的困境和解决思路。

### 问答

1. 请问，Istio 组件，包括数据面和控制面发生故障时，有哪些快速 fallback 的方案，之前阅读了大佬的相关文章，这块好像没有细讲，谢谢！

   > 相对来说， 数据面 fallback 更重要一些，因为它直接接流量。最好是能结合流量劫持环节，让 sidecar 故障时，系统能自动感知到，流量自动 fallback 到直连模式，具体思路可以参考分享内容，其次 sidecar 的监控也是必要的，用来辅助感知和处理故障。控制面故障短时间内不会对流量转发造成影响，也可以通过部署多副本来应对故障。

2. 有些服务 QoS 想设置 guaranteed，但是 istio 的 sidecar 不是 request 和 litmit 一样的。要 guaranteed 的话必须 sidecar 的 QoS 相关配置也要改。你们是怎么做的？如果改，建议设置为多少？感谢大佬！

   > 我们通常 sidecar 内存 limit 200M，cpu limit 是业务的 10% 到 20%，但我觉得这个没有通用的参考数据，需要结合业务场景压测拿到数据，更为科学。

3. 你好。作为业务方的技术负责人，被中间件团队推动上 Istio，目前带来的收益主要是服务治理方向的。从业务迭代效率的角度看，上 Istio 的增量收益抵不上迁移成本的代价；另外还降低了业务方工作的技术含量。请问有没有实践中，业务方在 Mesh 化的过程中获得显著收益的例子？

   > 不能只关注 mesh 自身的能力，还要深入了解业务，最好是能挖掘业务最痛点的问题，比如原有框架治理能力比较弱，或者可视化能力弱，或者变更效率低等，业务最痛点的问题对于 mesh 来说可能是普通的能力，但却会给业务线带来很大的提升。

4. 为什么没有采用 mcp over xds 的方案？ 而是独立搭建了 API server 和 etcd？

   > api server + etcd 可以比较容易的独立部署，能复用尽量复用。

5. pilot 的多业务方案是怎么做的？ 如果是多个 pilot 的话，那独立的 Kubernetes API server 和 etcd 也要多个么？

   > 我们目前的实践是 api server + etcd 是一套，pilot 根据业务线多套，当然 api server + etcd 也可以是多套，可以根据系统性能以及数据隔离等需求灵活部署。

6. Envoy 的 brpc 改造方案，会考虑开源么？ 怎么 follow 后续社区 Envoy 的最新代码呢

   > brpc 本身也是开源的，Envoy 只是做了集成。社区版本更新很快，具体多久更新一次其实很难抉择，需要考虑架构升级成本，以及社区版本的成熟度，这块我也没有太好的建议。

7. 内部的 mesh 方案，考虑通过百度云的方式对外输出么？

   > 一些高级策略能力会逐步输出到公有云产品。

8. 随着 istio 新版本的不断发布，内部使用的版本是否跟进了开源新版本，跟进社区版本升级有什么经验分享？

   > 同上，社区版本更新很快，具体多久更新一次其实很难抉择，需要考虑架构升级成本，以及社区版本的成熟度，这块需要结合团队现实情况考虑升级时机。

9. Envoy filter 管理麻烦的话，nshead、dubbo 等多协议支持是怎么实现的？在 pilot 中是如何管理的？

   > 我们内部是直接在 pilot 内部实现支持，类似于 http 的功能。

10. 引入两个 sidecar 后问题定位的成本和难度会大福增加，这块有什么经验可以分享

    > 一方面 Envoy 自身提供了丰富的接口，可以暴露内部很多的状态，另一方面也需要和自有监控基础设施对接。

11. Sidecar 带来的额外成本问题谁来买单？业务认可吗

    > 这个其实需要和业务团队明确，额外的资源成本是需要业务买单的，但对于内部业务，具体的成本可以比较低，业务普遍是能接受的。

12. Sidecar 可以使用的的资源配额是怎么分配管理的，动态的还是静态的，有什么经验

    > 不同的业务场景可能不太一样，内存大概在几百 M，CPU 一般是是业务的 10% 到 20%，但最好是要根据业务场景进行压测，得到数据。

13. Sidecar 的监控是怎么做的？ 权限，成本方面可能都有一些疑问

    > Envoy 本身会暴露自身指标，对接相关的监控即可。

14. Naming 这个 agent 和框架非常不错，请问 Naming 可以支持负载均衡么， 也就是 PodX 访问 PodY 的时候，naming 不要返回 PodY 真实 IP，而是返回负载均衡的 VIP 给 PodX; 十分感谢 - Ken

    > 目前没有这么做，直接返回了 Envoy 的 loopback ip 来做流量劫持。

15. 这种架构的话，PodX 主动出公网的逻辑是怎样的呢，也是通过 ip-masq 做 NAT 吗？

    > 目前主要做内网服务的 mesh，这块没有太多经验，十分抱歉～

16. Naming agent 是部署在哪个容器？

    > 是一个主机部署一个的单机 agent，工作在主机网络上的。

17. Pliot 在落地过程中部署模型，大规模 Envoy 注册后，是否存在一些性能瓶颈，有什么优化的经验？

    > 可以增加 pilot 的副本数，来应对大规模 Envoy 的链接，另外控制面处理逻辑也有很多可以优化的地方，来优化从 API server 拿到数据之后的计算过程，这部分需要对 pilot 代码有一定开发经验和熟悉程度。

18. 虽然老师不一定有关注这一块，但也提个问题看看吧。 Envoy 流量劫持是在 userSpace 还要经 TCP 协议栈其实损耗非常大的，后续 Envoy 有考虑 byPass Kernel，直接传包给网卡驱动提速么（例如 DPDK、SPDK）

    > 这个一方面要考虑成本问题，比如内核和硬件是否满足，另一方面也要评估收益，比如流量劫持这一部分虽然优化了，但是缩减的耗时对于整个请求链路的占比是否足够明显。

19. 流量都经过 sidecar 后，sidecar 在 trace 这方面是怎么考虑和设计的？

    > Envoy 本身支持 trace 相关的功能，这块其实是需要业务 sdk 中来进行支持，必须要透传 trace 相关的信息。

20. 对于 inbound 流量的限流是如何设计的呢？

    > 可以使用 EnvoyFilter CRD，给被调用方 inbound listener 插入 LocalRateLimiter 对应的 filter 来实现。

21. 私有协议如果要变更的时候，是不是要级联更新？

    > 抱歉，这个问题没太看明白～

22. 支持服务治理的配置灰度下发吗？可以简单说下实现方案吗

    > 内部其实是实现了，方案比较复杂，简单来说就是控制面自己控制 xds 下发，会先挑选部分实例生效，然后再给全部实例下发。

23. 你们 内部对于 istio deployment 里的 version 字段在落地时有大规模使用吗？我们最近在基于 istio 做灰度发布，但是每次灰度都要给他一个版本号，导致完成之后 deployment 名称就从 v1 变成 v2 以此累加，这样还会导致 deployment 本身的回滚功能失效。

    > 我理解是不是只需要 v1 和 v2 就够了，先灰度给 v1，没问题的话 v2 也生效，这时候 v1 和 v2 策略就打平了。下次恢复依然还是这个流程，好像不需要一直叠加版本好吧，不确定我理解的对不对～

24. Envoy 对于我司来说技术储备其实不是很够， 请问贵司刚上线的时候， Envoy 有没有遇到哪些问题。 特别是稳定性和故障方面。 如果能建议一下 Envoy 应该如何监控，那就 perfect.

    > Envoy 本身比较复杂，上线初期一定会遇到问题，最好是能结合流量劫持方案，做到 Envoy 故障自动 fallback，思路可以参考分享内容。监控的话，Envoy 自身会暴露 stats 接口，比较容易接入监控系统。

25. 对于 dubbo 的泛化调用，探针会实时检测调用关系的变化么？如果 sidecar 还没有被生成，这个时候流量请求阻塞怎么处理呢？一直等待还是直接拒绝？如果服务是新的请求呢？

    > 泛化调用这种比较灵活的方式，我们目前也没有很好的支持，一个思路是可以提前手动配置好调用关系。

26. link 模型解决 xDS 问题，可以再详细介绍一下整个逻辑链路么？例如 consumer 和 provider 的 link 数据是怎么获得的

    > 目前内部大规模落地的方案中，是需要用户在产品上显示定义的。

27. 2ms 的 Envoy 额外消耗，请问是怎么查看的呢？curl endpoint 跟 curl Envoy 做一次对比么

    > 官方的测试方法没有详细研究过，自己测试的话，可以用经过 Envoy 和 没经过 Envoy 的耗时 diff，也可以在程序里打点来看。

28. Envoy 注入后业务 pod 会存在 2 个 container， 那么 Envoy 的配额是怎么限制的呢？ 比如限制 4 核心可能就是 2 个容器（1 个 pod）里面的配额了；

    > 可以参见上面的回答

29. 就是我们在落地的时候，会遇到部分服务有 sidecar，部分没有 (服务 A 会被其他 10 个服务调用)，一般如何去判断配置设置在哪里，是在 outbound（其他 10 个服务部署 sidecar）处还是 inbound 处（服务 A 部署 sidecar）。这个有没有什么比较好的实践？

    > 这个需要结合流量劫持方案，做到有 sidecar 就过 sidecar，没有就走直连，具体思路可以参考分享内容。

30. Envoy 如何实现长连接的动态开关的？

    > 这个问题比较好，我们是通过让 Envoy 重新生成一个 listener，更改了 listen 的地址，让调用 Enovy 的 SDK 感知到，并重新链接。

## 第五期：腾讯云服务网格生产落地最佳实践

- 分享时间：2021 年 6 月 30 日（周三）晚 8 点到 9 点
- 议题名称：腾讯云服务网格生产落地最佳实践
- 分享嘉宾：钟华（腾讯云）
- 回放地址：https://www.bilibili.com/video/BV1th411h7Zr/

### 讲师简介

钟华，腾讯云高级工程师，Istio contributor，Dapr contributor, Tencent Cloud Mesh 技术负责人。专注于容器和服务网格，在容器化、服务网格生产落地和性能调优方面具有丰富经验。

通过本次分享了解大规模场景下，Istio 性能调优和最佳实践，包括 xDS 懒加载，控制面负载平衡，控制面灰度升级，Ingress gateway 优化等。

### 分享大纲

1. Istio 生产落地挑战
2. 腾讯云服务网格全托管架构介绍
3. 大规模服务网格性能优化
4. Istio 生产落地最佳实践

### 问答

1. Istio 的 gateway 对比 ambassador 的差异在哪？是否在 Istio 的基础上增加 api 网关这一层？增加后能填补哪些缺陷？

   答：Ambassador 本身也是基于 envoy 之上的一个云原生网关产品， 本身包括控制平面；api gateway 范畴包括一些 Istio ingress gateway 不具备的功能，比如 api 生命周期管理，api 计费，限速，监控，认证等。所以 api gateway 本身有存在的必要，不过 API Gateway 需求中很大一部分需要根据不同的应用系统进行定制。

   我们有客户将 kong， openresty 等 api gateway 和 Istio ingress gateway 结合起来用。

2. 对于多集群 Istio 部署了解到架构图如下所示，由单个控制平面管控所有集群，这里如果有 k8s 集群间网络不通，pod 与 pilot 交互链路是？

   答：数据面 k8s 间不互通，不会影响 控制面和数据面的通信。

   Istio 多集群的前提是：多 k8s 之间要互通，可以是 pod 扁平互通，或者通过 Istio gateway 互通。

3. Istio Envoy Sidecar 使用 iptables 劫持流量，一定规模环境下性能损耗较大，排障复杂，很多大厂都是自研 Envoy，比如蚂蚁金服、新浪、腾讯、华为等，自研的 Envoy 是使用什么来劫持流量呢，亦或者说自研的 envoy 解决了原生的 envoy 哪些缺陷呢？

   答：常见的有三种：

   1）uds：数据包不过协议栈，性能高，但只适合私有 mesh，因为需要应用面向 uds 编程。不适合公有云。比如美团，字节在使用这种方案。

   2）localhost+port：使用 port 代表不同的服务，通常需要拦截服务发现流量，再重新规划服务到端口映射，有一定管理成本，比如百度在使用这种方案。

   3）ebpf：在内核 socket ops 挂载 ebpf 程序，应用流量和 envoy 流量在 这个互通，流量不经过协议栈，性能高，对用户透明，但技术门槛高，对内核有版本要求。目前腾讯云 TCM 在小范围推广。

4. 长连接的情景下懒加载又是如何实现的？Workload 流量如何重定向到 egress，通过 passthrough？

   1）目前 lazy xds 对长连接没有特殊处理，用户需要权衡一下，首跳长连接性能 vs 数据面内存开销，以此决定是否使用长连接，大家如果对长连接 lazy xds 有想法，欢迎联系我。

   2）没有走 passthrough，请看 lazyxds 架构图上第二步，是会给 workload 2 下发具体的重定向规则，也就是指明哪些服务流量要到 lazy egress。

5. 钟老师您好， Istio 属于较新的技术，能否推荐一下监控应该怎么做， 或具体监控哪些指标？ 另外，下图步骤 10， Istiod 更新的时候是全量所有 workload 都更新吗， 还是只更新 wordload1 ?

   1）mesh 监控包括三个方面：metric, tracing，logging, TCM 技术选型偏云原生：metric 使用 prometheus, tracing 使用 jaeger collector， logging 是自研的技术。另外也用到了腾讯云上的监控服务。

   2）只更新 workload1，注意架构图上的第八，sidecar 里会指定具体的 workload。

6. Istio 目前的性能优化有什么实践经验吗

   答：TCM 团队之前在 kubeconf 上有数据面性能分享，请参考：[深入了解服务网格数据平面性能和调优](https://cloud.tencent.com/developer/article/1685873)。

7. 请问 isitod 的稳定性有什么实践经验可以分享吗，failback，failover 容错机制是怎么实现的？

   1. 本次分享包括 2 个 Istiod 稳定性实践：如何保证 Istiod 负载平衡，如何对 Istiod 做灰度升级
   2. 数据面 failback，failover 本身是 envoy 的能力，Istio 会给 eds 设置 priority， 这个值表示和当前 pod 的亲和度（地域和区域），（如果开启就近访问）服务访问会优先访问 priority 为 0 的 endpoint， 如果为 0 的 endpoint 都失效了，访问会 failover 到 priority 为 1 的 endpoint，接下来是 priority 为 2 的，逐级失效转移。

8. Istio 与已有的基础设施 (注册中心等) 如何整合，是使用 mcp 还是 k8s api server 实现

   答：之前我们尝试过 mcp，不过比较难调试，目前我们更推荐使用扩展 service entry 方式，参考我们开源的 [dubbo2istio](https://github.com/aeraki-framework/dubbo2istio) 或 [consul2istio](https://github.com/aeraki-framework/consul2istio)。

9. TKE 注入 sidecar pod 会从 1 个容器升级为 2 个容器，请问 pod 对集群内其他 pod 访问的链路是怎么走的呢？ 20:28 说到控制面板资源 HPA 后依然会紧张，能否建议下 ISTIOD 的资源应该如何设计么， 比如 n 个 pod 对应 1 个 Istiod。

   1. client 业务容器 ->client pod iptables->client envoy （将 service ip 转成 pod ip） -> node (iptables 不做 service nat 了) -> server pod iptables-> server envoy -> server 业务容器
   2. 需要结合业务做压测，通常建议可以把 request 设小一点，把 limit 设大一点。

10. isito 的部署模型是怎么样的？是每个业务部署一个 isitod 集群，还是多个业务共享？

    答：TCM 托管场景下，每个 mesh 有一个 Istiod。Istiod 按照 namespace 隔离。

11. namespace 是如何划分的，是按照业务来划分吗？

    答：TCM 场景下，是的，通过 namespace 隔离多租户的控制面。

12. Istio 使用 envoyFilter 做限流，可以在 inbound 上根据 url 前缀匹配或者接口级别的维度做限流么？目前看只能在 outbound 上引用 virtualService 里面的配置，inbound 只能限制总流量。

    答：目前社区应该不支持 url 级别的限流，需要自研。这个需求是刚需，我们可以一起调研下解决方案。

13. CRD 托管的原理能详细介绍下吗？

    答：核心使用的是 kubernetes aggregation 技术，把 Istio CRD 作为 kubernetes 的外部扩展。

    当用户读写 Istio crd 时， api server 会将流量路由到我们指定的外部服务，我们这外部服务实现了 crd 的托管。

14. Envoy 如何做热更新？怎么在容器内注入新版本的 Envoy？

    答：热更新核心是通过 UDS（UNIX Domain Socket），可以参考下 openkruise 解决方案，不过该方案只能解决仅有镜像版本变化的更新，对于 yaml 变化太大的更新，目前不好处理。

15. 业务容器已经启动接收流量了，而 envoy 还没完成 eds 的下发，出现流量损失？Istio 是否会出现这种情况？

    答：会的，所以需要遵循 make before break，核心原因在于：目前 Istio 实现中，没法知道 规则下发是否完全生效。

    目前的姑息办法是 make before break + 等待一定时间。

16. 如何支持 `subdomain-*.domain.com` 这样的 host 规则？Envoy 是不支持的，有没有方法可以扩展

    答：目前的确不支持，建议去社区提 issue，参与共建。不过 Istio 的 header match 支持正则，可以尝试使用 host header，或者 authority 属性，需要验证一下。

17. Istio 可否实现类似于 dubbo 服务的 warmup 机制，动态调整新注册 pod 的流量权重由低到正常值？ZPerling

    答：Envoy 社区有提案，目前没有完成：[issue #11050](https://github.com/envoyproxy/envoy/issues/11050) 和 [issue 13176](https://github.com/envoyproxy/envoy/pull/13176)。

18. Mysql 和 mq 可以做版本流量控制吗？他们的流量识别怎么做呢？

    答：目前不行，这是 Istio 的软肋，envoy mysql filter 功能比较基础，关注下 Dapr 这个项目。

19. 原来的 SpringCloud 项目 服务注册发现 & 配置中心用的 consul，如果切换 Istio 的话，服务发现和配置中心要怎么支持？

    答：注册发现考虑下 [consul2istio](https://github.com/aeraki-framework/consul2istio)，另外 SpringCloud 组件可能需要做一些减法，去掉一些 Istio 支持的流控能力组件。

20. SpringCloud 项目 通过 K8s 集群部署，切换到 Istio，原来业务依赖的中间件通信方式需要改变？原本的流量如果直接切换到 Istio 风险较高，有没有一键下掉 Istio 的开关或者这种机制：降低有问题流量降级切换到原来的部署架构？

    1）可能改变的通信方式：主要是服务发现过程改变。Istio 支持透明接入，通常中间件的通信方式不会受影响。

    2）这个能力的确会给刚开始 mesh 化的业务带来信心，开源 Istio 没有这个能力，参考之前百度陈鹏的分享。

21. 使用 traefik 作为边缘代理，Istio 来管理服务内部的流量。traefik 转发策略是直连 pod，而不是走 k8s 的 service，如何使用 Istio 来管理到达服务的流量？

    答：抱歉我对 traefik 并不熟悉，不过大概看了这篇[在 Istio 服务网格中使用 Traefik Ingress Controller](https://cloudnative.to/blog/using-traefik-ingress-controller-with-istio-service-mesh/)，流量从 traefik 出来是经过了 envoy，在这里应该还可以做服务治理，后面我再研究下。

22. 目前 Istio 版本缺失限流功能，这部分要怎么支持？

    答：目前 Istio 支持 local 和 global 两种方式，不过 local 无法多 pod 共享限频次数，global 性能可能不一定满足用户需求。

    目前社区应该不支持 url 级别的限流，需要自研。这个需求是刚需，我们可以一起调研下解决方案。

23. 现有 K8S 集群业务切换到腾讯云 Istio 部署需要做哪些操作？成本高？

    答：看当前业务的技术特征，如果是 http、grpc+ k8s 服务发现，迁移成本比较低，如果有私有协议，会有一定难度。

24. 是一套 k8s 对应一套 Istio，还是一套 Istio 对应多个 k8s 集群？多集群是怎么做的？

    1. 主要看业务需求，如果有跨集群业务互访，或者跨集群容灾，就可以考虑使用 Istio 多集群方案。
    2. 多集群实现可以参考我之前的分享：[Istio 庖丁解牛 (五) 多集群网格实现分析](https://zhonghua.io/2019/07/29/istio-analysis-5/) 和 [istio 庖丁解牛 (六) 多集群网格应用场景](https://zhonghua.io/2019/08/01/istio-analysis-6/)。

25. Istio 下的服务限流方案？

    答：目前支持 local 和 global 两种方式，参考 [Enabling Rate Limits using Envoy](https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/)，另外网易 slime 中有动态的限流方案。

26. Istio 到现在都不支持 path rewrite 的正则，这块是否有一些社区的方案支持，因为这个策略在实际的业务中还是很常见的

    答：目前的确不支持，建议去社区提 issue，参与共建。

27. 多网络单控制平面的情况下，从集群如果没有某服务的 Pod 的话，该集群其他 Pod 通过域名访问主集群 pod 的话从集群必须有空的 svc 吗，有其他什么方案实现吗 智能 dns 方案成熟了吗？Pilot Agent 不是有 DNS Proxy 么

    答：Istio 1.8 提供的 智能 DNS 可以解决这个问题，1.8 里有 bug， 1.9 修复了，目前我们有生产客户在用了，目前看起来生产可用，可以尝试。

28. 切换到 istio, 原来业务依赖的中间件通信方式需要改变？MySQL Redis Consul Kafka

    答：Istio 对 db mesh 支持功能不多，通信方式不需要改变。

29. 推荐使用哪个版本的 Istio？

    答：建议使用次新版本，比如现在 1.10 发布了，建议使用 1.9；未来 1.11 发布了，就要着手升级到 1.10。

## 第六期：Envoy Proxy 在线答疑

- 分享时间：2021 年 8 月 3 日（周二）中午 12:30 到 14:00
- 议题名称：Envoy Proxy 在线答疑
- 分享嘉宾：周礼赞（Tetrate）
- 回放地址：https://www.bilibili.com/video/BV1d64y1x7yn

我们在过去两个月内已经陆续举办了 5 期《[Istio 大咖说](https://mp.weixin.qq.com/s?__biz=MzI1NTE2NDE2MA==&mid=2649385244&idx=1&sn=c03da04686c82d75a62c214f851da48b&chksm=f224e373c5536a655f5f7270da8ed66f3f92d55f9a3a92d26125d14699fd40e3112db397cedf&scene=21#wechat_redirect)》，直播过程中很多观众反馈想要了解下 Envoy，有很多关于 Envoy 的问题却没有人可以来解答，而 Envoy 作为 Istio 中默认的数据平面，可以说如果你搞懂了 Envoy 就算把 Istio 搞懂 80%了。这次我们邀请了来自企业级服务网格提供商 Tetrate 公司的周礼赞，他是 Envoy 的核心 maintainer，之前也在云原生社区中分享过一次[《云原生学院第 17 期：Envoy 调试流量的常用技巧》](https://mp.weixin.qq.com/s?__biz=MzI1NTE2NDE2MA==&mid=2649383202&idx=1&sn=aec41575106a2b039900b0dfe963231e&chksm=f224eb4dc553625bf39d153a55fcc7ce59f25779ca9f8c4d5f7e2b2ae1edd684168c2e041301&scene=21#wechat_redirect)。

## 第七期：基于 Envoy/Istio 的云原生 API 网关 —— 开源项目 Hango 的设计与实现

- 分享时间：2021 年 8 月 25 日（周三）晚上 8:00 到 9:00
- 议题名称：基于 Envoy/Istio 的云原生 API 网关 —— 开源项目 Hango 的设计与实现
- 分享嘉宾：韩佳浩（网易轻舟）
- 回放地址：https://www.bilibili.com/video/BV1YL411b7e6/

### 讲师简介

韩佳浩，网易数帆资深研发工程师，主导 Hango 网关开源研发及设计，负责网易数帆轻舟 API 网关集团内部大规模落地及产品化建设。具有三年网关相关研发及大规模实践经验。

### 话题介绍

云原生架构演进下，更多的业务着重于 API 的统一暴露，API 网关便成为 API 统一接入的必备组件。本次分享主要从云原生概念出发，探讨云原生模式下 API 网关的选型之道；介绍网易研发的高性能、可扩展，功能丰富的云原生 API 网关 Hango 的设计之道以及落地实践。

### 问答

1. Envoy体系学习图谱，现在是整体文档都看完有用到时再翻文档

   答：可以关注社区动态，学习思路路线上可以根据自己想对 Envoy了解的程度按照以下线路进行：了解 Envoy 基本架构 -> 使用 Envoy 常用特性 -> 尝试扩展 envoy -> 对 Envoy 做深度定制，另外 Tetrate 即将推出免费的 Envoy 教程，敬请关注。

2. Hango项目与网易轻舟项目是什么关系？开源版么？

   答：网易轻舟项目包含轻舟微服务、轻舟API网关、轻舟容器等产品，轻舟API网关是Hango项目的商业版。

3. Ingress Controller与API Management是否有必要合为一个产品？ 就是 k8s 资源，意思两个产品位置是否需要合一？

   答：具体需要看网关的定位，如果作为微服务网关的话，不建议合为一个产品；如果承担ingress功能，可以合一。

4. 使用 Envoy 以网关的形式和以 Sidecar 的形式做服务治理有什么区别，使用场景分别是什么呢？以网关的形式做东西南北向流量的服务治理的方案可行吗？

   答：网关主要做南北流量治理；Sidecar承担集群东西流量治理。在大规模场景下，不建议网关作为东西流量治理；服务调用关系简单，API规模有限可以。

5. Hango必须配合Istio一起使用吗？

   答：推荐使用Istio, 仅单独使用网关数据面丧失网关动态配置能力，自身静态配置复杂度也大大提高。

6. 接问题5，如果是可以独立使用，在k8s内额外创建一个网关，这个网关目的是什么，这在集群内服务之间互访的时候等于破坏了Kubernetes本身的svc特性，consumer服务找这个网关所注册的服务？能否举例一个具体的场景。

   答：不推荐独立使用，网关的功能对外统一暴露集群内API。网关暴露的意义，一部分是代理，另一部分是丰富的治理功能以及多维度的指标监控。

7. 加载 Lua后性能有下降吗？

   答：简单的插件，性能基本在20%损失。

8. 边缘网关有哪些场景？看到ppt里有写，但是没有讲。

   答：类似集群中的统一API暴露，只是不需要额外的用户配置。

9. 性能没太看懂，9wqps是几台机器？几c？

   答：容器：8c8g 物理机：56c256g

10. lua 怎么保证脚本安全？隔离性怎么样？写个while true 会不会把整个网关搞崩？

    答：lua的插件链的异常不会导致主线程crash，异常后跳过逻辑，执行之后的插件链。

11. 大规模场景下，踩过哪些坑

    答：升级的平滑度以及线上规模的预估。

12. 可以认为是在Istio gateway + virtualservice的一个升级版么？ 是不是用了这个网关我就可以不用Istio gateway了？

    答：是的

## 第七期：基于 Envoy/Istio 的云原生 API 网关——开源项目 Hango 的设计与实现

- 分享时间：2021 年 8 月 25 日（周三）晚上 8:00 到 9:00
- 议题名称：基于 Envoy/Istio 的云原生 API 网关 —— 开源项目 Hango 的设计与实现
- 分享嘉宾：韩佳浩（网易轻舟）
- 回放地址：https://www.bilibili.com/video/BV1YL411b7e6/

### 讲师简介

韩佳浩，网易数帆资深研发工程师，主导 Hango 网关开源研发及设计，负责网易数帆轻舟 API 网关集团内部大规模落地及产品化建设。具有三年网关相关研

### 话题介绍

云原生架构演进下，更多的业务着重于 API 的统一暴露，API 网关便成为 API 统一接入的必备组件。本次分享主要从云原生概念出发，探讨云原生模式下 API 网关的选型之道；介绍网易研发的高性能、可扩展，功能丰富的云原生 API 网关 Hango 的设计之道以及落地实践。

### 问答

1. Envoy体系学习图谱，现在是整体文档都看完有用到时再翻文档

   答：可以关注社区动态，学习思路路线上可以根据自己想对 Envoy了解的程度按照以下线路进行：了解 Envoy 基本架构 -> 使用 Envoy 常用特性 -> 尝试扩展 envoy -> 对 Envoy 做深度定制，另外 Tetrate 即将推出免费的 Envoy 教程，敬请关注。

2. Hango项目与网易轻舟项目是什么关系？开源版么？

   答：网易轻舟项目包含轻舟微服务、轻舟API网关、轻舟容器等产品，轻舟API网关是Hango项目的商业版。

3. Ingress Controller与API Management是否有必要合为一个产品？ 就是 k8s 资源，意思两个产品位置是否需要合一？

   答：具体需要看网关的定位，如果作为微服务网关的话，不建议合为一个产品；如果承担ingress功能，可以合一。

4. 使用 Envoy 以网关的形式和以 Sidecar 的形式做服务治理有什么区别，使用场景分别是什么呢？以网关的形式做东西南北向流量的服务治理的方案可行吗？

   答：网关主要做南北流量治理；Sidecar承担集群东西流量治理。在大规模场景下，不建议网关作为东西流量治理；服务调用关系简单，API规模有限可以。

5. Hango必须配合Istio一起使用吗？

   答：推荐使用Istio, 仅单独使用网关数据面丧失网关动态配置能力，自身静态配置复杂度也大大提高。

6. 接问题5，如果是可以独立使用，在k8s内额外创建一个网关，这个网关目的是什么，这在集群内服务之间互访的时候等于破坏了Kubernetes本身的svc特性，consumer服务找这个网关所注册的服务？能否举例一个具体的场景。

   答：不推荐独立使用，网关的功能对外统一暴露集群内API。网关暴露的意义，一部分是代理，另一部分是丰富的治理功能以及多维度的指标监控。

7. 加载 Lua后性能有下降吗？

   答：简单的插件，性能基本在20%损失。

8. 边缘网关有哪些场景？看到ppt里有写，但是没有讲。

   答：类似集群中的统一API暴露，只是不需要额外的用户配置。

9. 性能没太看懂，9wqps是几台机器？几c？

   答：容器：8c8g 物理机：56c256g

10. lua 怎么保证脚本安全？隔离性怎么样？写个while true 会不会把整个网关搞崩？

    答：lua的插件链的异常不会导致主线程crash，异常后跳过逻辑，执行之后的插件链。

11. 大规模场景下，踩过哪些坑

    答：升级的平滑度以及线上规模的预估。

12. 可以认为是在Istio gateway + virtualservice的一个升级版么？ 是不是用了这个网关我就可以不用Istio gateway了？

    答：是的

## 第八期：小红书服务网格大规模落地实践

- 分享时间：2021 年 11 月 9 日（周二）晚上 8:00 到 9:30
- 议题名称：小红书服务网格大规模落地经验分享
- 分享嘉宾：贾建云（小红书）
- 回放地址：https://www.bilibili.com/video/BV12b4y187ae/

### 讲师简介

贾建云，小红书 Kubernetes 云原生工程师，负责小红书服务网格相关工作。主导设计了小红书服务网格落地方案，对于大规模服务网格落地、调优有丰富的经验。

### 话题介绍

1. 小红书基于 Istio 的服务网格方案和架构设计
2. 小红书对于 Pilot、Envoy 做的特性增强
3. 小红书落地服务网格碰到的性能/Bug 问题

### 听众收获

了解小红书服务网格关于流量拦截、thrift 协议、懒加载等做的特性增强，同时了解在大规模落地服务网格过程中碰到的控制面性能问题，以及 ServiceEntry 场景下 pilot 存在的 Bug。

### 问答

1. 我们在落地Istio 中碰到一个坑是 envoy 的 connection idleTime 和各种语言的 keepalive 时间不同，在大量使用长连接（http1.1）的情况下，可能会出现客户端用现有的长连接发起请求，但是服务端连接刚好超时回收了，导致会有部分请求 503（报错是 connection reset），在 Istio 社区也看到了这类的 issue，但是都没发现一个合适的解决方案。Istio 默认内置的重试条件中不包括 connection reset 这种情况，可能是害怕对非幂等请求的重试。不知道小红书内部有没有类似的问题？

   答：这个问题可以参考Envoy官网关于超时时间设置的[最佳实践](https://www.envoyproxy.io/docs/envoy/v1.17.1/faq/configuration/timeouts)。

2. Envoy是否考虑降级，以应对envoy异常时跳过sidecar直接访问服务，不知道是否有类似经验？

   答：我们目前是通过监听实际端口来做流量拦截的，这样当出现问题之后我们会让sdk把流量切换到中央sidecar。这种流量回滚方式与我们的流量拦截方式强相关，同时也对sdk有一定入侵，可以看一下小红书关于流量拦截方案的介绍。

3. xds 和 eds 分开会不会有数据不一致的问题？

   答：不会有问题

4. 有没有使用webassembly开发扩展？

   答：小红书暂时没有使用wasm，扩展是直接开发envoy filter。

5. 配置灰度下发解决思路是什么？

   答：跟我们sidecar灰度升级的思路比较一致，通过创建cluster/ns/service粒度的升级任务，由pilot决定配置要下发给哪些sidecar

6. Envoy引入brpc是替换了Envoy哪些部分？

   答：不算事替换吧，是想做到自由切换线程模型，引入bthread。

7. 虚机服务（通过域名+nginx+tomcat）如何解决服务网格的灰度上线？

   答：虚拟机跟pod应该是一样的，通过创建dr维护版本信息，然后配置流量配比。

8. 手动维护服务依赖的话还算懒加载吗？

   答：严格意义上面不算了。但是本质上都是为了做服务可见性。

9. 懒加载中hosts依赖的serviceEntry信息是不是依然要全局envoy下发？

   答：特定服务的所有实例/流控配置是全量的，这个跟pilot实现有关，目前社区的新版本已经在开发增量推送了，可以关注一下。

10. 不拦截入流量的话要做 inbound 的策略怎么办？

    答：原生的方案inbound本身也没有什么流量治理的特性，就是流量转发，所以我们不担心不拦截inbound会有流量治理能力的缺失。主要是担心可观察性会有影响，目前期望通过SDK补齐丢失的指标。

11. 对 Istio multi-tenancy有支持增强吗？

    答：小红书内部对多租户没有什么诉求，这个应该是公有云比较关心。

12. Thrift Proxy 的路由变化后会导致重建 Listener，线上业务可以接受客户端存量链接在路由规则变化后被断开吗？

    答：目前业务方可以接受，我们是告知过这个事情的。另外就是社区已经有envoy thrift filter支持rds的pr，合并到主干之后我们会升级，届时就没有问题了。

13. 调用的下游过多的情况下，端口的冲突怎么解决？

    答：端口不会冲突，一个Pod内部依赖的服务不会重复，每个服务都有唯一的端口。但是主机网络会存在端口冲突的情况，目前我们的方案就是让用户改为非主机网络。

14. 懒加载中serviceEntry+sidecar中如何支持按照route等方式配置http路由信息，就像virtualserver中支持的httproute功能？

    答：使用serviceEntry+sidecar不影响vs等的使用。两个东西没有太大关系。

15. 老师提到了小红书用到了开源项目 Aeraki 来管理 Thrift 协议，请问这部分后续的开源计划？

    答：后续会有团队小伙伴小红书分享关于aeraki做的扩展，但是应该不会合并到aeraki，内容偏小红书定制。

16. 流量拦截中还是用到了iptables(tproxy)模式，性能上会不会依然受影响？

    答：会有影响的，但是用了tproxy模式会好一些。

17. 有没有Envoy数据面性能的参考数据，总体上和业务容器的平均占比会是怎样的，cpu 和内存呢？

    答：按照我们内部一个业务的压测，单跳Envoy延迟增加2ms。Envoy大概占用0.5核，300m左右内存。后续我们会压测高QPS业务，届时我再补充数据。整体来看配置了懒加载envoy资源吃的不多。

18. 灰度下发的方案，不同sidecar配置的diff是保存在那个地方？

    答：存储在mysql。

19. Istio 通过 virtualservice 做灰度的话，基于流量比例的灰度无法做到 session sticky，这个有最佳实践吗？

    答：这个没有。目前小红书的灰度是通过注册中心来实现的。

20. 性能测试数据如何？

    答：参考问题17。

21. 为什么不用 service 而用 serviceentry 呀？小红书内部没有使用 k8s service 吗？

    答：小红书内部不用service，而且serviceentry可以支持虚机。

22. 老师能否介绍下小红书的Service Mesh发展到现在的程度，大概是多少人的团队，做了多久？

    答：目前4个人，大概做了半年。

23. Envoy延迟的长尾情况呢？

    答：还是比较明显的，这个跟Envoy线程模型有关吧。但是引入backuprequest会好很多，来自百度的内部实践。

24. 大佬微信发下？

    答：请加入云原生社区 Istio SIG 交流，大佬在群里。

25. 原生 Istio 自动注入会跳过主机模式host的pod？

    答：出于安全考虑 Istio一般也不敢直接在虚机上面拦，比较危险，最好还是不要用主机网络吧。非要用的话只能修改webhook吧。

26. 大佬服务注册这边是什么方案注册的

    答：公司内部自研的注册中心，细节不太清楚，后续可能有同事分享小红书注册中心。

27. 请问sidecar热升级前后，通过istioctl ps 查看proxy的版本有变化吗？

    答：不会有变化。版本号是我们自己在Envoy开发的api，跟istioctl ps哪个版本没关系。
