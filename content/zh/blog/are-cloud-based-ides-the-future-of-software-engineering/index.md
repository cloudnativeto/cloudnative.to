---
title: "云端 IDE 是软件工程的未来吗？"
date: 2022-01-10T19:55:44+08:00
draft: false
image: "/images/blog/cloud-ide.jpg"
author: "[Divya Mohan](https://thenewstack.io/are-cloud-based-ides-the-future-of-software-engineering)"
translator: "[宋净超（Jimmy Song）](https://jimmysong.io)"
description: "本文主要对比了云端 IDE 的优缺点，就像云端 Office 一样，云端 IDE 迟早也会变得流行起来。"
tags: ["IDE"]
categories: ["其他"]
type: "post"
avatar: "/images/profile/default.jpg"
---

本文译自 [Are Cloud-Based IDEs the Future of Software Engineering](https://thenewstack.io/are-cloud-based-ides-the-future-of-software-engineering)，原文发布于 2022 年 1 月 7 日。

**编者按**

> 本文主要对比了云端 IDE 的优缺点，就像云端 Office 一样，云端 IDE 迟早也会变得流行起来。

传统上，[软件开发](https://thenewstack.io/category/development/)是（而且在很大程度上仍然是）在个人机器上使用集成开发环境（IDE）工具，如 VSCode、JetBrains、Eclipse 等完成。虽然这种 "离线" 开发的模式在早期运作得非常好，但人们很快就注意到，这种方法并非完美。

首先，合作起来很麻烦，因为写好的代码必须上传到网上供进一步审查。这样写出来的代码的可移植性也并不总是有保证，因为有各种各样的操作系统和其他限制条件，需要它来实现最佳的功能。

正如开发者和技术记者 [Owen Williams](https://char.gd/blog/author/owen) 去年 [在他的博客 Charged 上](https://char.gd/blog/2020/github-codespaces-means-your-computer-doesnt-matter-anymore)写道：“在设备之间同步你的文档和照片是微不足道的…… 这样你就可以在任何地方把它们调出来，但开发者工具仍然停留在过去 —— 每台笔记本电脑或 PC 都要单独配置，使你的环境设置得恰到好处。”

随着大流行期间越来越多的分布式团队和更多的敏捷工作方式，引入能够让开发人员在任何地方保持生产力的工具变得至关重要。这为什么会有 [Gitpod](https://thenewstack.io/gitpod-open-sources-a-holistic-ide/)、[GitHub Codespaces](https://thenewstack.io/this-week-in-programming-github-codespaces-portable-dev-environment/)、Replit 等基于云端 IDE 出现。

## 云端 IDE 的优点

这些新的 IDE 工具具有大量的功能，包括 GitHub 集成，支持多语言的编写和编译，提供了一个整体的环境，以提高开发人员的生产力。

在他们的其他优势中：

### 使用云端 IDE 无需担心配置

由于开发环境完全在浏览器上运行，因此不再需要梳理安装页面和弄清楚需要安装哪个软件包。

### 硬件的选择并不重要

基于云的集成开发环境消除了（好吧，几乎是！）开始进行网络开发的障碍。在任何支持现代网络浏览器都可以运行，你甚至不需要在不同的机器上从头开始重新配置一切。

### 在任何地方工作和协作都很容易

这些工具具有高度可定制的工作空间，可以在团队 / 个人层面上进行优化，它们不仅促进了更好的合作，而且完全消除了 “在我的机器上可以运行 " 这种太过普遍的情况。鉴于这些主要的优点，很明显基于云的 IDE 已经获得了发展势头。

但云端 IDE 也有一些局限性。

## 云端 IDE 的缺点

基于云的 IDE 的许多缺点都与扩展问题有关，因为这些工具仍然处于成熟的早期阶段。以下是早期采用者可能会遇到的一些关键问题。

### 性能可能是不平衡的

由于云上的资源是由需求不稳定的消费者共享的，因此肯定有机会出现性能不一致的情况，特别是在对网络延迟、容量或整体产品的故障造成问题的情况下，更是如此。

### 故障的来源可能很难识别和解决

当你不知道根本原因时，很难修复一个问题，总的来说，这可能会导致此类产品的早期采用者有一个令人沮丧的体验。

### 大项目可能更适合使用离线 IDE

到今天为止，已经观察到一些初期问题，用户[抱怨平均负载过高](https://github.com/gitpod-io/gitpod/issues/5992)。对于大型开发项目，所需的数据传输和处理量将是巨大的。虽然它可能不会扼杀基于云的 IDE 的资源，但由于其实用性，在这种情况下，离线替代方案肯定是更佳选择。

### 供应商锁定会限制工具的可用性

另一个需要考虑的方面是当涉及到基于云端 IDE 时，工具包的可用性。大量的工具可以在本地与 IDE 配对使用。但是，对于基于云端 IDE，开发者被限制在供应商提供的集成选择上，这对于那些需要更广泛工具包的人来说可能是限制性的。

### 云端 IDE 需要 WiFi

最后一点往往被忽略，基于云的 IDE 在与真正强大的桌面 IDE 相媲美之前还有很长的路要走，这些 IDE 允许降低对 WiFi 等外部因素的依赖性。即使正在实施各种变通办法，其可靠性水平也远远不能与桌面 IDE 提供的离线体验相比。

## 下一代集成开发环境

虽然基于桌面的集成开发环境仍是非常规范的，并将继续流行，但基于云的集成开发环境正在发展势头正猛。这些工具也在迅速发展，并可能越来越多地与基于桌面的 IDE 一起使用。

为了类比这一切可能的走向，请考虑微软 Office 的情况。

笔记本电脑 / 计算机刚问世时，我们只有微软 Office 作为任何形式的合作的默认套件。它的大部分工作都是离线的。但是，随着 Zoho Office 和 Google Workspace 等基于浏览器的协作工具将很大一部分工作带到了网上，我们现在看到它们比 MS Office 更重要的使用情况。

集成开发环境也会走同样的路。桌面 IDE 仍将被使用（就像现在使用的微软 Office 一样），但基于云的 IDE 将看到一些非常有趣的用例出现，并可能对这些特定用例变得更加重要。

在写这篇文章时，JetBrains 已经发布了其下一代 IDE——Fleet 的早期预览。由于更加关注分布式和协作式开发以及降低入门门槛，JetBrains 的解决方案承诺 Fleet 不会取代该公司现有的工具，而是旨在增加进一步的选择。

Gitpod 的社区经理 [Pauline Narvas](https://www.linkedin.com/in/pnarvas/) 告诉 The New Stack，她对未来的远程、云、开发环境有可能改善开发者的日常生活感到非常兴奋。

她说：“例如，有了标准化的开发者环境，我们可以轻松地加入新的工程师，你可以审查同事的代码，提出 Pull request，甚至为开源做出贡献，“她补充说，“不再有’它在我的机器上工作’的痛苦，也不再有因为依赖关系不工作而破坏预览环境。

“开发人员甚至不需要一台高规格的机器也能开始工作，“Narvas 说。“只要有一个可以联网的浏览器你就可以在任何地方编码！"。这真的是软件工程的未来，我迫不及待地想看看五年后的景象。”
