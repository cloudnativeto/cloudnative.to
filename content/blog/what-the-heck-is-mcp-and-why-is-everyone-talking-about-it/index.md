---
title: "MCP 到底是什么，为什么每个人都在谈论它？"
summary: "MCP 是一个开放标准，用来连接大模型与外部的数据和工具。"
authors: ["GitHub"]
translators: ["云原生社区"]
categories: ["AI"]
tags: ["AI","MCP","GitHub"]
draft: false
date: 2025-04-14T10:37:31+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/
---

本文译自：[What the heck is MCP and why is everyone talking about it?](https://github.blog/ai-and-ml/llms/what-the-heck-is-mcp-and-why-is-everyone-talking-about-it/)

在大模型（LLM）相关的讨论中，最近“**MCP（模型上下文协议，Model Context Protocol）**”这个词频频出现，几乎成了热门话题。但真正讲清楚它是什么的，反而不多。

**一句话总结：MCP 是一个开放标准，用来连接大模型与外部的数据和工具。**

本文带你快速了解它的来龙去脉。

## LLM 的上下文难题

大模型擅长生成内容，但一旦你问它一些训练数据之外的内容，它要么**胡诌**（幻觉），要么说“我不知道”。

这时，我们就需要在 Prompt 里提供“上下文信息”——无论是你的代码仓库、文档、数据源还是配置项，这些上下文对构建真正有用的 AI agent 来说是必不可少的。

目前主流做法包括：

- 在 Prompt 中尽可能精细地嵌入上下文
- 借助额外工具注入上下文，比如 GitHub Copilot 的 [@workspace](https://code.visualstudio.com/docs/copilot/workspace-context)，会把代码库中的信息传递给 LLM

这种方式虽然很酷，但**实现复杂、跨 API 和服务集成时更是困难重重**。

## 解决方案：MCP（Model Context Protocol）

2023 年 11 月，Anthropic [开源了 MCP 协议](https://www.anthropic.com/news/model-context-protocol)，它是一个用于连接大模型和工具的数据交换标准。

MCP 就像“你睡觉的样子”——起初慢慢发展，后来突然爆火。随着越来越多的组织采纳 MCP，它的价值也在迅速上升。

✨ **MCP 是模型无关的（model-agnostic）**，意味着任何厂商、平台或个人开发者都可以实现自己的 MCP 兼容系统。这种开放性让它在 AI 工具生态中大受欢迎。

从云原生社区的角度看，它类似于我们熟悉的 [Language Server Protocol（LSP）](https://microsoft.github.io/language-server-protocol/)。LSP 诞生于 2016 年，标准化了代码编辑器和语言之间的通信方式，使编辑器对语言的支持变得“开箱即用”。

如今，**MCP 正在复刻这一成功路径，只不过对象变成了 AI 工具链。**

## MCP 意味着什么？

它让：

- 大厂 🏢
- 初创团队 🚀
- 独立开发者 👩‍💻

都能在自己的系统中**快速集成上下文能力**，从而构建功能更强大的 AI 应用。

**它降低了 AI 工具链的集成门槛，提升了开发体验和用户体验**，在开放标准领域，MCP 有望成为“新一代基础设施”。

## GitHub 正在行动

GitHub 不只是聊 MCP，我们也在贡献！

我们最近发布了一个官方开源项目：[GitHub MCP Server](https://github.com/github/github-mcp-server)，它可以与 GitHub API 无缝集成，开发者可以基于它构建自动化和上下文增强工具。

📢 查看 [官方公告](https://github.blog/changelog/2025-04-04-github-mcp-server-public-preview/)，或加入 [GitHub 社区讨论](https://github.com/orgs/community/discussions/categories/announcements)。

## 如何参与 MCP 社区？

非常欢迎你加入 MCP 社区并贡献力量，下面是一些推荐资源：

- [MCP 官方文档](https://modelcontextprotocol.io/introduction)
- [MCP 示例实现仓库](https://github.com/modelcontextprotocol/servers)
- [MCP 协议规范](https://spec.modelcontextprotocol.io/)
- [LSP 背景资料](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide#why-language-server)

当然，也别忘了：MCP 已可与 Agent 模式结合使用。是时候动手打造你的 AI 工具链了！

## 🚀 云原生视角总结

MCP 是一个符合云原生价值观的协议标准：

- **开放**：人人可用，人人可贡献
- **可组合**：可以集成到任何 AI 系统
- **可移植**：不绑定任何平台或模型
- **生态驱动**：标准的普及带动工具和平台共同进化

它的崛起像当年的 Kubernetes、gRPC、LSP —— 正在为 AI 时代构建“可插拔”基础设施。
