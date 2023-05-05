---
title: "OSM（Open Service Mesh）项目将停止更新，团队将协力 Istio 服务网格开发"
date: 2023-05-05T09:16:27+08:00
draft: false
authors: ["OSM"]
translators: ["宋净超"]
summary: "开放服务网格（OSM）宣布停止更新，将与Istio社区更加紧密地合作，以加速实现下一代服务网格技术的发展。服务网格社区的发展，如Kubernetes Gateway API和GAMMA，进一步凸显了服务网格在当今云原生栈中的关键重要性和成熟度。OSM团队将与Istio社区合作，包括利用Kubernetes的ClusterTrustBundles功能增强Istio的网格证书管理体验，提出“安全模式”功能方法，改进Istio的遥测体验，并与Istio新宣布的无Sidecar环境网格模式进行合作。"
tags: ["Service Mesh","OSM"]
categories: ["Service Mesh"]
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://openservicemesh.io/blog/osm-project-update/
---

> 摘要：本文译自 [OSM 官方博客](https://openservicemesh.io/blog/osm-project-update/)。开放服务网格（OSM）宣布停止更新，将与 Istio 社区更加紧密地合作，以加速实现下一代服务网格技术的发展。服务网格社区的发展，如 Kubernetes Gateway API 和 GAMMA，进一步凸显了服务网格在当今云原生栈中的关键重要性和成熟度。OSM 团队将与 Istio 社区合作，包括利用 Kubernetes 的 ClusterTrustBundles 功能增强 Istio 的网格证书管理体验，提出 “安全模式” 功能方法，改进 Istio 的遥测体验，并与 Istio 新宣布的无 Sidecar 环境网格模式进行合作。

开放服务网格（OSM）于 2020 年 8 月推出，并于此后不久加入了 CNCF。自那以后，OSM 一直在与社区紧密合作，提供一个使用可互操作的服务网格 API 集合的简化操作服务网格体验，这些 API 集合通过[服务网格接口（SMI）](https://smi-spec.io/)实现。

服务网格社区涌现了大量的兴奋、进步和共享的想法，这些想法与 OSM 的指导原则相一致。OSM 的宪章一直是提供一个聚焦于易于消费和操作的服务网格体验。同样，另一个服务网格社区项目 Istio 也简化了操作，并且 Istio 项目继续发展和支持一组新的用例和功能，以推进未来各种工作负载，例如无 Sidecar 模式。随着 [Istio 项目加入 CNCF 的宣布](https://istio.io/latest/blog/2022/istio-accepted-into-cncf/)，OSM 团队很高兴能够与 Istio 社区更加紧密地合作。这种合作将导致 OSM 项目在与 CNCF 的档案工作中向着 Istio 项目进行重点资源的集中。

## 服务网格成熟度

随着云原生采用的势头不断增强，用户需要服务网格提供的核心功能和可扩展性来支持他们的云原生微服务。增强功能，如 [Kubernetes Gateway API](https://gateway-api.sigs.k8s.io/) 和 [用于网格管理和管控的网关 API（GAMMA）](https://gateway-api.sigs.k8s.io/contributing/gamma/)，进一步凸显了服务网格在当今云原生栈中的关键重要性和成熟度。

因此，服务网格正在发展以满足未来云原生工作负载的需求，这是 OSM 团队在项目路线图和技术决策方面的关注点。我们看到社区继续致力于为服务网格用户提供简化的操作体验是一个重要的投资领域，无论是在时间还是资源方面。随着社区在诸如 Gateway API 之类的功能上进行投资，例如通过 GAMMA 为标准的一组服务网格 API 和无 Sidecar 代理模式，我们认为这些是激发集体努力的领域。这些社区主导的举措为增强协作提供了坚实的基础，并创造了一个更可持续的服务网格生态系统。

## 前进的道路

OSM 维护人员很高兴与 Istio 社区以及 Gateway API 和 GAMMA 的项目合作，在 CNCF 提供的强大治理和协作生态系统下开展合作。Istio 项目继续发展以支持一组新的用例和功能，例如带[环境网格（Ambient Mesh）的宣布](https://istio.io/latest/blog/2022/introducing-ambient-mesh/)的无 Sidecar 模式。

OSM 团队一直致力于满足社区需求，提供亟需的服务网格功能，以解决当前问题并开发下一代服务网格技术。这个决定将使团队帮助加速实现这一目标。**此外，将不再发布 OSM 的新版本。**

目前，与 Istio 的即刻兴趣和合作包括利用 Kubernetes 的 ClusterTrustBundles 功能增强 Istio 的网格证书管理体验（[RFC：ClusterTrustBundle 与 Istio 的集成](https://docs.google.com/document/d/1eVKo57JVQ8QGjqRkMYGHDraS_vANJf3tTUWqqbvcylQ/edit)），提出 “安全模式” 功能方法，为 Istio 提供一种简化的方式，以对最稳定的 API 进行任务关键型企业环境的防护（[提案：Istio 安全模式](https://docs.google.com/document/d/1aaORW2Ak4Vfpr-N68Q04qS7iskDdF3v7lcZFQsFA_L0/edit)），改进 Istio 的遥测体验，并与 Istio 新宣布的无 Sidecar 环境网格模式进行合作。鉴于有许多共享目标，OSM 团队认为这是一种有效和高效的协作方式，可以推动社区向前发展。我们很高兴宣布这一努力，并期待更多贡献者和维护者加入塑造下一代服务网格的发展。如果您尚未加入 Istio 的 CNCF Slack 频道，请考虑加入，成为当前和未来讨论 Istio 的一部分。
