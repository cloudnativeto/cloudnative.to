---
title: "云原生生态周报（Cloud Native Weekly）第 1 期"
date: 2019-04-16T19:35:39+08:00
draft: false
authors: ["云原生社区"]
summary: "这是 Cloud Native 周报第一期。"
tags: ["云原生","周报"]
categories: ["云原生"]
keywords: ["service mesh","服务网格","云原生","cloud native"]
---

> 本周作者：张磊 临石 禅鸣 至简 宋净超
>
> 编辑：木环

这是 Cloud Native 周报第一期。

## 业界要闻

- 在上周于旧金山举办的 Google Cloud Next 2019 大会上，Google Cloud 正式发布了：
   - [Cloud Run](https://cloud.google.com/run/)。这是一个跟 Microsoft Azure ACI，AWS Fargate 类似的容器实例服务。但与 ACI 和 Fargate 基于虚拟机技术栈的实现不同，Google 的 Cloud Run 服务则是基于 [Knative](https://github.com/knative/) 这个 Kubernetes 原生的 Serverless 基础设施项目完成的。这也是业界第一个基于 Knative + Kubernetes + gVisor 体系的 Serverless 服务。此外，[Cloud Run 的计费模型](https://cloud.google.com/run/pricing)也颇具创新性：它不像 Fargate 那样完全按请求数目计费，而是将所有并发的请求算在一个计费单位内，这有望大大减低用户需要支付的成本。
   -  [Traffic Director](https://cloud.google.com/traffic-director/)。一个与 AWS App Mesh 对标的 Service Mesh 产品。Traffic Director 通过 xDS 协议与数据平面的 Envoy 进行通讯，可分别与 Google Cloud 的[MIG](https://cloud.google.com/compute/docs/instance-groups/)和[NEG](https://cloud.google.com/load-balancing/docs/negs/)两款产品结合去提供 Service Mesh 的能力。Traffic Director 的功能与开源 Istio 项目中的 Pilot-discovery 相似，也复用了 Istio 的不少技术实现（比如，通过 iptables 完成流量透明拦截）。Traffic Director 支持全球负载均衡、集中式的集群健康检查、流量驱动的自动扩缩容等功能，帮助客户在全球部署与管理高弹性的无状态应用。

- 关于 Google Cloud Next 上其他一些比较有意思的发布，你可以阅读 [TechCrunch 上的这篇文章](https://techcrunch.com/2019/04/10/the-6-most-important-announcements-from-google-cloud-next-2019/)来进一步了解。

## 上游重要进展

- [KEP: Rebase K8s images to distroless](https://github.com/kubernetes/enhancements/pull/900)  Kubernetes 即将使用 gcr.io/distroless/static:latest 作为 K8s 核心镜像和 addon 镜像的统一 base 镜像。优势如下：
   - 使得镜像体积更小，也更加安全。
   - 极大的减少冗余的 K8s image 的数量。
   - 通过对底层镜像的统一管理，可以使得 K8s image 更加安全（比如 CVE 的防护），更易于维护。

- [Kustomize: Generator and Transformer Plugins](https://github.com/kubernetes/enhancements/pull/906/files) 将 Kustomize 进行解耦，各项功能由各个 plugin 进行实现，现有的基础功能会作为内置插件。这意味着 Kubernetes 在向基于 Kustomize 的原生应用管理能力上又迈出了坚实的一步。

- [Port Troubleshooting Running Pods proposal to KEP](https://github.com/kubernetes/enhancements/pull/830/files) 为 kubectl 添加一个 debug 命令，开发者可以用这个命令来和特定 pod 中的所有容器进行交互和访问。这里的关键设计，在于 Kubernetes 巧妙的利用了 sidecar 容器实现了对应用的非侵入式的 debug，非常值得学习。

- [keps: sig-node: initial pod overhead proposal](https://github.com/kubernetes/enhancements/pull/887/files) 这个 KEP（Kubernetes Enhancement Proposal）设计了一套机制，使 Pod 能够对系统层面的 额外资源消耗（overhead）进行审计。这里的 overhead 主要包括以下两个部分。
  - 系统组件比如 kubelet，Docker, Linux Kernel，以及 Fluentd 等日志组件带来的 额外资源消耗
  - 沙箱容器运行时（Sandbox container runtime，比如 KataContainers）本身因为虚拟化和独立 Guest Kernel 所带来的额外的资源消耗

- [RuntimeClass scheduling\] native scheduler support, ready to implement](https://github.com/kubernetes/enhancements/pull/909/files) 在这个设计中，Kubernetes RuntimeClass 的信息会被 Kubernetes 直接转义成 Toleration/Taint 信息从而使用 Kubernetes 的默认调度器即可处理。这个设计实现后，Kubernetes 就有了根据应用的需求，自主选择使用 KataContainers 还是 Docker 来运行应用的能力，值得期待。

## 开源项目推荐

- [Kubecost: 让你的 Kubernetes 服务花费一目了然](https://medium.com/kubecost/introducing-kubecost-a-better-approach-to-kubernetes-cost-monitoring-b5450c3ae940) 本周，我们强烈推荐你了解一下这个名叫 [Kubecost](https://github.com/kubecost) 的开源项目。它能够按照 Kubernetes 的原生 API 比如 Pod，Deployment，Service，Namespace 等概念逐层监控并详细的计算和展现出每一层上你的真实花费。更重要的是，无论你下层用的是 AWS 还是 GCP，Kubecost 内置的成本模型都可以应对自如。

## 本周阅读推荐

- 技术博文：[《Fargate 幻象》](https://leebriggs.co.uk/blog/2019/04/13/the-fargate-illusion.html)by Lee Briggs。众所周知，Fargate 是 AWS 目前主推的容器实例服务产品。但是，Fargate 这种产品形态，是不是就是开发者想要的云产品的未来呢？本周，推荐你阅读一篇深入剖析 Fargate 服务的技术博文《Fargate 幻象》。这篇文章不仅能带你理解关于 Fargate 服务的方方面面，也能从一位开发者的角度，跟你聊聊作者眼中到底什么才是 Kubernetes 最具吸引力的“魔法”所在。

- 技术博文：[《Benchmark results of Kubernetes netwokr plugins (CNI) over 10Gbit/s network》](https://itnext.io/benchmark-results-of-kubernetes-network-plugins-cni-over-10gbit-s-network-updated-april-2019-4a9886efe9c4)，by Alexis Ducastel。这个系列博客专注对 K8s 不同 CNI 网络插件的性能测试，上一篇博客发布于 2018 年 11 月，随着 K8s 1.14 的发布，作者对 up-to-date 的网络插件的性能重新进行了对比。对比的 CNI 包括：Calico v3.3，Canal v3.3，Cilium 1.3.0，Flannel 0.10.0，Kube-router 0.2.1，Romana 2.0.2，WeavNet 2.4.1；对比的内容包括安装难度（Installation）、安全、性能和资源消耗。测试结果不出意外的说明了没有一个 CNI 是所有方面的全能冠军，如何根据自身的需求选择合适的 CNI 方案？阅读这篇文章也需要可以给你很多启发。

- 技术博文：[《Infrastructure as Code, Part One》](https://crate.io/a/infrastructure-as-code-part-one/)，by Emily Woods。Infrastructure as Code（IaC）是时下非常火热的概念，然而究竟什么是 IaC，谁应该去关心它，它能解决什么痛点，不同的人有不同的答案。这篇博客从一个常见的升级失败展开，讨论我们需要什么样的集群和应用管理方式，集群管理者和应用开发者究竟以什么样的方式共享知识才能更加高效的协作，并描述 IaC 的实践应该如何展开。这篇文章对每一个软件工程师都会有帮助。

- 技术博文：[《Istio Sidecar 注入过程解密》](http://www.servicemesher.com/blog/data-plane-setup/)by Manish Chugtu，崔秀龙 译。Sidecar 模式是 Istio 项目工作的核心依赖，也是 Kubernetes 项目“容器设计模式”的最重要的一种。那么你是否会好奇，Istio 中 Istio Sidecar 注入到底是如何完成的呢？相信这篇精心翻译的博文一定能帮你一解究竟。

- 技术博文：[《Istio 学习笔记：Istio CNI 插件》](http://www.servicemesher.com/blog/istio-cni-note/)by 陈鹏。当前实现将用户 Pod 流量转发到 proxy 的默认方式是使用 privileged 权限的 istio-init 这个 InitContainer 来做的（运行脚本写入 iptables），而 Istio CNI 插件的主要设计目标是消除这个 privileged 权限的 InitContainer，换成利用 k8s CNI 机制来实现相同功能的替代方案。你是否好奇过，这个改进到底是如何实现的？这篇文章，三言两语之间就能为你解释清楚。
