---
title: "Istio 扩展对 Gateway API 的支持"
date: 2022-07-24T18:36:27+08:00
draft: false
authors: ["Istio"]
translators: ["宋净超"]
summary: "Gateway API 将作为 Istio 的标准网关 API 支持。"
tags: ["Istio","网关"]
categories: ["service mesh"]
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://istio.io/latest/blog/2022/gateway-api-beta/
---

我们要[祝贺 Kubernetes SIG Network 社区发布了 Gateway API 规范的 beta 版本](https://kubernetes.io/blog/2022/07/13/gateway-api-graduates-to-beta/)。除了这个里程碑，我们很高兴地宣布，对在 Istio ingress 中使用 Gateway API 的支持正在升级为 Beta，并且我们打算让 Gateway API 成为未来所有 Istio 流量管理的默认 API。我们也很高兴地欢迎来自服务网格接口（SMI）社区的朋友，他们将加入我们的行列，使用 Gateway API 标准化服务网格用例。

## Istio 流量管理 API 的历史

API 设计更像是一门艺术而不是一门科学，Istio 经常被用作一个 API 来配置其他 API 的服务！仅在流量路由的情况下，我们必须考虑生产者与消费者、路由与后路由，以及如何使用正确数量的对象来表达复杂的特征集 —— 考虑到这些必须由不同的团队拥有。

我们在 2017 年推出 Istio 时，我们将 Google 的生产 API 服务基础设施和 IBM 的 Amalgam8 项目的多年经验带到了 Kubernetes 上。我们很快就遇到了 Kubernetes 的 Ingress API 的限制。支持所有代理实现的愿望意味着 Ingress 仅支持最基本的 HTTP 路由功能，而其他功能通常作为供应商特定的注解（Annotation）实现。Ingress API 在基础设施管理员（“创建和配置负载均衡器”）、集群运维（“为我的整个域管理 TLS 证书”）和应用程序用户（“使用它将 `/foo` 路由到 foo 服务”）之间共享。

我们[在 2018 年初重写了流量 API](https://istio.io/latest/blog/2018/v1alpha3-routing/)，以解决用户反馈的问题，并更充分地解决这些问题。

Istio 新模型的一个主要特性是具有单独的 API，用于描述基础设施（负载均衡器，由[Gateway](https://istio.io/latest/docs/concepts/traffic-management/#gateways)表示）和应用程序（路由和后路由，由[VirtualService](https://istio.io/latest/docs/concepts/traffic-management/#virtual-services)和[DestinationRule](https://istio.io/latest/docs/concepts/traffic-management/#destination-rules)表示）。

Ingress 作为不同实现之间的最小子集运行良好，但它的缺点导致 SIG Network 研究新版的设计。[在 2018 年](https://github.com/bowei/k8s-ingress-survey-2018/blob/master/survey.pdf)的用户调查之后，[2019 年的新 API 提案](https://www.youtube.com/watch?v=Ne9UJL6irXY)在很大程度上基于 Istio 的流量 API。这种努力后来被称为“Gateway API”。

Gateway API 能够对更多用例进行建模，具有扩展点以启用不同实现之间的功能。此外，采用 Gateway API 打开了一个服务网格，可以与为支持它而编写的整个软件生态系统兼容。你不必直接要求你的供应商支持 Istio 路由：他们需要做的就是创建网关 API 对象，而 Istio 会做它需要做的事情，开箱即用。

## 支持 Istio 中的网关 API

Istio 在 2020 年 11 月增加[了对 Gateway API](https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/)的支持，支持标记为 Alpha 以及 API 实现。随着 API 规范的 Beta 版发布，我们很高兴地宣布 Istio 中对 ingress 使用的支持正在升级为 Beta。我们还鼓励早期采用者开始试验用于网格（服务到服务）使用的网关 API，当 SIG 网络标准化所需的语义时，我们将把这种支持转移到测试版。

在 API v1 发布时，我们打算让 Gateway API 成为配置 Istio 中所有流量路由的默认方法 - 用于入口（南北）和服务到服务（东西）流量。届时，我们将更改我们的文档和示例以反映该建议。

就像 Kubernetes 打算在 Gateway API 稳定多年后依然支持 Ingress API 一样，Istio API（Gateway、VirtualService 和 DestinationRule）在可预见的未来仍将受到支持。

不仅如此，你还可以继续使用现有的 Istio 流量 API 和网关 API，例如，使用带有 Istio [VirtualService](https://gateway-api.sigs.k8s.io/v1beta1/api-types/httproute/)。

API 之间的相似性意味着我们将能够提供一个工具来轻松地将 Istio API 对象转换为 Gateway API 对象，我们将与 API 的 v1 版本一起发布。

Istio 功能的其他部分，包括策略和遥测，将继续使用 Istio 特定的 API 进行配置，同时我们与 SIG Network 合作对这些用例进行标准化。

## 欢迎 SMI 社区加入 Gateway API 项目

在整个设计和实施过程中，Istio 团队的成员一直在与 SIG Network 的成员合作实施 Gateway API，以确保该 API 适用于网格用例。

我们很高兴服务网格接口（SMI）社区的成员[正式加入这项工作](https://smi-spec.io/blog/announcing-smi-gateway-api-gamma)，包括来自 Linkerd、Consul 和 Open Service Mesh 的领导者，他们共同决定在网关 API 上标准化他们的 API 工作。为此，我们在 Gateway API 项目中建立了[Gateway API Mesh Management and Administration（GAMMA）工作流](https://gateway-api.sigs.k8s.io/contributing/gamma/)。Istio 技术监督委员会成员兼网络工作组负责人 John Howard 将担任该小组的负责人。

我们的后续步骤是为网关 API 项目提供[增强建议](https://gateway-api.sigs.k8s.io/v1alpha2/contributing/gep/)，以支持网格用例。我们已经[开始研究](https://docs.google.com/document/d/1T_DtMQoq2tccLAtJTpo3c0ohjm25vRS35MsestSL9QU/edit)用于网格流量管理的 API 语义，并将与在其项目中实施 Gateway API 的供应商和社区合作，以构建标准实施。之后，我们打算为授权和身份验证策略构建一个表示。

SIG Network 作为供应商中立论坛确保服务网格社区使用相同的语义实现 Gateway API，我们期待有一个标准 API 可用于所有项目，无论其技术堆栈或代理如何。
