---
title: "蚂蚁金服开源的 Service Mesh Sidecar 代理 SOFAMosn 发布 0.4.0 版本"
date: 2018-12-17T11:07:07+08:00
draft: false
authors: ["宋净超"]
summary: "本文是蚂蚁金服开源的 SOFAMosn 的 0.4.0 版本的发布日志。"
tags: ["MOSN"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","MOSN"]
type: "post"
---

SOFAMosn 几个月前由蚂蚁金服开源，使用 Go 语言实现，遵循 Envoy xDS 协议，既可以单独作为网络代理使用，也可以作为 Istio/SOFAMesh 中的数据平面 Sidecar 代理。开源地址：https://github.com/alipay/sofa-mosn

## HTTP 协议优化

- 性能优化：HTTP/1.x 性能提升 30%，HTTP/2.0 性能提升 100%
- IO、流处理接入 MOSN 自研框架，统一架构，并支持 metrics 收集等基础能力
- 支持HTTP/1.x、HTTP/2.0协议自动识别
- 支持 GRPC

## 流量路由 & 管理

- 完善故障注入机制，支持基于路由匹配、后端匹配的延迟、错误响应异常注入
- 支持 HTTP 请求 direct response 路由机制
- 支持对 HTTP 请求添加自定义 Headers，支持删除指定 Headers
- 支持重写 HTTP 请求中 Host、URI
- 支持基于计数的失败重试机制
- 支持基于 QPS、基于速率限流
- 完善 TCP 转发功能，支持灵活的转发特性配置

## 遥感

- 支持对接Mixer上报请求/响应的基本信息

## 扩展性

- 重构、优化协议处理引擎
- 支持可扩展的链式路由机制

## 其他

- 支持基于 RCU 思路的动态配置更新机制
- 新增 MOSN 的管理 API，支持动态修改日志级别，获取运行时生效配置
- 支持 RPC 的 Tracing
- 修复了一些 bug
