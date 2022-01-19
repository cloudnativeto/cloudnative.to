---
title: "GitOps 如何提高开发人员的工作效率"
date: 2022-01-19T09:24:17+08:00
draft: false
image: "/images/blog/gitops.jpg"
author: "[Shazad Brohi](https://faun.pub/accelerating-developer-productivity-via-gitops-e8175bec0d8)"
translator: "[宋净超（Jimmy Song）](https://jimmysong.io)"
description: "本文介绍了什么是 GitOps 及其架构。"
tags: ["gitops","flux"]
categories: ["DevOps"]
type: "post"
---

GitOps 是一种方法，通过声明式清单来管理 Kubernetes 集群，以强制执行自我修复和自我调整，达到你所期望的状态。

与传统的 CI/CD 管道相比，GitOps 采用了拉与推的模式。这意味着开发人员和运维人员不需要调用管道来推送变更到集群中。开发人员只需在源控制中更新他们的 Kubernetes 清单，在集群上运行的 GitOps 控制器将拉取这些变更，并应用所需的状态。因此，Git 成为环境中的唯一的事实来源。

## 为什么要实施 GitOps？

在过去 11 年的行业观察中，我发现了从 TeamCity 到 Jenkins 到 Gitlab 等众多 CI/CD 系统的好处和陷阱。我在各组织中看到的一个共同模式是共享 CI/CD 基础设施。一台或几台构建服务器被几十个团队共享，这往往导致服务器方面的资源争夺，间歇性的网络问题，频繁的中断，这些都成为开发团队无法推送构建的瓶颈。当然，这些系统有许多好处，但肯定有更好的方法。

很多时候，团队由于对共享服务的依赖而退步。

GitOps 允许我们横向扩展集群的数量，因为每个集群都支持自我调节和自我修复。

## 架构图

有许多技术支持部署 GitOps 工作流程。FluxCD 和 ArgoCD 是两个最常用的工具。在这篇文章中，我们将通过 FluxCD 来探讨 GitOps。

如前所述，每个启用了 GitOps 的集群都会运行一组控制器，负责从 Git 上协调集群状态。这些控制器能够从不同的存储库（如 Gitlab、Github、Bitbucket 等）和不同的清单（如 Kubernetes、Helm 等）进行协调。

下面是 FluxCD 中这些控制器的高级架构。

![img](https://tva1.sinaimg.cn/large/008i3skNly1gyis2lo9rdj319r0u00vi.jpg) 

来源：https://fluxcd.io/docs/

上面定义的是以下控制器，每个控制器都是作为部署资源的一部分而部署的 pod。

- 源控制器：负责从配置的源存储库和分支持续拉取清单。如果需要的话，可以将控制器配置为使用 HTTP 出口代理来与这些资源库进行通信。
- Kustomize 控制器：负责对源控制器检索到的 Kubernetes 清单进行 kustomize 构建，并通过与 Kubernetes API 服务器的通信将它们应用于集群。Kustomize 是一个工具，它允许你声明性地定义 Kubernetes 清单，并通过插值将其模板化。
- Helm 控制器：负责从源头协调 HelmRepository 和 HelmChart 资源并将其部署到集群上。通过这个控制器，你可以像平时一样用 value 文件创建一个 Helm 部署清单。然后 HelmController 将负责获取 Helm 资源库。你可以配置图表的来源，通过 HelmRepository 资源从上游的 Helm 仓库中提取，或者通过 GitRepository 资源从本地的 Git 仓库中提取。

## Git 存储库结构

你可以灵活地定义如何构建 Git 仓库，这些仓库在你的 GitOps 工作流程中被用作事实源。

以下是你可以采用的一些做法。

- 为每个 Kubernetes 集群定义一个 Git 存储库
- 为每个 Git 存储库定义 N 个 Kubernetes 集群

如果你有很多 Kubernetes 清单，第一种模式比较简单，而且会比较容易管理。如果您的 Kubernetes 清单在每个集群中占用的空间较小，第二种模式也能发挥作用。为了本文的目的，我们将坚持采用第一种模式。

以下是你如何构建你的资源库。

```yaml
- kustomize.yaml
- networking
  - networking-sync.yaml
  - nginx-ingress-controller.yaml
  - kustomize.yaml
- namespaces
  - namespaces-sync.yaml
  - ingress-controller-ns.yaml
  - my-app-ns.yaml
  - kustomize.yaml
- app
  - app-sync.yaml
  - my-app-deployment.yaml
  - my-app-service.yaml
  - my-app-configmap.yaml
  - kustomize.yaml
- app-system
  - app-system-sync.yaml
  - app-repository.yaml
  - kustomize.yaml
- flux-system
  - gotk-components.yaml
  - gotk-sync.yaml
```

顶部的 kustomize.yaml 文件是你的根 kustomization 文件，它将构建你的资源库中定义的所有资源。下面是如何定义这个文件。

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources: 
 - app-system/app-system-sync.yaml
 - networking/networking-sync.yaml
 - namespaces/namespaces-sync.yaml
 - app/app-sync.yaml
```

注意上面我们定义了一组 - sync.yaml 文件。在这些文件中，我们定义了需要多长时间将我们的集群与我们定义的源同步，以及源所在的路径和存储库，还有其他各种高级配置，我们可以在 Flux 中应用我们的自定义清单，如 `var substitution`。

下面是我们的 app-sync.yaml 清单的一个例子。

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1beta2
kind: Kustomization
metadata:
  name: app-sync
  namespace: flux-system
spec:
  interval: 10m
  path: "./app"
  sourceRef:
    kind: GitRepository
    name: app-system
  timeout: 5m
```

在我们的应用程序文件夹中，我们可以继续为我们的应用程序定义我们的本地 Kubernetes 清单，如 Deployment 资源，Service 资源来暴露它，以及配置的 ConfigMap。我不会讨论这些定义，因为网络上有各种资源可以参考。

最重要的是，我们将定义一个 GitRepository 资源，这样 Flux 的源码控制器就知道从哪里拉取源码进行核对。

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta1
kind: GitRepository
metadata:
  name: app-repository
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/<my-organization>/<my-repo>
  branch: master 
```

## 用 Flux 引导集群

定义好 GitRepository 后，就可以用以下命令启动集群了。在这之前，请确保你已经安装了 Flux CLI。

```bash
$ brew install --cask flux
```

引导命令：

```bash
flux bootstrap \
  github \                      
  --owner <your-github-user> \  
  --repository <repo-name> \   
  --path ./  \              
  --branch master               
```

执行之后，flux 将在你的集群上启动，并配置为使用你在这里定义的存储库。此外，所有的控制器将被部署到 flux-system 命名空间。flux CLI 也是一个很好的探索资源，因为有许多命令可以用来询问你的集群的状态。

检查核对状态：

```bash
flux get kustomization -A
```

暂停核对：

```bash
flux suspend kustomization app-sync
flux suspend helmrelease prometheus
```

恢复核对：

```bash
flux resume kustomization app-sync
```

总之，GitOps 是一个可以用来加速开发人员生产力、部署应用程序和在整个组织中横向扩展 Kubernetes 集群的模式。

## 参考

- [FluxCD 文档](https://fluxcd.io/docs/)
- [ArgoCD 文档](https://argo-cd.readthedocs.io/en/stable/)
- [Kustomize 文档](https://kubectl.docs.kubernetes.io/guides/config_management/)
