---
title: "Cilium 2023 年度报告发布"
summary: "这份报告回顾了 Cilium 项目在 2023 年的成就和进展，包括贡献者增长、版本亮点、用户调查结果、生产环境案例、社区活动和引用、以及 2024 年的发展方向。"
authors: ["云原生社区"]
categories: ["Cilium"]
tags: ["Cilium"]
date: 2024-01-09T18:00:00+08:00
---

这份报告回顾了 Cilium 项目在 2023 年的成就和进展，包括贡献者增长、版本亮点、用户调查结果、生产环境案例、社区活动和引用、以及 2024 年的发展方向。报告显示，Cilium 项目已经成为云原生网络、可观测性和安全性的领导者，得到了广泛的认可和采用。报告还展示了 Cilium 项目的健康状况和活跃度，通过数据和图表展示了项目的里程碑和提交情况。报告最后感谢了社区的支持和贡献，以及期待未来的更多创新和协作。

详情见：<https://www.cncf.io/blog/2023/12/21/ciliums-2023-annual-report/>

下载地址：[GitHub](https://github.com/cilium/cilium.io/blob/main/Annual-Reports/Cilium%20Annual%20Report%202023.pdf)

以下内容选取自报告中的 release highlight 部分。

## 版本更新

Cilium 在 2023 年进行了两次重大发布。Cilium 1.13 于 2 月发布，针对网络（特别是服务网格）、性能和软件供应链安全等方面进行了许多改进。Cilium 1.14 于 7 月发布，引入了一个备受期待的功能：与主要改进相结合的双向身份验证，同时扩展了 Kubernetes 之外的网络。Tetragon 1.0 于 10 月发布，带来了主要的更新和性能改进。

以下是所有版本中包含的一些主要变化的概述：

## Cilium 1.13

### Gateway API

- Cilium 1.13 带有 Gateway API 的完全兼容实现。这个 API 是用于北向负载均衡和流量路由到 Kubernetes 集群的新标准，是 Kubernetes Ingress API 的长期继任者。

### 带注释的 Kubernetes 服务的 L7 负载均衡

- Cilium 1.13 引入了使用 Cilium 内置的 Envoy 代理来实现现有 Kubernetes 服务的 L7 负载均衡的功能，通过应用以下注释：`"service.cilium.io/lb-l7": "enabled"`。

### 数据面上的双向身份验证 - Beta

- 数据面级别添加了双向身份验证支持，以便 Cilium 能够对集群中对等节点上的终端进行身份验证，并根据成功的双向身份验证来控制数据平面连接。

### LoadBalancer 服务和 BGP 服务广告的 IPAM

- LoadBalancer IP 地址管理（LB-IPAM）是一个新功能，允许 Cilium 为 Kubernetes LoadBalancer 服务提供 IP 地址。Cilium BGP 通过引入服务地址广告得到了改进，这个功能可以与 LB-IPAM 功能无缝配合使用，帮助用户通过 BGP 广告 Kubernetes 服务的 IP 地址，从而不再需要 MetalLB，简化了网络堆栈。

### 支持 Kubernetes 上的 SCTP

- SCTP 是一种在电信行业中经常用于支持 VoIP 和其他实时服务的传输层协议。Cilium 1.13 引入了 STCP 的基本支持，甚至支持在 Hubble 中进行可视化。

### 性能

- Cilium 引入了支持 BIG TCP 的功能，通过提高吞吐量并减少节点的延迟来提高网络性能，帮助用户扩展到 100Gbps 集群甚至更大的规模。

### 软件供应链安全

- Cilium 和 Tetragon 容器镜像现在在创建时使用 cosign 进行签名。利用镜像签名，用户可以确信他们从容器注册表获取的镜像是维护者构建和发布的受信任的代码。

### SBOMs

- 从版本 1.13 开始，Cilium 和 Tetragon 镜像现在包含了软件材料清单（SBOM）。这意味着用户可以确保 Cilium 中使用的组件和依赖关系是透明和可验证的，以便查找潜在的漏洞。

## Cilium 1.14

### 服务网格和双向身份验证

#### 双向身份验证 - Beta

- Cilium 1.14 带来了新的双向身份验证支持，通过 SPIFFE（Secure Production Identity Framework for Everyone）和 SPIRE（SPIRE 是 SPIFFE API 的生产就绪实现）提供。有了这个新支持，Cilium 现在可以与 SPIRE 服务器一起部署，以启用双向身份验证。这允许工作负载在 SPIRE 服务器上创建和管理其身份，该服务器自动管理和旋转证书。

### Envoy DaemonSet

- 添加了 Envoy 作为 DaemonSet 的支持。这意味着 Envoy 代理不再需要在 Cilium 代理 Pod 内作为进程运行，从而允许独立的生命周期、独立的管理以及将问题的影响限制在 Envoy 代理或 Cilium 代理中的能力。

### WireGuard 节点到节点加密和 Layer 7 策略支持

- Cilium 的使用 WireGuard 的加密已经得到增强。现在可以加密 Pod 之间、从 Pod 到节点以及节点之间的流量，并且还支持将 L7 网络策略应用于使用 WireGuard 加密的流量。

### 超越 Kubernetes 的网络

#### L2 公告

- Cilium 1.14 带有一个名为 L2 Announcement policy 的新功能，它允许 Cilium 响应本地客户端对 ExternalIPs 和/或 LoadBalancer IP 的 ARP 请求。

#### BGP 增强

- 为 Cilium 的 BGP 实现添加了新功能，包括：Cilium CLI 中的 BGP 命令，可以使用 Cilium CLI 显示所有节点的 BGP 对等状态；BGP Graceful Restart，可以在重新启动代理时保持对等方的路由；eBGP Multi-Hop，允许用户在没有明确的 TTL 跳数限制的情况下启用两个 EBGP 对等方之间的邻居连接；自定义 BGP 定时器，可以自定义 Cilium 和对等方之间的 BGP 会话的定时器。

### 集群网格

- 在 KVStoreMesh 模式下，Cilium Cluster Mesh 实现了改进的可扩展性和隔离，面向大规模 Cluster Mesh 部署，支持多达 50,000 个节点和 500,000 个 Pod。

## Tetragon 1.0

- Cilium Tetragon 1.0 主要关注提高性能并减小系统开销。它是一个基于 Kubernetes 的工具，通过 eBPF 应用策略和过滤，确保以最小的性能影响实现深度可观测性。Tetragon 跟踪各种活动，如进程执行、特权升级、文件和网络活动，提供一系列的开箱即用的安全可观测性策略。

- Tetragon 作为一个基于 Kubernetes 的本地工具，与 Kubernetes 无缝集成，以增强安全可观测性，通过为精确的策略应用丰富事件提供必要的元数据。它使用 eBPF 进行事件观察和过滤，确保最小的开销和高效的性能，显着减少了数据传输和执行操作中的延迟。

- 在性能测试中，其有效性得到了证明，在进程执行跟踪方面的开销不到 2%，即使在高 I/O 条件下也能够高效地监视文件完整性，对网络性能的影响也很小，展示了它有效和高效地观察网络流量的能力。
