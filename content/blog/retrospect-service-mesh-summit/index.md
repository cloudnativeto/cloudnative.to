---
title: "服务网格峰会回顾：服务网格的发展趋势"
draft: false
summary: "一起回顾首届服务网格峰会的内容，了解服务网格的发展趋势。"
authors: ["张晓辉"]
categories: ["Service Mesh"]
tags: ["微服务", "代理"]
date: 2022-10-09T09:00:42+08:00
---
2022 年 9 月 24 日，由云原生社区主办的第一届 Service Mesh Summit 在上海成功举办，这次峰会汇聚了国内几大服务网格落地企业和提供商，他们带来服务网格在实践以及商业化的经验以及对未来的展望，也吸引了大量线上线下服务网格技术的关注者。

服务网格问世五年多来，业界对服务网格的应用进展以及发展趋势如何，这篇文章为大家来了本地大会内容的盘点，希望能帮助大家把握服务网格发展方向。

一句话概括：市场趋于理性，设计更加务实，回归价值，产品百花齐放。

这里总结了服务网格演进的几大方向：

- 扩展性
- 连通性
- 性能与资源占用
- 易用性

从技术选型上来看，有基于流行的 Istio+Envoy 的定制，也有基于其他数据面代理和控制面的新产品出现。

## 演进

### 扩展性

扩展性几乎是所有分享中都会提及的内容，相信也是已经采用的、或者观望中的用户的首要关注点。作为服务于业务的基础设施一部分的服务网格来说，不管是何种技术实现，其核心还是对业务的支撑。而业务和现有架构的多样性为服务网格的采用造成诸多掣肘，导致了服务网格需求的复杂性。作为服务网格明星的 Istio，其社区功能实际上就很难满足用户的实际需求。

应对复杂性的一大利器就是扩展性，在社区功能的基础之上，通过扩展来增加业务多样性需求的支持。业界对服务网格扩展性的支持主要在两个方向上：基于 Istio+Envoy 体系的扩展；选择其他数据面代理和控制平面。

#### 控制面

控制面的扩展，在 Istio 体系下多是通过多 configsource + MCP-over-xDS 的方式进行扩展。提供新的 CRD 配合数据面的扩展，提供新的能力。比如全局智能限流、熔断等等。

对外支持多种注册中心，Istio 系统下如 [Aeraki Mesh](https://github.com/aeraki-mesh/aeraki) 通过进程外的方式将其他注册中心的服务信息同步到 Istio，支持对 Nacos、Zookeeper、Etcd、Consul、Polaris 等注册中心。Flomesh 的 [osm-edge](https://github.com/flomesh-io/osm-edge) 提供了 Services/Endpoints `Provider` 接口来接入其他注册中心。

#### 数据面

数据面的扩展，我们首先看下 Istio + Envoy 体系下的扩展。

- WasmPlugin API：Istio 提供的一种通过 Wasm（WebAssembly） 过滤器来扩展代理的机制。Wasm 过滤器是 Envoy 的 **实验性** 功能，利用 Wasm 的特性允许开发人员可以使用熟悉的编程语言来编写过滤器的逻辑，编译成 Wasm 字节码由 runtime 来执行。
- EnvoyFilter API：Istio 提供的一种对生成的 Envoy 配置进行定制化的机制。比如在 [Aeraki Mesh](https://github.com/aeraki-mesh/aeraki) 通过 EnvoyFilter API 完成 Dubbo、Thrift 等 7 层协议的支持（结合定制的 Envoy 的原生过滤器）。还有衍生出的 [Lua + EnvoyFilter 集成](https://help.aliyun.com/document_detail/383257.html)，将 filter chain 中使用 Lua 过滤器。
- EnvoyFilter API 的二次封装 CRD：EnvoyFilter API 虽然强大，但非常复杂并且缺少必要的校验环节，有着很强的破坏性。业界提出了 EnvoyFilter API 的二次封装方案，通过新的 CRD 的来屏蔽 EnvoyFilter API 的复杂性，并降低配置出错导致 sidecar 代理崩溃的风险。如阿里云 ASM 的 Voyage、网易数帆的 [Slime](https://github.com/slime-io/slime/) 等。
- Envoy 原生过滤器：在 Envoy 中使用 Lua 的另一种实现，以 C++ 的方式实现 Lua 插件来执行 Lua 脚本，俗称 Envoy 的 OpenResty。典型的实现是网易数帆的 [Rider](https://github.com/hango-io/rider)。
- 进程外的扩展：这种方案在 Envoy 进程/容器外运行一个独立的进程/容器来实现非侵入式的扩展，二者之间通过共享内存或者 UDS（Unix Domain Socket）等方式进行数据交互。该进程/容器通过 xDS 从 MCP-over-xDS 组件获取配置的更新。虽然说是无侵入的 Envoy 扩展，实际上 Envoy 中还会引入新的扩展过滤器来与另一个进程进行交互。实现有阿里云 ASM 的 Voyage + Envoy Assistant，蚂蚁集团的 MOSN on Envoy 方案。

除了基于 Istio+Envoy 的优化定义以外，还有厂商选择了其他的代理作为数据面：

- Flomesh 的服务网格 [osm-edge](https://github.com/flomesh-io/osm-edge) 使用其自研的可编程代理 [Pipy](https://github.com/flomesh-io/pipy) 作为数据面
- API7 的服务网格 [Amesh](https://github.com/api7/amesh) 使用高性能云原生网关 [Apache APISIX](https://github.com/apache/apisix) 作为数据面
- 蚂蚁集团的服务网格使用云原生网络代理平台 [MSON](https://github.com/mosn/mosn) 作为数据面

选择自研或者开源的数据面的优势在于借助代理自身的可扩展特性来满足用户的多样性需求。

### 连通性

业务、管理、架构的复杂性带来的另一个问题就是连通性问题。异地多机房可用区的容灾、单集群容量限制、敏捷和成本考虑的混合云、多 Kubernetes 版本共存、多租户多主体等导致企业内部存在几个、几十甚至上百的集群，这些彼此独立的集群形成了若干的孤岛，除了带来了管理难度的提升外，首当其冲的便是多集群之间的流量管理。

解决连通性的问题，也成为服务网格能否在企业内部落地的关键所在。

- Flomesh 的服务网格通过集成开源的 [fsm](https://github.com/flomesh-io/fsm) 组件实现跨集群的服务发现，进而完成跨集群的流量管理
- Tetrate 企业版中的 [Tetrate Service Bridge](https://www.tetrate.io/tetrate-service-bridge/)（简称 TSB） 实现多个 Istio 集群（多 Istiod）的管理，同时提供了对虚拟机的支持
- 蚂蚁集群的 MOSN 通过引入 SOFA Gateway，来解决网络隔离的多实体间的服务 RPC 调用

### 性能与资源占用

服务网格天生特殊“体质”，在引入 sidecar 代理之后原本的单次服务调用基础上又增加了两跳带来了额外的延迟，当请求链路较长时这种延迟则更加严重，尤其是延迟敏感的业务。虽然 sidecar 代理的已经足够快了，但是仍未满足业务对延迟永不满足的追求。由于 sidecar 的引入，额外的资源占用不可避免，尤其是大规模部署的云端以及资源受限的边缘场景。处于成本控制和环境限制的考虑，数据面的资源占用也成为选择服务网格的重要指标。

在 Envoy 体系下，我们的用户和厂商通过各种手段来提升代理的性能，降低资源占用。

大量 TLS 连接对网关/sidecar 带来性能的损耗，Intel 从平台、指令集层面对 TLS 性能进行优化，通过 Crypto Acceleration 技术包中的 Multi-Buffer（多缓冲区）和 AVX512 指令集对 Envoy TLS 性能加速，带来了 70-80% 的提升。相比优化前，单机可处理更多的 TLS 连接。

字节跳动则是在 Envoy 的设计和源码上下手，对模块结构、基础库进行优化：移除虚函数抽象层、Stats（减少 metrics 输出），将使用最多的 HTTP/1 协议的处理从抽象层中移出，替换 HTTP 协议解析器，引入零拷贝缓冲器；优化编译。同时，跨节点通信网络优化的 RDMA 和 DPDK 也进入了实验阶段。

蚂蚁集团的数据平面 MOSN 在提供优秀的服务治理能力同时，由于使用 Go 开发处理 7 层协议时的性能不够理想。MOSN on Envoy 方案的推出，将流量处理和治理决策分离，兼顾了 MOSN 的功能和 Envoy 处理 7 层流量的性能。

除了在 Envoy 上的持续优化以外，更多厂商选择其他的数据面来解决 Envoy 的功能膨胀、设计过度抽象等问题。如 Flomesh 的 Pipy、Apache APISIX 成为数据面的新选择，在提供优于 Envoy 性能的同时，有着更低的资源占用。

### 易用性

易用性是技术选型中的另一考量，易用性关乎这用户学习、使用和维护服务网格产品的成本。服务网格通过将治理功能与应用解耦的方式将治理功能下沉到数据平面代理，Envoy、Pipy、APISIX、MOSN 均是功能强大的网络代理，不管是提供大量开箱即用的功能，还是通过可扩展性灵活管理代理的功能。控制平面经过抽象，隔离了代理的复杂性以 CRD/API 的方式对外提供治理能力，但依然免不了有着不低的学习门槛和维护成本。

在提升易用性方面，Istio 体系下通过提供新的 CRD 来对原有 CRD 进行封装，通过抽象业务语义简化技术复杂性。比如网易数帆服务网格团队的使用 CRD `SmartLimiter` 提供智能限流，CRD `EnvoyPlugin` 来封装 `EnvoyFilter`；阿里云的 `ASMLocalRateLimiter` 简化限流配置。

另一个方向就是标准化，Flomesh 的服务网格使用 [OSM（Open Service Mesh）](https://github.com/openservicemesh/osm) 作为控制平面，实现了 [SMI（Service Mesh Interface）](https://github.com/servicemeshinterface/smi-spec) 规范。SMI 简单易用，提供了 Kubernetes 服务网格的标准接口、常见服务网格场景的基本功能集、支持服务网格新功能的灵活性、提升互操作性，以及服务网格技术生态的创新空间。SMI 的实现除了 OSM 以外，还有 Linkerd、Traefik Mesh、Meshery 等。

## 总结

看了上面这些之后，相信你会发现市场在关注服务网格时更加得理性，而服务网格本身也更加“务实”，以实现快速平稳落地为出发点，解决落地过程中的各种问题，比如性能、资源占用、跨集群、多协议支持、功能扩展等等。解决这些问题，或者坚持在 Istio/Envoy 体系上继续优化；或者转投其他的实现，更换数据面代理，如 MOSN、Pipy、APISIX、Linkerd Proxy；再或者引入其他的技术来解决，如 eBPF、WASM、RDMA、DPDK 等等。

“好的架构不是设计出来的，而是演进出来的”，相信这话对服务网格一样受用。