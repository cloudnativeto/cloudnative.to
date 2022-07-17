---
title: "在 Istio 中引入 Wasm 意味着什么？"
date: 2022-02-16T09:24:17+08:00
draft: false
authors: ["Peter Jausovec"]
translators: ["宋净超"]
summary: "本文回顾了 Istio 和 Envoy 中引入 Wasm 的历史并介绍了其重要性。"
tags: ["wasm","Tetrate","Istio","service mesh"]
categories: ["Istio"]
---

WasmPlugin API 最近被添加到 Istio 项目中，作为一种新改进的可扩展性机制。在 Tetrate，我们最近成功举办了一个名为 Istio Wasm workshop 的研讨会。[点击这里](https://tetrate-io.zoom.us/webinar/register/WN_OJG0hpo-RXSEJcH_SutlPQ)观看研讨会的录音，并加入 [Slack 上的对话](https://tetr8.io/tetrate-edu-slack)。

我们谈论了 WebAssembly 及其在 Istio 和 Envoy 项目中的重要性，并通过使用 [Proxy-Wasm Go SDK](https://github.com/tetratelabs/proxy-wasm-go-sdk) 和 [func-e](https://func-e.io/) 进行了多个演示。

我们在 Tetrate 关注 Istio 的可扩展性已经有很长一段时间了。Tetrate 的工程师 Takeshi Yoneda 和周礼赞在为此做出了巨大的贡献，我们非常高兴地看到 Istio 的可扩展性因此而得到了极大的改善。

在这篇博文中，我描述了在引入 WasmPlugin API 之前 Istio 和 Envoy 可扩展性的状况；目前大为改善的情况；以及将或多或少完成这条可扩展性改进弧线的变化，我们预计这些变化将在即将到来的版本中出现。

## Istio 和 Wasm 的历史

| Istio 1.4 之前                       | Istio 1.5                                                   | Istio 1.12 和未来         |
| ------------------------------------ | ----------------------------------------------------------- | ------------------------- |
| 用 C++ 扩展维护自己的 Envoy 代理构建 | 使用 EnvoyFilter 资源引入新的 Wasm 可扩展性模型（仍然复杂） | 引入专用的 WasmPlugin API |
| 使用 Mixer（效率低）                 | 仅支持本地或 HTTP 位置                                      | 包括对 OCI 注册表的支持   |

在 Istio 1.4（2019 年 11 月发布）之前，没有良好的机制来运行插件。当时，Istio 维护了他们自己的 Envoy 代理的分支，以运行自定义插件，如用 C++ 编写并与 Envoy 代理一起构建的 RBAC 和 JWT 过滤器。

当时，Istio 使用 Mixer 组件，在应用程序代码和基础设施后端之间提供一个层。使用 Mixer，人们能够执行授权策略，收集遥测数据，并管理配额。在这种模式下，Envoy 代理在向后端发出请求之前会调用 Mixer 组件，以执行任何前提条件检查 —— 例如，“服务 A 能否调用服务 B”，并在每个请求完成后再次调用 Mixer 以报告遥测数据。使用这种模式导致了资源的低效使用，也导致了延迟。

Envoy 的扩展性依赖于开发者知道如何用 C++ 编写扩展。此外，任何 C++ 扩展都必须用 Envoy 代理来构建。这就是当时 Istio 维护他们自己的 Envoy 代理构建的原因。

在这种模式下，人们必须用新的二进制文件替换整个现有的 Envoy 代理实例。

## Envoy 和 Wasm 的历史

Envoy 希望将依赖一个单一的可扩展性堆栈，使 Envoy 的发布与扩展生态系统脱钩，并使扩展开发者能够使用 C++ 以外的东西。在 Envoy 中加入这个功能，可以让 Istio（以及其他 Envoy 代理用户）随时推出新的特性和功能，而不需要单独维护 Envoy 的构建。在 Envoy 和 Istio 双方的强烈推动下，在 Envoy 中[支持](https://github.com/envoyproxy/envoy/issues/4272) WebAssembly 的[工作](https://github.com/envoyproxy/envoy/issues/4272)于 2018 年开始。

## 在 Envoy 中引入 WebAsssembly

在 Envoy 和 Istio 中所做的关于可扩展性的艰苦工作被纳入了 Istio 1.5 版本（2020 年）。Istio 1.5 版本包括一个使用 WebAssembly 的可扩展性新模型。随着 WebAssembly 的引入，不再需要运行单独的 Mixer 组件，这也导致了 Istio 部署的简化 —— 少了一件部署的东西，也少了一件需要担心的东西。

该版本包括通用的应用二进制接口（ABI）和 C++、Rust 和 AssemblyScript SDK。现有的 Istio 功能，如统计、元数据交换和其他功能也被实现为 WebAssembly 扩展。一个名为 EnvoyFilter 的资源被引入，以处理这些扩展的部署。

EnvoyFilter 资源是对 Envoy 配置的一个非常简单的抽象，它允许 Istio 操作者修改 Envoy 代理行为。然而，这种轻量级的抽象仍然意味着操作者必须熟悉 Envoy API 的细节以及如何有效地配置它们。

为了让 Envoy 代理加载和使用扩展，你必须把 Wasm 二进制文件放在与 Envoy 代理容器相同的 pod 内。运维人员可以选择指向一个本地文件（即集群内的文件，Envoy 代理容器可以访问）或提供一个 HTTP 位置，代理可以从那里下载扩展。

在 Istio 的后续版本中有多项改进，特别是 Istio 代理开始拦截 EnvoyFilter 资源并代表 Envoy 代理获取二进制文件的变化。

## Istio 1.12 和 WasmPlugin API

最近在 Istio 1.12 中引入了最重要的突破性功能。为 Wasm 插件引入了一个专门的 API，称为 WasmPlugin API，它使用一种新的方法从符合 OCI 的注册表中获取 Wasm 二进制文件。

新 API 的引入消除了使用 EnvoyFilter 来部署扩展的需要。扩展开发者现在可以使用一个名为 WasmPlugin 的资源来指定要部署插件的工作负载。对符合 OCI 标准的注册表的新支持允许开发人员使用现有的工具（例如，Docker）来构建包含其扩展的镜像，并将其推送到符合 OCI 标准的注册表。这允许以对待容器镜像的相同方式对待 Wasm 插件。例如，使用镜像标签和不同的存储库。

# 总结

WasmPlugin API 的工作仍在进行中。一些功能，包括对镜像拉取 secret 的支持，更好的镜像缓存支持，以及对 singleton 扩展的支持还不能使用。

要开始使用 Wasm，请[观看](https://tetrate-io.zoom.us/webinar/register/WN_OJG0hpo-RXSEJcH_SutlPQ) Wasm 研讨会的[录音](https://tetrate-io.zoom.us/webinar/register/WN_OJG0hpo-RXSEJcH_SutlPQ)并加入 [Slack 上的 Wasm 对话](https://tetr8.io/tetrate-edu-slack)。
