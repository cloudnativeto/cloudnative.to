---
title: "将 AI 应用于 WebAssembly 还为时过早吗？"
summary: "Fermyon Technologies 认为，将 AI 应用于 WebAssembly 并不为时过早。WebAssembly 为在服务器上运行推理提供了坚实的基础，而且在许多不同的环境中，如浏览器和物联网设备等，通过将这些工作负载移动到终端用户设备上，可以消除延迟并避免将数据发送到集中式服务器，同时能够在边缘发现的多种异构设备上运行。Fermyon Serverless AI 通过提供超过 100 倍于其他按需 AI 基础设施服务的亚秒冷启动时间来解决了企业级 AI 应用程序成本高的问题。这是一种共生关系。"
authors: ["TheNewStack"]
translators: ["宋净超"]
categories: ["WebAssembly"]
tags: ["AI","WebAssembly"]
date: 2023-09-07T21:03:00+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://thenewstack.io/is-it-too-early-to-leverage-ai-for-webassembly/
---

本文译自：<https://thenewstack.io/is-it-too-early-to-leverage-ai-for-webassembly/>

摘要：Fermyon Technologies 认为，将 AI 应用于 WebAssembly 并不为时过早。WebAssembly 为在服务器上运行推理提供了坚实的基础，而且在许多不同的环境中，如浏览器和物联网设备等，通过将这些工作负载移动到终端用户设备上，可以消除延迟并避免将数据发送到集中式服务器，同时能够在边缘发现的多种异构设备上运行。Fermyon Serverless AI 通过提供超过 100 倍于其他按需 AI 基础设施服务的亚秒冷启动时间来解决了企业级 AI 应用程序成本高的问题。这是一种共生关系。

---

人工智能及其在 IT、软件开发和运营方面的应用刚开始发挥作用，预示着人类角色将如何在近期和长期内演变，特别是在较小的规模上，WebAssembly 代表着一种正在引起重大关注的技术，同时证明了其可行性，但成功的商业模型尚未实现，主要是由于最终端点的缺乏标准化。与此同时，至少有一家供应商 Fermyon 认为，在这个阶段应用 AI 于 WebAssembly 并不为时过早。

那么，AI 如何潜在地帮助 Wasm 的开发和采用，这是否为时过早？正如 VMware CTO 办公室的高级工程师 Angel M De Miguel Meana 所指出的那样，自从 ChatGPT 推出以来，AI 生态系统已经发生了巨大的变化，WebAssembly 为在服务器上运行推理提供了坚实的基础，而且在许多不同的环境中，如浏览器和物联网设备等，通过将这些工作负载移动到终端用户设备上，可以消除延迟并避免将数据发送到集中式服务器，同时能够在边缘发现的多种异构设备上运行。由于 Wasm 生态系统仍在兴起，因此在早期阶段集成 AI 将有助于推动新的和现有的与 AI 相关的标准。这是一种共生关系。

## 完美的匹配

Fermyon Technologies 的联合创始人兼首席执行官 Matt Butcher 告诉 The New Stack：“我们成立 Fermyon 的目标是打造下一代无服务器平台。AI 显然是这一下一代的一部分。在我们的行业中，我们经常看到革命性的技术一起成长：Java 和 Web、云和微服务、Docker 和 Kubernetes。WebAssembly 和 AI 是一对完美的组合。我看到它们一起成长（并变老）。”

“烘焙”AI 模型，如 LLM（大型语言模型）或转换器，到 WebAssembly 运行时中，是加速采用 WebAssembly 的逻辑下一步，Enterprise Management Associates (EMA) 的分析师 Torsten Volk 告诉 The New Stack。与调用诸如通过 API 的数据库服务类似，编译 WebAssembly 应用程序（二进制文件）可以将其 API 请求发送到 WebAssembly 运行时，该运行时将该调用中继到 AI 模型并将模型响应返回给发起者，Volk 说。

“一旦我们有一个提供开发人员一个标准 API 的通用组件模型（CCM），访问数据库、AI 模型、GPU、消息传递、身份验证等，这些 API 请求将变得非常强大。CCM 将让开发人员编写相同的代码，在数据中心、云甚至边缘位置的任何类型的服务器上与 AI 模型（例如 GPT 或 Llama）进行通信，只要该服务器拥有足够的硬件资源可用，”Volk 说。“这一切都归结为关键问题，即产业参与者何时会就 CCM 达成一致。同时，WebAssembly 云（如 Fermyon）可以利用 WebAssembly 使 AI 模型在其自己的云基础设施中具有可移植性和可扩展性，无需 CCM，并将一些节省成本传递给客户。”

## 解决问题

同时，Fermyon 认为，在这个阶段应用 AI 于 WebAssembly 并不为时过早。正如 Butcher 所指出的那样，负责在 LLM（如 LLaMA2）上构建和运行企业 AI 应用程序的开发人员面临着 100 倍计算成本的挑战，即每小时 32 美元及以上的 GPU 访问费用。或者，他们可以使用按需服务，但是启动时间却非常慢。这使得以实惠的方式提供企业级 AI 应用程序变得不切实际。

Fermyon Serverless AI 通过提供超过 100 倍于其他按需 AI 基础设施服务的亚秒冷启动时间来解决了这个问题，Butcher 说。这一“突破”得益于驱动 Fermyon Cloud 的服务器 WebAssembly 技术，该技术被架构为亚毫秒冷启动和高容量时间分片的计算实例，已被证明可以将计算密度提高 30 倍。“将此运行时配置文件扩展到 GPU 将使 Fermyon Cloud 成为最快的 AI 推理基础设施服务，”Butcher 说。

Volk 说，这样的推理服务“非常有趣”，因为典型的 WebAssembly 应用程序仅包含几兆字节，而 AI 模型的大小要大得多。这意味着它们不会像传统的 WebAssembly 应用程序那样启动得那么快。“我认为 Fermyon 已经想出了如何使用时间分片为 WebAssembly 应用程序提供 GPU 访问的方法，以便所有这些应用程序都可以通过其 WebAssembly 运行时保留一些时间片来获取所需的 GPU 资源”，Volk 说。“这意味着很多应用程序可以共享一小部分昂贵的 GPU，以按需为其用户提供服务。这有点像分时共享，但不需要强制参加午餐时间的演示。”

使用 Spin 入门。

!https://prod-files-secure.s3.us-west-2.amazonaws.com/86575c70-5cc9-4b3e-bee7-d1bb14ba20e3/6bf78916-e34c-4051-86a7-52145cdc372a/4a27b287-capture-decran-2023-09-05-192118.png

那么，用户如何与 Serverless AI 交互？Fermyon 的 Serverless AI 没有 REST API 或外部服务，它仅构建在 Fermyon 的 Spin 本地和 Fermyon Cloud 中，Butcher 解释说。“在您的代码的任何位置，您都可以将提示传递到 Serverless AI 并获得响应。在这个第一个测试版中，我们包括 LLaMa2 的聊天模型和最近宣布的 Code Llama 代码生成模型，”Butcher 说。“因此，无论您是在总结文本、实现自己的聊天机器人还是编写后端代码生成器，Serverless AI 都可以满足您的需求。我们的目标是使 AI 变得简单，使开发人员可以立即开始利用它来构建新的令人瞩目的无服务器应用程序。”

## 重要意义

使用 WebAssembly 来运行工作负载，可以使用 Fermyon Serverless AI 将“GPU 的一小部分”分配给用户应用程序，以“及时”执行 AI 操作，Fermyon CTO 和联合创始人 Radu Matei 在一篇博客文章中写道。 “当操作完成时，我们将该 GPU 的一小部分分配给队列中的另一个应用程序，”Matei 写道。“由于 Fermyon Cloud 中的启动时间为毫秒级，因此我们可以在分配给 GPU 的用户应用程序之间快速切换。如果所有 GPU 分数都在忙于计算数据，我们将在下一个可用的应用程序之前将传入的应用程序排队。”

这有两个重大的影响，Matei 写道。首先，用户不必等待虚拟机或容器启动并附加到 GPU 上。此外，“我们可以实现更高的资源利用率和效率，”Matei 写道。

Fermyon 传达的 Serverless AI 的具体特点包括：

- 这是一款开发人员工具和托管服务，专为使用开源 LLM 进行 AI 推理的无服务器应用程序而设计。
- 由于我们的核心 WebAssembly 技术，我们的冷启动时间比竞争对手快 100 倍，从几分钟缩短到不到一秒。这使我们能够在相同的时间内（并且使用相同的硬件）执行数百个应用程序（二进制文件），而今天的服务用于运行一个。
- 我们为使用 Spin 构建和运行 AI 应用程序提供了本地开发体验，然后将其部署到 Fermyon Cloud 中，以高性能的方式以其他解决方案的一小部分成本提供服务。
- Fermyon Cloud 使用 AI 级别的 GPU 处理每个请求。由于我们的快速启动和高效的时间共享，我们可以在数百个应用程序之间共享单个 GPU。
- 我们正在推出免费的私人测试版。

## 大希望

然而，在 Wasm 和 AI 同时达到潜力之前，还有很长的路要走。在 WasmCon 2023 上，Second State 的 CEO 兼联合创始人 Michael Yuan 和 Wasm 的运行时项目以及 WasmEdge 的讨论了一些正在进行的工作。他在与 De Miguel Meana 的谈话中涵盖了这个话题，“开始使用 AI 和 WebAssembly”在 WasmCon 2023 上。

“在这个领域（AI 和 Wasm）需要做很多生态系统工作。例如，仅拥有推理是不够的，”Yuan 说。“现在的百万美元问题是，当您拥有图像和文本时，如何将其转换为一系列数字，然后在推理之后如何将这些数字转换回可用的格式？”

预处理和后处理是 Python 今天最大的优势之一，这得益于为这些任务提供的众多库，Yuan 说。将这些预处理和后处理函数合并到 Rust 函数中将是有益的，但需要社区更多的努力来支持其他模块。“这个生态系统有很大的增长潜力，”Yuan 说。
