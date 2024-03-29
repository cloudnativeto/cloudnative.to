---
title: "2024 年 API 管理趋势预测"
summary: "本文预测了 2024 年 API 管理的六大趋势，包括多源 API、多种 API 标准和格式、API 技术的解耦、API 的自动化和智能化、API 的无服务器化和边缘化、以及 API 的 GitOps 化。"
authors: ["TheNewStack"]
translators: ["云原生社区"]
categories: ["Gateway"]
tags: ["API Gateway","Gateway"]
date: 2024-01-01T11:00:00+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://thenewstack.io/what-will-be-the-api-management-trends-for-2024/
---

本文译自：[What Will Be the API Management Trends for 2024?](https://thenewstack.io/what-will-be-the-api-management-trends-for-2024/)

我们已经审视了 2023 年的发展，并确定了几个可能在明年主导 API 管理领域的关键趋势。

根据一个想法：API 完全控制了数字世界，预测到本十年结束时，API 管理市场将增长六倍。

随着越来越多的公司转向 API 为先的架构，API 管理的需求变得至关重要。一家组织可能会管理数百甚至数千个微服务，它们需要工具来有效地编排和监控这些 API。

因此，随着这种增长的开始，API 管理在未来会带来什么？我们已经审视了 2023 年的发展，并确定了几个可能在 2024 年主导 API 管理领域的关键趋势。

## 是时候实行零信任了（这并不是坏事！）

随着 API 的不断增加，安全漏洞、黑客和 API 问题的风险也在增加。将零信任安全概念与你的 API 战略结合起来，倡导一种安全模型，其中不管交互发生在网络边界内还是外部，都不会假定信任。

这种方法要求对每个试图访问网络内资源的个人和设备进行严格的身份验证，有效地消除了传统的受信任的内部网络概念。在数据泄露和恶意行为者变得越来越复杂的时代，采用零信任框架对于全面的安全至关重要，包括 API、云服务和网络基础设施在内的所有技术方面。

在 API 管理领域，API 网关在实施零信任架构中起着关键作用。作为第一道防线，这些网关对每个 API 请求执行严格的身份验证和授权策略。它们负责验证凭据，管理访问令牌，并确保每个请求，无论来自组织内部还是外部，都要经过相同严格的安全检查。

在这个框架中，API 网关不仅仅是流量管理器；它们是安全姿态的一部分，将零信任原则嵌入到 API 交互的核心。它们帮助构建适应持续风险评估、基于上下文的访问控制和深度监控 API 使用模式的动态安全策略。

在零信任模型中，API 网关演变为安全执行者，对流经 API 的数据的完整性和机密性至关重要。这种演变强调了高级 API 管理工具在维护零信任原则和确保安全和弹性基础设施方面的重要性。

## “多体验架构”将成为常态

随着 2024 年 Gartner 的“多体验架构”概念变得越来越普遍，API 管理的复杂性将升级。组织不再只处理一种类型的 API；他们在同一应用生态系统中处理多种协议和架构。这种情况是现代应用多样性的结果，这些应用不仅包括基于 Web 的门户和本机移动应用，还包括扩展，如手表应用、实时对话界面和人工智能集成。

每个组件都需要特定的 API 方法。通常情况下，REST API 在外部通信中因其简单性和通用性而受欢迎，而 gRPC 由于其效率和速度而可能被选择用于内部服务通信。与此同时，GraphQL 因其创建联合图和子图的能力而越来越多地用于高度灵活和高效的数据检索，这对于复杂的客户端应用程序是必不可少的。此外，消息代理对于实现需要立即数据更新和交互的应用程序的实时通信至关重要。

在这种环境下，API 管理的挑战是多方面的。它涉及编排不同类型的 API 并确保在这些不同的架构中实现无缝集成、一致的安全执行和有效的性能监控。解决方案在于高级 API 管理工具和网关，它们能够处理这种多样性。这些工具必须提供复杂的功能，如协议转换、统一的安全策略和可以适应每种 API 类型的独特需求的分析。

因此，2024 年的 API 管理将涉及到拥抱和管理这种复杂性，提供一个有凝聚力和高效率的框架，支持多体验架构的各种需求。

## API 管理正在变成组织管理

有一个著名的故事，来自前亚马逊和谷歌工程师 Steve Yegge，讲述了 Jeff Bezos 在 2002 年在亚马逊网络服务（AWS）制定的一项核心任务：

1. 所有团队将通过服务接口公开其数据和功能。
2. 团队必须通过这些接口相互通信。
3. 不允许其他形式的进程间通信：不允许直接链接，不允许直接读取另一个团队的数据存储，不允许共享内存模型，也不允许任何后门。唯一允许的通信是通过网络上的服务接口调用。

4. 无论他们使用什么技术。HTTP、Corba、Pubsub、自定义协议——都无所谓。贝佐斯不关心。
5. 所有服务接口，没有例外，必须从头开始设计，以便能够将接口暴露给外部世界的开发人员。不允许例外。
6. 不这样做的人将被解雇。

贝佐斯正在为亚马逊的面向服务的体系结构打下基础。二十二年后，这一框架在技术领域普及。这意味着 API 管理实际上是团队在组织内部进行通信和操作的方式。

API 已经成为组织过程的生命线，代表了从孤立的功能到集成系统的转变。这种转变将 API 管理从技术任务转变为组织领导的核心方面。这带来了几个具体的变化：

- **战略对齐**。API 管理与业务战略密切对齐。它涉及理解 API 如何能够实现业务目标，如进入新市场、提升客户体验或简化运营。这种战略对齐要求 API 倡议与组织的方向和目标同步。
- **跨职能合作**。API 不再仅仅是 IT 部门的责任。它们需要跨各种功能领域的合作，包括营销、销售、客户服务和业务发展。这种合作确保 API 以支持多样化的组织需求和机会的方式开发和管理。
- **将 API 作为产品的思维方式**。API 越来越被视为产品，有专门的团队负责它们的生命周期，从构思到淘汰。这种方法涉及定期更新、用户反馈集成和持续改进，就像公司提供的任何其他产品或服务一样。
- **性能指标和分析**。API 的成功不仅通过技术性能来衡量，还通过其对业务结果的影响来衡量。诸如 API 使用趋势、用户参与度和对收入增长的贡献等指标成为 API 有效性的重要指标。

因此，API 的管理不再仅仅关于技术规范或协议，而是关于管理信息分享和服务交付的方式，跨整个组织。这种方法促进了敏捷性、可扩展性和创新，这在今天不断发展的技术领域中是必不可少的。

## GitOps 已经在 API 中使用

将 GitOps 集成到 API 管理中标志着 API 是如何更高效、透明和可靠地开发、部署和维护的一种显著转变。GitOps 是一种将 git 的版本控制原则应用于操作工作流程的方法，对于以更高效、透明和可靠的方式管理 API 的生命周期至关重要。

在这个框架中，API 的每个方面，从其设计文档和配置到代码和部署清单，都存储在 git 存储库中。这种方法确保了整个 API 生命周期都受到版本控制，允许详细跟踪更改，以及在出现问题时轻松回滚，增强了团队成员之间的协作。

自动化部署流程是使用 GitOps 管理 API 的一个关键优势。通过利用 git 作为唯一的真相来源，可以设置自动化流水线，以在提交更改时部署 API。这种自动化不仅限于简单的部署，还包括配置和策略的更新，确保 API 的所有方面都得到一致和可靠的更新。团队可以创建与 GitOps 工作流程直接集成的分散的声明性工作流，用于复杂的自定义配置。

GitOps 还为 API 管理带来了更高级别的安全性。关于更改的拉取请求鼓励同行审查和批准，为引入修改提供了更健壮的流程。此外，git 存储库的不可变性增加了额外的安全性层，因为每个更改都是被跟踪和可审计的。

GitOps 有望通过引入版本控制、自动化、安全和协作原则来改变 API 管理，从而使 API 开发和管理更加与现代敏捷实践相符，提高了效率和可靠性。

## 开发者体验将成为标配

在 2024 年，提供卓越的开发者体验（DevX）将不再是奢侈；它将成为一项必需。未将 DevX 置于优先位置的 API 管理系统越来越有被淘汰的风险，因为以开发者为中心的模式正在成为标准。

这一变革的基石在于认识到开发者需要与其工作流程相一致并增强生产力的工具和系统。这其中的一个关键方面是采用[基础设施即代码](https://thenewstack.io/why-use-infrastructure-as-code/)（IaC）实践。IaC 允许开发者通过代码而不是手动流程来管理和配置基础设施。

另一个关键因素是 API 管理系统支持各种部署环境的能力。随着部署模型的多样化，从本地部署到[云原生](https://www.getambassador.io/kubernetes-glossary/cloud-native)等，一个灵活的 API 管理解决方案，能够适应不同的环境至关重要。

API 管理系统必须不断发展，以满足现代软件开发实践的需求。未能提供以开发者为中心的体验的系统，其特点包括 IaC、与标准工具的集成、易用性、灵活性和强大的分析功能，将在开发者体验至关重要的环境中难以保持相关性。

## 捆绑随后的解绑

API 管理工具的演变正在见证回归到捆绑解决方案，这是与最近的点对点解决方案的趋势相反。与旧的企业捆绑解决方案不同，这些新一代捆绑解决方案适用于更广泛的组织范围，提供了综合的、集成的解决方案。

API 生态系统的不断复杂和规模的增加推动了这一转变。现代 API 管理需要一种全面的方法，包括强大的身份验证机制、严格的安全协议和自助开发者工具。通过将这些功能整合到[单一的、连贯的包中](https://www.getambassador.io/products/edge-stack/api-gateway)，捆绑解决方案提供了一种更简化和高效的 API 管理方式。

在这些捆绑解决方案中包括网关对于流量管理至关重要，提供了速率限制、请求路由和协议转换等功能。身份验证是另一个关键组成部分，确保通过 OAuth 和 JSON Web Tokens（JWT）等机制安全访问 API。这些捆绑解决方案中的安全功能不仅限于身份验证，还提供了全面的保护，防止 SQL 注入、DDoS 攻击和数据泄露等威胁。

[自助开发者工具](https://www.getambassador.io/products/telepresence)是这些捆绑解决方案的重要组成部分。它们赋予开发者独立创建、测试和部署 API 的能力，减少了对 IT 团队的依赖，加速了开发。这些工具必须包括用户友好的界面、详细的文档和自动化的测试功能。

API 管理中捆绑解决方案的再次出现代表着对现代 API 景观需求的适应。通过在一个统一的包中提供网关、身份验证、安全和开发者工具，这些捆绑解决方案提供了适用于各种组织需求的多功能和高效的解决方案。

## 未知的人工智能

人工智能正在颠覆数十个行业的规则，并以意想不到的方式重塑它们。

“意想不到”是描述人工智能/机器学习技术将如何扰乱 API 管理生态系统的好方式。KubeCon North America 2023 与 OpenAI Dev Day 同时举行，但两者似乎天差地别。在 KubeCon 上，AI 只轻微[提及](https://danielbryantuk.medium.com/kubecon-chicago-key-takeaways-3de5ca13b375)，似乎 DevOps 和 API 管理行业对人工智能没有太多（尚未！）言论。

但是，将 AI 排除在外将严重低估 AI 发展的范围和速度。去年这个时候，ChatGPT 才两周大。那时没有人知道它将如何彻底改变技术的各个方面。

因此，AI/机器学习与 API 战略的融合是不可避免的，可能会彻底改变 API 的开发、管理和优化方式。

- AI 驱动的分析可以提供对 API 使用模式的更深入洞察，从而实现更有效的资源管理和优化。
- AI 可以自动化和增强安全协议，比传统方法更有效地检测异常和潜在威胁。
- AI 可以显着简化 API 开发过程。通过使用机器学习算法，API 可以变得更加自适应和智能，能够以更高的准确性和效率处理复杂请求。这种集成可能导致自我优化的 API，根据实时反馈调整其行为。

AI 与 API 管理的交汇是即将到来的现实。随着 AI 继续渗透各个领域，其融入 API 生态系统将提供前所未有的效率、安全性和适应性水平，宣告了 API 管理和使用方式的新时代。

## 未知的未知

还有什么在未来？随着技术进步的极速和 API 已经吞噬了整个世界的方式，预测 API 管理的未来就像试图绘制未知领域一样困难。

这个领域正在迅速发展，受新兴技术和 Paradigm 转变的推动，这使得难以预见未来的变化的全部范围。就像 API 已经改变了数字基础设施一样，未来的创新和方法将进一步重新定义我们今天对 API 管理的理解。

请告诉我们你认为 2024 年将为 API 管理带来什么，以及你认为明年我们将使用什么令人兴奋的技术。