---
title: "Istio 1.11 发布"
description: "这是 Istio 在 2021 年度发布的第三个版本。"
author: "[Istio Team](https://istio.io/latest/news/releases/1.11.x/announcing-1.11/)"
translator: "[宋净超（Jimmy Song）](https://jimmysong.io)"
image: "images/blog/istio-111.jpg"
categories: ["Istio"]
tags: ["Istio"]
date: 2021-08-13T07:05:42+08:00
type: "post"
---

本文译自 [Istio 官方博客](https://istio.io/latest/news/releases/1.11.x/announcing-1.11/)。

这是 Istio 在 2021 年发布的第三个版本，我们要感谢整个 Istio 社区，特别是来自红帽的发布经理 John Wendell、来自 Solo.io 的 Ryan King 和来自英特尔的 Steve Zhang，感谢他们帮助 Istio 1.11.0 发布。该版本正式支持 Kubernetes 1.18.0 到 1.22.x。下面是该版本的一些亮点。

## CNI 插件（Beta）

默认情况下，Istio 会在部署在网格的 pod 中注入一个 [init 容器](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)。`istio-init` 容器使用 `iptables` 设置 pod 网络流量重定向到（来自）Istio sidecar 代理。这需要网格中部署 pod 的用户或服务账户有足够的权限来部署[具有 `NET_ADMIN` 和 `NET_RAW` 功能的容器](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#set-capabilities-for-a-container)。要求 Istio 用户拥有较高的 Kubernetes 权限，对于组织内的安全合规性来说是有问题的。Istio CNI 插件是 `istio-init` 容器的替代品，它执行相同的网络功能，但不要求 Istio 用户启用更高的 Kubernetes 权限。

CNI 插件可以与其他插件同时使用，并支持大多数托管的 Kubernetes 实现。

在这个版本中，我们通过改进文档和测试，将 CNI 插件功能提升为 Beta 版，以确保用户能够在生产中安全地启用这一功能。[了解如何用 CNI 插件安装 Istio](https://istio.io/latest/docs/setup/additional-setup/cni/)。

## 外部控制平面（Beta）

去年，我们为 Istio 引入了一种[新的部署模式](https://istio.io/latest/blog/2020/new-deployment-model/)，即集群的控制平面是在该集群之外管理的。这就解决了这样一个问题 —— 将管理控制平面的 Mesh 所有者和在 Mesh 中部署和配置服务的 Mesh 用户之间分离。运行在独立集群中的外部控制平面可以控制单个数据平面集群或多集群网格的多个集群。

在 1.11 版本中，该功能已被提升为 Beta 版。[了解如何设置带有外部控制平面的网格](https://istio.io/latest/docs/setup/install/external-controlplane/)。

## 网关注入

Istio 提供了网关作为与外部世界连接的方式。你可以部署[入口网关](https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/)和[出口网关](https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/)，前者用于接收来自集群外的流量，后者用于从你的应用程序向集群外部署的服务输出流量。

在过去，Istio 版本会将网关部署为一个 Deployment，它的代理配置与集群中所有其他的 Sidecar 代理完全分开。这使得网关的管理和升级变得复杂，特别是当集群中部署了多个网关时。一个常见的问题是，从控制平面传到 sidecar 代理的设置和网关可能会漂移，导致意外的问题。

网关注入将对网关的管理变得与一般的 sidecar 代理相同。在代理上设置的全局配置将适用于网关，以前不可能的复杂配置（例如，将网关作为 DaemonSet 运行）现在很容易。在集群升级后，你也可以简单地通过重启 pod 将网关更新到最新版本。

除了这些变化之外，我们还发布了新的[安装网关](https://istio.io/latest/docs/setup/additional-setup/gateway/)文档，其中包括安装、管理和升级网关的最佳做法。

## 对修订和标签部署的更新

在 Istio 1.6 中，我们增加了对同时运行多个控制平面的支持，这使得你可以[对新的 Istio 版本进行金丝雀式部署](https://istio.io/latest/blog/2020/multiple-control-planes/)。在 1.10 版本中，我们引入了[修订标签（revision tag）](https://istio.io/latest/blog/2021/revision-tags/)，这让你可以将一个修订版标记为 `production` 或 `testing`，并在升级时将出错的机会降到最低。

`istioctl tag` 命令在 1.11 中已经不再是实验性了。你现在也可以为控制平面指定一个默认的修订版。这有助于进一步简化从无修订版的控制平面到新版本的金丝雀升级。

我们还修复了一个关于升级的[悬而未决的问题](https://github.com/istio/istio/issues/28880) —— 你可以安全地对你的控制平面进行金丝雀升级，不管它是否使用修订版安装。

为了改善 sidecar 的注入体验，引入了 `istio-injection` 和 `sidecar.istio.io/inject` 标签。我们建议你使用注入标签，因为比注入注解的性能更好。我们打算在未来的版本中弃用注入注解。

## 支持 Kubernetes 多集群服务（MCS）（实验性）

Kubernetes 项目正在建立[一个多集群服务 API](https://github.com/kubernetes/enhancements/tree/master/keps/sig-multicluster/1645-multi-cluster-services-api)，允许服务所有者或网格管理员控制如何导出整个网格的服务及其端点。

Istio 1.11 增加了对多集群服务的实验性支持。一旦启用，服务端点的可发现性将由客户端位置和服务是否被导出决定。驻留在与客户端相同的集群中的端点将总是可被发现。然而，在不同集群内的端点，只有当它们被导出到网格时，才会被客户端发现。

注意，Istio 还不支持 MCS 规范所定义的 `cluster.local` 和 `clusterset.local` 主机的行为。客户端应该继续使用 `cluster.local` 或 `svc.namespace` 来做服务寻址。

这是我们[支持 MCS 计划](https://docs.google.com/document/d/1K8hvQ83UcJ9a7U8oqXIefwr6pFJn-VBEi40Ak-fwQtk/edit)第一阶段。请继续关注！

## 预告：新的 API

Istio 的一些功能只能通过 [`EnvoyFilter`](https://istio.io/latest/docs/reference/config/networking/envoy-filter/)来配置，它允许你设置代理配置。我们正在为常见的用例开发新的 API—— 比如配置遥测和 WebAssembly（Wasm）扩展部署，在 1.12 版本中你可以看到这些功能。如果你有兴趣帮助我们测试这些实现，[请加入工作组会议](https://github.com/istio/community/blob/master/WORKING-GROUPS.md)。

## 加入 Istio 社区

你也可以在 [Discuss Istio](https://discuss.istio.io/) 加入讨论，或者加入我们的 [Slack](https://slack.istio.io/)。

你想参与吗？寻找并加入我们的一个[工作组](https://github.com/istio/community/blob/master/WORKING-GROUPS.md)，帮助改进 Istio。

## Istio 1.11 升级调查

如果你已经完成了对 Istio 1.11 的升级，我们想听听你的意见请花几分钟时间回复我们的简短[调查](https://forms.gle/pquMQs4Qxujus6jB9)，告诉我们我们的工作情况。
