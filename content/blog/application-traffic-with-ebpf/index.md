---
title: "用 eBPF 洞察应用层网络流量"
summary: "本文介绍了如何使用 eBPF 程序捕获、分析和修改应用层的网络数据，包括 HTTP 头部和 URL 路径。作者还展示了如何使用 eBPF map 在内核和用户空间之间传递数据。"
authors: ["thebsdbox"]
translators: ["云原生社区"]
categories: ["eBPF"]
tags: ["eBPF"]
date: 2024-01-10T12:00:00+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://thebsdbox.co.uk/2023/12/08/Application-traffic-with-eBPF/
---

本文译自：[Application traffic with eBPF](https://thebsdbox.co.uk/2023/12/08/Application-traffic-with-eBPF/)

摘要：本文介绍了如何使用 eBPF 程序捕获、分析和修改应用层的网络数据，包括 HTTP 头部和 URL 路径。作者还展示了如何使用 eBPF map 在内核和用户空间之间传递数据。

---

在[先前的帖子](../ebpf-adventures-in-networking/)中，我稍微谈到了建立 eBPF 知识，以开始更多地了解网络适配器的输入和输出情况。基本上，将以太网帧并剥离标头（以太网标头+IP 标头+TCP/UDP 标头），最终你将得到来自应用程序或数据角度的数据包中剩余的内容。

所有的代码都在“学习 eBPF”存储库中，具体的 eBPF 代码在[这里](https://github.com/thebsdbox/learning-ebpf/blob/main/ebpf/http/http.c)。这篇文章的计划是逐步介绍我认为有用或可能重要的部分...

**注意**：此代码确实对入口/出口数据包进行了一些修改，因此需要 6.1+ 的 Linux 内核才能使用一些 eBPF 助手函数。

## 映射！

你可能以前遇到过这些吧？如果没有，不用担心！简而言之，eBPF 映射是在用户空间和内核中的 eBPF 程序之间通信的机制。在我看来，非常酷的一点是这些映射使用键和值...所以我不必循环比较数据并寻找匹配的内容，我传递一个键，如果有匹配的内容，我就得到相应的数据:D

下面是我将要使用的映射，称为`url_map`，键是 20 个字符长（可以说是有界的“字符串”），分配给该键的值是我在上面定义的结构体。

```
// 定义与键关联的不同URL
struct url_path {
  __u8 path_len;
  __u8 path[max_path_len]; // 这应该是一个char，但在这里和Go之间的代码生成有点不同...
};

// 定义我的URL映射
struct {
  __uint(type, BPF_MAP_TYPE_HASH);
  __uint(max_entries, 1024);
  __type(key, char[max_path_len]);
  __type(value, struct url_path);
}
url_map SEC(".maps");
```

## eBPF 程序！

代码中定义了两个 eBPF 程序`tc_egress`和`tc_ingress`，如果你能猜到它们是如何连接的，那就加分！在这篇文章中，我们只关注`tc_ingress`程序。

就像我们在已经存在的众多示例中看到的那样，我们需要进行标头识别的操作。

1. 进行合理性检查，并将`data`强制转换为`ethhdr`类型（[以太网标头](https://en.wikipedia.org/wiki/Ethernet_frame)）。
2. 通过读取以太网标头内部的`h_proto`（也称为`Ethertype`）来查找以太网帧内部的协议。
3. 将以太网标头后的数据强制转换为`iphdr`类型（[IP 标头](https://en.wikipedia.org/wiki/Internet_Protocol_version_4#Header)）。
4. 在 IP 标头内查找协议，我们还需要确定 IP 标头的大小（原来它们可以有不同的大小！`¯\_(ツ)_/¯`）。
5. 为了确定标头的大小，我们将其值乘以四，你可能会问为什么！好吧，这个值乘以 32 位以确定标头的大小，所以如果值为 6，那么标头将是 192 位（或 24 字节）。所以，为了简单地确定 IP 标头的字节数，我们可以将这个值乘以 4！
6. 将以 IP 标头后的数据强制转换为`tcphdr`类型（[TCP 标头](https://en.wikipedia.org/wiki/Transmission_Control_Protocol#TCP_segment_structure)）。
7. 像步骤（5）一样，我们需要确定 TCP 标头的大小（它也可以是动态的），在这里的步骤也是一样的，我们只需要将值`doff`乘以四来确定标头的大小（以字节为单位）。
8. 通过计算所有这些，我们现在可以推断出数据位于以太网标头大小、IP 标头大小和 TCP 标头大小的末尾。
9. 最后，我们可以通过从 IP 标头中减去 IP 和 TCP 标头的大小来确定应用程序数据的大小，使用`tot_len`（总长度）。

### 应用数据！！

为了读取这些数据，我们将需要上面提到的一些东西！

首先，我们需要数据偏移量（数据起始位置），它位于以太网标头+IP 标头大小（一旦计算出来）和 TCP 标头（再次，一旦计算出来）之后。我们还需要一个缓冲区来存储我们将从套接字缓冲区中读取的数据。

```c
// 用于存储我们应用程序数据的数据缓冲区
char pdata[60];

// 计算数据实际位置的偏移量
poffset = ETH_HLEN + ip_hlen + tcp_hlen;

// 从套接字缓冲区加载数据，poffset 从 TCP 标头的末尾开始
int ret = bpf_skb_load_bytes(skb, poffset, pdata, 60);
if (ret != 0) {
   return 0;
}
```

我们使用`bpf_skb_load_bytes`从套接字缓冲区（`skb`）中读取一定量的数据（60 个字节）到我们的缓冲区（`pdata`），起始位置是我们知道数据位于的偏移量（`poffset`）！

此时，我们有了 60 字节的数据，应该足够让我们编写一些代码来理解它。

### HTTP 数据 :-)

让我们看看当我们尝试进行 HTTP 请求时会发生什么！

```plaintext
 ~ curl code/test -vvv
*   Trying 192.168.0.22:80...
* Connected to code (192.168.0.22) port 80 (#0)
> GET /test HTTP/1.1
> Host: code
> User-Agent: curl/7.87.0
> Accept: */*

...
```

我正在使用`curl`从主机`code`（code 是我的开发 VM，运行 code-server）请求 URL `/test`。我们可以看到发送到服务器的数据（每行以`>`开头，用于确定通信的方向）。HTTP 请求中的第一行数据通常是一个*动词*，后面是我们希望与之交互的资源，然后是 HTTP 规范和回车符，如[HTTP 标准](https://en.wikipedia.org/wiki/HTTP#HTTP/1.1_request_messages)中定义。因此，我们可以看到我们关心的行是`GET /test`（在这一点上，我们/我不太关心 HTTP 规范:D）。

第一步是读取`pdata`的前三个字符，查找`pdata[0] == G`，`pdata[1] == E`和`pdata[2] == T`，这将有效地帮助我们确定首先是否是 HTTP 请求，特别是是否是 HTTP 请求！

一旦我们验证了这前 3 个字节，我们将想要从第 4 个字节（请求的前三个字节加上一个用于分隔的空格）开始读取更多数据！

```c
char path[max_path_len];
memset(&path, 0, sizeof(path));

int path_len = 0;

// 查找请求 URI（从偏移量 4 开始），以空格结束
for (int i = 4; i < sizeof(pdata) ; i++)
{
    if (pdata[i] != ' ') {
        path[i-4] = pdata[i];
    } else {
        path[i-4] = '\0';
        path_len = i-4;
        break;
    }
}
```

上面的函数将从 HTTP 数据的第 4 个字节开始（从第 4 个字节开始）读取其余的数据，直到遇到空格为止，留下我们要`GET`的 URL！我们可以通过一个调试打印语句来验证这一点：

```c
bpf_printk("<- incoming path [%s], length [%d]", path, path_len);
```

这将在日志中显示如下：

```plaintext
<idle>-0       [001] dNs3. 2252901.017812: bpf_trace_printk: <- incoming path [/test], length [5]
```

### 对 HTTP 应用程序请求采取行动

上述解释详细说明了我们如何读取数据以及如何读取数据，但如果我们想要“动态”查找 HTTP 请求，我们将需要使用 eBPF 映射。

在我们的 Go 用户空间代码中，我们执行以下操作：

```go
path := flag.String("path", "", "The URL Path to watch for")
flag.Parse()

// ...

// 创建一个 uint8 数组
var urlPath [20]uint8
// 将我们的字节复制到 uint8 数组中（我们可以进行类型转换）
copy(urlPath[:], *path)

// 将我们的 urlPath 作为键
err = objs.UrlMap.Put(urlPath,
  bpfUrlPath{
    Path:    urlPath,
    PathLen: uint8(len(urlPath)),
  })
if err != nil {
  panic(err)
}
```

正如我们在上面的代码中看到的，当我们启动 Go 程序时，它将从标志`-path`中读取，并将其用作我们 eBPF 映射中的**键**，可以暂时忽略值。

```c
struct url_path *found_path = bpf_map_lookup_elem(&url_map, path);
if (found_path > 0) {
    bpf_printk("Looks like we've found your path [%s]", path);
    // 可能进行更多操作，阻止流量或重定向？
}
```

在我们的 eBPF 程序中，我们将对 HTTP 请求进行映射查找，如果该请求作为 char 数组存在于**键**中，那么我们就可以对其进行操作！

现在启动我们的 Go 程序 `sudo ./http -interface ens160 -path /test` 将得到以下结果：

```plaintext
INFO[0000] Starting 🐝 the eBPF HTTP watcher, on interface [ens160] for path [/test]
INFO[0000] Loaded TC QDisc
INFO[0000] Press Ctrl-C to exit and remove the program
          <idle>-0       [001] d.s3. 2252901.015575: bpf_trace_printk: <- 0.0.0.0:56345 -> 0.0.0.0:80
          <idle>-0       [001] D.s3

. 2252901.015642: bpf_trace_printk: -> 192.168.0.22:80 -> 192.168.0.180:56345
          <idle>-0       [001] d.s3. 2252901.017552: bpf_trace_printk: <- 0.0.0.0:56345 -> 0.0.0.0:80
          <idle>-0       [001] d.s3. 2252901.017793: bpf_trace_printk: <- 0.0.0.0:56345 -> 0.0.0.0:80
          <idle>-0       [001] dNs3. 2252901.017812: bpf_trace_printk: <- incoming path [/test], length [5]
          <idle>-0       [001] dNs3. 2252901.017814: bpf_trace_printk: Looks like we've found your path [/test]
```

## 结论

解析 HTTP 并不太困难，因为它是一个相对简单的协议，它使用简单的动词和结构的简单方法，使用空格和回车符来区分。这种方法可能也适用于其他协议，如 DNS、POP3 或 SMTP。当数据加密时，我们需要一种解密的方法，然后才能解析数据（这超出了我的能力...）。但是，我希望这会激发你更多地尝试使用 eBPF 来解析和操作应用程序的想法！

我一直想写一些有希望有用的关于 eBPF 的帖子，尽管通常在我想出可能有用的东西之后，别人已经抢先一步。鉴于我已经在一段时间里以某种方式关注网络，这基本上是我关注的领域，尽管我确实为最近的 eBPF 峰会 2023 编写了一些有趣的内容。如上所述，有很多人开始撰写 eBPF 内容，所以我可能会参考他们的帖子，而不是重复内容。
