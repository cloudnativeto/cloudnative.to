---
title: "WebAssembly 的采用受到了什么阻碍？"
summary: "WebAssembly 的采用情况受到了组件模型的阻碍，这是一个需要解决的关键问题。尽管 WebAssembly 已经被广泛部署以提高应用程序在浏览器或后端运行时的性能，但其全部潜力尚未得到实现。为了实现一次编写、多处部署范例，需要一个通用的标准来将不同语言与其特定的功能集和设计范式集成起来。许多公司和大学的工程师正在开发组件模型、Wasi 提议和语言工具链，这些工程师的目标是将规范放入 W3C 中。"
authors: ["Cameron Gain"]
translators: ["宋净超"]
categories: ["WebAssembly"]
tags: ["WebAssemlby"]
date: 2023-08-07T13:05:42+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://thenewstack.io/whats-holding-up-webassemblys-adoption/
---

> 译者注：WebAssembly 的采用情况受到了组件模型的阻碍，这是一个需要解决的关键问题。尽管 WebAssembly 已经被广泛部署以提高应用程序在浏览器或后端运行时的性能，但其全部潜力尚未得到实现。为了实现一次编写、多处部署范例，需要一个通用的标准来将不同语言与其特定的功能集和设计范式集成起来。许多公司和大学的工程师正在开发组件模型、Wasi 提议和语言工具链，这些工程师的目标是将规范放入 W3C 中。

原文地址：<https://thenewstack.io/whats-holding-up-webassemblys-adoption/>

WebAssembly 的承诺是：将应用程序放在 WebAssembly（Wasm）模块中，可以提高运行时性能和降低延迟速度，同时提高跨平台的兼容性。

WebAssembly 只需要 CPU 指令集。这意味着在 WebAssembly 模块中部署一个应用程序理论上应该能够在不同的不同的设备上运行和更新，无论是服务器、边缘设备、多云、无服务器环境等等。

因此，WebAssembly 已经被广泛部署以提高应用程序在浏览器或后端运行时的性能。然而，WebAssembly 的全部潜力尚未得到实现。

尽管 [WebAssembly 核心规范](https://webassembly.github.io/spec/core/bikeshed/) 已经成为标准，但服务器端 Wasm 仍然是一个正在进行中的工作。服务器端 Wasm 层有助于确保在部署 Wasm 应用程序的不同设备和服务器之间的端点兼容性。如果没有一个服务器端 WebAssembly 的标准化机制，那么将需要为每种语言构建导出和导入，以便每个运行时将以不同的方式理解导出/导入。

截至今天，“Wasm 组件”是组件模型，但还有其他品种正在被研究；“[Wasi](https://thenewstack.io/mozilla-extends-webassembly-beyond-the-browser-with-wasi/)”是一种为特定硬件配置 WASM 的方法。wasi-libc 是“posixlike kernel”组或“world”；wasi-cloud-core 是一个无服务器“world”的提议。因此，开发人员可以使用他们选择的语言创建应用程序，同时在任何环境中同时分发，无论是在 Kubernetes 集群、服务器、边缘设备等等。

“超音速”性能、降低操作成本和平台中立性是 WebAssembly 的价值主张，但组件模型仍然是关键问题，Butcher 说。“性能是最容易解决的问题，我认为我们已经能够核对它了。在 Fermyon，我们看到成千上万的用户注册我们的云服务，使总拥有成本直线下降，”Butcher 说。“但是，平台中立性——在我们关心的层面上——需要组件模型。在这方面，明天来临得越快越好。”

WebAssembly 设计成可以运行使用多种语言编写的应用程序。它现在可以容纳 Python、JavaScript、C++、Rust 等。使用不同编程语言编写的不同应用程序应该能够在单个模块内运行，但这种能力仍然在开发中。

“在系统级别上使编程语言真正可互换可能是实现一次编写、多处部署范例的最后一个领域。但是为了使这项工作成功，我们需要一个通用的标准来将不同语言与其特定的功能集和设计范式集成起来，”Enterprise Management Associates（EMA）的分析师 Torsten Volk 表示。

“这是一个经典的集体行动问题，其中单独的营利组织必须合作才能共同实现语言互操作的最终目标。此外，当涉及到在跨语言上标准化和完善功能集时，它们需要就务实妥协达成一致。”

## 汇聚在一起

与此同时，来自许多公司和大学的工程师正在开发组件模型、Wasi 提议和语言工具链，这些工程师的目标是将规范放入 World Wide Web Consortium (W3C) 中，Microsoft 的主要项目经理、Azure Core Upstream 的负责人 Ralph Squillace 表示。

这些工程师通过为开源项目做出贡献或维护开源项目，参与 ByteCode Alliance 等工作，积极为知识共享做出贡献，或在会议上分享他们的知识和经验，例如在 KubeCon + CloudNativeCon Europe 的联合活动 Cloud Native Wasm Day 上。

“当涉及到标准时，所有主要的相关方都需要能够告诉他们的利益相关者为什么有必要在这个努力上花费宝贵的开发人员时间。当不同的当事方遵循不同的激励结构时，这变得特别棘手，例如，云服务提供商有兴趣让客户在他们的服务上花费尽可能多的钱，而不会因移动到另一个云而感到不满，”Volk 表示。“这意味着需要某种程度的锁定，而企业软件供应商需要专注于高度可定制性和可移植性，从而将其产品开放给尽可能多的受众。所有这些组合显示了实现 Wasm 的互操作性的困难程度之高。我希望我们可以，因为回报肯定应该是值得的。”

许多提供 PaaS 提供的工具成员继续不断涌现，以等待预期的 WebAssembly 时代的到来。参与者包括 Fermyon 和 Cosmonic。新的玩家 Dylibso 正在开发定制解决方案进行观察性分析；这些解决方案包括 Modsurfer，用于分析在您的环境中运行特定代码的复杂性和潜在风险。

与此同时，大多数大型软件公司正在积极为 Wasm 做出贡献，而不一定创建正式的部门来支持 Wasm 相关的开源项目、开发、基础设施和网络拓扑的集成，或为 Wasm 开发应用程序，技术领袖几乎都在生产中或作为沙盒项目使用 Wasm。

为了促进 WebAssembly（Wasm）的整合并弥合任何现有的差距，VMware 的 Wasm Labs 推出了 Wasm Language Runtimes 项目。主要目标是准备运行语言运行时、库和组件，供对 WebAssembly 感兴趣的开发人员使用，根据 VMware 的高级主管、Bitnami 的 CEO Daniel Lopez Ridruejo 表示。

这些语言运行时可以与其他各种倡议结合使用，包括 mod_wasm（用于运行传统的 Web 应用程序，例如 WordPress）和 Wasm Workers Server（用于执行边缘/无服务器应用程序）。Ridruejo 还提到了 Language Runtime 项目与 Fermyon 的 Spin 等开源努力的兼容性。

其他公司，如 Chronosphere 和 Microsoft，已经开始使用 WebAssembly 支持其操作，同时继续积极为社区的 Wasm 开发做出贡献。在 Microsoft 的情况下，它与 WebAssembly 的工作可以追溯到多年前。例如，Microsoft Flight Simulator 多年来一直在使用 WebAssembly 进行模块保护，例如当它被证明可以提高分发为 WebAssembly 模块的附加组件的安全性和可移植性时。Excel Online 使用 WebAssembly 计算 Lambda 函数。

如今，Microsoft 的大部分工作都集中在即将到来的组件模型上，Microsoft 的 Squillace 表示。例如，Microsoft 正在扩大 Azure Kubernetes Service WASI NodePool 的预览，并在 Wasm 沙盒之上为其服务提供额外的超级监视保护，用于请求。这为非常小的裸机微型虚拟机非常快速地提供了用于 wasm 函数的使用。）

在边缘浏览器之外，Microsoft 主要投资于基于服务器的 Wasm、系统接口（wasi）和围绕 Bytecode Alliance Foundation 的 Wasm 组件生态系统，以及基础设施和语言工具链，以实现有效的使用，Squillace 表示。“这意味着像 CNCF 的 Containerd runwasi shim 用于 Kubernetes 集成这样的开源投资，但也意味着与 TinyGo 兼容的 Wasm 组件工具、VSCode 扩展和 serverless 提案，例如 wasi-cloud-core，以及 Azure 投资于安全性，例如 hyperlight 和诸如 AKS WASI NodePool Preview 和 AKS Edge Essentials 等 Azure 服务。”

## 大炒作

WebAssembly 的轨迹反映了类似技术（如 Java、容器等）发生的周期。 Ridruejo 表示：“每一个都看到了一个围绕它的生态系统增长的周期，有了新的监控方式、安全等等。现在还太早，不知道它看起来是什么样子，”Ridruejo 表示。“问题是，在工具提供商和大型企业开始利用 WebAssembly 赚钱之前，需要发生什么。对此，Squillace 表示：

“客户已经告诉我们，他们需要一个可理解的（如果不是伟大的）开发体验和一个稳固的部署和管理体验。他们还需要网络支持（在第二个预览版中推出）；没有网络支持意味着 IoT 中没有服务主机的运行时支持。最后，他们需要一致的交互式调试。这最后一个在所有语言和运行时上都很难。”
