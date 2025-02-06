---
title: "Cilium v1.17.0 发布，新特性一览"
summary: "Cilium v1.17.0发布，网络上推服务质量标注等功能；安全方面优化策略性能；增强服务网格与Gateway API支持；提升可观测性；优化规模处理能力；并分享社区活动与用户案例。 "
authors: ["云原生社区"]
categories: ["Cilium"]
tags: ["Cilium"]
draft: false
date: 2025-02-05T15:22:42+08:00
---

[Cilium v1.17.0](https://github.com/cilium/cilium/releases/tag/v1.17.0) 带来了许多新的增强和改进，以下是本次更新的主要亮点：

## 🚠 网络（Networking）

- **🚦 服务质量（Quality of Service）**：可为 Pod 标注 `Guaranteed`、`Burstable` 或 `BestEffort` 出站流量优先级。
- **🌐 多集群服务 API（Multi-Cluster Service API）**：使用 Kubernetes MCS 在 Cilium Cluster Mesh 中管理全局服务。
- **🔀 基于 L4 协议的负载均衡（Load Balance based on L4 Protocol）**：支持区分 TCP 和 UDP 负载均衡，使相同端口的多个服务能够分发到不同的后端。
- **🥲 每个服务的负载均衡算法（Per-Service LB Algorithms）**：可为单个服务选择 `maglev` 或 `random` 负载均衡算法。
- **⛔ 服务来源范围的拒绝列表（Deny lists for Service source ranges）**：控制 Kubernetes `loadBalancerSourceRanges` 是否作为允许或拒绝列表。
- **🏊 更好的 IPAM 控制（Better control over IPAM）**：支持基于 AWS 标签的静态 IP 分配，多池模式可支持单个 IP 范围。
- **🛠️ 动态 MTU 检测（Dynamic MTU detection）**：Cilium 现在可以在运行时检测并调整 MTU，无需重启代理。

## 💂️ 安全（Security）

- **🚀 改进网络策略性能（Improved network policy performance）**：降低计算复杂网络策略组合的成本。
- **🗂️ 优先处理关键网络策略（Prioritize critical network policies）**：支持 Kubernetes `priorityNamespaces`，在使用 CiliumEndpointSlices 时优先传播关键命名空间的策略。
- **📋 网络策略验证（Validate Network Policies）**：在创建网络策略时可获得更好的反馈。
- **🏷️ 通过标签选择 CIDRGroups（Select CIDRGroups by Label）**：可为 CIDRGroups 添加标签，并用于网络策略选择。
- **🛏️ 扩展 ToServices 用于集群内服务（Extend ToServices for in-cluster services）**：支持带选择器的服务通过 `ToServices` 网络策略进行选择。
- **🚧 支持 hostNetwork 的 FQDN 过滤（FQDN Filtering for hostNetwork）**：可使用 `CiliumClusterwideNetworkPolicy` 配置集群节点的 DNS 请求的 L7 过滤。
- **📶 端口范围上的 HTTP 策略（HTTP policies on port ranges）**：支持在单个策略中重定向多个端口到 Envoy 进行 L7 过滤。

## 🕸️ 服务网格 & Gateway API（Service Mesh & Gateway API）

- **⛩️ Gateway API 1.2.1**：支持最新的 Gateway API v1.2.1，包括 HTTP 重试和镜像流量比例控制。
- **📝 静态网关地址（Static Gateway Addressing）**：支持静态指定网关地址。
- **🔐 改进 Envoy TLS 处理（Improved Envoy TLS handling）**：使用 SDS 管理 Envoy 的 TLS 可见性密钥，提高策略计算速度和密钥访问效率。

## 👁️ 可观测性（Observability）

- **🔍 动态 Hubble 指标（Dynamic Hubble Metrics）**：支持 `hubble-metrics-config` ConfigMap 配置 Hubble 指标，优化网络可观测性。
- **🛤️ 通过 Prometheus 监控启用的功能（Track enabled features using Prometheus）**：`cilium-agent` 和 `cilium-operator` 组件现可暴露 Prometheus 指标，显示已启用的功能。
- **📊 更多新指标（Many new metrics）**：增强 BGP、网络连接、网络策略、Pod 管理和 Cilium 组件状态的监控指标。

## 🌅 规模（Scale）

- **📈 改进集群连接性检查（Better cluster connectivity checking）**：`cilium-health` 组件针对大规模集群进行了优化，以提高网络健康检查的可靠性。
- **⏳ 速率限制监控事件（Rate-limit monitor events）**：优化 eBPF 事件处理，降低 CPU 负载。
- **👥 双写身份模式（Double-Write Identity mode）**：新增安全身份分配模式，简化 CRD 和 KVStore 之间的迁移。
- **⚖️ 更好的规模测试（Better scale testing）**：本次发布包含定期自动化大规模测试，增强网络策略的稳定性。

## 🏡 社区（Community）

- **❤️ Cilium 在生产环境的用户案例**：
    - [Seznam](https://www.cncf.io/case-studies/seznam/)、[Alibaba Cloud](https://www.cncf.io/case-studies/alibaba/)、[SysEleven](https://www.cncf.io/case-studies/syseleven/)、[QingCloud](https://www.cncf.io/case-studies/qingcloud/)、[ECCO](https://www.youtube.com/watch?v=Ennjmo9TFaM)、[Reddit](https://www.youtube.com/watch?v=YNDp7Id7Bbs)、[Confluent](https://www.youtube.com/watch?v=vOSiVeBXYpM)、[SamsungAds](https://www.youtube.com/watch?v=2KlVTx611bk)、[Sony](https://www.youtube.com/watch?v=M0PincxlHpI)
- **[Cilium 年度报告 2024](https://github.com/cilium/cilium.io/blob/main/Annual-Reports/Cilium_Annual_Report_2024.pdf)**：总结了社区的年度亮点，并强调了 Kubernetes 网络的关键发展。
- **社区活动**：
    - Cilium 社区在 [Cilium + eBPF Day](https://events.linuxfoundation.org/kubecon-cloudnativecon-north-america/co-located-events/cilium-ebpf-day/) 和 [Cilium Developer Summit](https://github.com/cilium/dev-summits/tree/main/2024-NA) 进行线下聚会。
    - 欢迎参加即将到来的 [CiliumCon](https://events.linuxfoundation.org/kubecon-cloudnativecon-europe/co-located-events/ciliumcon/) 和 [Cilium Developer Summit](https://docs.google.com/forms/d/e/1FAIpQLSd8E1dtCYiwqcw1MemQU3RDKlIQNBi2dRVMVGqDPgSow9mKjA/viewform?usp=header)！
