---
title: "2023 年 WebAssembly 技术五大趋势预测"
date: 2023-01-09T11:00:00+08:00
draft: false
authors: ["Matt Butcher"]
summary: "2023 年将是 Wasm 年。"
tags: ["WebAssembly"]
categories: ["WebAssembly"]
translators: ["宋净超"]
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://thenewstack.io/webassembly-5-predictions-for-2023/
---

2022 年，WebAssembly（通常缩写为 Wasm）成为了[焦点](https://thenewstack.io/yes-webassembly-can-replace-kubernetes/)。新的 Wasm 初创企业出现。老牌公司宣布支持 Wasm。Bytecode Alliance 发布了许多 Wasm 标准。Cloud Native Computing Foundation 举办了两次 WasmDay 活动。而其中最大的 Wasm 用户之一 Figma 被 Adobe 以惊人的 200 亿美元的价格收购。

Wasm 是一种二进制格式。许多不同的语言都可以编译为相同的格式，并且该二进制格式可以在大量操作系统和体系结构上运行。Java 和 .NET 在这方面也很相似，但是 Wasm 有一个重要的区别：Wasm 运行时不信任执行的二进制文件。

Wasm 应用程序被隔离在沙盒中，只能访问用户明确允许的资源（如文件或环境变量）。Wasm 还有许多其他理想的特性（例如非常出色的性能），但正是它的安全模型使 Wasm 在广泛的环境中使用，从浏览器到边缘和 IoT，甚至到云端。

如果要在 2022 年发现 Wasm 趋势，那就是 Wasm 现在在浏览器之外也同样成功。这一趋势是 2023 年的基础。随着 Wasm 出现在嵌入式设备到大数据中心的各个地方，2023 年将成为 Wasm 的一年。以下是我对 2023 Wasm 生态系统的五个预测。

## 1. 组件模型将是分水岭时刻

标准很少是一个生态系统中最令人兴奋的部分。而且，随着“组件模型”这样的名字，激起兴奋感确实是一项艰巨的任务。但是，在这个乏味的名字背后是 Wasm 为软件世界带来的最重要的创新。

组件模型描述了 Wasm 二进制文件之间如何交互的方式。更具体地说，两个组件可以告诉对方它们提供的服务以及需要履行的期望。然后，Wasm 模块可以利用彼此的能力。这为软件开发人员提供了一种新的建立应用程序的方式。开发人员可以声明应用程序所需的组件（或者更抽象地说，应用程序所需的功能），然后 Wasm 运行时可以代表用户组装正确的组件集合。

Wasm 最多产的贡献者之一 [Dan Gohman](https://github.com/sunfishcode) 写了一篇很好的[概述文章](https://blog.sunfishcode.online/what-is-a-wasm-component/)。Fermyon 的 [Joel Dice](https://github.com/dicej) 则为那些对内部更感兴趣的人写了一篇[技术概述](https://www.fermyon.com/blog/webassembly-component-model)。

组件模型正在迅速成熟，已经出现了参考实现。2023 年将是组件模型开始重新定义我们如何编写软件的一年。

## 2. Serverless 将是 Wasm 的最佳应用场景

Serverless 的承诺已经在过去几年中显而易见。AWS Lambda 让我们看到了一种新的、简单的编程模型 —— 函数即服务（FaaS）。然而，尽管 Serverless 的概念的势头正在建立，但是底层技术的运行成本仍然很高。这种成本已经转嫁给用户。此外，虽然 FaaS 应用的启动速度比容器快，但仍然满足不了当前对于网络性能的期望。还有提升速度的空间。

Wasm [改变了](https://www.fermyon.com/blog/serverless-reckoning) Serverless 的潜力。几乎立即的启动时间、小的二进制大小和平台和体系结构的中立性，使得 Wasm 二进制文件可以使用比运行今天的 Serverless 基础设施所需的资源少得多的资源来执行。

如果全球经济正在进入一个不确定的时期，那么知道 Wasm 可以帮助我们控制成本，同时还能推进开发人员喜欢的 Serverless 函数模型，这是件好事。Wasm 的更快的启动时间和适度的资源消耗需要的计算能力比基于容器的系统少得多，并且比 Lambda 等 FaaS 系统更便宜。

这种对 Wasm 可以改变 Serverless 环境的认识，促使 Fermyon 创建了 [Spin](https://developer.fermyon.com/spin/index)。Spin 是一个面向开发者的工具，用于引导、构建、测试和部署 Serverless 功能。Spin 的核心是其基于 Wasm 运行时。它是开源的，已经得到 [Fermyon Cloud](https://www.fermyon.com/cloud) 和微软 Azure 的 AKS 的支持，2023 年还会有更多的支持。

小、快、便宜、更好。这就是 Wasm 在 2023 年为 Serverless 世界带来的组合。

## 3. Wasm 应用程序将存储在 DockerHub 和容器注册表中

包管理——这是从编程语言到操作系统再到像 Kubernetes 这样的集群编排器的必要功能。每次我们发明一项新技术时，我们似乎注定要（重新）发明一个管理该技术资产的系统。

早在 2022 年初，我们看到了几种管理 Wasm 对象的方法。没有一种方法流行起来。一小群工程师一直坚持把 OCI Registry（也称为 Docker Registry）作为存储 Wasm 的系统。但事实是，OCI Registry 格式不支持非容器工件。它是用来存储 Docker 镜像的。

然后 OCI Registries 的一项重大变化改变了景观。OCI（[Open Container Initiative](https://thenewstack.io/open-container-initiative-creates-a-distribution-specification-for-registries/)）是一个小型标准机构，致力于管理围绕 OCI 容器（或我们过去所称的 Docker 容器）的标准。OCI 定义了容器格式、安全模型和运行时。它还定义了如何在注册表和客户端之间传输容器映像。

在 2022 年底，OCI Registries 工作组宣布了一种官方方法来存储除容器映像之外的其他内容。这可能包括 Helm 图表、照片或（你猜到了）Wasm 应用程序。这项新功能被称为“工件存储”。

当 DockerHub [宣布支持](https://www.docker.com/blog/announcing-docker-hub-oci-artifacts-support/)这一新的工件存储规范时，Wasm 生态系统中传遍了信号：我们可以简单地将我们的应用程序存储在像 DockerHub 这样的 OCI 注册表中，而不是重新发明轮子。Wasm 生态系统必须进行新的工作，使这成为现实，但这项工作正在进行中。2023 年将是 Wasm 应用程序在 OCI 注册表中找到家的一年。

## 4. 所有大型编程语言都将支持 Wasm

语言支持是 Wasm 成功的关键因素。随着能够将 Wasm 编译成 Wasm 的新语言的出现，新的开发人员群体可以获得 Wasm 的优势。几乎所有排名前 20 的编程语言都在[添加 Wasm 支持](https://www.fermyon.com/wasm-languages/webassembly-language-support)。

在 2022 年，我们看到 Wasm 取得了三个巨大的进步。[Python](https://pythondev.readthedocs.io/wasm.html) 添加了支持。然后是 [Ruby](https://www.ruby-lang.org/en/news/2022/12/06/ruby-3-2-0-rc1-released/)。10 月，一直支持浏览器内的 Wasm 的 .NET 增加了更深入的 Wasm 支持，使其[能够在浏览器之外运行](https://www.fermyon.com/blog/dotnet-wasi)。

另外三种语言在今年也取得了一些进展，但 2023 年将是这些语言可以使用的一年。这三种语言是 Kotlin、Dart 和当然是世界上最流行的编程语言：JavaScript。

Kotlin 和 Dart 社区都一直积极参与构建 Wasm 编译目标。但是两者都在等待 Wasm 的一项标准成熟 —— 一项描述垃圾收集的标准，这是语言运行时中的一项功能，允许内存在程序执行时清理。我们的预测是 [Wasm-GC 建议书](https://github.com/WebAssembly/gc/blob/main/proposals/gc/Overview.md)将在 2023 年初可用并支持，因此 Kotlin 和 Dart 将很快发布 Wasm 编译器。

我们的最后一种语言非常重要，因此它值得特别预测。

## 5. JavaScript 将成为最受欢迎的 Wasm 语言

JavaScript 与 Wasm 的关系最为复杂。在最初的设想中，Wasm 与浏览器中的 JavaScript 交互。事实上，Wasm 最初的承诺是，它将延伸浏览器语言支持超出 JavaScript。

但实际使用情况会使假设渐渐淡化。

由于 Wasm 在浏览器外，许多开发人员希望能够在任何可以运行 Wasm 的地方运行他们的 JavaScript 代码。最好的方法是使 JavaScript 在 Wasm 运行时内部运行（而不是浏览器中的下方）。在 2022 年，我们看到几个新的 Wasm 项目专注于将 JS 带入新的运行时。这些项目中的大多数使用了一个叫 [QuickJS](https://bellard.org/quickjs/) 的优秀开源项目。

QuickJS 有许多优点，其中最重要的是它完全符合最新的 JavaScript 标准。但它不是设计成最快或最强大的 JavaScript 引擎的。它非常易于嵌入，许多早期的 Wasm 项目已经找到了将解释器编译到 Wasm 并在 Wasm 运行时内部运行 JavaScript 的方法。

但是有一个主流的 JavaScript 运行时正在加入竞争。Mozilla 的 [SpiderMonkey](https://spidermonkey.dev/) 引擎以其性能和健壮性而闻名，正在进入 Wasm 世界。它最著名的用途是在 Mozilla Firefox 浏览器中使用，但也可以在浏览器外使用。作为一个可以不断优化执行的脚本的运行时，SpiderMonkey 引擎将是 Wasm 世界中最快的 JS 引擎。早期数据表明，由于在这种环境中可以进行的优化，JavaScript 在 Wasm 版本的 SpiderMonkey 中运行的速度可能[比浏览器中的 JavaScript 快 13 倍](https://bytecodealliance.org/articles/making-javascript-run-fast-on-webassembly)。

JavaScript 是世界上最受欢迎的编程语言。随着 QuickJS 和 SpiderMonkey 等 Wasm 运行时的出现，Wasm 的潜力突然对巨大的开发人员社区开放。是的，C 是第一种支持 Wasm 的编程语言。是的，Rust 有相当大的红利。当然，我们也看到 Python 和 Ruby 在行动。但 JavaScript 将像火箭一样冲入 Wasm 宇宙。

## 结论：2023 年是 Wasm 年

我对 Wasm 生态系统内将发生什么做出了五个大胆的预测。随着这些里程碑的实现，Wasm 将作为浏览器以外的通用技术变得更加有用。在文章开头，我提出 2023 年有望成为 Wasm 的一年。考虑到这五个预测，很容易看出为什么：新功能、巧妙的用例、与 Docker Hub 的集成以及广泛的语言支持相结合，使得这种对开发人员友好的技术具有巨大的前途。

## 关于作者

Matt Butcher，他是 WebAssembly Cloud 公司 Fermyon 的联合创始人和 CEO。Matt 是 Helm、Brigade、CNAB、OAM、Glide 和 Krustlet 的原始创建者之一。他撰写和合作撰写了许多书籍，包括《学习 Helm》和《Go in Practice》。他是 "Kubernetes 插图儿童指南"系列的共同创造者。目前，他主要从事 WebAssembly 项目，如 Spin、Fermyon Cloud 和 Bartholomew。他拥有哲学博士学位，住在科罗拉多州。