---
title: "Istio 1.26 发布：增强 Gateway API 支持，拥抱 Kubernetes 未来 —— 同时告别 1.23 版本"
summary: "Istio 1.26 发布，增强 Gateway API 与 Ambient 模式支持，同时宣布 1.23 停止维护。"
authors: ["云原生社区"]
categories: ["Istio"]
tags: ["Istio","Service Mesh","Ambient","Gateway API"]
draft: false
date: 2025-05-09T10:35:46+08:00
---

2025年5月8日，Istio 社区正式发布了 **Istio 1.26**。这是一次在功能、可扩展性、安全性与平台适配性方面全面提升的重要更新。与此同时，Istio 1.23 也正式停止维护，标志着这一主流版本的生命周期正式结束。

## 一、Istio 1.26 新特性速览

### 1. Gateway API 自动资源支持全面可配置

在 Istio 1.26 中，用户终于可以通过 ConfigMap 自定义由 Gateway API 自动生成的资源，例如 `Service`、`Deployment`、`HorizontalPodAutoscaler` 和 `PodDisruptionBudget`。这使得运维和网关部署策略更灵活，显著提升了生产可用性。

详见文档：[如何自定义 Gateway 自动部署的资源](https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/#automated-deployment)

### 2. Ambient 模式下支持 TCPRoute

Ambient 模式下的 Waypoint 代理现在支持 [Gateway API 的 `TCPRoute`](https://gateway-api.sigs.k8s.io/guides/tcp/)，让 TCP 层流量的精细控制成为可能，进一步提升了 L4 层面的可观测与控制能力。

此外，Istio 还引入了 Gateway API v1.3 的实验性特性 [`BackendTLSPolicy`](https://gateway-api.sigs.k8s.io/api-types/backendtlspolicy/) 与 [`BackendTrafficPolicy`](https://gateway-api.sigs.k8s.io/api-types/backendtrafficpolicy/)，为未来的重试、后端认证控制铺平道路。

### 3. 支持 Kubernetes 新特性 ClusterTrustBundle

Istio 1.26 增加了对 Kubernetes 实验性特性 [`ClusterTrustBundle`](https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/#cluster-trust-bundles) 的支持，这是集群间信任管理的重要一步，未来有望替代传统 CA 机制。

### 4. istioctl 工具增强

- `istioctl analyze` 现在支持指定某个检查项，便于集成自动化检测。
- 增加 `--tls-server-name` 支持，便于生成可用于特定网关域名的 kubeconfig。
- 多项 CLI 命令修复与增强，提升安装与调试体验。

### 5. 安装与平台适配改进

- 在 GKE 中自动配置 `ResourceQuota` 与 `cniBinDir`，提升兼容性。
- `istio-cni` 不再默认使用 `hostNetwork`，降低端口冲突风险。
- Helm Chart 中新增支持设置 `loadBalancerClass`、`updateStrategy`、`ConfigMap` 等关键参数。

### 6. EnvoyFilter 和 Retry 策略增强

- `EnvoyFilter` 现可基于 `VirtualHost` 的域名进行匹配。
- 支持配置重试的 backoff 间隔与 host predicate。

详细改动请参考官方[完整变更日志](https://istio.io/latest/news/releases/1.26.x/announcing-1.26/change-notes/)。

## 二、Istio 1.23 正式停止支持

根据 [官方公告](https://istio.io/latest/news/support/announcing-1.23-eol-final/)，自 2025 年 4 月 16 日起，Istio 1.23 版本已停止维护，不再接收安全漏洞与关键 Bug 修复。建议仍在使用该版本的用户尽快升级至 Istio 1.26 或更新版本。

## 三、推荐关注的社区内容

若你希望深入了解 Ambient 模式在实际生产环境中的表现、安全性与性能比较，建议阅读以下 Istio 官方博客：

- [ztunnel 安全性评估报告](https://istio.io/latest/blog/2025/ztunnel-security-assessment/)
- [Ambient 模式 vs 内核旁路性能对比](https://istio.io/latest/blog/2025/ambient-performance/)
- [Istio 在 KubeCon EU 的技术分享](https://istio.io/latest/blog/2025/istio-at-kubecon-eu/)

## 四、升级建议与反馈通道

本次发布支持 Kubernetes 1.29 至 1.32（预计兼容 1.33），如计划升级至 1.26，请提前参考 [升级指南](https://istio.io/latest/news/releases/1.26.x/announcing-1.26/)。如遇问题或希望提供反馈，可加入 [Istio Slack 社区](https://slack.istio.io/)，进入 `#release-1.26` 频道参与讨论。

## 五、写在最后

Istio 1.26 标志着 Ambient 模式从“实验性”走向更成熟阶段，也是 Istio 与 Kubernetes 深度集成的又一里程碑。作为云原生网络的核心基础设施，Istio 将持续推动面向服务的流量治理、安全与可观测性演进。

欢迎大家参与测试、反馈体验，贡献代码或文档，为开源世界添砖加瓦！

**👉 延伸阅读：**

- [📃 Istio 1.26 变更日志](https://istio.io/latest/news/releases/1.26.x/announcing-1.26/change-notes/)
- [⚙️ Istio 1.26 升级指南](https://istio.io/latest/news/releases/1.26.x/announcing-1.26/)
- [📌 Istio 1.23 EOL 最终公告](https://istio.io/latest/news/support/announcing-1.23-eol-final/)
