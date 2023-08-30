---
title: "Envoy 调试流量的常用技巧直播分享及问答整理"
authors: ["周礼赞"]
categories: ["Envoy"]
summary: "云原生学院第七期分享《Envoy 调试流量的常用技巧》的视频回放及问答整理。"
tags: ["envoy"]
date: 2020-11-02T14:00:00+08:00
---

本期是 Envoy 系列分享的第一期，在本次分享开始前云原生社区中进行了关于 Envoy 的问卷调查，从问卷结果来看大多数同学都希望了解调试流量这个主题，所以就选了这个主题作为第一次分享。而且大多数同学都是刚开始看 Envoy，所以本次分享也会涉及到很多 Envoy 入门的内容，未来我也会在社区中给大家分享更多 Envoy 的内容。视频回放见 [B 站](https://www.bilibili.com/video/BV1Qa411A7hF)。

![Envoy 直播回放地址](0081Kckwly1gkd7z7bv71j30b40e43zi.jpg)

此次分享由三部分组成：

1. 历史和设计理念：这部分主要是 Envoy 入门，介绍为什么 Envoy 被开发出来，有哪些设计理念，扩展点。
2. Envoy 如何处理一个请求：这部分讲解了一下 Envoy 如何处理一个请求，在其中 Listener、Transport Socket、Filter、Cluster 这些概念分别起到什么作用。
3. 如何用调试流量：分享了以下几种调试流量的方法：日志、stats、TAP。演示了如何用日志和 TAP 来调试流量。

Envoy AMA（Ask Me Anything）环节的问答主要围绕着：Wasm、Istio 支持、性能方面，还有一些社区相关的问题。以下是对问答内容的整理。

## WASM 相关的问题

### WASM 在后端其它领域有哪些应用？

起源于浏览器，安全高性能执行 Native Code。衍生了 WASI 规格支持单独执行文件。微软基于此做了 WASM 容器 (Krustlet)。

### Envoy WASM 性能不是很理想，社区对这块有什么优化的方向吗？

WASM 还相对早期，合并到官方的仓库里在本月初已实现（还在 alpha 阶段），性能优化还没重点改进，有很大的改进空间，欢迎贡献。WASM 有很多 runtime，如 V8 (Chrome)、WAVM、Cranelift (Firefox) 等等。

### WASM 会主要支持哪些语言？

理论上各种语言都可以支持，但是需要社区跟进。上个月 Tetrate 发布了 [GetEnvoy](https://www.getenvoy.io) Toolkit，目前支持 Go、Rust。

### Envoy 中使用 WASM 实现的 filter 和原生在 Envoy 里面的 C++ 实现的 filter 性能差多大？预计什么时候 Envoy 的 WASM 模块可以上生产使用？

已经有实际落地，实际案例，如 American Express 和 Yahoo 美国。EnvoyCon 分别有演讲。在理想情况下，2-3 倍的性能差异。

## Istio 相关的问题

### Istio/Envoy 未来的计划？是否会在以后可以直接使用 envoyproxy/envoy？

是的，去年底就在开始往这个方向做。正在把现有的 Istio 的扩展功能转换成 WebAssembly。

### Envoy 或者 Istio 对于第三方协议扩展未来有什么计划？

Envoy 由社区主导，没有明确的未来计划。需要维护者来 cover 这些事情。第三方协议范围很广，其中 Tetrate 在做一些数据库协议的集成。其他协议例如 Dubbo 或者 Thrift 需要贡献者帮助。

## 性能方面的问题

### 对比 NGINX、traefik 等的性能差异如何？

因为 Envoy 默认开启很多可观测性会影响压测性能，对此 Envoy 官方文档里有个 benchmark 文档解说如何压测 Envoy。有些压测场景 Envoy 比 NGINX 好，有些相反。Traefik 不知道。

### 如何利用硬件加速 Envoy HTTPS？

官方有扩展点，需要自行扩展而实现。

### 在哪里可以了解 Envoy 的最佳配置，以及如何高效可靠的维护 Envoy？

取决于具体案例。官方文档，第三方文档有相关资料，

### Envoy 的性能如何调优？

取决于具体案例。需要 Profiling。

### 为什么一开始选择 C++，感觉性能比较差

C++ 比绝大多数语言性能都好。当时没有更好的语言选择。有 GC 的语言会有大的 tail-latency。C 可能可以性能更好，但对内存管理更为苛刻，难维护。

## 关于 xDS 的问题

### 关于 on-demand，目前已经有了 VHDS，其他 xDS 会陆续支持吗？比如 on-demand CDS/EDS?

VHDS 并不是 on-demand。现在主要是把 Delta xDS 做好。

### Envoy 如何根据请求参数的值，动态过滤 endpoint 实例？

金丝雀发布 / 蓝绿发布。可以参照官方 Subset LB 资料。

单 Envoy 能否同时连接多个 xDS server 以合并 CDS、EDS 数据，例如 Istiod + consul，以适配混合环境。

CDS 服务器需要给出对应的 EDS 服务。取决于 CDS 数据。[Tetrate Istio Cloud Map](https://github.com/tetratelabs/istio-cloud-map) 支持连 Consul 到 Istio。

## 其他问题

### 对于新手学习 Envoy 有哪些建议？

首先根据自己的用例和方向性来确定目标，Envoy 本身功能强大范围广，官网资料相对齐全。社区（Slack、GitHub）提问一般可以得到回答。

### ListenerFilter 前后顺序有影响吗？

有的没有（如 HTTP），有的有影响（如 Proxy Protocol）

### ListenerFilter 冲突会和时间有关吗？现在有 debug 方案和过滤验证机制吗？

超时机制跟时间有关（server 主动发起的消息场景需要超时机制）

### Envoy 的运行时的动态配置为什么不做持久化处理（动态更新的配置落盘）？

这是一个常见问题，持久话动态配置是错误补丁，应该提升控制面的可靠性。

### Tetrate 对 Envoy 都在哪些方面做了增强？

包括以下几点：

- GetEnvoy: [https://www.getenvoy.io](https://www.getenvoy.io/)
- PostgreSQL Filter
- WASM 扩展

大家可以关注 Tetrate 的微信公众号，了解 Tetrate 对 Envoy 支持的更多信息。

![tetrate 公众号](0081Kckwly1gkce34sy73j303k03k3yf.jpg)

### 为什么不基于 Nginx 改造？

在做网关的时候已经调查过很多产品，Envoy 的可扩展性强，XDS 可以动态配置 service mesh，有很大的优势，这个与其他网关产品不同。社区文化与 HAProxy、Nginx 不同，他们都是商业公司的背景开发的，增加功能的时候与他们的商业版本会有冲突。Envoy 还没有商业公司完全控制其开源，更社区化一些。

### 如何提交 PR 和 feature 给 Envoy 社区？

首先提交 GitHub issue，扩展需要维护者 sponsor，参加社区会议讨论（每月 2 次，一次西海岸时间早上，一次亚太时间早上）

### Envoy 后续支持 graphQL 的计划

需要维护者提交。

### EnvoyCon 视频什么时候有？

EnvoyCon 10 月 15 号刚开完，下个月即可有视频。
