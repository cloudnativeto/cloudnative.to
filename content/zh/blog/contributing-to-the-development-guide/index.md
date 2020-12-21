---
title: "为《Kubernetes 开发指南》提交贡献"
description: "一个新的贡献者讲述为《Kubernetes 开发指南》做贡献的经验。"
author: "[Erik L. Arneson](https://www.linkedin.com/in/elarneson/)"
translator: "[杨冉宁](https://github.com/hyfj44255)"
image: "images/blog/contributing-k8s.jpeg"
categories: ["Kubernetes","贡献开源"]
tags: ["Kubernetes","贡献开源"]
date: 2020-12-17T13:05:42+08:00
type: "post"
avatar: "/images/profile/Erik-L-Arneson.jpeg"
profile: "一位软件开发人员，自由作家和研究顾问。"
---

本文译自 [Contributing to the Development Guide](https://www.kubernetes.dev/blog/2020/09/28/contributing-to-the-development-guide/)

我猜大多数人提到为开源工程做贡献，他们想到的是贡献代码，新的功能，还有修复 bug。作为一个长期使用开源应用并也贡献了很多代码的软件开发工程师，我也确实是这么想的。尽管我已经在同的工作流中贡献了大量的文档，但这么大的 Kubernetes 社区对我来说仍然是个新工作对象。当 Google 要求我的同胞和我在 [Lion's Way](https://lionswaycontent.com/) 上对《 Kubernetes 开发指南》进行急需的更新时，我还是不知道会发生什么。

## 和社区合作的乐趣
作为一个专业作家，我们习惯于被雇来写一些具体的作品。我们专门从事技术服务和产品的营销，培训和文档，范围从相对宽松的营销电子邮件到针对 IT 和开发人员的深入技术白皮书。凭借这种专业服务，每一项交付成果往往都有可衡量的投资回报。我当时也晓得以这样的标准做开源文档会很不同，但我还是预测不了它能怎么改变我之前的认知。

我们贡献开源项目文档和之前给传统客户做工作，一个主要的特点就是，我们和公司内部总会有一两个主要的负责人。有这些负责人来审阅我们的文章，并保证文章是按公司想要的方式来的，而且也是目标受众客户需要的。这种方式对我们来讲压力比较大，这也是为啥我很庆幸我的写作搭档 [Joel](https://twitter.com/JoelByronBarker) 帮我处理这些来自客户方的负责人，他是一个目光敏锐的审稿人和能干的编辑。

当我和 Kubernetes 社区合作，这些来自客户方的压力都烟消云散了，我觉得非常惊喜。

我第一次加入到 Kubernetes 社区一个叫 #sig-contribex 的 slack 聊天群，当时我说我将着手编写[《Kubernetes 开发指南》](https://github.com/kubernetes/community/blob/master/contributors/devel/development.md)，我脑子闪过了很多问题，像“我得多精细”，“我搞砸了怎么办？”，“把开发者们惹火了怎么办，这不就有仇家了吗！”，一想到这些我就感觉如履薄冰。

![img](images/jorge-castro-code-of-conduct.jpg)

>“《Kubernetes 行为准则》已经生效，因此请彼此做到卓越。” — SIG ContribEx 联合主席 Jorge Castro

我的担心是多余的，当时我就感到社区伙伴们很接纳我。我认为这不仅是因为我正在完成一项急需的任务，更是因为 Kubernetes 社区充满了友好氛围。 SIG ContribEx 周会上马上有了我们《Kubernetes 开发指南》的进度报告。另外，带头人一直强调[《Kubernetes 代码规范》](https://www.kubernetes.dev/resources/code-of-conduct/) 已经生效了，所以我们应当像 Bill 和 Ted 那样，每个人都追求优秀。

## 也不意味着没有一点难度

《Kubernetes 开发指南》需要很大规模的修整。里面已放满了很多信息，还有很多新开发人员需要知道的步骤，但是很长时间没有更新，还有许多遗漏的地方。修改文档真的是需要一个整体的视角，而不单单只是修整某些单独的点。最后我给 [社区库](https://github.com/kubernetes/community) 提了一个大大的 PR，修改很大，267 个新增，88 个删除。

提到社区的 PR 需要 一些 Kubernetes 组织成员的校对才能批准合并。这是一个很好的做法，因为文档中含有代码，可以把格式调整的很完美，找合适的人来帮忙校对也很难，因为校对工作也很费时费力。从第一次提交到最后合并，这些 PR 用了我 26 天，好在最后都 [成功了](https://github.com/kubernetes/community/pull/5003)。

像写 Markdown 文档还不是最难的，因为 Kubernetes 更新很快 ，开发者对写文档还额外不感冒，还会遇到比如，对 Kubernetes 子系统的如何工作的关键描述，被我们的 [开发牛人](https://github.com/amwat) 藏在他们迷宫一样的大脑里，当需要更新入门文档以进行端到端 (e2e) 测试时，我遇到了这个问题。

因为这些我的角色换了，脱离了编写文档的领域，成为了某些未完成软件的全新用户。我最终与新的 [kubetest2 框架](https://github.com/kubernetes-sigs/kubetest2) 的一名开发人员合作，记录了 e2e 测试启动和运行的最新过程，但是这需要我做很多事情。 大家可以看哪些我已 [完成的 PR](https://github.com/kubernetes/community/pull/5045)，就能知道有多难了。

## 没人说了算，但所有人都会给反馈

我本以为会出现混乱，但《Kubernetes 开发指南》的编写还有和 Kubernetes 社区的交流都很顺利。没有争执，也没人记我仇，所有人都非常的友好热情，我很享受这一过程。

在开源的项目里，没有谁说了算。Kubernetes 工程越来越大，已经被分成了许多不同的特殊兴趣小组 (SIG)，工作组，还有社区。每个都有自己的经常性固定的会议、分配的任务、选举的主席。我的工作与 SIG ContribEx（负责监督并寻求改善贡献者体验的工作）和 SIG Testing（负责测试的工作）相交。 事实证明，这两个 SIG 的伙伴共事起来都很轻松，他们都很渴望贡献自己的力量，他们都非常的友好和热情。

像 Kubernetes 这样正活跃的项目中，文档需要持续与代码库一起进行维护，修订和测试。《Kubernetes 开发指南》对于加入 Kubernetes 代码库的新贡献者将继续至关重要，正如我们的努力表明的那样，该指南必须与 Kubernetes 项目的发展保持同步。

我和 Joel 非常喜欢与 Kubernetes 社区进行互动并为《Kubernetes 开发指南》做出贡献。 我期待不仅可以继续做出更多贡献，而且还希望继续建立过去几个月来我在这个庞大的开源社区中建立的新友谊。
