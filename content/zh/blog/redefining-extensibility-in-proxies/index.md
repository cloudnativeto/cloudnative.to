---
title: "重新定义代理的扩展性：WebAssembly在Envoy与Istio中的应用"
date: 2020-03-07T15:14:43+08:00
draft: false
image: "/images/blog/redefining-extensibility-in-proxies.jpg"
author: "Istio"
authorlink: "https://istio.io"
translator: "[陆培尔](https://lupeier.com)"
originallink: "https://istio.io/blog/2020/wasm-announce/"
description: "编者按 istio1.5架构发生了重大升级，用于扩展代理服务器的新接口允许将Istio可扩展性从控制平面移至Sidecar代理本身，本文探讨采用Istio采用Wasm技术的背景和未来生态发展的考虑"
tags: ["Istio","Wasm","Envoy"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","wasm","istio"]
type: "post"
avatar: "/images/profile/default.jpg"
---

本文为翻译文章，[点击查看原文](https://istio.io/blog/2020/wasm-announce/)。

译者注：Istio的架构在1.5版本中发生了翻天覆地的变化，控制平面从微服务回归单体，pilot、citadel、galley等控制平面组件整合成了单一的istiod二进制文件，同时饱受诟病的mixer同志终于在1.5中deprecated了，社区呼声很高的Wasm以Proxy-Wasm plugins的方式登上历史舞台，官方承诺在1.6版本中提供标准的wasm插件配置API，甚至还推出了webassemblyhub这样的类似应用商店的服务，构建wasm plugin生态的野心不可谓不大。结合代理无关的ABI标准，只能说谷歌又在下一盘大棋。mixer的两大核心功能，check和report，分别使用Proxy-Wasm plugins和telemetry V2替代，曾经所谓的Mixer V2计划也渐渐烟消云散，湮没在历史尘埃中。本文翻译官方的技术博客，来一探本次的划时代变更proxy-wasm plugin的究竟。

自2016年采用[Envoy](https://www.envoyproxy.io/)以来，Istio项目一直希望提供一个平台，在此平台上可以构建丰富的扩展，以满足用户的多样化需求。 有很多理由可以向服务网格的数据平面添加功能-支持更新的协议，与专有安全控件集成或通过自定义指标增强可观察性等。

在过去的一年半中，我们在Google的团队一直在努力使用[WebAssembly](https://webassembly.org/)向Envoy代理添加动态可扩展性。 我们很高兴今天与大家分享这项工作，并推出[WebAssembly (Wasm) for Proxies](https://github.com/proxy-wasm/spec) (Proxy-Wasm)：我们打算标准化的ABI； SDK； 它的第一个主要实现是新型的，低延迟的[Istio遥测系统](https://istio.io/docs/reference/config/telemetry)。

我们还与社区紧密合作，以确保为用户提供良好的开发人员体验，以帮助他们快速入门。 Google团队一直与[Solo.io](https://solo.io/)团队紧密合作，他们已经构建了[WebAssembly Hub](https://webassemblyhub.io/)，该服务用于构建，共享，发现和部署Wasm扩展。 使用WebAssembly Hub，Wasm扩展与容器一样易于管理，安装和运行。

这项工作今天发布了Alpha版本，还有很多工作要做，但是我们很高兴将其交到开发人员手中，以便他们可以开始尝试由此带来的巨大可能性。

## 背景

Istio和Envoy项目的创建原则都是基于对可扩展性的需求，但是两个项目采用了不同的方法。 Istio项目的重点是启用具有轻量级开发人员体验的称为[Mixer](https://istio.io/docs/reference/config/policy-and-telemetry/mixer-overview/)的通用进程外扩展模型，而Envoy则专注于代理内[扩展](https://www.envoyproxy.io/docs/envoy/latest/extending/extending)。

每种方法都有其优点和缺点。 Istio模型导致严重的资源效率低下，从而影响了尾部延迟和资源利用率。 该模型在本质上也受到限制-例如，它永远不会为实现[自定义协议处理](https://blog.envoyproxy.io/how-to-write-envoy-filters-like-a-ninja-part-1-d166e5abec09)提供支持。

Envoy模型强化了整体的构建过程，并要求使用C++编写扩展，从而限制了开发人员生态系统。 为集群发布新的扩展需要推入新的二进制文件并重新启动，这可能很难协调，并且会造成停机风险。 这也激励了开发人员向Envoy上游提交他们的扩展，而这些扩展仅由一小部分生产环境使用，只是为了肩负其发布机制。

随着时间的流逝，Istio的一些对性能最敏感的功能已进入Envoy的上游，例如[流量策略检查](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/rbac_filter)和[遥测报告](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/rbac_filter)。 尽管如此，我们一直希望将单个堆栈融合以实现可扩展性，从而减少折衷：这使Envoy版本与其扩展生态系统脱钩，使开发人员能够使用他们选择的语言进行工作，并使Istio可靠地推出新功能而不会造成停机风险。 

## 什么是WebAssembly？

[WebAssembly](https://webassembly.org/)（Wasm）是一种可移植的字节码格式，用于以接近本机的速度执行以[多种语言](https://github.com/appcypher/awesome-wasm-langs)编写的代码。 其最初的[设计目标](https://webassembly.org/docs/high-level-goals/)与上述挑战很好地吻合，并且在其背后得到了可观的行业支持。 Wasm是在所有主要浏览器中本地运行的第四种标准语言（继HTML，CSS和JavaScript之后），于2019年12月成为[W3C Recommendation](https://www.w3.org/TR/wasm-core-1/)。这使我们有信心对其进行战略下注。

尽管WebAssembly最初是作为客户端技术而诞生的，但在服务器上使用它具有许多优点。 运行时是内存安全的，并且经过沙盒处理以确保安全。 有一个大型工具生态系统可用于以文本或二进制格式编译和调试Wasm。 [W3C](https://www.w3.org/)和[BytecodeAlliance](https://bytecodealliance.org/)已成为其他服务器端工作的活跃中枢。 例如，Wasm社区正在W3C标准化[“WebAssembly系统接口”（WASI）](https://hacks.mozilla.org/2019/03/standardizing-wasi-a-webassembly-system-interface/)，并提供一个示例实现，该示例为Wasm“程序”提供类似于OS的抽象。

## 为Envoy带来WebAssembly

[在过去的18个月中](https://github.com/envoyproxy/envoy/issues/4272)，我们一直与Envoy社区合作，将Wasm可扩展性纳入Envoy并在上游做出贡献。 我们很高兴地宣布，此特性在[Istio 1.5](https://istio.io/news/releases/1.5.x/announcing-1.5/)随附的Envoy版本中Alpha可用，其源代码包含在[envoy-wasm](https://github.com/envoyproxy/envoy-wasm/)开发分支中，并且正在努力将其合并到Envoy主干中。 该实现使用内置在Google高性能[V8引擎](https://v8.dev/)中的WebAssembly运行时。

除了底层的运行时，我们还构建了：

- 用于在代理中嵌入Wasm的通用应用程序二进制接口（ABI），这意味着编译后的扩展将在不同版本的Envoy或其他代理（如果他们选择实施ABI）下也可以使用

- 用于在[C++](https://github.com/proxy-wasm/proxy-wasm-cpp-sdk)，[Rust](https://github.com/proxy-wasm/proxy-wasm-rust-sdk)和[AssemblyScript](https://github.com/solo-io/proxy-runtime)中轻松进行扩展开发的SDK，还有更多后续更新

- 有关如何在Istio和独立的Envoy中进行部署的综合[示例和说明](https://docs.solo.io/web-assembly-hub/latest/tutorial_code/)

- 允许使用其他Wasm运行时的抽象，包括“空”运行时，该运行时将在本地把扩展编译进Envoy中，这对于测试和调试非常有用

使用Wasm扩展Envoy可以为我们带来几个主要好处：

- 敏捷性：可以使用Istio控制平面在运行时交付和重新加载扩展。 这样可以快速进行扩展的开发→测试→发布周期，而无需Envoy的重启。

- 标准发布：合并到主树中之后，Istio和其他人将能够使用Envoy的标准发布，而不是自定义版本。 这也将使Envoy社区有更多的时间将某些内置扩展迁移到该模型，从而减少其受支持的覆盖区域。

- 可靠性和隔离性：扩展部署在具有资源限制的沙箱中，这意味着它们现在可以崩溃或泄漏内存，而不会影响Envoy主进程。 CPU和内存使用率也可以受到限制。

- 安全性：沙盒具有用于与Envoy进行通信的明确定义的API，因此扩展只能访问并修改连接或请求中有限数量的属性。 此外，由于Envoy会协调此交互过程，因此可以隐藏或清除扩展中的敏感信息（例如，HTTP标头中的“Authorization”和“ Cookie”属性，或客户端的IP地址）。

- 灵活性：[可以将30多种编程语言编译为WebAssembly](https://github.com/appcypher/awesome-wasm-langs)，从而使来自各种背景（C++，Go，Rust，Java，TypeScript等）的开发人员都可以使用他们选择的语言来编写Envoy扩展。

“看到WASM在Envoy中的支持，我感到非常兴奋； 这是Envoy可扩展性的未来。 Envoy的WASM支持与社区驱动hub相结合，将在服务网格和API网关用例中释放出令人难以置信的网络领域创新。 我迫不及待地想看到社区的建设向前发展。” –Envoy创作者Matt Klein。

有关实现的技术细节，请关注即将在[Envoy博客](https://blog.envoyproxy.io/)上发布的帖子。

主机环境和扩展之间的[Proxy-Wasm](https://github.com/proxy-wasm)接口有意设计为与代理无关。 我们已将其内置到Envoy中，但旨在供其他代理供应商采用。 我们希望看到一个世界，您可以获取为Istio和Envoy编写的扩展，并在其他基础架构中运行它。 您很快就会听到更多有关此的信息。

## 在Istio中构建WebAssembly

为了提高性能，Istio将其几个扩展移动到了1.5版本中内置的Envoy构建中。 在执行此工作时，我们一直在测试以确保这些相同的扩展可以作为Proxy-Wasm模块进行编译和运行，而行为没有任何变化。 鉴于我们认为Wasm目前的支持为Alpha，因此我们还没有准备好将此设置设为默认设置。 然而，这使我们对通用方法以及已开发的主机环境ABI和SDK充满了信心。

我们还非常小心地确保Istio控制平面及其[Envoy配置API](https://istio.io/docs/reference/config/networking/envoy-filter/)可以支持Wasm。 我们有一些示例来说明如何执行几种常见的定制操作，例如定制标头解码或程序化路由，这是用户的常见要求。 当我们将支持转移到Beta时，您将看到说明在Istio中使用Wasm的最佳实践的文档。

最后，我们正在与许多编写了[Mixer适配器](https://istio.io/docs/reference/config/policy-and-telemetry/adapters/)的供应商合作，以帮助他们迁移到Wasm —如果这是前进的最佳途径。 Mixer将在将来的版本中转为社区项目，在那里它将仍可用于遗留用例。

## 开发者体验

没有出色的开发人员体验，再强大的工具也毫无用处。 Solo.io[最近宣布](https://www.solo.io/blog/an-extended-and-improved-webassembly-hub-to-helps-bring-the-power-of-webassembly-to-envoy-and-istio/)发布[WebAssembly Hub](https://webassemblyhub.io/)，这是一套用于构建，部署，共享和发现Envoy和Istio的Envoy Proxy Wasm扩展的工具和存储库。

WebAssembly Hub完全自动化了开发和部署Wasm扩展所需的许多步骤。 使用WebAssembly Hub工具，用户可以轻松地以任何受支持的语言将其代码编译为Wasm扩展。 然后，可以将这些扩展上传到Hub注册表，并使用单个命令将其部署和取消部署到Istio。

在后台，Hub会处理很多细节问题，例如引入正确的工具链，ABI版本验证，权限控制等。 该工作流程还通过自动化扩展部署，消除了跨Istio服务代理的配置更改带来的麻烦。 该工具可帮助用户和运维人员避免由于配置错误或版本不匹配而引起的意外行为。

WebAssembly Hub工具提供了功能强大的CLI和优雅且易于使用的图形用户界面。 WebAssembly Hub的一个重要目标是简化构建Wasm模块的体验，并为开发人员提供共享和发现有用扩展的协作场所。

请查看[入门指南](https://docs.solo.io/web-assembly-hub/latest/tutorial_code/)，以创建您的第一个Proxy-Wasm扩展。

## 下一步

除了努力发布Beta版，我们还致力于确保围绕Proxy-Wasm有一个持久的社区。 ABI需要最终确定，而将其转变为标准的工作将会在适当的标准机构内获得更广泛的反馈后完成。 向Envoy主干提供上游支持的工作仍在进行中。 我们还在为工具和WebAssembly Hub寻找合适的社区之家。

原文：[Redefining extensibility in proxies - introducing WebAssembly to Envoy and Istio](https://istio.io/blog/2020/wasm-announce/)
