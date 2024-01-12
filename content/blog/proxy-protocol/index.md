---
title: "Proxy 协议"
summary: "本文译自 Proxy Protocol 定义文档。"
authors: ["HAProxy"]
translators: ["云原生社区"]
categories: ["开源"]
tags: ["proxy protocol","haproxy"]
date: 2024-01-12T12:00:00+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://github.com/haproxy/haproxy/blob/master/doc/proxy-protocol.txt
---

## 版本 1 和 2

**摘要**

PROXY 协议提供了一种方便的方式，可以安全地传输连接信息，例如客户端的地址，跨越多层 NAT 或 TCP 代理。它旨在对现有组件进行少量更改，并限制由传输信息处理引起的性能影响。

**修订历史**

- 2010/10/29 - 第一个版本
- 2011/03/20 - 更新：实现和安全性考虑
- 2012/06/21 - 添加对二进制格式的支持
- 2012/11/19 - 最终审查和修复
- 2014/05/18 - 修改和扩展 PROXY 协议版本 2
- 2014/06/11 - 修复示例代码以考虑 ver+cmd 合并
- 2014/06/14 - 修复示例代码中的 v2 头检查，并更新 Forwarded 规范
- 2014/07/12 - 更新实现列表（添加 Squid）
- 2015/05/02 - 更新实现列表和 TLV 附加组件的格式
- 2017/03/10 - 添加校验和、noop 和更多与 SSL 相关的 TLV 类型、保留的 TLV 类型范围、添加 TLV 文档、澄清字符串编码。Andriy Palamarchuk（Amazon.com）的贡献。
- 2020/03/05 - 添加唯一 ID TLV 类型（Tim Düsterhus）

## 1. 背景

通过代理中继 TCP 连接通常会导致原始 TCP 连接参数的丢失，例如源地址、目标地址、端口等等。一些协议使得传输此类信息变得稍微容易一些。对于 SMTP，Postfix 的作者提出了 XCLIENT 协议[1]，它得到了广泛的采用，特别适用于邮件交换。对于 HTTP，存在"Forwarded"扩展[2]，旨在替代普遍存在的"X-Forwarded-For"头部，该头部携带有关原始源地址的信息，以及较不常见的 X-Original-To 头部，该头部携带有关目标地址的信息。

但是，这两种机制都需要在中间件中实施对底层协议的了解。

然后出现了一类新的产品，我们将其称为"愚蠢的代理"，并不是因为它们什么都不做，而是因为它们处理协议无关的数据。Stunnel[3]和 Stud[4]都是这种"愚蠢的代理"的示例。它们一侧使用原始 TCP，另一侧使用原始 SSL，而且可以可靠地执行，而不需要了解在连接的顶部传输的协议是什么。当 HAProxy 以纯 TCP 模式运行时，显然也属于这个类别。

当将这种代理与另一个代理（如 haproxy）结合使用时，它的问题在于使其适应高级别协议进行通信。已经为 Stunnel 提供了一个补丁，使其能够在每个传入连接的第一个 HTTP 请求中插入 X-Forwarded-For 头部。当连接来自 Stunnel 时，HAProxy 可以不添加另一个头部，以便可以将其隐藏在服务器端。

典型的架构如下所示：

```
      +--------+      HTTP                      :80 +----------+
      | client |  --------------------------------> |          |
      |        |                                    | haproxy, |
      +--------+             +---------+            |  1 or 2  |
     /        /     HTTPS    | stunnel |  HTTP  :81 | listening|
    <________/    ---------> | (server | ---------> |  ports   |
                             |  mode)  |            |          |
                             +---------+            +----------+
```

当 HAProxy 在向客户端的一侧启用了保持活动时，问题就出现了。Stunnel 补丁将仅在每个连接的第一个请求中添加 X-Forwarded-For 头部，并且所有后续的请求将不会有它。一种解决方案可能是改进补丁，使其支持保持活动，并解析所有转发的数据，无论它们是使用 Content-Length 还是 Transfer-Encoding 进行通告，同时注意特殊的方法，例如 HEAD，它们宣布数据而不传输它们等等。实际上，这将需要在 Stunnel 中实现一个完整的 HTTP 堆栈。然后它会变得更加复杂，可靠性更差，并且不再是适用于所有目的的"愚蠢的代理"。

实际上，我们不需要为每个请求添加一个头部，因为我们将每次发出相同的信息：与客户端端口连接相关的信息。然后，我们可以在 HAProxy 中缓存该信息，并将其用于每个其他请求。但这变得危险，并且仍然仅限于 HTTP。

另一种方法是在每个连接前添加一个报头，报告另一侧连接的特征。这种方法更容易实施，不需要在任一侧具有任何特定于协议的知识，并且完全适合目的，因为确切的目标是了解另一侧连接的端点。对于发送方来说执行起来很容易（只需在建立连接后发送一个简短的报头），对于接收方来说解析也很容易（只需在接收连接后执行一次 read() 来填充地址）。用于在代理之间传递连接信息的协议因此被称为 PROXY 协议。

## 2. PROXY 协议头

本文使用一些值得在这里解释的术语：
- "连接发起方"是请求新连接的一方。
- "连接目标"是接受连接请求的一方。
- "客户端"是请求连接的一方。
- "服务器"是客户端希望连接的一方。
- "代理"是拦截并中继连接的一方，从客户端到服务器。
- "发送方"是在连接上发送数据的一方。
- "接收方"是从发送方接收数据的一方。
- "头部"或"PROXY 协议头"是连接发起方在连接开始时添加的连接信息块，从协议的角度来看，它成为发送方。

PROXY 协议的目标是用代理收集的信息填充服务器的内部结构，如果客户端直接连接到服务器而不是通过代理连接，服务器本身也可以获得这些信息。协议携带的信息是服务器使用 getsockname() 和 getpeername() 获得的信息：
- 地址族（AF_INET 表示 IPv4，AF_INET6 表示 IPv6，AF_UNIX）
- 套接字协议（SOCK_STREAM 表示 TCP，SOCK_DGRAM 表示 UDP）
- 第 3 层源和目标地址
- 如果有的话，第 4 层源和目标端口

与 XCLIENT 协议不同，PROXY 协议被设计为具有有限的可扩展性，以帮助接收方快速解析它。版本 1 侧重于保持人类可读性，以获得更好的调试可能性，这在早期采用时是非常有用的，因为存在很少的实现。版本 2 增加了对头部的二进制编码的支持，这在处理昂贵的以 ASCII 形式发出和解析的 IPv6 地址时要高效得多。

在两种情况下，协议只包括由连接发起方放置在每个连接开头的易于解析的头部。协议故意是无状态的，不期望发送方在发送头部之前等待接收方，也不期望接收方发送任何数据回来。

此规范支持两种头部格式，一种是人类可读的格式，是协议版本 1 唯一支持的格式，另一种是二进制格式，只有协议版本 2 支持。这两种格式都经过设计，以确保头部不会与常见的高级协议（如 HTTP、SSL/TLS、FTP 或 SMTP）混淆，并且接收方可以轻松区分它们。

版本 1 的发送方只能生成人类可读的头部格式。版本 2 的发送方只能生成二进制头部格式。版本 1 的接收方必须至少实现人类可读的头部格式。版本 2 的接收方必须至少实现二进制头部格式，并建议它们也实现人类可读的头部格式，以获得更好的互操作性和在面对版本 1 发送方时更容易升级的便利性。

这两种格式都经过设计，以适应任何 TCP/IP 主机都必须支持的最小 TCP 段（576 - 40 = 536 字节）。这确保在连接开始时套接字缓冲区仍然为空时，整个头部将始终一次性传递。发送方必须始终确保头部一次性发送，以便传输层在传送到接收方的路径上保持原子性。接收方可能对部分头部宽容，或者在接收到部分头部时可能只是断开连接。建议是宽容，但是实施限制可能不总是容易允许这样做。重要的是要注意，没有任何中间设备强制转发整个头部，因为 TCP 是一种流式协议，如果需要的话，可以一次处理一个字节，导致在到达接收方时头部被分段。但由于使用这种协议的地方，通常是可以接受上述简化的，因为处理一个字节的设备的风险接近于零。

接收方在接收完整且有效的 PROXY 协议头之前，**不得**开始处理连接。这对于接收方预期首先发言的协议（例如：SMTP、FTP 或 SSH）尤为重要。接收方可以应用短暂的超时，并决定在几秒内（至少 3 秒以覆盖 TCP 重传）内未看到协议头时终止连接。

接收方**必须**配置为仅接收本规范中描述的协议，**不得**尝试猜测协议头是否存在。这意味着该协议明确阻止了公共和私有访问之间的端口共享。否则，它将通过允许不受信任的方伪造其连接地址而开启一个重大的安全漏洞。接收方**应该**确保进行适当的访问过滤，以便只有受信任的代理可以使用这个协议。

一些代理足够聪明，能够理解传输的协议，并重复使用空闲的服务器连接来传输多个消息。这通常发生在 HTTP 中，其中来自多个客户端的请求可能通过同一个连接发送。这样的代理**不得**在复用连接上实现此协议，因为接收方会将 PROXY 头中广告的地址用作所有转发请求的发送方地址。实际上，这样的代理不是"愚蠢的代理"，因为它们对传输的协议有完全的了解，因此它们**必须**使用此协议提供的功能来呈现客户端的地址。

## 2.1. 人类可读的头部格式（版本 1）

这是协议版本 1 中指定的格式。它包括一行 US-ASCII 文本，与以下完全匹配的块，立即在连接建立时发送，且在从发送方流向接收方的任何数据之前添加：

- 标识协议的字符串："PROXY"（\x50 \x52 \x4F \x58 \x59）
  看到此字符串表示这是协议的版本 1。

- 正好一个空格：" "（\x20）

- 指示代理的 INET 协议和族的字符串。截至版本 1，仅允许"TCP4"（\x54 \x43 \x50 \x34）表示 IPv4 上的 TCP，以及"TCP6"（\x54 \x43 \x50 \x36）表示 IPv6 上的 TCP。其他、不支持的或未知的协议必须报告为名称"UNKNOWN"（\x55 \x4E \x4B \x4E \x4F \x57 \x4E）。对于"UNKNOWN"，发送方可以省略 CRLF 之前的行的其余部分，接收方必须忽略在找到 CRLF 之前呈现的任何内容。请注意，本规范的早期版本建议在发送健康检查时使用此协议，但这会导致服务器拒绝"UNKNOWN"关键字。因此，现在建议不发送"UNKNOWN"，当预计要接受连接时，而只在无法正确填充 PROXY 行时才发送"UNKNOWN"。

- 正好一个空格：" "（\x20）

- 以其规范格式表示的第 3 层源地址。IPv4 地址必须表示为一系列恰好为[0..255]范围内的 4 个整数，用十进制表示，每个数字之间用一个点分隔。不允许在数字前面添加零，以避免与八进制数混淆。IPv6 地址必须表示为一系列以冒号分隔的 4 位十六进制数字（大小写不敏感），允许使用一个双冒号序列来替换连续的零的最大可接受范围。解码的比特总数必须恰好为 128。广告的协议族决定了要使用的格式。

- 正好一个空格：" "（\x20）

- 以其规范格式表示的第 3 层目标地址。它与第 3 层源地址的格式相同，与相同的协议族匹配。

- 正好一个空格：" "（\x20）

- 以十进制整数表示的 TCP 源端口，范围在[0..65535]内。在数字前面不允许添加零，以避免与八进制数混淆。

- 正好一个空格：" "（\x20）

- 以十进制整数表示的 TCP 目标端口，范围在[0..65535]内。在数字前面不允许添加零，以避免与八进制数混淆。

- CRLF 序列（\x0D \x0A）

接收方必须等待 CRLF 序列，然后开始解码地址，以确保它们是完整且正确解析的。如果在前 107 个字符中找不到 CRLF 序列，接收方应声明该行无效。接收方可能会拒绝不完整的行，其中不包含 CRLF 序列的第一次原子读取操作。当期望一个完整的 CRLF 序列时，接收方不得容忍单个 CR 或 LF 字符结束行。

## 2.2. 二进制头部格式（版本 2）

生成可读的 IPv6 地址并解析它们非常低效，因为存在多种可能的表示格式和紧凑地址格式的处理。此外，无法在 IPv4/IPv6 以外指定地址系列，也不能指定非 TCP 协议。人类可读格式的另一个缺点是实现需要解析所有字符才能找到尾随的 CRLF，这使得只读取确切字节数变得更加困难。最后，由于其不精确的含义，一些服务器并不总是接受 UNKNOWN 地址类型作为有效协议。

因此，协议的版本 2 引入了一种新的二进制格式，该格式与版本 1 和其他常用协议仍然可以区分开。它专门设计成与各种协议不兼容，并在意外呈现时被许多常见实现拒绝（请参阅第 7 节）。此外，为了提高处理效率，IPv4 和 IPv6 地址分别在 4 字节和 16 字节边界上对齐。

二进制头部格式以包含协议签名的固定 12 字节块开头：

   \x0D \x0A \x0D \x0A \x00 \x0D \x0A \x51 \x55 \x49 \x54 \x0A

请注意，该块在第 5 个位置包含一个空字节，因此不得将其视为以空字符结尾的字符串。

接下来的一个字节（第 13 个字节）是协议版本和命令。

最高四位包含版本。根据本规范，它必须始终以\x2 发送，接收方只能接受此值。

最低四位表示命令：
  - \x0 : LOCAL : 连接是代理有目的地建立的，而没有被中继。连接的端点是发送方和接收方。当代理向服务器发送健康检查时，存在这样的连接。接收方必须将此连接视为有效，并使用真实的连接端点，丢弃包括被忽略的协议块在内的协议块。

  - \x1 : PROXY : 连接是代表另一个节点建立的，并反映了原始的连接端点。接收方必须使用协议块中提供的信息来获取原始地址。

  - 其他值未分配，发送方不得发出这里意外的值。接收方必须丢弃呈现意外值的连接。

第 14 个字节包含传输协议和地址族。最高的 4 位包含地址族，最低的 4 位包含协议。

地址族映射到原始套接字族，而不一定匹配系统内部使用的值。它可以是以下之一：

  - 0x0 : AF_UNSPEC : 该连接被转发到未知、未指定或不支持的协议。发送方应在发送 LOCAL 命令或处理不支持的协议系列时使用此系列。接收方可以自由地接受连接并使用真实的端点地址，或拒绝它。接收方应忽略地址信息。

  - 0x1 : AF_INET : 转发的连接使用 AF_INET 地址族（IPv4）。地址完全是每个 4 字节的网络字节顺序，后跟传输协议信息（通常是端口）。

  - 0x2 : AF_INET6 : 转发的连接使用 AF_INET6 地址族（IPv6）。地址是每个 16 字节的网络字节顺序，后跟传输协议信息（通常是端口）。

  - 0x3 : AF_UNIX : 转发的连接使用 AF_UNIX 地址族（UNIX）。地址是每个 108 字节。

  - 其他值未指定，不得在该协议的版本 2 中发送，并且必须被接收方拒绝为无效。

传输协议在第 14 个字节的最低 4 位中指定：

  - 0x0 : UNSPEC : 该连接被转发到未知、未指定或不支持的协议。发送方应在发送 LOCAL 命令或处理不支持的协议系列时使用此系列。接收方可以自由地接受连接并使用真实的端点地址，或拒绝它。接收方应忽略地址信息。

  - 0x1 : STREAM : 转发的连接使用 SOCK_STREAM 协议（例如：TCP 或 UNIX_STREAM）。在与 AF_INET/AF_INET6（TCP）一起使用时，地址后跟以网络字节顺序表示的源和目标端口，通常是 2 字节。

  - 0x2 : DGRAM : 转发的连接使用 SOCK_DGRAM 协议（例如：UDP 或 UNIX_DGRAM）。在与 AF_INET/AF_INET6（UDP）一起使用时，地址后跟以网络字节顺序表示的源和目标端口，通常是 2 字节。

  - 其他值未指定，不得在该协议的版本 2 中发送，并且必须被接收方拒绝为无效。

实际上，以下协议字节是预期的：

  - \x00 : UNSPEC : 该连接被转发到未知、未指定或不支持的协议。发送方应在发送 LOCAL 命令或处理不支持的协议系列时使用此系列。在使用 LOCAL 命令时，接收方必须接受连接并忽略任何地址信息。对于其他命令，接收方可以自由地接受连接并使用真正的端点地址，或拒绝连接。接收方应忽略地址信息。

  - \x11 : TCP over IPv4 : 转发的连接使用 AF_INET 协议系列的 TCP。地址长度为 2*4 + 2*2 = 12 字节。

  - \x12 : UDP over IPv4 : 转发的连接使用 AF_INET 协议系列的 UDP。地址长度为 2*4 + 2*2 = 12 字节。

  - \x21 : TCP over IPv6 : 转发的连接使用 AF_INET6 协议系列的 TCP。地址长度为 2*16 + 2*2 = 36 字节。

  - \x22 : UDP over IPv6 : 转发的连接使用 AF_INET6 协议系列的 UDP。地址长度为 2*16 + 2*2 = 36 字节。

  - \x31 : UNIX 流 : 转发的连接使用 AF_UNIX 协议系列的 SOCK_STREAM。地址长度为 2*108 = 216 字节。

  - \x32 : UNIX 数据报 : 转发的连接使用 AF_UNIX 协议系列的 SOCK_DGRAM。地址长度为 2*108 = 216 字节。

只有 UNSPEC 协议字节（\x00）是接收方必须实现的。接收方不需要实现其他协议字节，只要对于它不支持的上述有效组合，它会自动回退到 UNSPEC 模式。

第 15 和第 16 字节是以网络字节序的字节长度。它用于使接收方知道要跳过多少地址字节，即使它不实现所呈现的协议也是如此。因此，协议头的字节长度总是精确地为 16 加上此值。当发送方呈现 LOCAL 连接时，它不应呈现任何地址，因此将此字段设置为零。接收方必须始终考虑此字段以跳过适当数量的字节，不得假设 LOCAL 连接的情况下为零。当接收方接受显示 UNSPEC 地址族或协议的传入连接时，如果存在，它可能会决定是否记录地址信息。

因此，16 字节的版本 2 头部可以这样描述：

```c
struct proxy_hdr_v2 {
    uint8_t sig[12];  /* hex 0D 0A 0D 0A 00 0D 0A 51 55 49 54 0A */
    uint8_t ver_cmd;  /* protocol version and command */
    uint8_t fam;      /* protocol family and address */
    uint16_t len;     /* number of following bytes part of the header */
};
```

从第 17 个字节开始，地址以网络字节顺序呈现。地址顺序始终相同：
  - 源层 3 地址以网络字节顺序呈现
  - 目标层 3 地址以网络字节顺序呈现
  - 如果有，源层 4 地址以网络字节顺序呈现（端口）
  - 如果有，目标层 4 地址以网络字节顺序呈现（端口）

地址块可以直接从以下联合发送或接收，这样可以根据地址类型轻松进行转换到/从相关套接字本机结构：

```c
union proxy_addr {
    struct {        /* for TCP/UDP over IPv4, len = 12 */
        uint32_t src_addr;
        uint32_t dst_addr;
        uint16_t src_port;
        uint16_t dst_port;
    } ipv4_addr;
    struct {        /* for TCP/UDP over IPv6, len = 36 */
         uint8_t  src_addr[16];
         uint8_t  dst_addr[16];
         uint16_t src_port;
         uint16_t dst_port;
    } ipv6_addr;
    struct {        /* for AF_UNIX sockets, len = 216 */
         uint8_t src_addr[108];
         uint8_t dst_addr[108];
    } unix_addr;
};
```

发送方必须确保整个协议头一次发送。这个块总是小于 MSS，所以没有理由在连接开始时将其分段。接收方也应一次处理头部。接收方在接收完整的地址块之前不得开始解析地址。接收方还必须拒绝包含部分协议头的传入连接。

接收方可以配置为支持协议的版本 1 和版本 2。识别协议版本很容易：

  - 如果传入的字节计数为 16 或更多，并且前 13 个字节与协议签名块匹配，后跟协议版本 2：

       \x0D\x0A\x0D\x0A\x00\x0D\x0A\x51\x55\x49\x54\x0A\x20

  - 否则，如果传入的字节计数为 8 或更多，并且前 5 个字符与"PROXY"的 US-ASCII 表示匹配，那么协议必须解析为版本 1：

       \x50\x52\x4F\x58\x59

  - 否则，该协议不在本规范的范围内，连接必须被丢弃。

如果 PROXY 协议头中指定的长度表示在地址信息之后还有其他字节，接收方可以选择跳过并忽略这些字节，或尝试解释这些字节。

这些字节中的信息将以 Type-Length-Value（TLV 向量）的格式排列。第一个字节是向量的类型。接下来的两个字节表示值的长度（不包括类型和长度字节），在长度字段之后是长度字段指定的字节数。

```c
struct pp2_tlv {
    uint8_t type;
    uint8_t length_hi;
    uint8_t length_lo;
    uint8_t value[0];
};
```

接收方可以选择跳过并忽略其不感兴趣或不理解的 TLVs。发送

方只能为它选择发布的信息生成 TLVs。

以下类型已经注册到<type>字段：

```c
#define PP2_TYPE_ALPN           0x01
#define PP2_TYPE_AUTHORITY      0x02
#define PP2_TYPE_CRC32C         0x03
#define PP2_TYPE_NOOP           0x04
#define PP2_TYPE_UNIQUE_ID      0x05
#define PP2_TYPE_SSL            0x20
#define PP2_SUBTYPE_SSL_VERSION 0x21
#define PP2_SUBTYPE_SSL_CN      0x22
#define PP2_SUBTYPE_SSL_CIPHER  0x23
#define PP2_SUBTYPE_SSL_SIG_ALG 0x24
#define PP2_SUBTYPE_SSL_KEY_ALG 0x25
#define PP2_TYPE_NETNS          0x30
```

2.2.1 PP2_TYPE_ALPN

应用层协议协商（ALPN）。它是定义连接上正在使用的上层协议的字节序列。最常见的用例将是传递由 RFC7301 [9]定义的传输层安全性（TLS）协议的 ALPN 扩展的精确副本。

2.2.2 PP2_TYPE_AUTHORITY

包含由客户端传递的主机名值，作为 UTF8 编码的字符串。在客户端连接上使用 TLS 的情况下，这是由 RFC3546 [10]第 3.1 节定义的“server_name”扩展的精确副本，通常称为“SNI”。可能还有其他情况可以在没有涉及 TLS 的情况下在连接中提到权威。

2.2.3. PP2_TYPE_CRC32C

类型 PP2_TYPE_CRC32C 的值是一个 32 位数字，存储了 PROXY 协议头的 CRC32c 校验和。

如果发送方支持校验和并构建了头部，则发送方必须：

- 将校验字段初始化为'0'。

- 计算 PROXY 头的 CRC32c 校验和，如 RFC4960 附录 B [8]所述。

- 将结果值放入校验字段中，保持其余位不变。

如果校验和作为 PROXY 头的一部分提供，并且接收方支持校验和功能，则接收方必须：

- 存储接收到的 CRC32c 校验和值。

- 用所有'0'替换接收到的 PROXY 头中的 32 位校验字段，并计算整个 PROXY 头的 CRC32c 校验值。

- 验证计算的 CRC32c 校验和是否与接收到的 CRC32c 校验和相同。如果不相同，接收方必须将提供头部的 TCP 连接视为无效。

处理无效 TCP 连接的默认过程是中止它。

2.2.4. PP2_TYPE_NOOP

当解析时，应忽略此类型的 TLV。值是零个或多个字节。可以用于数据填充或对齐。请注意，它只能对齐 3 个或更多字节，因为 TLV 不能小于这个大小。

2.2.5. PP2_TYPE_UNIQUE_ID

类型 PP2_TYPE_UNIQUE_ID 的值是由上游代理生成的最多 128 个字节的不透明字节序列，用于唯一标识连接。

唯一 ID 可用于轻松地在多层代理之间关联连接，无需查找 IP 地址和端口号。

2.2.6. PP2_TYPE_SSL 类型和子类型

对于类型 PP2_TYPE_SSL，值本身如下定义：

```c
struct pp2_tlv_ssl {
    uint8_t  client;
    uint32_t verify;
    struct pp2_tlv sub_tlv[0];
};
```

如果客户端提供了证书并成功验证，<verify>字段将为零，否则为非零。

<client>字段由以下值的位字段组成，指示哪些元素存在：

#define PP2_CLIENT_SSL           0x01
#define PP2_CLIENT_CERT_CONN     0x02
#define PP2_CLIENT_CERT_SESS     0x04

请注意，这些元素中的每一个都可能导致在此 TLV 之后使用第二级 TLV 封装追加额外数据。因此，可以在此字段之后找到多个 TLV 值。pp2_tlv_ssl 的总长度将反映这一点。

PP2_CLIENT_SSL 标志表示客户端通过 SSL/TLS 连接。当此字段存在时，TLS 版本的 US-ASCII 字符串表示将附加在 TLV 格式的字段末尾，使用类型 PP2_SUBTYPE_SSL_VERSION。

PP2_CLIENT_CERT_CONN 表示客户端在当前连接上提供了证书。PP2_CLIENT_CERT_SESS 表示客户端在属于此连接的 TLS 会话中至少提供了一次证书。

第二级 TLV PP2_SUBTYPE_SSL_CIPHER 提供了所使用的密码的 US-ASCII 字符串名称，例如"ECDHE-RSA-AES128-GCM-SHA256"。

第二级 TLV PP2_SUBTYPE_SSL_SIG_ALG 提供了用于签名前端提供的证书的算法的 US-ASCII 字符串名称，当通过 SSL/TLS 传输层进行传入连接时，例如"SHA256"。

第二级 TLV PP2_SUBTYPE_SSL_KEY_ALG 提供了用于生成前端提供的证书密钥的算法的 US-ASCII 字符串名称，当通过 SSL/TLS 传输层进行传入连接时，例如"RSA2048"。

在所有情况下，客户端证书的 Distinguished Name 的 Common Name 字段（OID：2.5.4.3）的字符串表示（UTF8 编码）都将附加在 TLV 格式下，使用类型 PP2_SUBTYPE_SSL_CN。例如："example.com"。

2.2.7. PP2_TYPE_NETNS 类型

类型 PP2_TYPE_NETNS 将值定义为命名空间名称的 US-ASCII 字符串表示。

2.2.8. 保留的类型范围

以下范围的 16 个类型值保留用于特定应用数据，并永远不会被 PROXY 协议使用。如果需要更多的值，请考虑通过 TLV 中的类型字段扩展范围。

#define PP2_TYPE_MIN_CUSTOM    0xE0
#define PP2_TYPE_MAX_CUSTOM    0xEF

这个 8 个值的范围被应用程序开发人员和协议设计师用于临时实验性用途。这个范围的值永远不会被 PROXY 协议使用，不应在生产功能中使用。

#define PP2_TYPE_MIN_EXPERIMENT 0xF0
#define PP2_TYPE_MAX_EXPERIMENT 0xF7

以下范围的 8 个值被保留供将来使用，可能用于扩展协议以支持多字节类型值。

#define PP2_TYPE_MIN_FUTURE    0xF8
#define PP2_TYPE_MAX_FUTURE    0xFF

## 3. 实现

HAProxy 1.5 在双方都实现了 PROXY 协议的版本 1：
  - 在“accept-proxy”设置传递给“bind”关键字时，监听套接字接受协议。在此类侦听器上接受的连接将表现得就像源实际上是协议中宣传的一样。这对于日志记录、ACL、内容过滤、透明代理等都是真实的。

  - 如果“server”行上存在“send-proxy”设置，则可以使用协议连接到服务器。它是基于每个服务器启用的，因此可以仅对远程服务器启用它，而仍然使本地服务器行为不同。如果使用“accept-proxy”接受了传入连接，则中继的信息是此连接的 PROXY 行中宣传的信息。

  - HAProxy 1.5 还作为发送方实现了 PROXY 协议的版本 2。此外，已添加了具有有限可选 SSL 信息的 TLV。

Stunnel 在版本 4.45 中为出站连接添加了对协议版本 1 的支持。

Stud 于 2011 年 06 月 29 日为出站连接添加了对协议版本 1 的支持。

Postfix 于版本 2.10 中为传入连接中的 smtpd 和 postscreen 添加了对协议版本 1 的支持。

可用于 Stud [5]的补丁来实现对传入连接的协议版本 1 的支持。

Varnish 4.1 [6]添加了对协议版本 1 和版本 2 的支持。

Exim 于 2014/05/13 为传入连接添加了对协议版本 1 和版本 2 的支持，并将作为版本 4.83 的一部分发布。

Squid 在版本 3.5 [7]中添加了对协议版本 1 和版本 2 的支持。

Jetty 9.3.0 支持协议版本 1。

lighttpd 在版本 1.4.46 [11]中为传入连接添加了对协议版本 1 和版本 2 的支持。

协议足够简单，预计其他实现将出现，特别是在 SMTP、IMAP、FTP、RDP 等客户端地址对服务器很重要且一些中介环境中。事实上，已经有几个专有部署在 FTP 和 SMTP 服务器上实现了这样做。

鼓励代理开发人员实现此协议，因为它将使其产品在复杂的基础设施中更加透明，并且将消除与日志记录和访问控制相关的一些问题。

## 4. 架构优势

### 4.1. 多层架构

在多层基础架构中，使用 PROXY 协议而不是透明代理提供了多个优点。第一个即时的优点是可以链式连接多个代理层，并始终呈现原始 IP 地址。例如，考虑以下 2 层代理架构：

         互联网
          ,---.                     | 从客户端到PX1：
         (  X  )                    | 原生协议
          `---'                     |
            |                       V
         +--+--+      +-----+
         | FW1 |------| PX1 |
         +--+--+      +-----+       | 从PX1到PX2：PROXY + 原生协议
            |                       V
         +--+--+      +-----+
         | FW2 |------| PX2 |
         +--+--+      +-----+       | 从PX2到SRV：PROXY + 原生协议
            |                       V
         +--+--+
         | SRV |
         +-----+

防火墙 FW1 接收来自互联网客户端的流量并将其转发给反向代理 PX1。PX1 添加 PROXY 头，然后通过 FW2 转发到 PX2。PX2 配置为读取 PROXY 头并在输出上发送它。然后，它加入到源服务器 SRV 并在那里呈现原始客户端的地址。由于所有 TCP 连接端点都是真实的机器，而不是伪造的，因此对于回程流量通过防火墙和反向代理而不是使用默认路由没有问题。使用透明代理，这将非常困难，因为防火墙必须处理来自 DMZ 中代理的客户端地址，并且必须正确路由回程流量，而不是使用默认路由。

### 4.2. IPv4 和 IPv6 集成

该协议还简化了 IPv4 和 IPv6 的集成：如果仅第一层（FW1 和 PX1）支持 IPv6，即使整个链路仅通过 IPv4 连接，仍然可以将原始客户端的 IPv6 地址呈现给目标服务器。

### 4.3. 多个返回路径

当使用透明代理时，不可能运行多个代理，因为返回流量将遵循默认路由，而不是找到正确的代理。有时可以使用多个服务器地址和策略路由来实现一些技巧，但这些方法非常有限。

使用 PROXY 协议，此问题消失了，因为服务器无需路由到客户端，只需路由到转发连接的代理。因此，可以完全在非常大的服务器群前面运行代理群，即使处理多个站点也能轻松工作。

在类似云的环境中，这一点特别重要，因为很少有选择绑定到随机地址，而每个节点通常需要多个前端节点，处理能力较低。

下面的示例说明了以下情况：虚拟化基础设施部署在 3 个数据中心（DC1..DC3）中。每个数据中心都使用其自己的 VIP，由托管提供商的第 3 层负载均衡器处理。这个负载均衡器将流量路由到一组第 7 层 SSL/缓存卸载设备，它们在其本地服务器之间进行负载均衡。VIP 由地理位置感知的 DNS 广告，以便客户端通常坚持使用特定的 DC。由于客户端不能保证坚持使用一个 DC，因此 L7 负载均衡代理必须知道可以通过托管提供商的 LAN 或通过互联网访问的其他 DC 服务器。L7 代理使用 PROXY 协议加入它们后面的服务器，因此即使在数据中心之间的流量也可以转发原始客户端的地址，而返回路径是明确的。使用透明代理是不可能的，因为大多数情况下，L7 代理将无法伪造一个地址，并且在数据中心之间永远无法工作。

                               互联网
    
            DC1                  DC2                  DC3
           ,---.                ,---.                ,---.
          (  X  )              (  X  )              (  X  )
           `---'                `---'                `---'
             |    +-------+       |    +-------+       |    +-------+
             +----| L3 LB |       +----| L3 LB |       +----| L3 LB |
             |    +-------+       |    +-------+       |    +-------+
       ------+------- ~ ~ ~ ------+------- ~ ~ ~ ------+-------
       |||||   ||||         |||||   ||||         |||||    ||||
      50 SRV   4 PX        50 SRV   4 PX        50 SRV    4 PX

## 5. 安全注意事项

协议头的版本 1（可读格式）设计为与 HTTP 有所区别。它不会解析为有效的 HTTP 请求，而 HTTP 请求也不会解析为有效的代理请求。版本 2 添加了一个不可解析的二进制签名，以使许多产品在此块上失败。该签名设计为导致 HTTP、SSL/TLS、SMTP、FTP 和 POP 等多种产品立即失败。它还导致 LDAP 和 RDP 服务器中的中止（见第 6 节）。这使得可以在特定连接下强制使用它变得更加容易，同时确保不正确配置的服务器能够快速被检测到。

实现者应非常小心，不要试图自动检测是否必须解码头部，而是只依赖于配置参数。的确，如果留给普通客户端使用协议的机会，它将能够隐藏其活动或使其看起来来自其他地方。但是，仅从一些已知来源接受头部应该是安全的。

## 6. 验证

协议版本 2 的签名已发送到各种协议和实现，包括旧协议。已测试以下协议和产品，以确保在呈现签名时表现出最佳可能的行为，即使只有最小的实现：

  - HTTP：
    - Apache 1.3.33：连接中止        => 通过/最佳
    - Nginx 0.7.69：400 Bad Request + 中止 => 通过/最佳
    - lighttpd 1.4.20：400 Bad Request + 中止 => 通过/最佳
    - thttpd 2.20c：400 Bad Request + 中止 => 通过/最佳
    - mini-httpd-1.19：400 Bad Request + 中止 => 通过/最佳
    - haproxy 1.4.21：400 Bad Request + 中止 => 通过/最佳
    - Squid 3：400 Bad Request + 中止 => 通过/最佳
  - SSL：
    - stud 0.3.47：连接中止        => 通过/最佳
    - stunnel 4.45：连接中止        => 通过/最佳
    - nginx 0.7.69：400 Bad Request + 中止 => 通过/最佳
  - FTP：
    - Pure-ftpd 1.0.20 ：3*500 then 221 Goodbye  => 通过/最佳
    - vsftpd 2.0.1     ：3*530 then 221 Goodbye  => 通过/最佳
  - SMTP：
    - postfix 2.3      ：3*500 + 221 Bye         => 通过/最佳
    - exim 4.69：554 + 连接中止  => 通过/最佳
  - POP：
    - dovecot 1.0.10   ：3*ERR + 注销         => 通过/最佳
  - IMAP：
    - dovecot 1.0.10：5*ERR + 挂起         => 通过/非最佳
  - LDAP：
    - openldap 2.3：中止                 => 通过/最佳
  - SSH：
    - openssh 3.9p1：中止                 => 通过/最佳
  - RDP：
    - Windows XP SP3：中止                 => 通过/最佳

这意味着大多数协议和实现不会因具有协议签名的传入连接而感到困惑，这避免了面对错误配置时的问题。

## 7. 未来发展

该协议可能会略微发展，以呈现其他信息，例如传入网络接口或在第一个代理之前发生网络地址转换的情况下的原始地址，但目前没有明确要求。已经对此进行了深入思考，似乎试图添加更多信息会打开一个潘多拉盒子，其中包括 MAC 地址到 SSL 客户端证书等大量信息，这将使协议变得更加复杂。因此，目前没有计划。欢迎提出改进建议。

## 8. 联系和链接

请使用 w@1wt.eu 将任何意见发送给作者。

以下链接在文档中引用：

1. [Postfix XCLIENT Documentation](http://www.postfix.org/XCLIENT_README.html)
2. [RFC 7239 - Forwarded HTTP Extension](http://tools.ietf.org/html/rfc7239)
3. [Stunnel - SSL/TLS Proxy](http://www.stunnel.org/)
4. [Stud - Scalable TLS Unwrapping Daemon](https://github.com/bumptech/stud)
5. [Pull Request for Stud on GitHub](https://github.com/bumptech/stud/pull/81)
6. [SSL/TLS Again (by PHK)](https://www.varnish-cache.org/docs/trunk/phk/ssl_again.html)
7. [Squid Proxy Server Documentation](http://wiki.squid-cache.org/Squid-3.5)
8. [RFC 4960 - SCTP Specification (Appendix B)](https://tools.ietf.org/html/rfc4960#appendix-B)
9. [RFC 7301 - Transport Layer Security (TLS) Application-Layer Protocol Negotiation Extension](https://tools.ietf.org/rfc/rfc7301.txt)
10. [RFC 3546 - Transport Layer Security (TLS) Extensions](https://www.ietf.org/rfc/rfc3546.txt)
11. [Lighttpd Redmine Issue #2804](https://redmine.lighttpd.net/issues/2804)

## 9. 示例代码

下面的代码是一个示例，演示了接收器如何处理 TCP over IPv4 或 IPv6 协议头的两个版本。该函数应该在读事件发生时调用。地址可以直接复制到它们的最终内存位置，因为它们以网络字节顺序传输。发送端甚至更简单，可以从这个示例代码中轻松推导出。

```c
  struct sockaddr_storage from; /* 由 accept() 填充 */
  struct sockaddr_storage to;   /* 由 getsockname() 填充 */
  const char v2sig[12] = "\x0D\x0A\x0D\x0A\x00\x0D\x0A\x51\x55\x49\x54\x0A";

  /* 如果需要轮询，则返回 0，<0 表示错误，>0 表示完成了工作 */
  int read_evt(int fd)
  {
      union {
          struct {
              char line[108];
          } v1;
          struct {
              uint8_t sig[12];
              uint8_t ver_cmd;
              uint8_t fam;
              uint16_t len;
              union {
                  struct {  /* 用于 TCP/UDP over IPv4，len = 12 */
                      uint32_t src_addr;
                      uint32_t dst_addr;
                      uint16_t src_port;
                      uint16_t dst_port;
                  } ip4;
                  struct {  /* 用于 TCP/UDP over IPv6，len = 36 */
                       uint8_t  src_addr[16];
                       uint8_t  dst_addr[16];
                       uint16_t src_port;
                       uint16_t dst_port;
                  } ip6;
                  struct {  /* 用于 AF_UNIX 套接字，len = 216 */
                       uint8_t src_addr[108];
                       uint8_t dst_addr[108];
                  } unx;
              } addr;
          } v2;
      } hdr;

      int size, ret;

      do {
          ret = recv(fd, &hdr, sizeof(hdr), MSG_PEEK);
      } while (ret == -1 && errno == EINTR);

      if (ret == -1)
          return (errno == EAGAIN) ? 0 : -1;

      if (ret >= 16 && memcmp(&hdr.v2, v2sig, 12) == 0 &&
          (hdr.v2.ver_cmd & 0xF0) == 0x20) {
          size = 16 + ntohs(hdr.v2.len);
          if (ret < size)
              return -1; /* 头部被截断或太大 */

          switch (hdr.v2.ver_cmd & 0xF) {
          case 0x01: /* PROXY 命令 */
              switch (hdr.v2.fam) {
              case 0x11:  /* TCPv4 */
                  ((struct sockaddr_in *)&from)->sin_family = AF_INET;
                  ((struct sockaddr_in *)&from)->sin_addr.s_addr =
                      hdr.v2.addr.ip4.src_addr;
                  ((struct sockaddr_in *)&from)->sin_port =
                      hdr.v2.addr.ip4.src_port;
                  ((struct sockaddr_in *)&to)->sin_family = AF_INET;
                  ((struct sockaddr_in *)&to)->sin_addr.s_addr =
                      hdr.v2.addr.ip4.dst_addr;
                  ((struct sockaddr_in *)&to)->sin_port =
                      hdr.v2.addr.ip4.dst_port;
                  goto done;
              case 0x21:  /* TCPv6 */
                  ((struct sockaddr_in6 *)&from)->sin6_family = AF_INET6;
                  memcpy(&((struct sockaddr_in6 *)&from)->sin6_addr,
                      hdr.v2.addr.ip6.src_addr, 16);
                  ((struct sockaddr_in6 *)&from)->sin6_port =
                      hdr.v2.addr.ip6.src_port;
                  ((struct sockaddr_in6 *)&to)->sin6_family = AF_INET6;
                  memcpy(&((struct sockaddr_in6 *)&to)->sin6_addr,
                      hdr.v2.addr.ip6.dst_addr, 16);
                  ((struct sockaddr_in6 *)&to)->sin6_port =
                      hdr.v2.addr.ip6.dst_port;
                  goto done;
              }
              /* 不支持的协议，保持本地连接地址 */
              break;
          case 0x00: /* LOCAL 命令 */
              /* 保持本地连接地址以用于 LOCAL */
              break;
          default:
              return -1; /* 不支持的命令 */
          }
      }
      else if (ret >= 8 && memcmp(hdr.v1.line, "PROXY", 5) == 0) {
          char *end = memchr(hdr.v1.line, '\r', ret - 1);
          if (!end || end[1] != '\n')
              return -1; /* 头部部分或无效 */
          *end = '\0'; /* 终止字符串以便于解析 */
          size = end + 2 - hdr.v1.line; /* 跳过头部 + CRLF */
          /* 使用喜欢的地址解析器（如 inet_pton）解析 V1 头部。
           * 在错误时返回 -1，或者直接继续接受。
           */
      }
      else {
          /* 错误的协议 */
          return -1;
      }

  done:
      /* 我们需要从套接字中消耗适当数量的数据 */
      do {
          ret = recv(fd, &hdr, size, 0);
      } while (ret == -1 && errno == EINTR);
      return (ret >= 0) ? 1 : -1;
  }
```

这段代码演示了如何处理 PROXY 协议头的两个版本，以及如何根据协议中的信息填充地址结构。这个示例代码可以帮助你理解如何在接收端处理 PROXY 协议的不同版本，并从中推导出发送端的实现。
