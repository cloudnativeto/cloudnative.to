---
title: "Istio 1.25.0 正式发布：全面增强 Ambient 模式与流量管理"
summary: "Istio 1.25.0 现已正式发布，并全面支持 Kubernetes 1.29 至 1.32 版本。此次更新带来了多个关键改进，特别是在 Ambient 模式、流量管理和 DNS 代理等方面。"
authors: ["云原生社区"]
categories: ["Istio"]
tags: ["Istio"]
draft: false
date: 2025-03-04T10:22:00+08:00
---

Istio 1.25.0 现已正式发布，并全面支持 Kubernetes `1.29` 至 `1.32` 版本。此次更新带来了多个关键改进，特别是在 Ambient 模式、流量管理和 DNS 代理等方面。你可以在 [Istio 官网](https://istio.io/latest/news/releases/1.25.x/announcing-1.25/)查看详情。

## 主要更新亮点

### 1. 默认启用 DNS 代理，增强 Ambient 模式支持

Istio 传统上依赖 HTTP 头进行流量路由。然而，在 Ambient 模式下，ztunnel 仅能处理四层（L4）流量，而无法访问 HTTP 头部信息。因此，DNS 代理对于解析 `ServiceEntry` 地址至关重要，尤其是在[发送出口流量到 Waypoint](https://github.com/istio/istio/wiki/Troubleshooting-Istio-Ambient#scenario-ztunnel-is-not-sending-egress-traffic-to-waypoints) 的场景下。

在 Istio 1.25 版本中，Ambient 模式默认开启 DNS 代理，并支持工作负载通过注解选择退出该功能。更多信息请参考[升级说明](https://istio.io/latest/news/releases/1.25.x/announcing-1.25/upgrade-notes/#ambient-mode-dns-capture-on-by-default)。

### 2. Waypoint 代理支持默认拒绝策略（default deny）

在 Sidecar 模式下，授权策略（Authorization Policy）通常通过 `selector` 绑定到特定工作负载。在 Ambient 模式中，原先 `selector` 绑定的策略仅在 ztunnel 层执行，而 Waypoint 代理则使用 `targetRef` 进行绑定。这可能导致某些情况下，默认被拒绝访问某个端点的工作负载，能够通过连接到 Waypoint 绕过该限制。

Istio 1.25 版本增加了对 `GatewayClass` 和 `Gateway` 目标策略的支持，使管理员能够在 `istio-waypoint` 级别定义策略，从而适用于所有 Waypoint 实例。

### 3. 增强区域（Zonal）路由能力

跨区域（zone）和跨地域（region）的流量控制对于企业级用户至关重要，尤其是出于可靠性、性能和成本的考虑。Istio 1.25 版本增强了区域路由能力，提供了更简单的流量控制选项：

- **全面支持 Kubernetes 原生流量分发机制**，提供更简洁的接口以保持流量本地化。
- **增强 Istio 本地负载均衡（Locality Load Balancing）**，适用于更复杂的流量分发场景。
- **在 Ambient 模式下，ztunnel 现支持 `source_zone`、`source_region`、`destination_zone` 和 `destination_region` 额外指标**，使跨区域流量的可观测性更清晰。

### 4. 其他新增特性与优化

- **新增支持虚拟接口流量转发**：允许工作负载指定一组虚拟接口，使其入站流量被视为出站流量。这对于 KubeVirt、VMs 及 Docker-in-Docker 场景尤为重要。
- **istio-cni DaemonSet 支持原地升级**：升级 `istio-cni` DaemonSet 时，不再需要对节点进行 Cordon 操作，以防止新创建的 Pod 逃避 Ambient 模式的流量捕获。

## 兼容性与升级指南

如果你计划从 Istio 1.24.x 升级至 Istio 1.25.x，请注意以下关键变更：

1. **Ambient 模式的 Pod 需要手动重启或启用 `istio-cni` 规则同步**，以确保 DNS 代理正常生效。
2. **DNS 代理默认启用**，若有特殊需求，可在 Pod 级别使用 `ambient.istio.io/dns-capture=false` 注解选择退出。
3. **Grafana 监控面板升级至 7.2 以上版本**，以支持新的指标展示。
4. **移除 OpenCensus 支持**，建议迁移至 OpenTelemetry。

更多升级细节请参考[官方升级说明](https://istio.io/latest/news/releases/1.25.x/announcing-1.25/upgrade-notes/)。

## 结语

Istio 1.25 版本在 Ambient 模式、流量管理、DNS 代理等多个方面进行了重要增强，进一步优化了服务网格的可用性和易用性。
