---
title: "使用 Jenkins X 实现 ChatOps"
date: 2019-06-06T4:30:44+08:00
draft: false
authors: ["Viktor Farcic"]
translators: ["孙海洲"]
summary: "本文很好的阐述了如何使用 Jenkins X 来实践 ChatOps，文中手把手带我们从零开始完成了一次 Kubernetes Native的CI/CD之旅。"
tags: ["Jenkins X", "Prow"]
categories: ["devops"]
keywords: ["Jenkins X", "Jenkins X", "Prow"]
---

本文为翻译文章，[点击查看原文](https://technologyconversations.com/2019/04/24/implementing-chatops-with-jenkins-x/)。

## 编者按

> 本文介绍了使用 Jenkins X 实现 ChatOps。很好的阐述了如何使用 Jenkins X 来实践 ChatOps，文中手把手带我们从零开始完成了一次 Kubernetes Native的CI/CD之旅。

Jenkins X 主逻辑是基于 GitOps 理念。每个更改都必须用 Git 记录，并且只允许 Git 触发集群中发生更改的事件。这种逻辑是 Jenkins X 的基石，到目前为止，它为我们提供了很好的服务。但是，我们可能还需要执行一些不会导致源代码或配置更改的操作，由此 ChatOps 就问世了。

我们可以将 ChatOps 定义为对话驱动开发。除了单人团队外，沟通对其他所有团队都是必不可少的。当我们开发的特性准备好时，我们需要与他人沟通。我们需要请其他人来 review 我们的变化。我们可能需要请求合并到主分支的权限。我们可能需要沟通的事情是无限多的。这并不意味着所有的交流都变成了聊天，而是我们交流的一部分变成了聊天。由系统来决定沟通的哪些部分应该导致操作，以及什么是没有实际结果的纯人与人之间的消息传递。

我不会用 ChatOps 的理论和原则来叨扰你们。相反，我们将看看 Jenkins X 是如何实现 ChatOps 的。

## 快速 demo 上手实践

我们需要一个 Kubernetes 集群，它具有 Jenkins X 的无服务器架构（serverless）风格。如果您手头没有一个，可以使用下面的 Gist 创建一个新的集群，或者在现有集群中安装 Jenkins X。请记住，当您完成上手实践后，Gist 还包含允许您销毁该集群的命令。

> 首先需要安装`jx`。如果您还没有[安装 jx](https://jenkins-x.io/getting-started/install/)，请遵循它的安装教程。

* 创建新的 serverless GKE 集群：[gke-jx-serverless.sh](https://gist.github.com/vfarcic/a04269d359685bbd00a27643b5474ace)
* 创建新的 serverless EKS 集群：[eks-jx-serverless.sh](https://gist.github.com/vfarcic/69a4cbc65d8cb122d890add5997c463b)
* 创建新的 serverless AKS 集群：[aks-jx-serverless.sh](https://gist.github.com/vfarcic/a7cb7a28b7e84590fbb560b16a0ee98c)
* 使用已有集群：[install-serverless.sh](https://gist.github.com/vfarcic/f592c72486feb0fb1301778de08ba31d)

> 如果对于使用哪个 serverless 集群犹豫不决，我推荐 GKE(谷歌 Kubernetes 引擎) 作为最稳定和功能丰富的 Kubernetes 托管解决方案。

探索 Jenkins X 在 Git、Prow 和系统其余部分之间集成的最佳方法是通过实例。我们首先需要一个项目，现在来创建一个新项目，命令如下。

```bash
jx create quickstart \
-l go \
-p jx-prow \
-b

cd jx-prow
```

由于 ChatOps 主要与 pull 请求相关，所以我们需要定义`reviewers`文件和`approvers`文件来决定谁可以 review 和 approve。我们可以通过修改 Jenkins X quickstart 创建项目时生成的所有者文件（`OWNERS`）来实现这一点。由于允许 PR 的发起者更改该文件是不安全的，所以在主分支中起作用的是`OWNERS`文件。这就是我们要探索和修改的。

```bash
cat OWNERS
```

输出如下所示：

```yaml
approvers:
– vfarcic
reviewers:
– vfarcic
```

所有者（`OWNERS`）包含负责此存储库的代码库的用户列表。它被划分为`reviewers`和`approvers`两个部分。如果我们想要实现一个两阶段的代码审查流程，其中不同的人将负责 review 和 approve pull 请求，这种分割是有用的。然而，这两个角色通常由相同的人执行，所以 Jenkins X 没有两阶段的开箱即用的评审过程 (尽管可以更改)。

接下来，我们需要一个真正的 GitHub 用户 (你的用户除外)，所以请联系你的同事或朋友，让她帮你一把。告诉她你需要她的帮助来完成接下来练习的一些步骤。同时，让她知道你需要了解她的 GitHub 用户。

我们将定义两个环境变量，它们将帮助我们创建所有者文件（`OWNERS`）的新版本。`GH_USER`将保存您的用户名，而`GH_APPROVER`将包含允许 review 和 approve 您的 pull 请求的人的用户。通常，我们会有多个 approver，这样 review 和 approval 任务就会分布到整个团队中。出于演示的目的，你们两个应该足够了。

> 在执行以下命令之前，请替换第一个[…]为您的 GitHub 用户，第二个为将批准您的 PR 的人的用户。

```bash
GH_USER=[…]

GH_APPROVER=[…]
```

现在我们可以创建所有者文件（`OWNERS`）的新版本。如前所述，我们将使用相同的用户作为`reviewers`和`approvers`。

```bash
echo "approvers:
– $GH_USER
– $GH_APPROVER
reviewers:
– $GH_USER
– $GH_APPROVER
" | tee OWNERS
```

剩下的与所有者文件（`OWNERS`）相关的工作就是将更改推入存储库。

```bash
git add .

git commit -m "Added an owner"

git push
```

即使`OWNERS`文件定义了谁可以 review 和 approve pull 请求，但是如果不允许这些用户在项目上进行协作，那么这将是无用的。我们需要告诉 GitHub，您的同事通过添加合作者与您合作 (其他 Git 平台可能会以不同的方式调用它)。

```bash
open "https://github.com/$GH_USER/jx-prow/settings/collaboration"
```

如果您被要求这样做，请登录。键入用户并单击`Add collaborator`按钮。

您的同事应该会收到一封电子邮件，其中包含邀请作为合作者加入项目的邀请。确保她接受邀请。

> 并非所有合作者都必须在所有者文件（`OWNERS`）中。您可能有一些人在您的项目上进行协作，但是不允许他们 review 或 approve pull 请求。

由于大多数 ChatOps 特性都适用于 pull 请求，所以我们需要创建一个，命令如下所示。

```bash
git checkout -b chat-ops

echo "ChatOps" | tee README.md

git add .

git commit -m "My first PR with prow"

git push –set-upstream origin chat-ops
```

我们创建了一个新的分支`chat-ops`，对`README.md`做了一个无脑的更改，提交了这个 commit。

现在我们已经拥有了修改过的源代码的分支，我们应该创建一个 pull 请求。我们可以通过 GitHub UI 做到这一点。不过有一个更好的方法`.jx`允许我们通过命令行实现这一点。考虑到我更喜欢终端屏幕而不是 UI(而您在这方面没有发言权)，我们将选择后者。

```bash
jx create pr \
-t "PR with prow" \
–body "What I can say?" \
-b
```

我们创建了一个 pull 请求，并显示一个带有链接的确认消息。请在您最喜欢的浏览器中打开它。

考虑到没有小猫的 PR 不应该被 approve，我们将增加一只小猫。

请输入以下 PR 评论并按下`Comment`按钮。

```bash
No PR should be without a kitten

/meow
```

你应该能看到猫的照片。我们并不真正需要它，但是它很好地演示了通过注释进行交流，从而自动执行操作。

当我们创建一个 pull 请求时，它被自动分配给`approvers`列表中某个人。你的同事应该收到一封通知邮件。请让她知道她应该去 pull 请求 (说明在电子邮件中)，键入`/lgtm`(在我看来不错)，并点击`Comment`按钮。

> 请注意`/approve`和`/lgtm`在此上下文中具有相同的目的。我们从一个分支切换到另一个分支，只是为了显示这两个分支都会导致 pull 请求被合并到主分支。

过一段时间，PR 将被合并，并执行 Pipeline 的构建。正如您所希望的那样，这将导致一个新版本被验证并部署到 staging 环境中 (多亏 Jenkins X Pipeline)。

您将注意到电子邮件通知在您和 approver 之间来回穿梭。我们不仅应用了 ChatOps 原则，而且还解决了通知的需求，让每个参与者都知道发生了什么，以及是否存在挂起的操作。这些通知由 Git 本身作为对特定操作的响应发送。控制谁接收哪个通知的方法是每个 Git 平台特有的，我希望您已经知道如何订阅、取消订阅或修改正在接收的 Git 通知。

例如，批准 PR 后发送的邮件如下。

```bash
[APPROVALNOTIFIER] This PR is APPROVED

This pull-request has been approved by: vfarciccb

The full list of commands accepted by this bot can be found here.

The pull request process is described here

Needs approval from an approver in each of these files:
OWNERS [vfarciccb]
Approvers can indicate their approval by writing /approve in a comment
Approvers can cancel approval by writing /approve cancel in a comment
```

总之，pull 请求得到了批准。结果，Prow 将其合并到主分支，并启动了一个 Pipeline 构建，该构建以将新版本部署到 staging 环境而告终。

在等到`All checks have passed`消息出现在 PR 消息中之后，就意味着整个流程已经结束。

这是对 Jenkins x 中的 ChatOps 的一个非常快速的概述。现在，您可以卷起袖子，探索 Prow、Tekton、Jenkins X Pipeline Operator 以及通过 serverless Jenkins X bundle 提供的其他工具。
