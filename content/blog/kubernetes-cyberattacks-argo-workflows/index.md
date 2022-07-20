---
title: "Kubernetes 云集群面临通过 Argo Workflows 实施的网络攻击"
summary: "近几年开源越来越热，各种的工具层出不穷。仪表盘可以说是离用户最近的一层，也是安全最容易被疏忽的一处，尤其是很多仪表盘并未提供用户校验或者容易配置错误。"
authors: ["Tara Seals"]
translators: ["张晓辉"]
categories: ["安全"]
tags: ["Security"]
date: 2021-08-18T21:05:42+08:00
---
本文翻译自 [Kubernetes Cloud Clusters Face Cyberattacks via Argo Workflows](https://threatpost.com/kubernetes-cyberattacks-argo-workflows/167997/)。

## 译者点评

行业中一直不缺安全的声音，安全也是永远绕不过的槛。再优雅再先进的架构设计，无法保障安全也是一文不值，甚至干系到企业的存活。

近期在云原生领域，安全也是被屡次被提起重视。从 [Istio 首次安全评估结果公布](https://cloudnative.to/blog/istio-first-security-assessment/)、[CNCF 云原生安全白皮书发布](https://mp.weixin.qq.com/s/W8oT2YabhHNSLsWXJbPSnw)[美国国家安全局出品《Kubernetes 加固指南》](https://mp.weixin.qq.com/s/PRXtfz2Vc3Q8dhjoazY8Pw)、[《关键信息基础设施安全保护条例》的颁布](http://www.gov.cn/zhengce/content/2021-08/17/content_5631671.htm)看出，下到社区到基金会，上到国内外政府对安全的重视。

近几年开源越来越热，各种的工具层出不穷。仪表盘可以说是离用户最近的一层，也是安全最容易被疏忽的一处，尤其是很多仪表盘并未提供用户校验或者容易配置错误。

## 正文

Argo 的 web 仪表盘权限配置错误，会允许未经身份验证的攻击者在 Kubernetes 目标上运行代码，包括加密币挖掘容器。

安全研究人员发出警告，Kubernetes 集群正受到配置错误的 Argo Workflow 实例的攻击。

Argo Workflow 是一个开源的、容器原生的工作流引擎，用于在 Kubernetes 上编排并行作业 -- 以加快机器学习和大数据处理等计算密集型作业的处理时间。与此同时，Kubernetes 是一种流行的用于管理云部署的容器编排引擎。

根据 Intezer 的一项分析，由于一些实例不需要外部用户的认证可以直接通过仪表盘访问，恶意软件运营商正在通过 Argo 将加密旷工投放到云中。因此，这些错误配置的权限可以让威胁者在受害者的环境中运行未经授权的代码。

根据[周二发布](https://www.intezer.com/blog/container-security/new-attacks-on-kubernetes-via-misconfigured-argo-workflows)的 Intezer 的分析，"在许多情况下，配置了允许任何访问用户部署工作流程的权限。在权限配置错误的情况下，攻击者有可能访问一个开放的 Argo 仪表盘并提交他们自己的工作流程。

研究人员说，这些错误配置还可能暴露敏感信息，如代码、凭证和私有容器镜像名称（可用于协助其他类型的攻击）。

Intezer 对网络的扫描发现了大量未受保护的实例，这些实例由多个行业的公司运营，包括技术、金融和物流。

Intezer 表示："我们已经确定了受感染的节点，由于存在数百个错误配置的部署，有可能出现更大规模的攻击"。在一个案例中，坏代码在 Docker Hub 的一个暴露的集群上运行了 9 个月才被发现并删除。

攻击的实施并不困难。研究人员观察到，不同的流行 Monero（门罗币）挖掘恶意软件被部署在位于 Docker Hub 等资源库的容器中，包括 Kannix 和 XMRig。网络犯罪分子只需要通过 Argo 或其他途径将这些容器中的一个拉入 Kubernetes。例如，微软最近[标记了](https://threatpost.com/microsoft-cryptomining-kubeflow/166777/) 通过运行机器学习工作流程的 Kubeflow 框架侵占 Kubernetes 的一些矿工。

研究人员称：“在 Docker Hub 中，仍然存在许多攻击者可以使用的门罗币挖矿选择。通过简单的搜索，可以看到至少有 45 个有数百万下载量的容器”

## 如何检查 Argo 的错误配置

研究人员指出，查看权限是否配置正确的最快方法是简单地尝试从企业环境之外的未经认证的隐身浏览器访问 Argo Workflows 仪表盘。

研究人员补充说，一种更主动技术的检查方法是访问实例的 API 并检查状态码。

根据分析，“向 [实例:端口]/api/v1/info 发送 HTTP GET 请求，未经授权的用户将收到‘411 Unauthorized’响应状态码，这说明实例配置正确，而成功的响应状态码‘200 Success’可能表明未经授权的用户能够访问该实例”。

管理员还可以检查日志和工作流时间线中的任何可疑活动。Intezer 指出，任何运行时间过长的工作流都可能表明存在加密挖矿活动。

研究人员指出，“即使你的集群部署在 Amazon Web Services（AWS）、EKS 或者 Azure Kubernetes Service（AKS）等托管的云 Kubernetes 服务上，责任共担模型仍声明需要为部署的应用安全负责的是云用户，而不是供应商。”

## 云错误配置为网络攻击提供媒介

错误配置[持续困扰](https://threatpost.com/google-cloud-buckets-exposed-misconfiguration/159429/)着云计算部门和各种规模的组织。去年秋天的一项分析发现，6% 的谷歌云存储桶被错误配置，并向公网开放，任何人都可以访问其内容。

有时这些失误会成为头条新闻。3 月，[有消息称](https://threatpost.com/hobby-lobby-customer-data-cloud-misconfiguration/164980/)，Hobby Lobby 将 138GB 的敏感信息放在一个向公网开放的云存储桶中。这些信息包括客户的姓名、支付卡的部分详细信息、电话号码以及实际地址和电子邮件地址。

根据云原生计算基金会（CNCF）[2020 年调查](https://www.cncf.io/wp-content/uploads/2020/11/CNCF_Survey_Report_2020.pdf)，91% 的受访者正在使用 Kubernetes，受访者称使用和部署容器的首要挑战是复杂性、安全性和缺乏培训。

Intezer 研究人员指出，“Kubernetes......是 GitHub 上最受欢迎的存储库之一，有超过 10 万个提交，超过 3000 个贡献者。每年，使用 Kubernetes 的企业和他们部署的集群数量都在稳步增加。由于企业使用容器和 Kubernetes 集群所面临的这些挑战，攻击者从未有更大的机会来利用安全方面的弱点......仍然存在错误配置或利用的可能性。”
