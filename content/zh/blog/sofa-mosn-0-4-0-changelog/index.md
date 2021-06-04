---
title: "蚂蚁金服开源的Service Mesh Sidecar代理SOFAMosn发布0.4.0版本"
date: 2018-12-17T11:07:07+08:00
draft: false
image: "/images/blog/006tNbRwly1fy9khjjni1j313z0u04qq.jpg"
author: "[宋净超](https://jimmysong.io)"
description: "本文是蚂蚁金服开源的 SOFAMosn 的0.4.0版本的发布日志。"
tags: ["MOSN"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","MOSN"]
type: "post"
avatar: "/images/profile/default.jpg"
profile: "云原生社区创始人"
---

SOFAMosn几个月前由蚂蚁金服开源，使用Go语言实现，遵循Envoy xDS协议，既可以单独作为网络代理使用，也可以作为Istio/SOFAMesh中的数据平面Sidecar 代理。开源地址：https://github.com/alipay/sofa-mosn

## HTTP协议优化

- 性能优化：HTTP/1.x性能提升30%，HTTP/2.0性能提升100%
- IO、流处理接入MOSN自研框架，统一架构，并支持metrics收集等基础能力
- 支持HTTP/1.x、HTTP/2.0协议自动识别
- 支持GRPC

## 流量路由 & 管理

- 完善故障注入机制，支持基于路由匹配、后端匹配的延迟、错误响应异常注入
- 支持HTTP请求direct response路由机制
- 支持对HTTP请求添加自定义Headers，支持删除指定Headers
- 支持重写HTTP请求中Host、URI
- 支持基于计数的失败重试机制
- 支持基于QPS、基于速率限流
- 完善TCP转发功能，支持灵活的转发特性配置

## 遥感

- 支持对接Mixer上报请求/响应的基本信息

## 扩展性

- 重构、优化协议处理引擎
- 支持可扩展的链式路由机制

## 其他

- 支持基于RCU思路的动态配置更新机制
- 新增MOSN的管理API，支持动态修改日志级别，获取运行时生效配置
- 支持RPC的Tracing
- 修复了一些bug
