---
title: "云原生软件的关键用例安全保障之道"
summary: "云原生软件开发意味着为公有云和私有云的特性优化应用和环境。Chainguard 旨在提供不影响开发者体验的软件供应链安全工具，通过提供最小化、强化的容器镜像，让用户能够准确地扫描漏洞并消除 CVE 警报。本文介绍了 Chainguard Images 为 Istio 和 Cilium 这两个云原生基础技术提供的安全增强方案。"
authors: ["Chainguard.dev"]
translators: ["云原生社区"]
categories: ["Cilium"]
tags: ["Cilium","zero trust","cilium","Istio"]
date: 2024-01-10T08:00:00+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://www.chainguard.dev/unchained/securing-cloud-natives-most-important-use-cases
---

本文译自 [Securing cloud native’s most important use cases](https://www.chainguard.dev/unchained/securing-cloud-natives-most-important-use-cases)。

摘要：云原生软件开发意味着为公有云和私有云的特性优化应用和环境。Chainguard 旨在提供不影响开发者体验的软件供应链安全工具，通过提供最小化、强化的容器镜像，让用户能够准确地扫描漏洞并消除 CVE 警报。本文介绍了 Chainguard Images 为 Istio 和 Cilium 这两个云原生基础技术提供的安全增强方案。

---

从根本上说，构建云原生软件意味着构建针对公共和私有云特性进行优化的应用程序和环境。开发云原生软件意味着管理一定程度的混乱，这不是所有类型的软件都需要的。

这在新的一年尤其重要，我们可以预期产品将趋向于优先考虑开发者体验，并且平台工程的崛起。良好的工程和工具使开发者可以专注于构建和创新。已经构建的所有内部开发者平台和即将推出的平台都需要尽量将基础设施管理从开发者那里抽象出来。

这正是 Chainguard 想要解决的问题领域，特别是在安全性和漏洞管理方面。我们致力于提供不妨碍开发者体验的工具，以确保软件供应链的安全。我们通过提供最小化、加固的容器镜像来实现这一目标，这使我们的用户可以获得准确的扫描结果，并将 CVE 收件箱警报降至零。

### 推出新的 Chainguard Images 捆绑包，适用于 Cilium 和 Istio

为了实现这一目标，我们密切关注最受欢迎的开源项目，但也关注那些如果经过加固，将为整个开源生态系统提供重要的安全改进的项目。为了在整个生态系统中产生最大的影响，我们应该帮助加固那些作为云原生软件基石的技术。Istio 和 Cilium 正是这样的明显示例，它们是云原生软件生态系统的基础构建模块之一。通过提供新的 Chainguard Images Istio 和 Cilium 捆绑包，我们为这些项目的用户提供了一个安全地将它们引入其构建流程的简便方法。

在任何给定的供应链中，有些原材料比其他原材料更为基础。如果这些原材料得到了妥善保护，那么这将对后续工作产生连锁效应（或者如果你愿意的话，可以说是对整个堆栈产生上下游影响）。

Cilium 和 Istio 技术都涵盖了对 Kubernetes 环境具有基础作用的各种用例。Cilium 和 Istio 是两个流行的工具，通过提供流量路由、负载平衡、服务发现等功能来帮助解决这些挑战。这些功能对于确保 Kubernetes 和其他云原生软件部署的顺利、高效和安全运行至关重要。最终，构建云原生软件意味着创建专为云设计的应用程序，而 Cilium 和 Istio 在帮助开发者实现这一目标方面发挥了关键作用。

### Istio 和 Cilium 在云计算中不可或缺的作用

根据 2022 年的 [CNCF 年度调查](https://www.cncf.io/reports/cncf-annual-survey-2022/)，Istio 是受访者中使用最广泛的服务网格，73% 的受访公司使用它。这种广泛的采用证明了 Istio 在解决各种服务管理挑战方面的有效性，使其成为现代企业寻求构建强大、安全和可扩展的微服务架构的重要工具。Istio 在 GitHub 上拥有超过 34,000 颗星星，使其成为 CNCF 中最受欢迎的项目之一。

从同一份 CNCF 调查中，有 47% 的受访者将 Cilium 作为他们容器编排平台（如 Kubernetes）的首选网络插件。它也受欢迎于网络安全领域，有 43% 的受访者将其用于此目的。eBPF 的未来和力量是不可思议的，所有人都同意这一点。

最近，我们推出了我们的新的 [Chainguard Images 目录](https://images.chainguard.dev/)，这是一个公开可用的网站，用户可以在其中浏览我们库存中的所有镜像。在每个 Chainguard

 Image 列表中，你将找到有关安装、基础设施、签名和 SBOM 的源数据的相关信息，以及更多其他相关信息。Chainguard Images 目录还包括一个新的[安全通报](https://images.chainguard.dev/security)页面，显示用户已知的 CVE，修复的状态等信息。

如果你正在寻找更多关于如何在本地环境中启动 Chainguard Images Cilium 或 Istio 捆绑包的技术指导，请查看 Chainguard 工程师[Nghia Tran](https://www.linkedin.com/in/tcnghia/)在 Chainguard Academy 上提供的这些方便入门的指南。非常感谢我们的朋友[Isovalent](https://www.linkedin.com/in/feroz-salam-372a4113/)的 Feroz Salam 在 Cilium Images 方面给了我们帮助，以及多年来帮助我们的 Istio 的[John Howard](https://www.linkedin.com/in/-johnhoward/)！以下是指南：

- [开始使用 Istio](https://edu.chainguard.dev/chainguard/chainguard-images/getting-started/getting-started-istio/)
- [开始使用 Cilium](https://edu.chainguard.dev/chainguard/chainguard-images/getting-started/getting-started-cilium/)

Chainguard Developer Images 提供了带有 `:latest` 和 `:latest-dev` 标签的免费镜像，供你在开发和测试环境中使用。在新的目录中，每个镜像页面还包括重要的特定于镜像的详细信息，例如版本标签和其他变体，如 FIPS 和长期支持（LTS），这些都适用于购买了这些解决方案的 Chainguard Images 客户。如果你想了解有关我们的 Production Images 中面向企业的功能的更多信息，请[联系我们的团队](https://www.chainguard.dev/contact)。