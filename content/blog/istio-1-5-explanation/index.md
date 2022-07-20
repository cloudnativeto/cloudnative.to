---
title: "拥抱变化 —— Istio 1.5 新特性解读"
date: "2020-03-03T10:00:06+08:00"
draft: false
authors: ["马若飞"]
summary: "本文基于istio最新的架构调整设计文档，分析了istio未来的设计目标。"
tags: ["istio"]
categories: ["service mesh"]
keywords: ["istio"]
---

## 引子

Istio 1.5 是一个具有重大变革的版本。长久以来，面对社区对 Istio 的性能和易用性的诟病，Istio 团队终于正视自身的问题，在当前版本中彻底推翻了原有控制平面的架构，完成了重建。正如 [Simplified Istio](https://docs.google.com/document/d/1v8BxI07u-mby5f5rCruwF7odSXgb9G8-C9W5hQtSIAg/edit#heading=h.xw1gqgyqs5b) 文中所说：

> 复杂是万恶之源，让我们停止焦虑，爱上单体。

Istio 1.5 回归单体，无论架构和使用方式都发生了巨大变化。因此笔者决定对 1.5 的变化内容做深入解读，以便开发者可以更好的理解和学习新版本，为使用和升级提供参考。

## 架构调整

这部分主要分析 Istio 1.5 在架构上的调整，这也是该版本最核心的变化。主要包括重建了控制平面，将原有的多个组件整合为一个单体结构 `istiod`；同时废弃了被诟病已久的 Mixer 组件。还对是否向后兼容的部分也做了说明，如果你要从 1.4.x 版本升级到 1.5 必须知道这些变化。

### 重建控制平面

官方使用的是重建（Restructuring）而不是重构（Refactoring）一词，可见其变化之大。在 Istio 1.5 中，控制平面将使用新的部署模式，将原有的各个组件整合在一起。

#### Istiod

Istio 1.5 中会使用一个全新的部署模式：`istiod`。这个组件是控制平面的核心，负责处理配置、证书分发、sidecar 注入等各种功能。`istiod` 是新版本中最大的变化，以一个单体组件替代了原有的架构，在降低复杂度和维护难度的同时，也让易用性得到提升。需要注意的一点是，原有的多组件并不是被完全移除，而是在重构后以模块的形式整合在一起组成了 `istiod`。

#### Sidecar 注入

以前版本的 sidecar 注入是由 `istio-sidecar-injector` webhook 实现的。在新版本中 webhook 保留了下来，但整合进了 `istiod` 中，注入逻辑保持不变。

#### Galley

- 配置验证 - 功能保留，并入 `istiod`。
- MCP Server - 改为默认关闭。对于大多数用户来说只是一个实现细节。如果确定依赖它，需要部署 `istio-galley` 并启动其进程。
- 实验特性（例如配置分析）- 也需要部署 `istio-galley`。

#### Citadel

以前 Citadel 的 2 个功能是生成证书以及 SDS 开启时以 `gRPC` 方式向 `nodeagent` 提供密钥。1.5 版本中密钥不再写入每个命名空间，只通过 gRPC 提供。这一功能也被并入 `istiod`。

#### SDS 节点代理

`nodeagent` 被移除。

#### Sidecar

以前，sidecar 能以两种方式访问证书：以文件挂载的密钥；SDS。新版本中所有密钥都存在本地运行的 SDS 服务器上。对绝大部分用户来说只需要从 `istiod` 中获取。对于自定义 CA 的用户，仍然可以挂载文件密钥，不过仍然由本地 SDS 服务器提供。这意味着证书轮询将不再需要 Envoy 重启。

#### CNI

CNI 没有改变，仍在 `istio-cni` 中。

#### Pilot

`istio-pilot` 的独立组件和进程被移除，由包含了它全部功能的 `istiod` 取而代之。为了向后兼容，仍有少许对 Pilot 的引用。

### 废弃 Mixer

在 Istio 1.5 中 Mixer 被废弃了。默认情况下 `mixer` 完全关闭。遥测的 V2 版本在新版本中是默认特性且不需要 `mixer`。如果你对 Mixer 的特殊功能有依赖，比如进程外适配器，需要重新开启 Mixer。Mixer 还会持续修复 bug 和安全漏洞直到 Istio 1.7 版本。`mixer` 的许多功能在 [Mixer Deprecation](https://tinyurl.com/mixer-deprecation) 文档中都描述了替代方案，包括基于 Wasm sandbox API 的 [in-proxy 扩展](https://github.com/istio/proxy/tree/master/extensions).

新版本中 HTTP 遥测默认基于 in-proxy Stats filter。这节省了 50% 的 CPU 使用量。1.5 中的遥测 V2 和老版本主要有以下几点不同：

- 流量的来源和目标如果没有注入 sidecar，部分遥测信息将无法收集。
- Egress 遥测不再支持。
- Histogram bucketization 和 V1 版本有很大不同。
- TCP 遥测只支持 mTLS。
- 需要更多的 Prometheus 实例来收集所有代理的数据。

如果开发者之前使用的是 Istio 默认的 HTTP 遥测，迁移到新版本是没问题的。可以直接通过 `istioctl upgrade` 自动升级到 V2。

最被社区开发者唾弃的 Mixer 终于被废弃，可以说它是影响老版本性能的罪魁祸首。现在皆大欢喜，甚至呼声最高的 Wasm 方案也提上日程。当然我们也能看出 Istio 团队为了保证老版本的升级依赖并没有一刀切的干掉 Mixer，持续修复 bug 到 1.7 版本的深层含义是它会在 1.7 的时候被彻底移除？

### 控制平面安全

老版本中，当设置了 `values.global.controlPlaneSecurityEnabled=true` 时，代理将安全地与控制平面交互，这是 1.4 版本的默认配置。每个控制平面组件都有一个带有 Citadel 证书的 sidecar，代理通过端口 15011 连接到 Pilot。

新版本中，不再推荐或以默认方式将代理连接到控制平面。作为替代，使用由 Kubernetes 或 Istiod 签发的 DNS 证书。代理通过端口 15012 连接到 Pilot。

## 功能更新

Istio 1.5 不仅仅做了减法，也做了很多加法，包括添加了新的功能，性能优化和 Bug 修复。这一部分列举了新版本中在流量管理、安全、遥测等多个功能方面的改进。

### 流量管理

- 提升了 `ServiceEntry` 的性能。
- 修复了 readiness 探针不一致问题。
- 通过定向局部更新的方式改善了配置更新的性能。
- 添加了为 host 设置所在负载均衡器设置的选项。
- 修复了 Pod 崩溃会触发过度配置推送的问题。
- 修复了应用调用自己的问题。
- 添加了使用 Istio CNI 时对 `iptables` 的探测。
- 添加了 `consecutive_5xx` 和 `gateway_errors` 作为离群值探测选项。
- 提升了 `EnvoyFilter` 匹配性能优化。
- 添加了对 `HTTP_PROXY` 协议的支持。
- 改进了 `iptables` 设置，默认使用 `iptables-restore`。
- 默认开启[自动协议探测](https://istio.io/docs/ops/configuration/traffic-management/protocol-selection/#automatic-protocol-selection-experimental)。

### 安全

- 添加 Beta 认证 API。新 API 分为 `PeerAuthentication` 和 `RequestAuthenticaiton`，面向工作负载。
- 添加认证策略，支持 deny 操作和语义排除。
- Beta 版本默认开启自动 mTLS。
- 稳定版添加 SDS。
- Node agent 和 Pilot agent 合并，移除了 Pod 安全策略的需要，提升了安全性。
- 合并 Citadel 证书发放功能到 Pilot。
- 支持 Kubernetes `first-party-jwt` 作为集群中 CSR 认证的备用 token。
- 通过 Istio Agent 向 Prometheus 提供密钥和证书。
- 支持 Citadel 提供证书给控制平面。

### 遥测

- 为 v2 版本的遥测添加 TCP 协议支持。
- 在指标和日志中支持添加 gRPC 响应状态码。
- 支持 Istio Canonical Service
- 改进 v2 遥测流程的稳定性。
- 为 v2 遥测的可配置性提供 alpha 级别的支持。
- 支持在 Envoy 节点的元数据中添加 AWS 平台的元数据。
- 更新了 Mixer 的 Stackdriver 适配器，以支持可配置的刷新间隔来跟踪数据。
- 支持对 Jaeger 插件的 headless 收集服务。
- 修复了 `kubernetesenv` 适配器以提供对名字中有`.`的 Pod 的支持。
- 改进了 Fluentd 适配器，在导出的时间戳中提供毫秒级输出。

### Operator

- 用 `IstioOperator` API 替代了 `IstioControlPlane` API。
- 添加了 `istioctl operator init` 和 `istioctl operator remove` 命令。
- 添加缓存改善了调和速度。

### 性能和扩展性

- 为网关生成集群时忽略没用的服务。
- 为 headless 服务略过调用 `updateEDS`。
- 在 ingress 网关中默认关闭 `SNI-DNAT` 。
- 错误覆盖声明。
- 容量已知时，基于容量创建切片。

### 测试和发布

- 为 `istioctl` 创建了Docker镜像。

### istioctl

- 添加 mTLS 分析器。
- 添加 JwtAnalyzer。
- 添加 ServiceAssociationAnalyzer。
- 添加 SercretAnalyaer。
- 添加 sidecar ImageAnalyzer。
- 添加 PortNameAnalyzer。
- 添加 Policy DeprecatedAnalyzer。
- 为 `RequestAuthentication` 添加了更多的验证规则。
- `istioctl analyze` 从实验特性转为正式特性。
- 添加新标记 `-A|--all-namespaces` 给 `istioctl analyze`，来分析整个集群。
- 添加通过 `stdin` 到 `istioctl analyze` 的内容分析。
- 添加 `istioctl analyze -L` 显示所有可用分析列表。
- 添加从 `istioctl analyze` 抑制信息的能力。
- 为 `istioctl analyze` 添加结构化格式选项。
- 为 `istioctl analyze` 的输出添加对应的文档链接。
- 通过 Istio API 在分析器中提供标注方法。
- `istioctl analyze` 可以基于目录加载文件。
- `istioctl analyze` 尝试将消息与它们的源文件名关联。
- `istioctl analyze` 可打印命名空间。
- `istioctl analyze` 默认分析集群内资源。
- 修复分析器抑制集群级别资源消息的 bug。
- 为 `istioctl manifest` 添加多文件支持。
- 替换 `IstioControlPlane` API 为 `IstioOperator` API。
- 为 `istioctl dashboard` 添加选择器.
- 为 `istioctl manifest --set` 标记添加切片和列表支持。

## 总结

Istio 1.5 是全面拥抱变化的一个版本。重建整个控制平面，打造了全新的部署模式 `istiod`；摒弃了拖累系统性能的 Mixer；保证兼容性也不忘持续优化和引入新的功能。在彻底抛弃历史包袱的同时，Istio团队也用他们的勇气践行了敏捷开发的真谛。随着稳定的季度发布，相信未来的 Istio 会越加成熟。让我们拭目以待。
