---
title: "WebAssembly 能够取代 Kubernetes 吗？探索其优势和限制"
summary: "WebAssembly 可以作为一种部署应用程序的方式，可以在服务器操作系统上运行，且在许多不同的硬件环境中表现出色。与 Kubernetes 相比，WebAssembly 的优点在于简易性和安全性。但是，Kubernetes 始终有其用途，它将始终用于编排微服务和容器。因此，对于某些用例来说，WebAssembly 可以替代 Docker 和容器，但是在高度分布式的云原生环境中，使用 WebAssembly 来编排容器和微服务程度上与 Kubernetes 相同的程度是不可能的。"
authors: ["TheNewStack"]
translators: ["宋净超"]
categories: ["Kubernetes"]
tags: ["Kubernetes","WebAssembly"]
date: 2023-09-11T19:03:00+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://thenewstack.io/webassembly/yes-webassembly-can-replace-kubernetes/
---

本文源自：<https://thenewstack.io/webassembly/yes-webassembly-can-replace-kubernetes/>

摘要：WebAssembly 可以作为一种部署应用程序的方式，可以在服务器操作系统上运行，且在许多不同的硬件环境中表现出色。与 Kubernetes 相比，WebAssembly 的优点在于简易性和安全性。但是，Kubernetes 始终有其用途，它将始终用于编排微服务和容器。因此，对于某些用例来说，WebAssembly 可以替代 Docker 和容器，但是在高度分布式的云原生环境中，使用 WebAssembly 来编排容器和微服务程度上与 Kubernetes 相同的程度是不可能的。

------

是的，WebAssembly 可以解决 Kubernetes 的一些问题。

WebAssembly 或 Wasm 被证明是一种在 Web 浏览器上运行代码的非常实用的方式，它可以作为编译器。它已经作为一种语言运行得非常好，以至于世界万维网联盟（W3C）在 2019 年将其命名为 Web 标准，成为第四个 Web 标准，与 HTML、CSS 和 JavaScript 一起。

主要的 Web 浏览器，包括 Mozilla、Chrome、Internet Explorer 等，都兼容 Wasm，用于编写代码和创建 Web 浏览器应用程序的使用越来越普遍。除了 Web 工作马车 JavaScript 外，Wasm 还可以容纳其他语言，包括 Go、.NET、C++、Java、PHP、Rust 和 Python。

Adobe依赖于Wasm/WASI平台在浏览器上直接运行C++代码，这是其中一个更有趣的用例。这使得用户可以在浏览器上直接运行Adobe的Photoshop和Acrobat，从而无需在用户的计算机上下载这些软件工具进行工作。

最终，开发人员意识到 Wasm 也可以在服务器操作系统上运行，现在它的使用范围扩展到硬件平台。它在许多不同的硬件环境中表现出色，从服务器端到边缘部署和物联网设备，或者任何可以直接在 CPU 上运行代码的地方。代码打包在整洁的 Wasm 可执行文件中，可以将其与容器或甚至可以与较少配置的代码和目标运行的迷你操作系统进行比较。无论在哪里部署代码，应用程序都比仅限于 Web 浏览器环境更加广泛。

在许多方面，Wasm 的功能可以与一个“大杂烩”多语言编译器相比。然而，与编译器相比，同一二进制可执行文件的 Wasm 可以针对多个平台进行目标和运行，而无需在 Wasm 代码和目标设备上进行配置。

因此，与编译器相比，Wasm 在完美针对多个目标运行二进制可执行文件时显然比较优越。而在这种情况下，单个二进制可执行文件可以针对多个目标运行，而无需重新配置：这就是 Wasm 的优美之处。

“Wasm 终于让我们在不涉及开发人员的情况下在服务器、云和边缘设备之间移动代码。这将最终结束开发人员花费大量时间担心调整他们的代码以及为不同的目标平台提供支持的时代，”Enterprise Management Associates（EMA）的分析师 Torsten Volk 告诉 The New Stack。“Wasm 的工作是在所有这些平台上提供一致的运行时。”

因此，Wasm 可以在某些情况下为 Kubernetes 提供很好的替代方案。与 Kubernetes 相比的主要优点是：

**简易性**。在部署应用程序时，即使将应用程序分发到不同的终端，也会有许多明显缺少的步骤。Cosmonic 的 PaaS 版本可以用几个命令行在图形界面中部署应用程序。当使用 Fermyon 和 Fastly 的 Compute@Edge 时，情况也是如此。

**安全性**。在 Kubernetes 这种高度分布式的环境中，安全性是一个真正的问题，并且问题点的详尽列表太长，这里不再赘述。微服务之间的互连性意味着，在一个 Pod 中有数百个入口点中获得访问权限的攻击者可能会对组织的整个基础架构造成严重破坏。[秘密管理](https://thenewstack.io/kubernetes-secrets-management-3-approaches-9-best-practices/)是另一个问题，并且与名称一样，在容器中指定谁可以访问它们也存在困难。

Wasm 的可移植性和一致性可以使安全性和合规性更易于管理（再次强调，它在 CPU 级别的二进制格式中运行）。此外，Wasm 结构的简单性意味着代码在几乎直接到达端点的封闭沙箱环境中发布。Wasm 并非没有漏洞可以利用。只是相对于 Kubernetes，它的漏洞利用可能性更少。

## 但它们并不是同一件事情

Wasm 提供了巨大的机会，并且可能会作为一种部署应用程序的方式，在未来几个月和几年中，我们将看到供应商变得更加有创造力，以便用户可以利用它。相比之下，那些预测 Wasm 最终将吃掉 Kubernetes 的午餐并完全取代它的人，可以说是错过了重点。不可能说会发生什么，以及其他用于在云环境中部署和管理高度分布式应用程序的技术可能最终取代 Kubernetes。但是，它高度不可能是 Wasm。

这是因为 Kubernetes 始终有其用途。它将始终用于编排微服务，以及当然还有容器。它也可以被认为实际上就是 Wasm 将在其中运行的东西，并且其支持者已经说过 Wasm 非常适合在 Kubernetes 环境中运行。

“[Wasm 是为开发人员提供无需编写和维护大量基础设施 YAML 的无服务器运行时](https://thenewstack.io/webassembly/serverless-webassembly-for-browser-developers/)。Wasm 为应用程序代码提供了一组标准 API，以便访问关键的运行时服务，例如 SQL 或 NoSQL、Kafka 消息传递或代码调试，”Volk 说。“但是，然后 Wasm 依赖于资源编排层，可以由 Kubernetes 或任何其他调度器提供，以提供这些服务所需的基础设施资源。这些资源可以以容器、虚拟机、裸机或一些未曾想到的花哨未来技术的形式交付。”

然而，并非所有人都认为 Kubernetes 作为容器编排的能力将无限期地保持其首选。许多 Wasm 领域的人都倾向于 HashiCorp 的 Nomad 调度器。的确，Fermyon 已经放弃了 Krustlet（Wasm-on-Kubernetes），并将重点转向 HashiCorp Nomad 作为其调度器。Butcher 说：“Nomad 在调度容器方面与 Kubernetes 相当，但具有一个至关重要的附加功能：它可以调度非容器工作负载。在 Fermyon 中，我们能够使 Nomad 调度和执行 WebAssembly 应用程序，而无需编写任何自定义代码。”

与此同时，Kubernetes 开发人员需要在低级别上[接受 WebAssembly](https://thenewstack.io/webassembly/what-is-webassembly-and-why-do-you-need-it/)，并更改内置的、容器特定的假设，Butcher 说。微软是第一家真正拥抱这个概念的公司，它的[runwasi](https://github.com/containerd/runwasi)项目是 WebAssembly 如何在 Kubernetes 内部执行的示例，Butcher 说。

“runwasi 项目仅仅是 Kubernetes 需要经历的一系列转型中的第一步，如果它不想被 Nomad 和 Wasm 超越，它的开发人员和维护人员需要快速采取行动。”Butcher 说。“Kubernetes 的游戏要输，但如果它不想被 Nomad 和 Wasm 取代，它们需要迅速采取行动。”

## 存在的威胁

WebAssembly 对于 Docker 以及容器构成了一种存在的威胁，尽管在超越 Kubernetes 方面，WebAssembly 的简单性、可移植性和安全性等优势使其成为弥补 Docker 缺陷的良好选择，特别是对于边缘和分布式应用。然而，Butcher 指出，Docker 在以下两种应用程序提供环境时表现出色：

- 长时间运行的过程，如数据库和消息队列，这些过程需要强大的 I/O 和内存管理能力。
- 遗留（传统）代码，该代码在应用程序中保留状态并大量使用线程。

“Butcher 说：“我对 Docker 的看法是，它在市场上有一个强大且不可撼动的地位，WebAssembly 不太可能取代它。但是，当涉及到微服务和 Web 应用程序后端时，我认为 WebAssembly 有望削减 Docker 的使用。”

因此，对于某些用例来说，Wasm 可以替代 Docker 和容器，但是在高度分布式的云原生环境中，使用 Wasm 来编排容器和微服务程度上与 Kubernetes 相同的程度是不可能的。
