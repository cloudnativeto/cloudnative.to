---
title: "Kubernetes 安全开发最佳实践的实际应用"
summary: "作者基于 NGINX Gateway Fabric 项目（一个基于 Kubernetes Gateway API 的实现）的开发实例来展现 Kubernetes 下的最佳安全开发实践。"
authors: ["Saylor Berman", "Ciara Stacke"]
translators: ["林静"]
categories: ["Kubernetes","Gateway API","DevOps"]
tags: ["NGINX","Gateway API","Security","DevOps"]
date: 2023-11-08T15:33:00+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://www.cncf.io/blog/2023/10/11/kubernetes-secure-development-best-practices-in-action/
---

译者注：
本文译自：<https://www.cncf.io/blog/2023/10/11/kubernetes-secure-development-best-practices-in-action/>

本文作者基于 [NGINX Gateway Fabric](https://github.com/nginxinc/nginx-gateway-fabric) 项目（一个基于 Kubernetes Gateway API 的实现）的开发实例来展现 Kubernetes 下的最佳安全开发实践。

---

本文作者来自：F5 NGINX 高级软件工程师 Saylor Berman 和 F5 NGINX 高级软件工程师 Ciara Stacke。

使用最小 Docker 容器是容器化领域的一种流行策略，因为它具有安全性和资源效率的优势。这些容器是传统容器的精简版本，旨在仅包含运行应用程序所需的基本组件。在某些情况下，base 容器可能根本不包含任何内容（这将是“scratch”容器）。

许多人尽可能简单地创建 Docker 映像来让他们的应用程序正常工作。这涉及选择一个基础映像，例如“ubuntu”或“python”，其中包含启动和运行所需的所有库和工具。虽然简单，但由于内部所有额外的“东西”，导致这些镜像的攻击面和内存占用量增加了。

当我们开发 [NGINX Gateway Fabric](https://github.com/nginxinc/nginx-gateway-fabric)（我们实现新的 Kubernetes Gateway API）时，我们利用了多种工具和策略来确保安全性和优化。在本文中，我们将介绍我们的设计决策：

* 减少攻击面
* 镜像安全扫描
* 代码质量和安全性
* 部署安全最佳实践

## 减少攻击面

我们选择从尽可能小的容器开始。事实上，我们不能再小了。基于 'scratch'，我们的 'nginx- gateway-fabric' 镜像只包含 Golang 二进制文件，没有其他内容。在生成最终版本之前，我们采取了几个步骤，但我们确保最终版本仅包含必要的内容，即二进制文件。Dockerfile 如下所示：

```Dockerfile 
FROM alpine:3.18 
RUN apk add --no-cache libcap 
COPY ./build/out/gateway /usr/bin/ 
RUN setcap 'cap_kill=+ep' /usr/bin/gateway 
FROM scratch 
USER 102:1001 
ENTRYPOINT [ "/usr/bin/gateway" ]
```

这个多步骤的 Dockerfile 允许我们将“alpine”与最新版本的 libcap 一起使用，将我们预先构建的二进制文件复制到正确的位置，并为我们管理 nginx 设置必要的权限。然后，我们使用“scratch”作为生产映像的基础，并设置用户和组 ID，以便我们可以控制和限制容器有权访问的权限。

使用这种方法，“nginx-gateway-fabric”映像的大小大致与二进制文件本身的大小相同，没有任何额外的膨胀。二进制文件不需要任何额外的依赖项即可运行，并且我们保持了尽可能小的大小和攻击面。

## 镜像安全扫描

确保产品安全的最有效方法之一是定期进行安全扫描。在 [Trivy](https://trivy.dev/) 的帮助下，我们定期运行镜像安全扫描，作为 Github CI/CD 管道的一部分。Trivy 扫描容器镜像查找库或二进制文件中存在的任何已知漏洞（CVE）。使用“scratch”镜像可以保护我们免受基础映像中的任何漏洞的影响，但 Trivy 仍然可以捕获在我们的 Golang 二进制文件中编译的库中的任何漏洞。扫描结果将上传到存储库的 Github 安全选项卡，使我们的团队可以轻松查看发现的任何问题。

## 代码质量和安全性

除了最小化容器镜像外，我们还优先考虑应用程序中的代码质量和安全性，采用安全第一的思维方式。我们从一开始就将安全性放在首位，以安全性为重点，全面评估每个设计和功能。我们在流程的早期阶段主动识别和保护资产，确保在整个开发生命周期中对其进行保护，并遵守安全设计的最佳实践，包括适当的身份验证、授权和加密机制。维护这些标准的一个重要部分是我们使用强大的代码审查流程。项目的每个贡献者为任何变化都需要创建一个 PR，并且每个 PR 必须得到至少两个项目维护者的批准。除了这个过程之外，我们还结合了 linter 和工具的使用，以保持我们对代码安全性和质量的高标准。

### 静态代码分析

提高代码质量的一种方法是使用静态代码分析工具（通常缩写为 SAST）。使用 SAST 的主要优势之一是能够在开发过程的早期检测漏洞。我们将 [CodeQL](https://codeql.github.com/docs/codeql-overview/about-codeql/)（GitHub 开发的静态代码分析工具）集成到我们的 CI/CD 管道中，该管道扫描并识别拉取请求以及主分支中的任何潜在问题。这使我们能够在将更改合并到主分支之前修正任何潜在的代码质量或安全问题。与 Trivy 扫描类似，任何潜在问题都会上传到我们存储库的 GitHub Security 选项卡，以便我们的团队轻松查看发现的任何问题。

### 使依赖项保持最新

使项目的依赖项保持最新对于安全性和性能至关重要。在 NGINX Gateway Fabric 项目中，我们利用 [Dependabot](https://docs.github.com/en/code-security/dependabot) 通过持续监控项目的依赖项，并在更新可用时自动创建 PR 来自动化此过程。这可确保我们始终使用最新、最安全的依赖项版本。

Dependabot 还通过监控常见漏洞和披露（CVE）数据库来提供安全警报。当我们项目的某个依赖项中发现安全漏洞时，Dependabot 会立即通知我们并自动打开包含必要更新的 PR。这与扫描我们的 Docker 镜像一起，使我们能够快速修补漏洞。


## 部署安全最佳实践

作为 Kubernetes 环境中的关键组件，我们努力尽可能遵循 Kubernetes 安全最佳实践。这包括：

- **最低权限 —** 我们设计了 RBAC（基于角色的访问控制）规范，以便对 NGINX Gateway Fabric 需要访问的资源具有所需的最低权限。仅定义正常操作明确所需的权限。
- **单一责任原则 —** 每个容器化应用程序都应具有单一职责，这意味着它应仅执行一项任务或功能。遵循这一原则，我们将 NGINX Gateway Fabric 设计为多容器应用程序，二进制文件在与 NGINX 二进制文件不同的容器中运行。
- **强化容器安全上下文 —** 我们已在每个容器上配置了安全上下文，以包含以下内容
  - 我们遵循“最小 Linux 功能”模型，从 NGINX Gateway Fabric Pod 中运行的容器中删除所有功能，并显式仅添加项目运行所需的功能。这有助于降低容器遭受潜在权限升级攻击的风险。
  - 我们确保在容器中运行的任何进程都不能获得比其父进程更多的权限。这是通过在容器的安全上下文中将“AllowPrivilegeEscalation”标志设置为 false 来实现的。
  - 我们的容器配置了只读根文件系统。只读根文件系统有助于实施不可变的基础架构策略。为此，我们将容器配置为写入已装载的卷，并在容器的安全上下文中将“readOnlyRootFilesystem”标志设置为 true。
  - 我们将“runAsUser”和“runAsGroup”标志设置为非根值。此外，我们在 Pod 安全上下文中将 'runAsNonRoot' 标志设置为 true，以强制容器必须以非 root 用户身份运行。

## 下一步是什么？

希望这些安全开发实践能为你提供一些想法，了解如何在开发弹性应用和选择平台工具的同时，最大限度地降低暴露风险。我们很想听听你是否有兴趣使用 [NGINX Gateway Fabric](https://github.com/nginxinc/nginx-gateway-fabric) 来改善 Kubernetes 平台的安全状况。我们鼓励您：

- 以贡献者身份加入项目
- 在实验室中尝试实现
- 测试并提供反馈
