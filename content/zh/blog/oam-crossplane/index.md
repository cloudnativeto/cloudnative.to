---
title: "OAM和Crossplane: 构建现代应用的下一个阶段(译)"
description: "本文翻译自阿里云高级技术专家张磊的文章 [OAM and Crossplane: The Next Stage for Building Modern Application](https://www.alibabacloud.com/blog/596240)"
author: "白凯"
categories: ["OAM"]
tags: ["OAM","Microservices","Crossplane"]
date: 2020-05-28T10:00:00+08:00
type: "post"
---
# OAM和Crossplane: 构建现代应用的下一个阶段(译)

`OAM和Crossplane社区共同致力于建设一个聚焦在标准化的应用和基础设施上的开放社区。`

## 前言

在2020年三月份，在来自Crossplane社区的协作和巨大贡献下，开放应用模型（即OAM）项目发布了其[v1alpha2规范](https://github.com/oam-dev/spec/releases/tag/v1.0.0-alpha.2?spm=a2c65.11461447.0.0.72267a2flm3ivr&file=v1.0.0-alpha.2)，旨在为OAM本身和任何采用OAM的Kubernetes应用平台带来绝佳的可扩展性。在2020年5月份，随着Crossplane最新的v0.11版本发布，Crossplane现在具备了OAM规范的标准实现。我们十分激动看到两个社区间的合作，合作将标准的应用和基础设施定义与实施一起带入了云原生社区。

## 旅程的开始

从Kubernetes工程师的角度来说，我们很接受现在的Kubernetes抽象层级：容器和基础设施API资源。但是对于平台的终端用户而言还是太过底层。

为了在一定程度上提高终端用户的体验，一些团队试图通过引入‘Paa。S’或者GUI了来向终端用户隐藏Kubernetes API。初看上去，这似乎是一个好主意。但事实上，这极大的限制了平台的能力。Kubernetes资源模型强调系统的所有能力都要能够可以表达成"数据"，例如API对象。向终端用户隐藏这些对象本质上会使得你的PaaS缺乏可扩展性，因而无法利用在生态圈中数不胜数的插件的能力。

带着我们必须使平台构建者能够定义应用级别的抽象而不引入对平台可扩展性限制的理念，我们开始探索这个领域。

## 建模你的应用，而不仅仅是描述

因为我们要定义应用级别的抽象，那么第一个问题就是：什么是应用？
![image.png](https://img.alicdn.com/tfs/TB13O2iIkT2gK0jSZFkXXcIQFXa-765-401.png)

一个现代应用通常是若干部分的组合(如上图所示)。这样的模式广泛存在于现实世界：多层应用，机器学习训练应用（参数服务器和工作节点），更不用提微服务架构。但是经常被遗忘的是，这些应用的组件经常需要绑定一系列的运行的策略。另外，分组策略也是一个特殊类型的运行策略。例如，我们需要设置一个组内多个组件的安全组。

因此直观的方法是使用CRD作为描述应用的高级抽象。并且这样可以与应用运行所需的所有其他部分（如运行策略，基础设施）一起合并成一个YAML文件，如下：

![image.png](https://img.alicdn.com/tfs/TB1ZCriIeH2gK0jSZJnXXaT1FXa-480-287.png)

上面的这个例子其实就是阿里巴巴“应用”定义的1.0版本。可以想象，开发人员会抱怨这样的“应用”太过于复杂，尽管它的初衷是使他们的生活更加简单。同样的，我们发现维护这个对象十分的混乱，并且基本上不可能扩展。更糟糕的是，越来越多的能力被安装到我们的Kubernetes集群中，这些都需要加进这个对象 - Kubernetes社区发展的十分迅速！

事实上，如果你仔细检查上述YAML文件，会发现开发者真正关心的只是运行他们应用的定义里的一些较小片段，如"commands"和"package"。

因此为何我们不把这个YAML分解成多个片段呢？开发人员只需要根据他们自己掌握的部分定义"运行什么(what to run)"，操作人员（或者系统管理员）定义运行策略，基础设施操作人员处理基础设施部分。

在接触社区中的各个公司之后，我们发现“分离关注”的想法与微软的团队非常契合。在与微软经过了数周的合作之后，我们定义了如下的顶层草图：

![image.png](https://img.alicdn.com/tfs/TB1RXHiIeL2gK0jSZFmXXc7iXXa-798-364.png)

看到了吗？与all-in-one式的CRD把所有东西揉在一起不同的是，OAM的核心思想本质上是一个"框架（frame）"。因此，开发人员和操作人员可以在整个应用表单的“空格”里填充他们自己片段的数据。这种灵活性保证了任何平台都可以采用这个定义而不会受限于特定的工作负载和能力类型，并且这个系统可以支持任何工作负载(容器，函数，甚至虚拟机)与运行能力(例如autoscaling, ingress, security policy)。

我们称这种方法为“应用模型”，因为当一个用户需要组合多个片段为一个应用是需要遵循这个规范，他们需要去思考哪些空白需要去填充，例如是否是描述“运行什么”？或者是否是运行策略？这个过程和数学建模十分类似，数学建模使用数学概念和语言来描述系统。我们现在使用OAM概念来描述应用的不同部分。好处是现在平台可以理解这些不同片段的类别，这样可以保证片段的拓扑，或是检查运行策略的兼容性-可发现性和可管理性是现代产品级应用平台的核心。

我们最终将这个理念发布为[OAM spec v1alpha1](https://github.com/oam-dev/spec/releases/tag/v1.0.0-alpha.1?spm=a2c65.11461447.0.0.72267a2flm3ivr&file=v1.0.0-alpha.1)

## Crossplane + OAM:构建Kubernetes之上的现代应用

OAM spec v1alpha1在阿里云的[企业级分布式应用服务(EDAS)](https://www.alibabacloud.com/zh/product/edas)以及内部平台上得到了快速采用。然而，我们同样发现了一个在"运行什么"片段中的问题(之前称之为[ComponentSchematic](https://github.com/oam-dev/spec/blob/v1.0.0-alpha.1/3.component_model.md?spm=a2c65.11461447.0.0.72267a2flm3ivr#component-schematics))，我们需要发布新版本的ComponentSchematic来进行YAML中的任何修改。这是因为她被设计成了一个模式（schematic）对象，因此开发者可以定义他们需要部署的任何工作负载并与他人分享。一个类似的问题同样存在于运行策略部分（我们成为"traits"）-它的模式同样将模式暴露给了终端用户。

在接下来12月份的KubeCon北美峰会中，我们遇到了来自Upbound.io的Crossplane维护者，我们一起讨论了OAM，以及OAM规范如何利用CRD作为模式与Crossplane进行无缝集成。我们都认为这个方向是有希望的，在经过了数月的头脑风暴，提案以及无数次的激烈讨论之后，这个想法最终演进成为了如下的OAM spec v1alpha2:

![image.png](https://img.alicdn.com/tfs/TB1cPesaCRLWu4jSZKPXXb6BpXa-811-413.png)

[OAM spec v1alpha2](https://github.com/oam-dev/spec/releases/tag/v1.0.0-alpha.2?spm=a2c65.11461447.0.0.72267a2flm3ivr&file=v1.0.0-alpha.2)采用了Kubernetes资源模型，因此Kubernetes中的任何数据片段都可以通过简单的定义一个WorkloadDefinition或者TraitDefinition来无缝引用为一个OAM中的工作负载或者特征(trait)。一个关于OAM spec v1alpha2的更深入的博客即将发布，这里可以先看看一个[详细的说明](https://speakerdeck.com/ryanzhang/building-the-next-generation-of-cloud-native-applications?spm=a2c65.11461447.0.0.72267a2flm3ivr)。

在实现方面，我们开发了一个基于Go的实现版本，称之为[oam-kubernetes-runtime](https://github.com/crossplane/oam-kubernetes-runtime?spm=a2c65.11461447.0.0.72267a2fUs9QIx)，作为[Crossplane](https://github.com/crossplane/crossplane?spm=a2c65.11461447.0.0.72267a2fUs9QIx)的一部分。现在我们有一个用于OAM的标准Kubernetes运行时。

## 组合：完成整个图景

就像你可能看到的，我们仍然缺乏关于OAM的一个部分：我们如何定义组件以来的基础设施片段，例如，一个来自阿里云MySQL数据库实例(RDS)？我们如何是这个定义适用于不同的云，就像OAM组件那样。

在Kubernetes中定义这样应用中心的和可移植的基础设施绝非易事，在社区有一些operators或者产品来做这个事情，但是没有像Crossplane中的Composition那样好。Composition组合多个基础设施片段，然后将其发布到与平台无关的CRD中，例如组合CRDs来将VPC与RDS描述为一个新的数据库的CRD。这个CRD，可以在之后引用为一个OAM的WorkloadDefinition并且成为一个应用的一部分。搞定！

组合的结果十分的有力，以团队为中心的平台，可以让基础设施操作人员为应用定义和组合供应商无关的基础设施，并且可以使应用开发人员和应用操作人员以OAM的方式定义，运行和管理可移植的应用，为不再去关心基础设施的复杂性。基础设施操作人员现在可以管理运行这些应用的基础设施。OAM和Crossplane一起提供了面向应用开发者和基础设施操作人员的优雅的解决方案。

## 下一步？

OAM的核心理念是开发人员可以描述他们的应用，然后他们就可以是应用运行在一个无服务器平台，或者在一个本地的Kubernetes集群而无需修改应用的描述。这是阿里巴巴和微软一直在努力的云边协同（cloud,edge consistency）故事的一部分。很明显，与Crossplane的合作弥补了这个故事真正实现所缺失的重要部分，那就是在一个系统中同时涵盖统一的应用定义和基础设施定义。我们将继续努力使Crossplane成为OAM的标准Kubernetes实现，并且具有更好的工作负载/特征可移植性，互操作性，丰富的运行能力；构建一个聚焦于标准应用和基础设施的开放社区。

`本文翻译自阿里云高级技术专家张磊的文章 [OAM and Crossplane: The Next Stage for Building Modern Application](https://www.alibabacloud.com/blog/596240)`