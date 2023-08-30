---
title: "Istio 控制平面故障后会发生什么？"
date: 2018-11-22T22:07:15+08:00
draft: false
authors: ["Jonh Wendell"]
translators: ["李守超"]
summary: "本文展示了当 Istio 控制平面的组件出现故障以后会发生什么现象。"
tags: ["istio"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","istio"]
---

本文为翻译文章，[点击查看原文](https://bani.com.br/2018/11/istio-what-happens-when-control-plane-is-down/)。

大家好！我在 Istio 上做了一些实验，禁用控制平面的组件，并观察应用和服务网格会发生什么。下面是我的笔记。

## Pilot

Pilot 负责 Istio 的流量控制特性，同时将 Sidecar 更新至最新的网格配置。

Pilot 启动以后，监听端口 *15010* （gRPC）和 *8080* （HTTP）。

当应用的 Sidecar（Envoy，Istio-Proxy）启动以后，它将会连接 *pilot.istio-system:15010* ，获取初始配置，并保持长连接。

Pilot 会监听 Kubernetes 资源，只要检测到网格发生变化，就会将最新的配置通过 gRPC 连接推送到 Sidecar 上。

- 当 Pilot 停止以后，Pilot 和 Sidecar 之间的 gRPC 连接被关闭，同时 Sidecar 会一直尝试重连。
- 网络流量不会受到 Pilot 停止的影响，因为所有的配置被推送过来以后，就会存储在 Sidecar 的内存中。
- 网格中新的变更信息（例如新的 Pod、规则、服务等等）不会继续到达 Sidecar，因为 Pilot 不再监听这些变化并转发。
- 当 Pilot 重新上线以后，Sidecar 就会重新建立连接（一直尝试重连）并获取到最新的网格配置。

## Mixer Policy

Policy 执行网络策略。

Mixer 在启动时读取配置，并监听 Kubernetes 的资源变化。一旦检测到新的配置，Mixer 就会将其加载至内存中。

Sidecar 在每次请求服务应用时，检查（发起连接）Mixer Policy Pod。

当 Mixer Policy Pod 停止以后，所有到服务的请求会失败，并收到 **“503 UNAVAILABLE:no healthy upstream”** 的错误——因为所有 sidecar 无法连接到这些 Pod。

在 Istio 1.1 版本中新增了[global]配置（ *policyCheckfailOpen* ），允许 *“失败打开”* 策略，也即当 Mixer Policy Pod 无法响应时，所有的请求会成功，而不是报 *503* 错误。默认情况下该配置设置为 *false* ，也即 *“失败关闭”* 。

当 Mixer 停止后，我们在网格中执行的操作（例如新增规则、更新配置等等）都不会对应用产生影响，直到 Mixer 重新启动。

## Mixer Telemetry

Telemetry 为 Istio 插件提供遥测信息。

Sidecar 什么时候调用 Telemetry Pod 取决于两个因素：批量完成 100 次请求和请求时间超过 1 秒钟（默认配置），这两个条件只要有一个先满足就会执行该操作，这是为了避免对 Telemetry Pod 造成过于频繁的调用。

当 Telemetry Pod 停止以后，Sidecar 记录一次失败信息（在 Pod 标准错误输出里），并丢弃遥测信息。请求不会受到影响，正如 Policy Pod 停止时一样。当 Telemetry Pod 重新启动以后，就会继续从 Sidecar 收到遥测信息。

## 其它信息

值得注意的是，Istio 允许自定义控制平面的组件。例如，如果不需要 Policy，你可以完全禁用 Mixer Policy。Istio 1.1 对这种模块化的特性支持的更好。更多信息，可以参考[这篇文档](https://istio.io/docs/setup/kubernetes/minimal-install/)。

当然，Pilot、Mixer Policy 和 Mixer Telemetry 在高可用部署场景工作的也很好，可以同时运行多副本。实际上，默认配置通过 *HorizontalPodAutoscaler* 允许启动 1 到 5 个 Pod。（详细请参考[这篇文档](https://github.com/istio/istio/blob/release-1.1/install/kubernetes/helm/subcharts/mixer/templates/autoscale.yaml#L15)和[这篇文档](https://github.com/istio/istio/blob/release-1.1/install/kubernetes/helm/subcharts/mixer/values.yaml#L14)）
