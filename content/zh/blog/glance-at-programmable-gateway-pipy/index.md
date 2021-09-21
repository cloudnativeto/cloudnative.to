---
title: "初探可编程网关 Pipy"
description: "初探 Flomesh 的数据平面 Pipy，一个可编程、高性能、轻量级的网关。"
author: "[张晓辉](https://atbug.com)"
image: "/images/blog/glance-at-gateway-pipy.jpg"
categories: ["service mesh"]
tags: ["service mesh", "gateway"]
date: 2021-05-31T7:13:54+08:00
type: "post"
avatar: "/images/profile/zhangxiaohui.jpeg"
profile: "资深码农，云原生爱好者。"
---

有幸参加了 [Flomesh](https://flomesh.cn/) 组织的workshop，了解了他们的 Pipy 网络代理，以及围绕 Pipy 构建起来的生态。Pipy 在生态中，不止是代理的角色，还是 Flomesh 服务网格​中的数据平面。

整理一下，做个记录，顺便瞄一下 Pipy 的部分源码。

## 介绍

下面是摘自 Github 上关于 Pipy 的介绍：

> Pipy 是一个轻量级、高性能、高稳定、可编程的网络代理。Pipy 核心框架使用 C++ 开发，网络 IO 采用 ASIO 库。 Pipy 的可执行文件仅有 5M 左右，运行期的内存占用 10M 左右，因此 Pipy 非常适合做 Sidecar proxy。

> Pipy 内置了自研的 pjs 作为脚本扩展，使得Pipy 可以用 JS 脚本根据特定需求快速定制逻辑与功能。

> Pipy 采用了模块化、链式的处理架构，用顺序执行的模块来对网络数据块进行处理。这种简单的架构使得 Pipy 底层简单可靠，同时具备了动态编排流量的能力，兼顾了简单和灵活。通过使用 REUSE_PORT 的机制（主流 Linux 和 BSD 版本都支持该功能），Pipy 可以以多进程模式运行，使得 Pipy 不仅适用于 Sidecar 模式，也适用于大规模的流量处理场景。 在实践中，Pipy 独立部署的时候用作“软负载”，可以在低延迟的情况下，实现媲美硬件的负载均衡吞吐能力，同时具有灵活的扩展性。

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/05/31/16221838193789.jpg)

Pipy 的核心是消息流处理器：

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/05/31/16221838399668.jpg)

Pipy 流量处理的流程：

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/05/31/16221838630400.jpg)

### 核心概念

* 流（Stream）
* 管道（Pipeline）
* 模块（Module）
* 会话（Session）
* 上下文（Context）

<u>以下是个人浅见</u>：

Pipy 使用 `pjs` 引擎将 JavaScript格式的配置，解析成其抽象的 `Configuration` 对象。每个 `Configuration` 中包含了多个 `Pipeline`，每个 `Configuration` 中又会用到多个 `Filter`。这些都属于 Pipy 的*静态*配置部分。（后面会提到 Pipeline 的三种不同类型）

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/05/31/16223905428188.jpg)

而属于**运行时**的就是流、会话和上下文了，在 Pipy 中，数据流是由对象（Pipy 的*抽象*）组成的。而这些对象抵达 Pipy，被抽象成不同的<u>事件</u>。而事件触发不同的过滤器的执行。

我个人更喜欢将其核心理解为：对数据流的事件处理引擎。

理解归理解，实践出真知。“大胆假设，小心求证！”

## 本地编译 

从编译 Pipy 开始。

### 环境准备

```shell
#安装 nodejs
$ nvm install lts/erbium 
#安装 cmake
$ brew install cmake
```

###  编译 Pipy

从 `https://github.com/flomesh-io/pipy.git` 克隆代码。

Pipy 的编译包括了两个部分，GUI 和 Pipy 本体。

GUI 是 Pipy 提供的一个用于开发模式下进行配置的界面，首先编译Pipy GUI。

```shell
# pipy root folder
$ cd gui
$ npm install
$ npm run build
```

接着编译 Pipy 的本体

```shell
# pipy root folder
$ mkdir build
$ cd build
$ cmake -DCMAKE_BUILD_TYPE=Release -DPIPY_GUI=ON ..
$ make
```

完成后检查根目录下的 `bin` 目录，可以看到 pipy 的可执行文件，大小只有 11M。

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/05/31/16223857141237.jpg)

```shell
$ bin/pipy --help
Usage: pipy [options] <script filename>

Options:
  -h, -help, --help                    Show help information
  -v, -version, --version              Show version information
  --list-filters                       List all filters
  --help-filters                       Show detailed usage information for all filters
  --log-level=<debug|info|warn|error>  Set the level of log output
  --verify                             Verify configuration only
  --reuse-port                         Enable kernel load balancing for all listening ports
  --gui-port=<port>                    Enable web GUI on the specified port
```
### Demo：Hello Pipy

开发模式下可以让 Pipy 携带 GUI 启动，通过 GUI 进行配置。

```shell
#指定 gui 的端口为 6060，从 test 目录中加载配置
$ bin/pipy --gui-port=6060 test/
2021-05-30 22:48:41 [info] [gui] Starting GUI service...
2021-05-30 22:48:41 [info] [listener] Listening on 0.0.0.0:6060
```

浏览器中打开
![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/05/31/16223862683344.jpg)

配置界面
![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/05/31/16223865498871.jpg)

展开 `002-hello` 子目录点选 `pipy` 并点击运行按钮：

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/05/31/16223866403409.jpg)

```shell
$ curl -i localhost:6080
HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 7

Hello!
```

### Pipy 过滤器

通过 pipe 的命令可以输出其支持的过滤器列表，一共 31 个。通过将一系列过滤器进行组装，可以实现复杂的流处理。

比如 `007-logging` 的配置实现了日志的功能：记录请求和响应的数据，并批量发送到 ElasticSearch。这里就用到了 `fork`、`connect`、`onSessionStart`、`encodeHttpRequest`、`decodeHttpRequest`、`onMessageStart`、`onMessage`、`decodeHttpResponse`、`replaceMessage`、`link`、`mux`、`task` 等十多种过滤器。

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/05/31/16223878872474.jpg)


```shell
$ bin/pipy --list-filters

connect             (target[, options])                         Sends data to a remote endpoint and receives data from it
demux               (target)                                    Sends messages to a different pipline with each one in its own session and context
decodeDubbo         ()                                          Deframes a Dubbo message
decodeHttpRequest   ()                                          Deframes an HTTP request message
decodeHttpResponse  ()                                          Deframes an HTTP response message
dummy               ()                                          Eats up all events
dump                ([tag])                                     Outputs events to the standard output
encodeDubbo         ([head])                                    Frames a Dubbo message
encodeHttpRequest   ([head])                                    Frames an HTTP request message
encodeHttpResponse  ([head])                                    Frames an HTTP response message
exec                (command)                                   Spawns a child process and connects to its input/output
fork                (target[, sessionData])                     Sends copies of events to other pipeline sessions
link                (target[, when[, target2[, when2, ...]]])   Sends events to a different pipeline
mux                 (target[, selector])                        Sends messages from different sessions to a shared pipeline session
onSessionStart      (callback)                                  Handles the initial event in a session
onData              (callback)                                  Handles a Data event
onMessageStart      (callback)                                  Handles a MessageStart event
onMessageEnd        (callback)                                  Handles a MessageEnd event
onSessionEnd        (callback)                                  Handles a SessionEnd event
onMessageBody       (callback)                                  Handles a complete message body
onMessage           (callback)                                  Handles a complete message including the head and the body
print               ()                                          Outputs raw data to the standard output
replaceSessionStart (callback)                                  Replaces the initial event in a session
replaceData         ([replacement])                             Replaces a Data event
replaceMessageStart ([replacement])                             Replaces a MessageStart event
replaceMessageEnd   ([replacement])                             Replaces a MessageEnd event
replaceSessionEnd   ([replacement])                             Replaces a SessionEnd event
replaceMessageBody  ([replacement])                             Replaces an entire message body
replaceMessage      ([replacement])                             Replaces a complete message including the head and the body
tap                 (quota[, account])                          Throttles message rate or data rate
use                 (module, pipeline[, argv...])               Sends events to a pipeline in a different module
wait                (condition)                                 Buffers up events until a condition is fulfilled
```

### 原理

“Talk is cheap, show me the code.”

#### 配置加载

个人比较喜欢看源码来理解实现，即使是 C++。从浏览器请求入手发现运行时向`/api/program` 发送了 `POST` 请求，请求的内容是配置文件的地址。

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/05/31/16223870171916.jpg)

检查源码后，找到逻辑的实现在 `src/gui.cpp:189`：
1. 创建新的 worker
2. 加载配置，将 JavaScrip 代码解析成 `Configuration` 对象
3. 启动 worker，执行`Configuration::apply()`
4. 卸载旧的 worker

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/05/31/16224186469477.jpg)

从 `src/api/configuration.cpp:267` 处看：`pipeline`、`listen` 和 `task` 配置实际在 Pipy 的配置中都是被抽象为 `Pipeline` 对象，只是在类型上有差异分别为：`NAMED`、`LISTEN` 和 `TASK`。比如 `listen` 中可以通过 `fork` 过滤器将事件的副本发送到指定的 `pipeline` 中。

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/05/31/16223897550113.jpg)

#### 基于数据流事件的处理

`src/inbound.cpp:171`

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/05/31/16223918853729.jpg)

## 结语

Pipy 虽小（只有 11M），但以其可编程的特性提供了灵活的配置能力，潜力无限。

Pipy 像处理 HTTP 一样处理任意的七层协议。内部版本支持Dubbo、Redis、Socks 等，目前正在迁移到开源版本。

期待即将开源的 Portal，以及服务网格 Flomesh。持续关注，后面考虑再写几篇。

“未来可期！”
