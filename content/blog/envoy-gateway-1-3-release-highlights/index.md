---
title: "Envoy Gateway 1.3 发布：增强安全性、流量管理和运维能力"
summary: "Envoy Gateway 1.3 版本在 安全性、流量管理和运维能力 方面进行了重大增强，并引入了 API Key 认证、支持 HTTPRoute 重试 以及 更灵活的基础设施管理 等关键改进。"
authors: ["Tetrate"]
translators: ["云原生社区"]
categories: ["Envoy Gateway"]
tags: ["Envoy","Envoy Gateway"]
draft: false
date: 2025-02-06T15:17:32+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://tetrate.io/blog/envoy-gateway-1-3-release-highlights/
---


Envoy Gateway 1.3 版本在 **安全性、流量管理和运维能力** 方面进行了重大增强，并引入了 **API Key 认证**、**支持 HTTPRoute 重试** 以及 **更灵活的基础设施管理** 等关键改进。详见 [Envoy Gateway 1.3 发布公告](https://gateway.envoyproxy.io/news/releases/v1.3/)。

## 1.2 到 1.3 版本的核心变化

本次发布重点更新包括 **安全特性增强**、**流量管理优化** 以及 **运维管控提升**。此外，1.3 版本还引入了一些 **重大变更**，以提升系统的安全性和可靠性，增强身份认证和流量管理能力。

本次更新的详细内容包括：

- **22 项新特性**，涵盖安全、流量管理和运维优化
- **26 项 Bug 修复**，提升稳定性和可靠性

本文将总结 Envoy Gateway 1.3 版本最重要的更新内容。

## **主要特性亮点**

### 1. 安全性：增强认证与访问管理

- **API Key 认证**：SecurityPolicy API 现支持 API Key 访问控制，简化从其他 Gateway 解决方案的迁移
- **安全策略增强**：改进 **外部认证（ext-auth）** 服务器集成，并支持 JWKS 配置的自定义 TLS 设置
- **客户端 IP 解析优化**：支持从 `X-Forwarded-For (XFF)` 头部提取真实客户端 IP
- **扩展服务默认 “fail-closed” 机制**：当扩展服务器返回错误时，将立即用 `Internal Server Error`（500 状态码）响应受影响的请求，确保安全性

### 2. 流量管理：更智能的路由与控制

- **扩展协议支持**：现在支持在 `GRPCRoute`、`TCPRoute` 和 `UDPRoute` API 中路由至 Backend 资源
- **响应压缩（Response Compression）**：BackendTrafficPolicy API 现支持对响应进行压缩，减少流量占用
- **GEP-1731 实施**：实现了 **Kubernetes Gateway API 的 HTTPRoute 重试**，支持通过 **Gateway API**（而非 Envoy Gateway API）定义请求重试策略
- **基于动态元数据的限流（Dynamic Cost-Based Rate Limiting）**：限流 API 现支持从 **动态元数据（Dynamic Metadata）** 提取成本值，可基于请求的不同消耗量对客户端进行限流
- **用户定义路由顺序**：EnvoyProxy CRD 现支持 **保留用户自定义的 HTTPRoute 匹配顺序**，增强路由控制灵活性

### . 运营管理：基础设施优化

- **HPA（水平自动扩展）增强**：提供 **EnvoyProxy HPA** 和 **PDB（Pod Disruption Budget）** 的更多配置选项
- **改进 IPv6 支持**：优化 **双栈（Dual-Stack）支持**，修复 IPv6 相关问题
- **优雅终止（Graceful Termination）**：在终止进程期间增强端点管理，确保平滑下线

### 4. 可观测性：监控与控制能力提升

- **Tracing 追踪优化**：改进追踪采样控制，支持 **按比例（fraction-based）定义采样率**
- **增强指标（Metrics）**：新增监控 Envoy Gateway **崩溃（Panic）** 相关的指标和仪表盘
- **扩展处理（Extension Processing）**：优化外部处理器（External Processor）的属性管理和配置选项

### 总结

Envoy Gateway 1.3 为团队提供了更强大的 **安全性**、**流量管理** 和 **运维能力**，主要更新包括：

 ✅ **增强身份认证机制**（API Key 认证、JWKS TLS 配置等）

 ✅ **优化路由与限流能力**（支持 GRPCRoute、HTTPRoute 重试、动态元数据限流等）

 ✅ **提高生产环境运维效率**（HPA 支持、IPv6 兼容、扩展服务 fail-closed 机制等）

这些改进使 Envoy Gateway 在 **生产环境** 下更具安全性、可扩展性和管理便利性，为 Kubernetes 生态中的流量管理提供更稳定、更强大的解决方案。🚀

