---
title: "Istio 1.7 发布——进击的追风少年"
date: 2020-08-25T11:00:00+08:00
draft: false
authors: ["马若飞"]
summary: "从用户角度出发，深度解读 Istio 1.7 版本。"
tags: ["istio"]
categories: ["service mesh"]
keywords: ["istio"]
---

## 引言

2020 年 8 月 21 日，Istio 发布了 1.7 版本。除了介绍新版本的主要更新内容外，本文会重点分析 Istio 团队在产品更新策略上的激进态度和举措。是稳扎稳打做好向后兼容，带给用户所承诺的易用性；还是快刀斩乱麻，做进击的追风少年，且听笔者慢慢道来。

## 如约而至——Istio 1.7.0 发布

就在几天前，Istio 发布了 1.7 版本，和 1.6 版本的发布时间正好间隔三个月，完美的实现了季度发布的诺言。本次发布的口号是 “伟大的 Istio 社区（Istio’s great community）”，因为有来自 40 多个公司的 200 多个开发者做出了贡献。Istio 官方是这样描述的：

> 正是因为有如此令人惊羡（amazing）的社区，才让 Istio 能够在每个季度有如此多的改进。

Istio 团队已经从上个月倒卖商标的麻烦中走了出来，看上去是想通过强调 `Istio's great community` 这个理念来抚平社区开发者受伤的心灵？笔者认为，作为开发者和用户不必太在意 Google 的商业行为，至少现阶段 Istio 还在以开源的身份持续演进，还能为我所用，这就足够了。

1.7 版本中重要的更新主要有以下四个方面。

### 安全增强

- 确认了使用安全发现服务（SDS）作为证书分发的优势，并把它作为一个重要的安全最佳实践。现在这一特性也被使用在出口网关上。
- 信任域验证除了支持 HTTP，现在也可以验证 TCP 流量了，并且还支持在 MeshConfig 中进行配置，提供了更多灵活性。
- 可以使用 [ECC](https://en.wikipedia.org/wiki/Elliptic-curve_cryptography) 进行 CA 通信，提高了安全性和效率。
- 网关默认使用非根（non-root）用户部署，这主要是基于一条最佳实践：不要让运行的进程有多于它所需的权限，这会导致不必要的混淆。

### 提升易用性

在易用性方面主要的改进依然是对 `istioctl` 命令行工具的增强：

- analysis 支持
  - 对可能不安全的 `DestinationRule` 配置发出警告
  - 对使用废弃的 Mixer 资源发出警告
- 可以使用 `ISTIOCONFIG` 设置自定义配置
- 使用助记符来标识端口号
- 添加了 `istioctl x uninstall` 来方便卸载 Istio

### 生产运维改进

在运维方面也有些许改进，例如：

- 可以支持让 Sidecar 启动后才启动你的应用容器。如果你的应用需要在启动时通过 Sidecar 代理来访问资源，这项修改可以让部署变的更稳定（避免因为 Sidecar 没启动而应用访问不到资源的情况）。
- Istio Operator 作为最佳安装方式。Operator 在之前的版本就已经提供了，看上去 Istio 想主推 Operator 以替代其他的安装形式。但笔者必须要吐槽一下官方发布文档对这一条的描述：

> The [Istio Operator](https://istio.io/latest/docs/setup/install/operator/) is a great way to install Istio, as it automates a fair amount of toil. Canary control plane deployments are also important; they allow ultra-safe upgrades of Istio. Unfortunately, you couldn’t use them together - [until now](https://istio.io/latest/docs/setup/upgrade/#canary-upgrades).

吹了一大堆，其实翻译成人话就是：Operator 目前还不支持金丝雀更新。真是佩服这段文案编写者拐弯抹角的能力。

- 提供了 istio-agent 的指标，可以观察它的运行情况
- Prometheus 指标收集方面的改进

### VM 安全性

持续对虚拟机相关功能的开发是本年度的重点，这是 Istio 多次强调的。这是因为目前客户应用部署环境的复杂性和混合性，VM 依然是一种主要的部署选择。和一些托管的竞品（比如 AWS APP Mesh ）相比，Istio 缺失了这方面的能力，使得这些客户不得不观望而无法落地。对 VM 的支持就成为了重中之重，这也是商业上的考量。

然而本次更新没有太多的重量级功能发布，只是做了小的改进，且还在 alpha 阶段。比如为 VM 也增加了安全特性，支持证书自动轮转；`istioctl` 现在可以验证 VM 的代理状态；增加了 RPM 安装包等。

## 温柔一刀——升级的伤痛

客观的讲，以上官方的发布文档大部分内容都不痛不痒，对使用层面的用户影响不大。而真正和用户息息相关是安装和升级的变化。Istio 团队并没有在发布首页强调这一点，这引起了笔者的强烈不适并严重怀疑 Istio 有刻意规避问题的嫌疑。我们先来看笔者认为最重要的一条变更：

### 过分严格的平台版本限制

> Require Kubernetes 1.16+
>
> Kubernetes 1.16+ is now required for installation.

这是 Istio 官方第一次在新版本的 Release Note 中明确的说明了 Kubernetes 的版本限制问题。尽管以前老版本的 Istio 也会对平台版本有要求，但通常是这样的口吻：

> Istio 1.5 has been tested with these Kubernetes releases: 1.14, 1.15, 1.16.

这种描述隐含的意思就是：我们在这几个版本测试过兼容性，但我们并没有说 Istio 不兼容其他版本，可能、也许、大概是兼容的，我们只是没有测试过而已。而这一次是描述是 “required”，请仔细体会这两种说法的区别。

为了验证 1.7 真实的兼容性（ required 只是骇人听闻？），笔者做了一次安装测试，测试环境为 Docker 桌面版内置的 Kubernetes，版本 v1.15.5。

首先，使用预检命令验证集群环境是否合法（新版本已经取消了 `istioctl verify-install` 命令）

```bash
$ bin/istioctl x precheck
Error: 1 error occurred:
 * The Kubernetes API version: v1.15.5 is lower than the minimum version: 1.16
```

果然，预检没有通过，出现了版本过低的错误。笔者忽略预检结果，尝试强行安装，想看看预检是否也只是吓唬人而已：

```bash
$ bin/istioctl install
This will install the default Istio profile into the cluster. Proceed? (y/N) y
The Kubernetes version v1.15.5 is not supported by Istio 1.7.0. The minimum supported Kubernetes version is 1.16.
Proceeding with the installation, but you might experience problems. See https://istio.io/latest/docs/setup/platform-setup/ for a list of supported versions.
✘ Istio core encountered an error: failed to wait for resource: failed to verify CRD creation: the server could not find the requested resource
```

验证结果被现实啪啪打脸。除了对版本限制的说明，Istio 还非常严谨的告知安装过程会继续，但你可能会遇到各种问题。果然，在 Istio core 的安装步骤中就报了错，安装过程被卡住无法继续进行。看来这一次 Istio 的 required 是来真的了。

为什么说这个强制性的版本限制会对用户造成最大的困扰？其根本原因就是当前绝大部分企业和用户所使用的 Kubernetes 根本没有达到 1.16+ 版本，大部分都是基于 1.14、1.12，甚至更低。目前两大云厂商的 Kubernetes 服务（AWS EKS 和 GCloud GKE）也都是兼容 1.14+，这也能从一个侧面说明有一大批老用户很可能都使用的是 1.14 版本。然而 Istio 并没有遵循这一规则，这等于直接将很大一部分用户踢出了场外，Istio 1.7 不带你们玩了。

另一个潜在的问题是为想要升级的用户带来了极大的困惑。举一个例子：某企业的运维团队正在打算将 1.14 版本的 Kubernetes 升级到 1.16，而架构团队正打算将安装在其上的 Istio 1.2 升级到 1.7。这个团队所面临的问题是，要升级到 Istio 1.7 必须先升级 Kubernetes 到 1.16；但是一旦升级了 1.16，原本的 1.2 版本很可能有兼容问题，因为 Istio 1.2 宣称只在 Kubernetes 1.12~1.14 测试过。Istio 1.7 过分严格的的平台版本限制给了这些用户致命一刀，升级之路充满荆棘。他们只能退而求其次选择老版本进行升级。

从 1.5 版本开始，Istio 一方面不断的强调易用性和用户体验，一方面又武断的放弃向下兼容，将大量用户拒之门外。其自相矛盾的行为令人匪夷所思。

### 资源版本号的变更

这一问题出现在 Change Note 安装部分的一条，很可能成为升级用户新的痛点。

> Upgraded the CRD and Webhook versions to v1. ([Issue #18771](https://github.com/istio/istio/issues/18771)),([Issue #18838](https://github.com/istio/istio/issues/18838))

从 Issue 可以看出，因为 Kubernetes 在 1.16 中将 webhook 的 API 版本改为 v1，并会在 1.19 版本中删除老的 v1beta 版本。这一激进行为导致 Istio 不得不在自己的 1.8 版本之前完成对应的迁移。笔者在 Istio 官方 Slack 中也验证了这一问题：

> Yes this is a hard requirement. Most specifically CRDs, and other apis use APIs that were promoted to v1 in 1.16 are being used.

Istio 开发团队也在 Issue 中抱怨对方太激进（aggressive），留给他们的开发周期太短（pretty tight window），有很多工作要做（probably a lot of work），一副巧妇难为无米之炊的委屈样。笔者不由得感叹：本是同门师兄弟，相煎太急！

而对于用户而言，意味着你不得不将自己的 mesh 配置文件的版本号进行更新，如果集群比较庞大，很可能有不少的工作量（主要是测试、验证方面）。你很可能还需要通过金丝雀升级的方式进行，因为无论是先升级 Istio，还是先修改配置，都可能出现兼容问题（说好的易用性和用户体验呢？）。

### 短暂的 LTS

在 Istio 的[版本支持公告页面](https://istio.io/latest/news/support/)，你可以发现以前的老版本都逐渐的停止了维护，特别是具有里程碑意义的 1.5 版本，在发布 6 个月后即停止维护，几乎成为了 Istio 史上最短命的版本。Istio 在[构建和发布节奏页面](https://istio.io/latest/about/release-cadence/)中这样定义 LTS（long term support）：

> Support is provided until 3 months after the next LTS

即上一个版本会在新版本发布后的 3 个月就停止维护（包括更新、修复 bug 等），算上它自己的发布日期，也只有半年时间。我们再来对比一下 Ubuntu 对 LTS 的定义，下面是 Ubuntu 20.04 LTS 的一段说明：

> 下载专为桌面 PC 和笔记本精心打造的 Ubuntu 长期支持 (LTS) 版本。LTS 意为 “长期支持”，一般为 5 年。LTS 版本将提供免费安全和维护更新至 2025 年 4 月。

5 年对 3 个月。对于操作系统来说，因为处在整个软件架构的最底层，理应保证长期稳定的维护。Service Mesh 比不了操作系统，但好歹也是基础设施，也应该对上层建筑提供更多稳定性。这个所谓的长期是不是有点过于短暂？追风少年你是要赶着去投胎吗？Istio 对 LTS 的定义让我开始怀疑人生。

## 路在何方——稳定是永恒的童话？

Service Mesh 领域的权威人士 Christian Posta 在公开采访中表示：Istio 1.7 将会是真正意义上的稳定、可用于生产环境的版本。笔者对此不敢苟同。本次更新表现平平，并无亮点，反倒是对 Kubernetes 的版本限制会导致用户在安装、升级环节增加成本和不确定性，是一次用户体验上的倒退。Istio 1.0 版本就宣称是生成环境可用（Production ready），恐怕这一次也依然会变成川建国金句的翻版：Make Istio production ready again!

经过了 3 年多的迭代，Istio 依然像个毛头小子，随性而为。稳定和可靠，在这里成了骗人的童话故事。笔者曾分析 Istio 1.8 将会是第一个稳定版本，希望下一次不要让我们失望。
