---
title: "Kro 项目：一次三大云厂商联合赋能 Kubernetes 用户的范例"
summary: "Kro 是由 AWS、Google 和 Microsoft 联合发起的开源项目，旨在跨云简化 Kubernetes 资源编排。"
authors: ["TheNewStack"]
translators: ["云原生社区"]
categories: ["Kubernetes"]
tags: ["Kubernetes"]
draft: false
date: 2025-04-21T15:04:55+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://thenewstack.io/the-kro-project-giving-kubernetes-users-what-they-want
---

在 Kubernetes 生态中，**资源编排**一直是平台工程领域面临的核心挑战。2024 年底，一个名为 [Kro](https://github.com/kro-run/kro)（Kubernetes Resource Orchestrator） 的项目横空出世，由 AWS、Google Cloud 和 Microsoft 三大云厂商罕见地联手推出，并以 Apache 2.0 协议开源，立足于解决 Kubernetes 用户对简化 CRD 编排的长期诉求。

## 不是企业战略，是用户需求的汇聚

Kro 项目的诞生并非某个公司的上层推动，而是由各大云厂商用户的“共同声音”催生。来自 AWS 的工程师表示，Kro 背后是“customer pull（客户拉力）”驱动，而非“vendor push（厂商推动）”。

Kubernetes 的高度可扩展性为构建软件提供了无限可能，但同时也带来了运维和资源管理的复杂性，尤其是围绕 CRD（自定义资源）和控制器的开发。Kro 的目标是：**在不绑定具体云平台的前提下，提供一套 Kubernetes 原生的资源编排能力，帮助平台团队降低复杂度，让开发者更专注于业务逻辑。**

正如 Google 的工程师所说：“Kubernetes 就像现代版的 POSIX，它是一个开放标准。客户普遍希望我们不要构建专有的封闭方案。”

## 云厂商联合开发：打破壁垒的开源合作

更令人振奋的是 Kro 的合作方式——不是竞品对抗，而是**开源协作**。Google、AWS 和 Azure 的工程师原本各自独立构建类似工具，最终决定放弃重复建设，合力打造一个真正通用的 Kubernetes 工具。

这种合作精神在 CNCF 社区并不罕见，大家秉持的是 “**Same Team, Different Company**” 的理念——不论公司背景，目标一致，就是**服务好 Kubernetes 用户**。

## 平台工程的统一编排接口

Kro 为平台团队提供了统一的资源抽象层。通过 Kro，开发者不需要了解各类云资源背后的 API 和配置细节，只需定义“我需要一个数据库”和“运行在哪个区域”等关键参数，其它繁杂的设置交由 Kro 背后的平台工程自动完成。

正如项目发起人之一所说：“开发者只需要填写一个名称和区域，而不必了解服务账号、密钥或底层资源的创建过程。”

## 项目进展与未来方向

截至目前，Kro 项目仅诞生 7 个月，已经吸引了近 60 位活跃贡献者，完全依赖社区自发传播。当前版本为 Alpha，不建议用于生产环境。但项目已规划下一阶段的关键特性，如：

- **Collections**：支持引用已有资源而非重复创建；
- **云无关性优化**：进一步提升在任意 Kubernetes 集群（无论是 EKS、GKE、AKS 还是自建集群）中的可移植性；
- **Scope 控制**：保持项目边界清晰，避免变成下一个“复杂平台”。

## 总结：从共识到行动，打造真正云原生的资源编排工具

在多云和平台工程成为趋势的今天，Kro 项目的发布不仅仅是一个工具的问世，更是一种信号——**主流云厂商也在向“云原生中立”靠拢，开始真正倾听用户对开源标准化的呼声**。

Kro 仍处于早期阶段，欢迎来自云原生社区的贡献者加入，一起打磨这个跨云资源编排的未来之路。项目仓库：https://github.com/kro-run/kro
