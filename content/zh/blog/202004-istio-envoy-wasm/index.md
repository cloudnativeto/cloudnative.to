---
title: "Istio1.5 & Envoy 数据面 WASM 实践"
date: 2020-04-11T11:40:00+08:00
draft: false
image: "/images/blog/006tKfTcly1g0avw2aq99j31an0u0u0y.jpg"
author: "王佰平"
authorlink: ""
reviewer: ["宋净超"]
reviewerlink: ["https://jimmysong.io"]
description: "Istio 1.5 回归单体架构，并抛却原有的 out-of-process 的数据面（Envoy）扩展方式，转而拥抱基于 WASM 的 in-proxy 扩展，以期获得更好的性能。本文基于网易杭州研究院轻舟云原生团队的调研与探索，介绍 WASM 的社区发展与实践。"
tags: ["envoy"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","istio", "envoy", "WASM"]
type: "post"
avatar: "/images/profile/default.jpg"
---

## 简介
Istio 1.5 回归单体架构，并抛却原有的 out-of-process 的数据面（Envoy）扩展方式，转而拥抱基于 WASM 的 in-proxy 扩展，以期获得更好的性能。本文基于网易杭州研究院轻舟云原生团队的调研与探索，介绍 WASM 的社区发展与实践。

超简单版解释：
> --> Envoy 内置 Google V8 引擎，支持WASM字节码运行，并开放相关接口用于和 WASM 虚拟机交互数据；
> --> 使用各种语言开发相关扩展并编译为 .WASM 文件；
> --> 将扩展文件挂载或者打包进入 Envoy 容器镜像，通过xDS动态下发文件路径及相关配置由虚拟机执行。

## WebAssembly 简述

Istio 最新发布的 1.5 版本，架构发生了巨大调整，从原有的分布式结构回归为单体，同时抛却了原有的 out-of-process 的 Envoy 扩展方式，转而拥抱基于 WASM 的 in-proxy 扩展，以期获得更好的性能，同时减小部署和使用的复杂性。所有的 WASM 插件都在 Envoy 的沙箱中运行，相比于原生 C++ Envoy 插件，WASM 插件具有以下的优点：

* 接近原生插件性能（存疑，待验证，社区未给出可信测试结果，但是 WASM 字节码和机器码比较接近，它的性能极限确实值得期待）；
* 沙箱运行，更安全，单个 filter 故障不会影响到 Envoy 主体执行，且 filter 通过特定接口和 Envoy 交互数据，Envoy 可以对暴露的数据进行限制（沙箱安全性对于 Envoy 整体稳定性保障具有很重要的意义）；
* 可动态分发和载入运行（单个插件可以编译为 .WASM 文件进行分发共享，动态挂载，动态载入，且没有平台限制）；
* 无开发语言限制，开发效率更高（WASM 本身支持语言众多，但是限定到 Envoy 插件开发，必然依赖一些封装好的 SDK 用于和 Envoy 进行交互，目前只有 C++ 语言本身、Rust 以及 AssemblysScript 有一定的支持）。

WASM 的诞生源自前端，是一种为了解决日益复杂的前端 web 应用以及有限的 JavaScript 性能而诞生的技术。它本身并不是一种语言，而是一种字节码标准，一个“编译目标”。WASM 字节码和机器码非常接近，因此可以非常快速的装载运行。任何一种语言，都可以被编译成 WASM 字节码，然后在 WASM 虚拟机中执行（本身是为 web 设计，必然天然跨平台，同时为了沙箱运行保障安全，所以直接编译成机器码并不是最佳选择）。理论上，所有语言，包括 JavaScript、C、C++、Rust、Go、Java 等都可以编译成 WASM 字节码并在 WASM 虚拟机中执行。

## 社区发展及现状

### Envoy & WASM

Envoy 提供了一个特殊的 Http 七层 filter，名为 wasm，用于载入和执行 WASM 字节码。该七层 filter 同样也负责 WASM 虚拟机的创建和管理，使用的是 Google 内部的 v8 引擎（支持 JS 和 WASM）。当前 filter 未进入 Envoy 主干，而是在单独的一个[工程](https://github.com/envoyproxy/envoy-WASM)中。该工程会周期性从主干合并代码。从机制看，WASM 扩展和 Lua 扩展机制非常相似，只是 Lua 载入的是原始脚本，而 WASM 载入的是编译后的 WASM 字节码。Envoy 暴露相关的接口如获取请求头、请求体，修改请求头，请求体，改变插件链执行流程等等，用于 WASM 插件和 Envoy 主体进行数据交互。

对于每一个 WASM 扩展插件都可以被编译为一个 \*.WASM 文件，而 Envoy 七层提供的 wasm Filter 可以通过动态下发相关配置（指定文件路径）使其载入对应的文件并执行：前提是对应的文件已经在镜像中或者挂载进入了对应的路径。当然，WASM Filter 也支持从远程获取对应的 \*.WASM 文件（和目前网易轻舟 API 网关对 Lua 脚本扩展的支持非常相似）。

### Istio & WASM

现有的 Istio 提供了名为 Mixer 插件模型用于扩展 Envoy 数据面功能，具体来说，在 Envoy 内部，Istio 开发了一个原生 C++ 插件用于收集和获取运行时请求信息并通过 gRPC 将信息上报给 Mixer，外部 Mixer 则调用各个 Mixer Adapter 用于监控、授权控制、限流等等操作，相关处理结果如有必要再返回给 Envoy 中 C++ 插件用于做相关控制。
Mixer 模型虽然提高了极高的灵活性，且对 Envoy 侵入性极低，但是引入了大量的额外的外部调用和数据交互，带来了巨大的性能开销（相关的测试结果很多，按照 istio 社区的数据：移除 Mixer 可以使整体 CPU 消耗减少 50%）。而且 Istio 插件扩展模型和 Envoy 插件模型整体是割裂的，Istio 插件在 out-of-process 中执行，通过 gRPC 进行插件与 Envoy 主体的数据交互，而 Envoy 原生插件则是 in-proxy 模式，在同一个进程中通过虚函数接口进行调用和执行。

因此在 Istio 1.5 中，Istio 提供了全新的插件扩展模型：WASM in proxy。使用 Envoy 支持的WASM机制来扩展插件：兼顾性能、多语言支持、动态下发动态载入、以及安全性。唯一的缺点就是现有的支持还不够完善。

为了提升性能，Istio 社区在 1.5 发布中，已经将几个扩展使用 in-proxy 模型（基于 WASM API 而非原生 Envoy C++ HTTP 插件 API）进行实现。但是目前考虑到 WASM 还不够稳定，所以相关扩展默认不会执行在 WSAM 沙箱之中（在所谓 NullVM 中执行）。虽然 istio 也支持将相关扩展编译为 WASM 模块，并在沙箱中执行，但是不是默认选项。

所谓 Mixer V2 其最终目标就是将现有的 out-of-process 的插件模型最终用基于 WASM 的 in-proxy 扩展模型来替代。但是目前举例目标仍旧有较长一段路要走，毕竟即使 Istio 社区本身的插件，也未能完全在 WASM 沙箱中落地。但从 Istio 1.5 开始，Istio 社区应该会快速推动 WASM 的发展。

### solo.io & WASM

solo.io 推出了 WebAssembly Hub，用于构建、发布以及共享 Envoy WASM 扩展。WebAssembly Hub 包括一套用于简化扩展开发的 SDK（目前 solo.io 提供了AssemblysScript SDK，而 Istio/Envoy 社区提供了 Rust/C++ SDK），相关的构建、发布命令，一个用于共享和复用的扩展仓库。具体的内容可以参考 [solo.io 提供的教程](https://docs.solo.io/web-assembly-hub/latest/tutorial_code/)。

## WASM 实践

下面简单实现一个 WASM 扩展作为演示 DEMO，可以帮助大家对 WASM 有进一步了解。此处直接使用了 solo.io 提供的构建工具，避免环境搭建等各个方面的一些冗余工作。**该扩展名为 path_rewrite，可以根据路由原始的 path 值匹配，来将请求 path 重写为不同值**。

执行以下命令安装 wasme：

```shell
curl -sL https://run.solo.io/wasme/install | sh
export PATH=$HOME/.wasme/bin:$PATH
```

wasme 是 solo.io 提供的一个命令行工具，一个简单的类比就是：docker cli 之于容器镜像，wasme 之于 WASM 扩展。

```bash
ping@ping-OptiPlex-3040:~/Desktop/wasm_example$ wasme init ./path_rewrite
Use the arrow keys to navigate: ↓ ↑ → ←
? What language do you wish to use for the filter:
  ▸ cpp
    assemblyscript

```

执行 wasme 初始化命令，会让用户选择使用何种语言开发 WASM 扩展，目前 wasme 工具仅支持 C++ 和 AssemblyScript，当前仍旧选择 cpp 进行开发（AssemblyScript 没有开发经验，后续有机会可以学习一下）。执行命令之后，会自动创建一个 bazel 工程，目录结构如下：其中关键的几个文件已经添加了注释。从目录结构看，solo.io 没有在 wasme 中添加任何黑科技，生成的模板非常的干净，完整而简洁。

```bash
.
├── bazel
│   └── external
│       ├── BUILD
│       ├── emscripten-toolchain.BUILD
│       └── envoy-wasm-api.BUILD      # 说明如何编译envoy api依赖
├── BUILD                             # 说明如何编译插件本身代码
├── filter.cc                         # 插件具体代码
├── filter.proto                      # 扩展数据面接口
├── README.md
├── runtime-config.json
├── toolchain
│   ├── BUILD
│   ├── cc_toolchain_config.bzl
│   ├── common.sh
│   ├── emar.sh
│   └── emcc.sh
└── WORKSPACE                         # 工程描述文件包含对envoy api依赖

```

**filter.cc 中已经填充了样板代码，包括所有的插件需要实现的接口。开发者只需要按需修改某个接口的具体实现即可(此处列出了整个插件的全部代码，以供参考。虽然该代码没有实现什么特许功能，但是已经包含了一个 WASM 扩展（C++ 语言版）应当具备的所有结构，无论多么复杂的插件，都只是在该结构的基础上填充相关的逻辑代码而已**：

```C++
// NOLINT(namespace-envoy)
#include <string>
#include <unordered_map>

#include "google/protobuf/util/json_util.h"
#include "proxy_wasm_intrinsics.h"
#include "filter.pb.h"

class AddHeaderRootContext : public RootContext {
public:
  explicit AddHeaderRootContext(uint32_t id, StringView root_id) : RootContext(id, root_id) {}
  bool onConfigure(size_t /* configuration_size */) override;

  bool onStart(size_t) override;

  std::string header_name_;
  std::string header_value_;
};

class AddHeaderContext : public Context {
public:
  explicit AddHeaderContext(uint32_t id, RootContext* root) : Context(id, root), root_(static_cast<AddHeaderRootContext*>(static_cast<void*>(root))) {}

  void onCreate() override;
  FilterHeadersStatus onRequestHeaders(uint32_t headers) override;
  FilterDataStatus onRequestBody(size_t body_buffer_length, bool end_of_stream) override;
  FilterHeadersStatus onResponseHeaders(uint32_t headers) override;
  void onDone() override;
  void onLog() override;
  void onDelete() override;
private:

  AddHeaderRootContext* root_;
};
static RegisterContextFactory register_AddHeaderContext(CONTEXT_FACTORY(AddHeaderContext),
                                                      ROOT_FACTORY(AddHeaderRootContext),
                                                      "add_header_root_id");

bool AddHeaderRootContext::onConfigure(size_t) {
  auto conf = getConfiguration();
  Config config;

  google::protobuf::util::JsonParseOptions options;
  options.case_insensitive_enum_parsing = true;
  options.ignore_unknown_fields = false;

  google::protobuf::util::JsonStringToMessage(conf->toString(), &config, options);
  LOG_DEBUG("onConfigure name " + config.name());
  LOG_DEBUG("onConfigure " + config.value());
  header_name_ = config.name();
  header_value_ = config.value();
  return true;
}

bool AddHeaderRootContext::onStart(size_t) { LOG_DEBUG("onStart"); return true;}

void AddHeaderContext::onCreate() { LOG_DEBUG(std::string("onCreate " + std::to_string(id()))); }

FilterHeadersStatus AddHeaderContext::onRequestHeaders(uint32_t) {
  LOG_DEBUG(std::string("onRequestHeaders ") + std::to_string(id()));
  return FilterHeadersStatus::Continue;
}

FilterHeadersStatus AddHeaderContext::onResponseHeaders(uint32_t) {
  LOG_DEBUG(std::string("onResponseHeaders ") + std::to_string(id()));
  addResponseHeader(root_->header_name_, root_->header_value_);
  replaceResponseHeader("location", "envoy-wasm");
  return FilterHeadersStatus::Continue;
}

FilterDataStatus AddHeaderContext::onRequestBody(size_t body_buffer_length, bool end_of_stream) {
  return FilterDataStatus::Continue;
}

void AddHeaderContext::onDone() { LOG_DEBUG(std::string("onDone " + std::to_string(id()))); }

void AddHeaderContext::onLog() { LOG_DEBUG(std::string("onLog " + std::to_string(id()))); }

void AddHeaderContext::onDelete() { LOG_DEBUG(std::string("onDelete " + std::to_string(id()))); }

```

注意到生成的样板代码类型名称仍旧以 AddHeader 为前缀，而没有根据提供的路径名称生成，此处是 wasme 可以优化的一个地方。此外，**自动生成的样板代码中已经包含了 AddHeader 的一些代码，逻辑简单，但是配置解析、API 访问，请求头修改等过程都具备，麻雀虽小，五脏俱全，正好可以帮助初次的开发者可以依葫芦画瓢熟悉 WASM 插件的开发过程**。对于入门是非常友好的。

针对 path_rewrite 具体的开发步骤如下：

**STEP ONE** 首先修改模板代码中 filter.proto 文件，因为 path rewrite 肯定不能简单的只能替换固定值，修改后 proto 文件如下所示：

```protobuf
syntax = "proto3";

message PathRewriteConfig {
  message Rewrite {
    string regex_match = 1;      # path正则匹配时替换
    string custom_path = 2;      # 待替换值
  }
  repeated Rewrite rewrites = 1;
}
```

**STEP TWO** 修改配置解析接口，具体方法名为 onConfigure。修改后解析接口如下：

```C++
bool AddHeaderRootContext::onConfigure(size_t) {
  auto conf = getConfiguration();
  PathRewriteConfig config; // message type in filter.proto
  if (!conf.get()) {
    return true;
  }
  google::protobuf::util::JsonParseOptions options;
  options.case_insensitive_enum_parsing = true;
  options.ignore_unknown_fields = false;
  // 解析字符串配置并转换为PathRewriteConfig类型：配置反序列化
  google::protobuf::util::JsonStringToMessage(conf->toString(), &config,
                                              options);

  // 配置阶段编译regex避免请求时重复编译，提高性能
  for (auto &rewrite : config.rewrites()) {
    rewrites_.push_back(
        {std::regex(rewrite.regex_match()), rewrite.custom_path()});
  }

  return true;
}
```

**STEP THREE** 修改请求头接口，具体方法名为 onRequestHeaders，修改后接口代码如下：

```C++
FilterHeadersStatus AddHeaderContext::onRequestHeaders(uint32_t) {
  LOG_DEBUG(std::string("onRequestHeaders ") + std::to_string(id()));
  // Envoy中path同样存储在header中，key为:path
  auto path = getRequestHeader(":path");
  if (!path.get()) {
    return FilterHeadersStatus::Continue;
  }
  std::string path_string = path->toString();
  for (auto &rewrite : root_->rewrites_) {
    if (std::regex_match(path_string, rewrite.first) &&
        !rewrite.second.empty()) {
      replaceRequestHeader(":path", rewrite.second);
      replaceRequestHeader("location", "envoy-wasm");
      return FilterHeadersStatus::Continue;
    }
  }
  return FilterHeadersStatus::Continue;
}

```

从上述过程不难看出，整个扩展的开发体验相当简单，按需实现对应接口即可，扩展本身内容非常轻，内部具体的功能逻辑才是决定扩展开发复杂性的关键。而且借助 wasme 工具，自动生成代码后，效率可以更高（和目前在内部使用的 filter_creator.py 有部分相似，样板代码自动生成）。

至此，插件已经开发完成，可以打包编译了。wasm 同样提供了打包编译的功能，甚至可以类似于容器镜像将编译后结构推送到远端仓库之中，用于分享或者存储。不过有一个提示，在开发之前，先直接执行 bazel 命令编译，编译过程中，一些基础依赖会被自动拉取并缓存到本地，借助 IDE 可以获得更好的代码提示和开发体验。



```bash
bazel build :filter.wasm
```

接下来是 wasme 命令编译：


```bash
wasme build cpp -t webassemblyhub.io/wbpcode/path_rewrite:v0.1 .
```

该命令会使用固定镜像作为编译环境，但是本质和直接使用 bazel 编译并无不同。具体的编译日志可以看出，实际上，该命令也是使用的`bazel build :filter.wasm`。

```shell
Status: Downloaded newer image for quay.io/solo-io/ee-builder:0.0.19
Building with bazel...running bazel build :filter.wasm
Extracting Bazel installation...
Starting local Bazel server and connecting to it...

```

注意，上述命令中 wbpcode 为用户名，具体实践时提议替换为自身用户名，如果注册了 webassemblyhub.io 账号，甚至可以进行 push 和 pull 操作。此次就不做相关操作了，直接本地启动带 WASM 的 envoy。命令如下：

```
# --config参数用于指定wasm扩展配置
wasme deploy envoy webassemblyhub.io/wbpcode/path_rewrite:v0.1 --config "{\"rewrites\": [ {\"regex_match\":\"...\", \"custom_path\": \"/anything\"} ]}" --envoy-run-args "-l trace"
```

从 envoy 执行日志可以看到：最终 envoy 会执行七层 Filter：`envoy.filters.http.wasm`，相关配置为：wasm 文件位置（docker 执行时挂载进入容器内部）、 wasm 文件对应插件配置、runtime 等等。通过在 http_filters 中重复添加多个`envoy.filters.http.wasm`，即可实现多个 WASM 扩展的执行。从下面的日志也可以看出，即使不使用 solo.io 的工具，只需要为 Envoy 指定编译好的 wasm 文件，其执行结果是完全相同的。

```bash
[2020-03-31 08:41:24.831][1][debug][config] [external/envoy/source/extensions/filters/network/http_connection_manager/config.cc:388]       name: envoy.filters.http.wasm
[2020-03-31 08:41:24.831][1][debug][config] [external/envoy/source/extensions/filters/network/http_connection_manager/config.cc:390]     config: {
 "config": {
  "rootId": "add_header_root_id",
  "vmConfig": {
   "code": {
    "local": {
     "filename": "/home/ping/.wasme/store/e58ddd90347b671ad314f1c969771cea/filter.wasm"
    }
   },
   "runtime": "envoy.wasm.runtime.v8"
  },
  "configuration": "{\"rewrites\": [ {\"regex_match\":\"...\", \"custom_path\": \"/anything\"} ]}",
  "name": "add_header_root_id"
 }
}

```

之后使用对应 path 调用接口：可发现 WASM 插件已经生效：

```bash
':authority', 'localhost:8080'
':path', '/ab' # 原始请求path匹配"..."
':method', 'GET'
'user-agent', 'curl/7.58.0'
'accept', '*/*'
```

```bash
':authority', 'localhost:8080'
':path', '/anything'
':method', 'GET'
':scheme', 'https'
'user-agent', 'curl/7.58.0'
'accept', '*/*'
'x-forwarded-proto', 'http'
'x-request-id', '1009236e-ab57-4ded-a8ff-3d1b17c6787b'
'location', 'envoy-wasm'
'x-envoy-expected-rq-timeout-ms', '15000'
```

## WASM 总结

WASM 扩展仍在快速发展当中，但是 Istio 使用 WASM API 实现了相关的插件，说明已经做好了迁移的准备。前景美好，值得期待，但有待进一步确定 WASM 沙箱本身稳定性和性能。

从开发体验来说：

* 借助 solo.io 工具，简单插件的开发几乎没有任何的难度，只是目前支持的语言只有 C++/AssemblyScript（Envoy 社区开发了 Rust 语言 SDK，但是正在开发当中而且使用 Rust 开发 WASM 扩展的价值存疑：Rust 相比于 C++ 最大的优势是通过严格的编译检查来保证内存安全，但是也使得上手难度又提升了一个台阶，在有 WASM 沙箱为内存安全兜底的情况下，使用 Rust 而不使用 JS、Go 等上手更简易的语言来开发扩展，实无必要）。
* 对于相对复杂的插件，如果使用 WASM 的话，测试相比于原生插件会更困难一些，WASM 扩展配置的输入只能依赖手写 JSON 字符串，希望未来能够改善。
* 缺少路由粒度的配置，所有配置都是全局生效，依赖插件内部判断，但是这一部分如果确实有需要，支持起来应该很快，不存在技术上的阻碍，倒是不用担心。

## 作者简介

王佰平，网易杭州研究院轻舟云原生团队工程师，负责轻舟 Envoy 网关与轻舟 Service Mesh 数据面开发、功能增强、性能优化等工作，对 Envoy 数据面开发、增强、落地具有较为丰富的经验。
