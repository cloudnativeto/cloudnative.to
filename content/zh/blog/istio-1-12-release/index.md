---
title: "Isto 1.12 发布——支持 WebAssembly 插件管理"
date: 2021-11-12T14:43:27+08:00
draft: false
author: "[Istio 团队](https://istio.io/latest/news/releases/1.12.x/announcing-1.12/)"
translator: "[宋净超（Jimmy Song）](https://jimmysong.io)"
tags: ["istio","wasm","service mesh"]
categories: ["istio"]
description: "这是 Istio 在 2021 年发布的最后一个版本，也是本年度发布的第四个版本，Istio 依然在按照它既定的发布节奏发展。"
type: "post"
image: "images/blog/istio-logo.jpg"
---

本文译自 [Istio 官方博客](https://istio.io/latest/news/releases/1.12.x/announcing-1.12/)。这是 Istio 在 2021 年发布的最后一个版本，也是本年度发布的第四个版本，Istio 依然在按照它既定的发布节奏发展。

## WebAssembly API

[WebAssembly](https://istio.io/latest/docs/concepts/wasm/) 是一个重要的项目，开发了 [3 年多](https://istio.io/latest/blog/2020/wasm-announce/)，为 Istio 带来了先进的可扩展性，允许用户在运行时动态加载自定义构建的扩展。然而，直到现在，配置 WebAssembly 插件一直是实验性的，而且很难使用。

在 Istio 1.12 中，我们通过增加一个 API 来配置 WebAssembly 插件 ——[WasmPlugin](https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/) 来改善这种体验。

有了 WasmPlugin，你可以轻松地将自定义插件部署到单个代理，甚至是整个网格。

该 API 目前处于 Alpha 阶段，正在不断发展。我们非常感谢 [您的反馈意见](https://istio.io/latest/get-involved/) !

## 遥测 API

在 Istio 1.11 中，我们引入了全新的 [Telemetry API](https://istio.io/latest/docs/reference/config/telemetry/)，为 Istio 中配置追踪、日志和指标带来了标准化的 API。在 1.12 版本中，我们继续朝这个方向努力，扩大了对配置指标和访问日志 API 的支持。

要想开始，请查看文档。

- [遥测 API 概述](https://istio.io/latest/docs/tasks/observability/telemetry/)
- [追踪](https://istio.io/latest/docs/tasks/observability/distributed-tracing/)
- [Metrics](https://istio.io/latest/docs/tasks/observability/metrics/)
- [访问记录](https://istio.io/latest/docs/tasks/observability/logs/access-log/)

该 API 目前处于 Alpha 阶段，正在不断发展。我们非常感谢 [您的反馈意见](https://istio.io/latest/get-involved/) !

## 支持 Helm

Istio 1.12 对我们的 [Helm 安装支持](https://istio.io/latest/docs/setup/install/helm/) 进行了一些改进，并为该功能在未来升级为测试版铺平了道路。

为了进一步简化使用流程，解决 [最受欢迎的 GitHub 功能请求](https://github.com/istio/istio/issues/7505) 之一，官方 Helm 资源库已经发布。请查看新的 [入门](https://istio.io/latest/docs/setup/install/helm/#prerequisites) 指南以了解更多信息。

这些 Chart 也可以在 [ArtifactHub](https://artifacthub.io/packages/search?org=istio) 上找到。

此外，还发布了一个新的精心制作的 [gateway chart](https://artifacthub.io/packages/helm/istio-official/gateway)。该 chart 取代了旧的 `istio-ingressgateway` 和 `istio-egressgateway` chart，大大简化了网关的管理，并遵循 Helm 最佳实践。请访问网关注入页面，了解迁移到新 Helm chart 的说明。

## Kubernetes Gateway API

Istio 已经增加了对 [Kubernetes Gateway API](http://gateway-api.org/) v1alpha2 版本的全面支持。该 API 旨在统一 Istio、Kubernetes Ingress 和其他代理使用的各种 API，以定义一个强大的、可扩展的 API 来配置流量路由。

虽然该 API 尚未针对生产工作负载，但该 API 和 Istio 的实现正在迅速发展。要尝试它，请查看 [Kubernetes Gateway API](https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/) 文档。

## 更多

- 默认重试策略已被添加到 [Mesh Config](https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/#MeshConfig) 中，允许用户在同一位置配置默认重试策略，而不是在每个 VirtualService 中重复配置。
- 一个新的 failoverPriority 配置已经被添加到 [定位负载均衡配置](https://istio.io/latest/docs/reference/config/networking/destination-rule/#LocalityLoadBalancerSetting) 中，允许自定义 pod 的优先级。例如，同一网络内的 pod 可以被赋予额外的优先级。
- 增加了新的配置，使 [发起安全 TLS 更简单](https://istio.io/latest/docs/ops/best-practices/security/#configure-tls-verification-in-destination-rule-when-using-tls-origination)。
- 回顾：对 [gRPC 原生 "无代理" 服务网格](https://istio.io/latest/blog/2021/proxyless-grpc/) 的初步支持。
- [增加了](https://github.com/istio/istio/wiki/Experimental-QUIC-and-HTTP-3-support-in-Istio-gateways) 对 HTTP/3 网关的实验性支持。
- 有关完整的变更清单，请参见 [变更说明](https://istio.io/latest/news/releases/1.12.x/announcing-1.12/change-notes/)。
