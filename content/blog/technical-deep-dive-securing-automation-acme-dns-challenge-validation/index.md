---
title: "深入探讨：ACME DNS 质询验证的自动化"
date: 2023-01-10T08:00:00+08:00
draft: false
authors: ["Joona Hoikkala"]
summary: "本文深入探讨了 DNS 质询的自动化。"
tags: ["安全","证书","DNS"]
categories: ["安全"]
translators: ["宋净超"]
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://www.eff.org/deeplinks/2018/02/technical-deep-dive-securing-automation-acme-dns-challenge-validation
---

注：原文发布于 2018 年 2 月 26 日。

2018 年 [Let's Encrypt](https://www.letsencrypt.org/) （免费、自动化、开放的证书颁发机构 EFF 在两年前帮助推出）达到了一个巨大的里程碑： [颁发了超过 5000 万个有效证书](https://www.eff.org/deeplinks/2018/02/lets-encrypt-hits-50-million-active-certificates-and-counting)。而且这个数字只会继续增长，因为几周后 Let's Encrypt 也将开始颁发“通配符”证书 —— 这是许多系统管理员一直要求的功能。

## 什么是通配符证书？

为了验证 HTTPS 证书，用户的浏览器会检查以确保证书中实际列出了网站的域名。例如，来自 `www.eff.org` 的证书实际上必须将 `www.eff.org` 列为该证书的有效域。如果所有者只想对他的所有域使用一个证书，则证书还可以列出多个域（例如，`www.eff.org`、`ssd.eff.org`、`sec.eff.org` 等）。通配符证书只是一个证书，上面写着“我对这个域中的所有子域都有效”，而不是明确地将它们全部列出。（在证书中，这是通过使用通配符来表示的，用星号表示。所以如果你今天检查 eff.org 的证书，它会说它对 *.eff.org 有效。）这样，

为了颁发通配符证书，Let's Encrypt 将要求用户通过使用基于 [DNS](https://en.wikipedia.org/wiki/Domain_Name_System) 的质询来证明他们对域的控制，DNS 是一种域名系统，可将 `www.eff.org` 等域名转换为 69.50.232.54 等 IP 地址。从像 Let's Encrypt 这样的证书颁发机构 (CA) 的角度来看，没有比修改其 DNS 记录更好的证明您控制域的方法，因为控制域是 DNS 的本质。

但 Let's Encrypt 背后的一个关键思想是获取证书应该是一个自动过程。但是，为了实现自动化，请求证书的软件还需要能够修改该域的 DNS 记录。为了修改 DNS 记录，该软件还需要能够访问 DNS 服务的凭据（例如登录名和密码，或加密令牌），并且这些凭据必须存储在自动化发生的任何地方。在许多情况下，这意味着如果处理该过程的机器受到威胁，DNS 凭据也会受到威胁，这才是真正的危险所在。在本文的其余部分，我们将深入探讨该过程中涉及的组件，以及使它更安全的选项。

## DNS 质询如何运作？

在高层次上，DNS 质询的工作方式与作为 ACME 协议一部分的所有其他自动质询一样 —— 证书颁发机构 (CA)（如 Let's Encrypt）和客户端软件（如 Certbot）使用该协议来就服务器请求的证书进行通信，以及服务器应该如何证明相应域名的所有权。在 DNS 质询中，用户使用支持 DNS 质询类型的 Certbot 等 ACME 客户端软件向 CA 申请证书。当客户端请求证书时，CA 要求客户端通过向其 DNS 区域添加特定的 TXT 记录来证明对该域的所有权。更具体地说，CA 向 ACME 客户端发送一个唯一的随机令牌，并且控制域的任何人都应该将此 TXT 记录放入其 DNS 区域，在名为 `_acme-challenge` 的预定义记录中。当令牌值添加到 DNS 区域时，客户端告诉 CA 继续验证质询，之后 CA 将向域的权威服务器执行 DNS 查询。如果权威 DNS 服务器回复包含正确质询令牌的 DNS 记录，则证明域的所有权并且证书颁发过程可以继续。

## DNS 控制数字身份

DNS 区域泄露之所以如此危险，是因为 DNS 是用户的浏览器所依赖的，以了解他们在尝试访问您的域时应该联系的 IP 地址。这适用于在您的域下使用可解析名称的每项服务，从电子邮件到 Web 服务。当 DNS 受到威胁时，恶意攻击者可以轻松拦截指向您的电子邮件或其他受保护服务的所有连接，终止 TLS 加密（因为他们现在可以证明对该域的所有权并为其获取自己的有效证书），阅读明文数据，然后重新加密数据并将连接传递到您的服务器。对于大多数人来说，这很难被发现。

## 独立和有限的特权

严格来说，为了让 ACME 客户端以自动方式处理更新，客户端只需要访问可以更新 `_acme-challenge` 子域的 TXT 记录的凭据。不幸的是，大多数 DNS 软件和 DNS 服务提供商不提供允许限制这些权限的精细访问控制，或者根本不提供 API 来处理基本 DNS 区域更新或传输之外的自动化。这使得可能的自动化方法无法使用或不安全。

一个简单的技巧可以帮助克服这些限制：使用 [CNAME 记录](https://en.wikipedia.org/wiki/CNAME_record)。CNAME 记录本质上充当到另一个 DNS 记录的链接。Let's Encrypt 遵循 CNAME 记录链，并将解析链中最后一条记录的质询验证令牌。

## 缓解问题的方法

即使使用 CNAME 记录，潜在的问题仍然存在，即 ACME 客户端仍然需要访问允许它修改某些 DNS 记录的凭据。有不同的方法可以缓解这个潜在的问题，在泄露的情况下具有不同程度的复杂性和安全影响。在接下来的部分中，本文将介绍其中一些方法，同时尝试解释如果凭据被泄露可能产生的影响。除了一个例外，它们都使用 CNAME 记录。

### 只允许更新 TXT 记录

第一种方法是创建一组具有仅允许更新 TXT 记录的权限的凭证。在泄露的情况下，此方法将影响限制为攻击者能够为 DNS 区域内的所有域颁发证书（因为他们可以使用 DNS 凭据来获取自己的证书），以及中断邮件传递。对邮件传递的影响源于邮件特定的 TXT 记录，即 [SPF](https://en.wikipedia.org/wiki/Sender_Policy_Framework)、 [DKIM](https://en.wikipedia.org/wiki/DomainKeys_Identified_Mail)、其扩展名 [ADSP](https://en.wikipedia.org/wiki/Author_Domain_Signing_Practices) 和 [DMARC](https://en.wikipedia.org/wiki/DMARC)。泄露这些还可以很容易地发送网络钓鱼电子邮件，这些电子邮件冒充来自相关受感染域的发件人。

### 使用“一次性”验证域

第二种方法是为 `_acme-challenge` 子域手动创建 CNAME 记录，并将它们指向一个验证域，该验证域位于由一组不同的凭据控制的区域中。例如，如果您想获得涵盖 `yourdomain.tld` 和 `www.yourdomain.tld` 的证书，则必须创建两个 CNAME 记录 ——`_acme-challenge.yourdomain.tld` 和 `_acme-challenge.www.yourdomain.tld`—— 并将它们都指向外部域以进行验证。

用于质询验证的域应位于外部 DNS 区域或具有自己的一组管理凭据的子委托 DNS 区域中。（子委托 DNS 区域是使用 NS 记录定义的，它有效地将对该区域的一部分的完全控制委托给外部机构。）

这种方法的泄露影响相当有限。由于实际存储的凭据是针对外部 DNS 区域的，因此获得凭据的攻击者只能获得为指向该区域中的记录的所有域颁发证书的能力。

然而，弄清楚哪些域确实指向那里是微不足道的：攻击者只需阅读 [证书透明度](https://www.certificate-transparency.org/) 日志并检查这些证书中的域是否具有指向受感染 DNS 区域的神奇子域。

### 有限的 DNS 区域访问

如果您的 DNS 软件或提供商允许创建绑定到子域的权限，这可以帮助您缓解整个问题。不幸的是，在发布时，我们发现唯一允许这样做的提供商是 [Microsoft Azure DNS](https://docs.microsoft.com/en-us/azure/dns/dns-protect-zones-recordsets)。据推测，Dyn 也有细粒度的权限，但我们无法在他们的服务中找到除“更新记录”之外的更低级别的权限，这仍然使该区域完全容易受到攻击。

Route53 和其他可能允许他们的用户创建子委托区域、新用户凭据、将 NS 记录指向新区域，并使用 CNAME 记录将 `_acme-challenge` 验证子域指向他们。使用这种方法正确地进行特权分离需要做很多工作，因为人们需要为他们想要使用 DNS 挑战的每个域完成所有这些步骤。

### 使用 ACME-DNS

作为免责声明，下面讨论的软件由作者编写，并用作以安全方式处理 DNS 质询自动化所需凭据所需功能的示例。最后一种方法是一款名为 ACME-DNS 的软件，专为解决这个问题而编写，它能够完全缓解这个问题。一个缺点是它为您的基础设施增加了一项需要维护的东西，以及对公共互联网开放 DNS 端口 (53) 的要求。ACME-DNS 充当具有有限 HTTP API 的简单 DNS 服务器。API 本身只允许更新自动生成的随机子域的 TXT 记录。没有方法可以请求丢失的凭据、更新或添加其他记录。它提供了两个端点：

- /register：此端点生成一个新的子域供您使用，并附有用户名和密码。作为可选参数，注册端点采用 CIDR 范围列表，以从中进行白名单更新。
- /update：此端点用于将实际质询令牌更新到服务器。

为了使用 ACME-DNS，您首先必须为其创建 A/AAAA 记录，然后将 NS 记录指向它以创建委托节点。之后，您只需通过 /register 端点创建一组新的凭据，并将 CNAME 记录从原始区域的 `_acme-challenge` 验证子域指向新生成的子域。

唯一保存在本地的凭据是用于 ACME-DNS 的凭据，它们仅适用于更新验证子域的确切 TXT 记录。这有效地限制了可能的危害对攻击者能够为这些域颁发证书的影响。有关 ACME-DNS 的更多信息，请访问 <https://github.com/joohoi/acme-dns/>。

## 结论

为了缓解 ACME DNS 挑战验证的问题，已经讨论了向 IETF 的 ACME 工作组提出的[辅助 DNS 等提案，但目前仍未得到解决](https://mailarchive.ietf.org/arch/msg/acme/6_j3fecaxIgwNTpJ3693U_n0Kec)。由于限制泄露的唯一方法是将 DNS 区域凭据权限限制为仅更改特定的 TXT 记录，因此当前安全地实现 DNS 验证自动化的可能性很小。唯一可持续的选择是让 DNS 软件和服务提供商要么实施方法来创建更细粒度的区域凭据，要么为这个确切的用例提供全新类型的凭据。