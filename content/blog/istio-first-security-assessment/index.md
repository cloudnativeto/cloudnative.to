---
authors: ["Istio"]
date: "2021-07-22T10:42:00+08:00"
draft: false
translators: ["宋净超"]
title: "Istio 首次安全评估结果公布"
summary: "由 NCC 集团进行的第三方安全审查的结果。"
categories: ["istio"]
tags: ["service mesh","istio"]
---

本文译自 Istio 社区官方博客 [Announcing the results of Istio’s first security assessment](https://istio.io/latest/blog/2021/ncc-security-assessment/)。

Istio 服务网格已在各行各业获得广泛的生产应用。该项目的成功，以及其在基础设施中执行关键安全策略的重要用途，都需要对与该项目相关的安全风险进行公开和中立的评估。

为了实现这一目标，Istio 社区去年与 [NCC 集团](https://www.nccgroup.com/)签约，对该项目进行第三方安全评估。审查的目标是“确定与 Istio 代码库有关的安全问题，突出管理员常用的高风险配置，并提供关于安全功能是否充分解决它们旨在提供的问题的观点”。

NCC 集团在 Istio 社区的领域专家的协作下，进行了为期五周的审查。在这篇博客中，我们将研究报告的主要发现，为实施各种修复和建议而采取的行动，以及我们对 Istio 项目的持续安全评估和改进的行动计划。你可以下载并阅读[安全评估报告的未删节版本](https://istio.io/latest/blog/2021/ncc-security-assessment/NCC_Group_Google_GOIST2005_Report_2020-08-06_v1.1.pdf)。

## 范围和主要发现

本次评估从整体上评估了 Istio 架构的安全相关问题，重点是 Istiod（Pilot）、Ingress/Egress 网关等关键组件，以及 Istio 作为数据平面代理的整体 Envoy 使用情况。此外，还审计了 Istio 的文档，包括安全指南，以确保其正确性和清晰性。该报告是针对 Istio 1.6.5 版本编制的，此后，随着新漏洞的披露，产品安全工作组发布了几个安全版本，同时还针对新报告中提出的问题进行了修复。

该报告的一个重要结论是，审计人员在 Istio 项目中没有发现“关键“问题。这一发现验证了 Istio 的产品安全工作组（PSWG）实施的持续和积极的安全审查和漏洞管理流程。对于报告中提到的其余问题，PSWG 开始着手解决，我们很高兴地报告，所有标为“高“的问题和几个标为“中 / 低“的问题在报告发布后已经得到解决。

该报告还围绕创建一个加固指南提出了战略建议，现在可以在我们的[安全最佳实践指南](https://istio.io/latest/docs/ops/best-practices/security/)中找到。这是一份全面的文件，汇集了 Istio 社区的安全专家和在生产中运行 Istio 的行业领导者的建议。我们正在努力为在安全环境中安装 Istio 创建一个有见地的、强化的安全配置文件，但在这期间，我们建议用户遵循安全最佳实践指南，配置 Istio 以满足他们的安全需求。说到这里，让我们看看对报告中提出的各种问题的分析和解决。

## 解决方法和心得

### 无法保证控制面网络通信的安全

该报告标记了旧版本的 Istio 中可用的配置选项，以控制如何保证控制面的通信安全。自 1.7 以来，Istio 默认保护所有控制面通信的安全，报告中提到的许多管理控制面加密的配置选项不再需要了。

报告中提到的调试端点是默认启用的（从 Istio 1.10 开始），允许用户使用 istioctl 工具调试他们的 Istio 服务网格。它可以通过设置环境变量 `ENABLE_DEBUG_ON_HTTP` 为 FALSE 来禁用，正如安全最佳实践指南中提到的。此外，在即将到来的版本（1.11）中，这个调试端点默认是安全的，需要一个有效的 Kubernetes 服务账户令牌才能访问。

### 缺少安全相关的文档

报告指出了与 Istio 1.6 一起发布的安全相关文档的差距。此后，我们创建了详细的安全最佳实践指南，并提出建议，以确保用户能够安全地部署 Istio，以满足他们的要求。今后，我们将继续用更多的加固建议来充实这个文档。我们建议用户关注该指南的更新。

### 缺乏 VirtualService Gateway 字段验证使请求被劫持

对于这个问题，报告使用了一个有效但允许的 Gateway 配置，可能导致请求被错误地路由。与 Kubernetes 的 RBAC 类似，Istio 的 API，包括 Gateway，可以根据你的要求调整为允许性或限制性。然而，该报告浮现了我们的文档中与最佳实践和指导用户保护其环境有关的缺失环节。为了解决这些问题，我们在我们的安全最佳实践指南中增加了一个章节，其中包括安全运行[网关](https://istio.io/latest/docs/ops/best-practices/security/#gateways)的步骤。特别是描述在网关资源的主机规范中[使用命名空间前缀](https://istio.io/latest/docs/ops/best-practices/security/#avoid-overly-broad-hosts-configurations)的部分，我们强烈建议加强你的配置，防止这种类型的请求劫持。

### 生成的 Ingress Gateway 配置使请求被劫持

报告指出，在使用默认机制，即在网关资源中通过标签跨命名空间选择网关工作负载时，可能出现请求劫持。这种行为是默认选择的，因为它允许将管理网关和 VirtualService 资源委托给应用程序团队，同时允许运维团队集中管理入口网关工作负载，以满足其独特的安全要求，例如在专用节点上运行。正如报告中所强调的，如果这种部署拓扑结构在你的环境中不是一个要求，强烈建议将网关资源与你的网关工作负载放在一起，并将环境变量 `PILOT_SCOPE_GATEWAY_TO_NAMESPACE` 设置为 true。

请参考[网关部署拓扑结构指南](https://istio.io/latest/docs/setup/additional-setup/gateway/#gateway-deployment-topologies)，了解 Istio 社区推荐的各种部署模式。此外，正如[安全最佳实践指南](https://istio.io/latest/docs/ops/best-practices/security/#restrict-gateway-creation-privileges)中提到的，网关资源的创建应使用 Kubernetes RBAC 或其他政策执行机制进行访问控制，以确保只有授权实体可以创建。

## 其他中等和低严重程度的问题

有两个中等严重程度的问题被报告，与项目内不同级别暴露的调试信息有关，这些信息可以被用来获取敏感信息或策划拒绝服务（DOS）攻击。虽然 Istio 默认启用了这些调试接口，用于剖析或启用“istioctl“等工具，但如上所述，可以通过将环境变量 `ENABLE_DEBUG_ON_HTTP` 设置为 FALSE 来禁用它们。

报告正确地指出，Istio 提供的默认镜像中安装的各种实用程序，如 `sudo`、`tcpdump` 等，可能导致特权升级攻击。提供这些工具是为了帮助运行时调试流经网络的数据包，建议用户在生产中使用这些镜像的[加固版本](https://istio.io/latest/docs/ops/configuration/security/harden-docker-images/)。

该报告还提出了一个已知的架构限制，即任何基于 sidecar 代理的服务网格实现都使用 `iptables` 来拦截流量。这种机制很容易被 [sidecar 代理绕过](https://istio.io/latest/docs/ops/best-practices/security/#understand-traffic-capture-limitations)，这对安全环境来说是一个有效的问题。它可以通过遵循安全最佳实践指南的[深入防御](https://istio.io/latest/docs/ops/best-practices/security/#defense-in-depth-with-networkpolicy)建议来解决。我们也在与 Kubernetes 社区合作，研究更安全的选项。

### 有用和安全之间的权衡

你可能已经注意到了评估结果和为解决这些问题提出的建议中的一个趋势。Istio 提供了各种配置选项，以根据您的要求创建一个更安全的安装，我们还推出了一个全面的安全最佳实践指南，供用户遵循。由于 Istio 在生产中被广泛采用，对我们来说，在切换到安全默认值和现有用户在升级时可能出现的迁移问题之间，是一个权衡。Istio 产品安全工作组评估了这些问题中的每一个，并在给我们的用户一些版本选择安全配置和迁移他们的工作负载后，创建了一个行动计划，以逐一启用安全默认。

最后，在经历了中立的安全评估期间和之后，我们有几个教训。其中最主要的是确保我们的安全实践是强大的，以快速响应评估结果，更重要的是在保持我们的升级标准不受影响的情况下进行安全改进。

为了继续这一努力，我们一直在 Istio 产品安全工作组中寻求反馈和参与，所以请[加入我们的公开会议](https://github.com/istio/community/blob/master/WORKING-GROUPS.md)，提出问题或了解我们为保持 Istio 的安全所做的工作！
