---
title: "Istio 中的应用程序指标度量"
date: 2019-03-06T14:00:26+08:00
draft: false
authors: ["Mate Atamel"]
translators: ["邱世达"]
summary: "本文介绍了在 Istio 环境下进行应用程序指标度量的背景知识、一般方法以及可能出现的问题。"
tags: ["istio"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","istio","metric"]
type: "post"
---

本文为翻译文章，[点击查看原文](https://meteatamel.wordpress.com/2019/01/07/application-metrics-in-istio/)。

## 背景

Istio 发送的默认指标有助于了解流量如何在集群中流动。但是，要了解应用程序的行为，还需要应用程序指标。

[Prometheus](https://prometheus.io/)提供了[客户端库](https://prometheus.io/docs/instrumenting/clientlibs/)，您可以使用它来检测应用程序并发送监测指标。
这很好，但也提出了一些问题：

- 您从哪里抓取这些指标？
- 您是使用 Istio 附带的 Prometheus，还是自建新的 Prometheus？
- 如果使用 Istio 附带的 Prometheus，那您需要使用什么样的配置来获取这些指标？

让我们尝试回答这些问题。

## Istio 的 Prometheus vs. 独立的 Prometheus

在 Prometheus 中，有一个[联邦](https://prometheus.io/docs/prometheus/latest/federation/)功能，它允许一个 Prometheus 服务端从另一个 Prometheus 服务端获取指标数据。如果您想将 Istio 指标和应用程序指标分开，可以为应用程序指标设置一个单独的 Prometheus 服务端。然后，您可以使用联邦功能来获取应用程序指标以及 Istio 默认的观测指标。

一种更简单的方法是直接使用 Istio 的 Prometheus 来提取应用程序的指标，这正是我在这里要重点讨论的。

## 发送应用程序指标

要从应用程序发送自定义指标，您需要使用 Prometheus 的[客户端库](https://prometheus.io/docs/instrumenting/clientlibs/)来检测应用程序。使用哪个库取决于您使用的语言。作为 C#/.NET 开发人员，我使用了 Prometheus 的[.NET 客户端](https://github.com/prometheus-net/prometheus-net)，Daniel Oliver 的[这篇博客](https://www.olivercoding.com/2018-07-22-prometheus-dotnetcore/)分步说明了如何从[ASP.NET](http://asp.net/) Core 应用程序发送自定义指标并在本地 Prometheus 服务端查看它们。

您需要注意的一件事是开放 Prometheus 指标的端口。在[ASP.NET](http://asp.net/) Core 中，默认开放的端口是 5000。在本地执行时，应用程序度量指标暴露于`localhost:5000/metrics`。然而，当您容器化您的应用程序时，通常会在不同的端口开放您的应用程序服务，例如 8080，稍后我们讨论配置时，这就变得相关了。

假设您在一个启用 Istio 的 Kubernetes 集群上容器化并部署了您的应用程序，现在让我们看看需要做些什么来让 Istio 的 Prometheus 获取这些应用程序指标。

## 配置

在 Istio 1.0.5 中，Kubernetes 默认安装文件`istio-demo.yaml`或`istio-demo-auth.yaml`已经在 ConfigMap 中为 Prometheus 提供了指标采集配置。您可以搜索`prometheus.yml`。这里有两个与应用程序指标抓取相关的任务配置：

```yaml
- job_name: 'kubernetes-pods'
  kubernetes_sd_configs:
- role: pod
...
- job_name: 'kubernetes-pods-istio-secure' 
  scheme: https
```

这些是从常规 Pod 以及启用了 mTLS 的 Pod 间抓取指标的任务配置。看起来，Istio 的 Prometheus 应该能够自动地抓取应用程序指标。但是，在我首次尝试时，它并没有正常工作。我不确定出了什么问题，但 Prometheus 有一些默认 endpoint 端点：

- `/config`：查看 Prometheus 的当前配置。
- `/metrics`：查看抓取的指标数据。
- `/targets`：查看正在被抓取指标的目标以及它们的状态。

所有这些 endpoint 端点对于调试 Prometheus 非常有用：

![](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/application-metrics-in-istio/007uElTfly1g0s0xtqjpzj30l40cbtaw.jpg)

原来，我需要在我的 Pod YAML 中添加一些注解，以便 Prometheus 对它们进行指标抓取。我必须通过这些注解告诉 Prometheus 哪些 Pod 需要被抓取指标数据，以及在哪个端口进行抓取：

```yaml
kind: Deployment
metadata:
  name: aspnetcore-v4
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: aspnetcore
        version: v4
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
```

添加注解后，我能够在 Prometheus 中看到我的应用程序的指标数据：

![](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/application-metrics-in-istio/007uElTfgy1g0sblvrx4tj30l409p74t.jpg)

然而，这只适用于常规 Pod，我无法看到启用了 mTLS 的 Pod 间的指标数据。

## Istio 证书和 Prometheus 的问题

经过一番调查后，我联系了 Istio 团队，结果发现这是个[Bug](https://github.com/istio/istio/issues/10528)。在 Prometheus 启动时，它将尝试挂载 Istio 提供的证书。然而，这些证书此时可能还没有被 Istio Citadel 颁发。不幸的是，Prometheus 不会重试加载证书，这导致抓取受 mTLS 保护的 endpoint 端点会产生问题。

这里有一个不是十分理想，但是却很容易的解决办法：重新启动 Prometheus Pod。重新启动迫使 Prometheus 获取证书，而且来自启用了 mTLS 的 Pod 的应用程序指标也开始被抓取。

## 结论

一旦理解了基础知识，获取 Istio Prometheus 的应用程序指标就非常简单了。希望这篇文章为您提供了实现这一目标所需的背景知识以及需要的配置说明。

值得注意的是，Mixer 正在被重新设计，并且在未来版本的 Istio 中，它将直接嵌入 Envoy。在该设计中，您将能够通过 Mixer 发送应用程序指标数据，并且它将流经与 sidecar 相同的统一指标处理管道。这将使应用程序指标的获取能够更容易地实现端到端工作。

感谢 Istio 团队和我的同事 Sandeep Dinesh 帮助我调试问题，多亏了他们，我才能完成本文。
