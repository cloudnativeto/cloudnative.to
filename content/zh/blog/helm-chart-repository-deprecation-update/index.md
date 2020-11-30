---
title: "Helm Chart 仓库弃用更新"
description: "Helm Chart 仓库更换地址，旧仓库地址将被弃用。"
author: "[Helm 官方](https://www.cncf.io/blog/2020/11/05/helm-chart-repository-deprecation-update/)"
translator: "[马景贺（小马哥）](https://github.com/majinghe)"
image: "images/blog/helm.jpg"
categories: ["Helm"]
tags: ["Helm"]
date: 2020-11-12T13:05:42+08:00
type: "post"
avatar: "/images/profile/helm.jpg"
profile: "Helm 是发现、共享和使用构建在 Kubernetes 上软件的最好方式。"
---

本文译自 [Helm Chart Repository Deprecation Update](https://www.cncf.io/blog/2020/11/05/helm-chart-repository-deprecation-update/)

在 2019 年，当 Helm v2 的支持时间表和 [终止计划](https://github.com/helm/charts#deprecation-timeline) 被宣布的时候，[helm/charts GitHub 仓库](https://github.com/helm/charts) 的弃用也同时被宣布。对于弃用的最主要原因是 [仓库维护人员](https://github.com/helm/charts/blob/master/OWNERS) 的维护成本显著增加。在过去的几年里，受维护的 charts 数量从约 100 增加到 300 个以上，这也导致了对于仓库的拉取请求和更新需求相应增加。很不幸的是，尽管采取了很多的措施来实现自动 review 和维护任务，但是维护人员能抽出的可用时间却没有增加。

当我们开始宣布弃用的时候，我们已经开始着手分享我们曾经用来维护 helm/charts 仓库的工具和指导文档。对于那些想要自己保持和维护自己仓库的小伙伴们，你们现在已经有工具能完成以下流程：

* [Chart 测试](https://github.com/helm/chart-testing) 为你的 charts PR 提供 lint 和测试
* [Chart 发布](https://github.com/helm/chart-releaser) 提供工具来帮助你使用 GitHub Releases 和 pages 功能来管理你自己的 chart 仓库
* [测试和发布 GitHub Action](https://github.com/helm?q=chart+action) 自动化调用上述工具。

在上述工具的帮助下我们就能使很多 charts 迁移到 [他们自己的仓库](https://github.com/helm/charts/issues/21103) 了，以便于进一步的维护。

## 关键时间点和建议行动

我们对上述计划和接下来发生的事情可能会有的困惑/疑问进行了提炼，并提供了关键事件时间表和建议的后续行动：

* 2020 年 11 月 2 号——所有非弃用 charts 的 README 中将会添加一个注释信息，以表明这些 charts 将不再更新
  * **推荐行动** —— 如果你依赖于 Charts 仓库中的 chart，那么就需要寻找新的官方地址了。如果没有依赖，那就使用自己的 chart 即可。

* 2020 年 11 月 6 号——稳定和孵化 charts 仓库将从 [Artifact Hub](https://artifacthub.io) 中删除
  * **推荐行动**——无

* 2020 年 11 月 13 号——[helm/charts 仓库](https://github.com/helm/charts) 中的 CI 将被停用并且不再接受拉取请求
  * **推荐行动**——关于正在进行的重新安置 charts 到新仓库的方案的更多信息，可以查看 [这个 issue](https://github.com/helm/charts/issues/21103)

* 2020 年 11 月 13 号以后——使用旧地址下载 Charts 将会被重定向到在 GitHub pages 上可用的归档地址。在这个日期以后旧下载地址将不再可用。
  * **推荐行动**——查看 [切换至归档的稳定和孵化仓库](https://helm.sh/docs/faq/#i-am-getting-a-warning-about-unable-to-get-an-update-from-the-stable-chart-repository) 的相关信息。切记那些 charts 将不再被更新，包括 bug 修复和安全补丁。

## 参考

* [Charts 仓库弃用时间表](https://github.com/helm/charts/issues/23944)
* [历史版本的归档](https://github.com/helm/charts/issues/23850)
* [请求让 CNCF 托管 Helm Charts](https://github.com/helm/community/issues/114)
