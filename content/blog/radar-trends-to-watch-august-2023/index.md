---
title: "O'Reilly：值得关注的雷达趋势（2023 年 8 月）"
summary: "O'Reilly 的雷达趋势报告列举了多个 AI、编程、安全、网络、加密货币、生物学和材料方面的趋势。其中包括 GPT-Prompt-Engineer、LlamaIndex、OpenAI 的代码解释器、WormGPT 等。此外，还有一些关于 Web 框架、浏览器、元宇宙、加密货币和室温常压超导体的趋势。"
authors: ["Mike Loukides"]
translators: ["宋净超"]
categories: ["其他"]
tags: ["技术趋势"]
date: 2023-08-10T13:05:42+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://www.oreilly.com/radar/radar-trends-to-watch-august-2023/
---

摘要：O'Reilly 的雷达趋势报告列举了多个 AI、编程、安全、网络、加密货币、生物学和材料方面的趋势。其中包括 GPT-Prompt-Engineer、LlamaIndex、OpenAI 的代码解释器、WormGPT 等。此外，还有一些关于 Web 框架、浏览器、元宇宙、加密货币和室温常压超导体的趋势。

本文译自：<https://www.oreilly.com/radar/radar-trends-to-watch-august-2023/>

人工智能依然是新闻头条。在过去的一个月中，我们看到了许多语言模型的重大更新：Claude 2，其上下文限制为 10 万个令牌；LLaMA 2，限制相对较宽松；以及 Stable Diffusion XL，是 Stable Diffusion 的一个功能更强大的版本。Claude 2 的巨大上下文是否真的改变了模型的能力？开放访问和开源语言模型在商业应用发展中将扮演什么角色？

## **人工智能**

- [Stable Diffusion XL](https://stability.ai/blog/stable-diffusion-sdxl-1-announcement) 是一个新的生成模型，扩展了 Stable Diffusion 的能力。它承诺更短、更容易的提示；正确地在图像内生成文本的能力；能够在私有数据上进行训练；以及更高质量的输出。在 [clipdrop](https://clipdrop.co/stable-diffusion) 上试用它。
- OpenAI [撤回了 OpenAI Classifier](https://arstechnica.com/information-technology/2023/07/openai-discontinues-its-ai-writing-detector-due-to-low-rate-of-accuracy/)，这是一个用于检测 AI 生成文本的工具，因为它的准确性不够高。
- ChatGPT 添加了一个名为“[Custom Instructions](https://openai.com/blog/custom-instructions-for-chatgpt)”的新功能。这个功能允许用户在任何其他用户生成的提示之前指定一个初始提示；实际上，它是一个个人的“系统提示”。这样可以让 Prompt Injection 更有趣。
- 高通正与 Facebook/Meta 合作，在像手机这样的小型设备上运行 [LLaMA 2](https://www.qualcomm.com/news/releases/2023/07/qualcomm-works-with-meta-to-enable-on-device-ai-applications-usi)，使得 AI 应用可以在本地运行。目标机器的大小将比开源和其他许可证的区别更少。
- StabilityAI 发布了两个新的大型语言模型，[FreeWilly1 和 FreeWilly2](https://stability.ai/blog/freewilly-large-instruction-fine-tuned-models)。它们分别基于 LLaMA 和 LLaMA 2。它们被称为开放访问（而不是开源），声称某些任务的性能类似于 GPT 3.5。
- [Chatbot Arena](https://chat.lmsys.org/?arena) 让 [聊天机器人互相对战](https://arxiv.org/abs/2306.05685)。用户输入提示，然后将其发送给两个未知（随机选择？）的语言模型。在生成响应后，用户可以宣布获胜者，并了解竞争的模型。
- GPT-4 解决问题的能力可能在过去几个月中 [有所下降](https://arxiv.org/pdf/2307.09009.pdf)，特别是它解决数学问题和生成正确的 Python 代码的能力似乎有所下降。另一方面，它对越狱攻击更加稳健。
- Facebook/Meta 发布了 [Llama 2](https://ai.meta.com/llama/)。虽然对其使用的限制较少，但它并不是 [开源的](https://blog.opensource.org/metas-llama-2-license-is-not-open-source/)，尽管 Facebook 声称它是。
- [Autochain](https://github.com/Forethought-Technologies/AutoChain) 是 Langchain 的一种轻量级、简化的替代品。它允许开发人员在大型语言模型和数据库之上构建复杂的应用程序。
- Elon Musk [宣布了](https://techxplore.com/news/2023-07-musk-xai-rival-openai-google.html) 他的新人工智能公司 xAI。这是否真正有助于人工智能或成为另一个花边，还有待观察。
- Anthropic 宣布了 [Claude 2](https://www.anthropic.com/index/claude-2)，这是他们大型语言模型的新版本。在 [claude.ai](https://claude.ai/login) 上提供了聊天界面，API 访问也可用。Claude 2 允许多达 10 万个令牌的提示，比其他 LLM 大得多，并且可以生成长度为“几千个令牌”的输出。
- [parsel](http://zelikman.me/parselpaper/) 是一个框架，帮助大型语言模型在涉及分层多步推理和问题解决的任务上做得更好。
- [gpt-prompt-engineer](https://github.com/mshumer/gpt-prompt-engineer) 是一个工具，它读取您希望 AI 执行的任务的描述，以及若干个测试用例。然后，它生成关于一个主题的大量提示，测试提示，然后对结果进行评分。
- [LlamaIndex](https://github.com/jerryjliu/llama_index) 是一个面向语言模型的 [数据框架](https://www.llamaindex.ai/)（有时被称为“编排框架”），简化了对用户数据进行索引并使用该数据构建复杂提示的过程。它可以与 [Langchain](https://python.langchain.com/docs/get_started/introduction.html) 一起用于构建复杂的 AI 应用程序。
- OpenAI 正在逐步发布其 [代码解释器](https://openai.com/blog/chatgpt-plugins)，它将允许 ChatGPT 执行它创建的任何代码，使用用户提供的数据，并将输出发送回用户。代码解释器可以减少幻觉、错误和错误的数学。
- 人类现在可以通过 [找到并利用 AI 系统的游戏弱点](https://goattack.far.ai/pdfs/go_attack_paper.pdf)，诱导 AI 犯下严重错误，从而打败 AI 的围棋。
- 时间到了提出存在性问题的时候：单个香蕉存在吗？[Midjourney 不这么认为](https://www.digital-science.com/tldr/article/the-lone-banana-problem-or-the-new-programming-speaking-ai/)。说真的，这是一篇关于设计适当的提示以提供适当结果的困难的优秀文章。
- [Jolly Roger Telephone Company](https://www.theregister.com/2023/07/03/jolly_roger_telephone_company/) 开发了基于 GPT-4 的语音机器人，可以雇佣它来回答电话，当推销员打电话时。如果你想听听，结果可能会很有趣。
- Apache Spark 现在有了一个 [English SDK](https://www.databricks.com/blog/introducing-english-new-programming-language-apache-spark)。它比 CoPilot 等工具更进一步，允许您在编写代码时直接使用英语。
- 人类可能会更愿意相信由 AI 生成的错误信息，可能是因为 AI 生成的文本比大多数人类文本更好结构化。或者，可能是因为 AI 很擅长说服。
- [OpenOrca](https://erichartford.com/openorca)是另一个基于 LLaMA 的开源语言模型和数据集。它的目标是复制 Microsoft 的[Orca](https://www.microsoft.com/en-us/research/publication/orca-progressive-learning-from-complex-explanation-traces-of-gpt-4/)的训练数据，该模型是使用 GPT-4 的链式思考提示和响应进行训练的。Orca 模型的主张是它可以复制 GPT-4 的“推理”过程。
- 在其[开发者峰会](https://thenewstack.io/snowflake-pushes-range-of-new-ai-developer-capabilities/)上，Snowflake 宣布了 Document AI：对非结构化文档集合的自然语言查询。该产品基于他们自己的大型语言模型，而不是 AI 提供商。

## **编程**

- “它在我的机器上运行”已经变成了“[它在我的容器中运行](https://dwdraju.medium.com/how-it-works-in-my-machine-turns-it-works-in-my-container-1b9a340ca43d)”：这篇文章提供了一些关于如何避免困扰计算机用户数十年的问题的好建议。
- StackOverflow 正在将 AI 集成到其产品中。StackOverflow for Teams 现在有一个[chatbot](https://stackoverflow.co/labs/slack/)来帮助解决技术问题，以及一个新的[GenAI StackExchange](https://genai.stackexchange.com/)用于讨论生成 AI，提示编写和相关问题。
- GitHub 泄露私钥和身份验证密钥并不是新闻。但是对 DockerHub 上可用的容器进行的研究表明，[Docker 容器也会泄露密钥和密码](https://www.bleepingcomputer.com/news/security/thousands-of-images-on-docker-hub-leak-auth-secrets-private-keys/)，其中许多密钥正在使用中。
- [Firejail](https://firejail.wordpress.com/)是一个 Linux 工具，可以在私有，安全的沙箱中运行任何进程。
- [复杂和复杂](https://spin.atomicobject.com/2023/07/10/complexity-software-information/)：有什么区别？它与信息有关，在“复杂系统”的时代，了解它很重要。第一部分。
- [npm-manifest-check](https://github.com/panki27/npm-manifest-check)是一个工具，用于[检查](https://www.bleepingcomputer.com/news/security/new-python-tool-checks-npm-packages-for-manifest-confusion-issues/)NPM 包中的内容与包的清单。这是解决 NPM 中恶意包问题的部分解决方案。
- Facebook 描述了他们的[软件开发平台](https://engineering.fb.com/2023/06/27/developer-tools/meta-developer-tools-open-source/)，其中大部分已经开源。很少有开发人员需要使用这么大的软件项目，但是他们的工具（包括测试框架，版本控制和构建系统）值得探究。
- [Polyrhythmix](https://github.com/dredozubov/polyrhythmix)是一个命令行程序，用于生成多节奏鼓部。没有涉及 AI。
- Philip Guo 的“[Real-Real-World Programming with ChatGPT](https://www.oreilly.com/radar/real-real-world-programming-with-chatgpt/)”展示了使用 ChatGPT 执行真实编程任务的情况：哪些工作得很好，哪些不好。

## **安全**

- 一个研究小组发现了一种方法来[自动生成攻击字符串](https://llm-attacks.org/)，以迫使大型语言模型生成有害内容。这些攻击可针对开源和闭源模型。AI 提供商无法防御它们还不清楚。
- 黑客集团 Lazarus Group 正在对 JavaScript 加密货币开发人员进行[社交工程攻击](https://socket.dev/blog/social-engineering-campaign-npm-malware)。开发人员被邀请在依赖于恶意 NPM 包的 Github 项目上进行合作。
- 语言模型是网络犯罪的下一个大事。一个名为[WormGPT](https://www.bleepingcomputer.com/news/security/openai-credentials-stolen-by-the-thousands-for-sale-on-the-dark-web/)的大型语言模型已经被开发用于网络犯罪。它基于 GPT-J。WormGPT 可在暗网上使用，以及成千上万的被盗 ChatGPT 凭据。
- 根据 MITRE 的研究，[越界写入](https://www.theregister.com/2023/06/29/cwe_top_25_2023/)是最危险的安全漏洞之一。它们也是最常见的，并且一直位列榜首。解决问题的简单方法是使用 Rust。

## **网络**

- 又一个 Web 框架？[Enhance](https://enhance.dev/)声称是 HTML 优先，只有在需要时才使用 JavaScript。实际情况可能并不那么简单，但如果没有其他东西，它证明了对复杂和臃肿的 Web 应用程序的不满正在增长。
- 又一个新的浏览器？[Arc](https://arc.net/) [重新思考](https://arstechnica.com/gadgets/2023/07/the-browsing-companys-unconventional-browser-arc-releases-publicly-on-mac/#p3)浏览体验，具有在选项卡组之间切换和自定义单个网站的功能。
- [HTMX](https://htmx.org/)提供一种使用 HTML 属性构建许多高级 Web 页面功能的方法，包括 WebSockets 和我们曾经称之为 Ajax。所有复杂性似乎都打包在一个 JavaScript 库中。
- 在元宇宙中有一家[律师事务所](https://www.technologyreview.com/2023/06/28/1074338/future-job-metaverse-lawyer/)，以及一个新兴的元宇宙律师协会。这是一个很好的会议地点，尽管律师不能获得在元宇宙中执业的许可。
- 欧洲法院（CJEU）裁定 Meta 的 GDPR 合规方法是非法的，Meta 可能不会在未经明确，自由授予的同意的情况下使用数据进行除核心功能之外的任何其他事情; 不在使用条款文件中隐藏的同意不足。

## **加密货币**

- 谷歌已更新其关于 Android 应用程序的[政策](https://android-developers.googleblog.com/2023/07/new-blockchain-based-content-opportunities-google-play.html)，允许应用程序提供基于区块链的资产，例如 NFT。
- ChatGPT 可以编程为[发送比特币付款](https://marginalrevolution.com/marginalrevolution/2023/07/teaching-gpt-to-send-bitcoin-payments.html)。正如第一个评论者指出的那样，这是 Langchain 的一个相当简单的应用。但这肯定会发生的事情。但问题是：我们何时会有基于 GPT 的加密货币套利？

## **生物学**

- Google 开发了[Med-PaLM M](https://arxiv.org/abs/2307.14334)，试图构建一个被训练用于生物医学应用程序的“通用”多模态 AI。Med-PaLM M 仍然是一个研究项目，但可能代表了将大型语言模型应用于医学的一步前进。

## **材料**

- [室温常压超导体](https://arxiv.org/abs/2307.12008)：这一说法引起了很多怀疑 - 但是一如既往，最好等到另一个团队成功或未能复制结果。如果这项研究成果成立，那么这是一个巨大的进步。
