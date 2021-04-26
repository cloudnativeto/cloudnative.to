---
title: "使用基于 WebAssembly 的 GetEnvoy 工具包扩展 Envoy"
description: "本文为大家介绍了如何使用开源项目 GetEnvoy 来扩展 Envoy。"
author: "[Yaroslav Skopets](https://www.tetrate.io/blog/introducing-getenvoy-extension-toolkit-for-webassembly-based-envoy-extensions/)"
translator: "Wing Wong"
image: "images/blog/getenvoy.jpg"
categories: ["Envoy"]
tags: ["Envoy",”GetEnvoy"]
date: 2021-04-21T10:03:00+08:00
type: "post"
avatar: "/images/profile/yaro.jpg"
profile: "Yaroslav Skopets 是 Tetrate 工程师和 Envoy 贡献者，专注于推进 Wasm 对 Envoy 代理的支持。"
---

说一说来龙去脉，Envoy 是一个非常注重规模化业务的底层网络组件，令人激动且功能强大。然而它在用户体验方面一直很欠缺。

当用户开始使用一个新工具时，必然会从 “如何在自己的环境中安装” 这一问题开始。而 Envoy 之前并没有给出答案。

为了填补这一空白，Tetrate [启动了](https://www.getenvoy.io/blog/announcing-the-getenvoy-project/) GetEnvoy 项目并且 [推出了](https://www.getenvoy.io/blog/introducing-the-getenvoy-cli/) getenvoy CLI，作为提供给用户的组件。

### 新挑战

下一个关于 Envoy 的常见需求是 “如何扩展”。

截止目前，如果想扩展或定制 Envoy，你将不得不 “越界” 成为实质上的 Envoy 开发者。 

幸运的是，这种情况即将改变。一种名为 [WebAssembly（Wasm）](https://webassembly.org/) 的新技术即将纳入 Envoy。Wasm 让使用不同编程语言开发 Envoy 扩展成为可能。更重要的是，能以完全动态的方式部署这些扩展。

### GetEnvoy 扩展工具包

[GetEnvoy 扩展工具包](https://www.getenvoy.io/reference/getenvoy_extension_toolkit_reference/) 的目的在于帮助有扩展 Envoy 需求的开发者，在短时间内完成扩展开发并启动运行。

作为开发者，你很可能想：

- 从工作中的典型示例入手
- 从开始就建立有效的开发工作流
- 利用最佳实践，自动避免常见陷阱

GetEnvoy 扩展工具包将帮助您解决以上所有问题！

### 使用 Rust 创建 Envoy HTTP Filter

让我们使用 Rust 开发一个 Envoy HTTP Filter 来试试 GetEnvoy 扩展工具包吧！

#### 1. 前置要求

[安装](https://www.getenvoy.io/install/) getenvoy CLI，例如：

```shell
$ curl -L https://getenvoy.io/cli | bash -s -- -b /usr/local/bin
```

[安装](https://docs.docker.com/engine/install/) Docker。 

检查

运行命令：

```shell
$ getenvoy --version
```
应该看到类似于以下的输出：
```shell
getenvoy version 0.2.0
```
运行
```shell
$ docker --version
```
应该看到类似于以下的输出：
```shell
Docker version 19.03.8, build afacb8b
```

#### 2. 安装新的 HTTP Filter 扩展包的脚手架

如果想在交互模式下构建一个新扩展，运行命令：

```shell
$ getenvoy extension init
```
此外，如果想跳过向导，需要在命令行提供参数，比如：
```shell
$ getenvoy extension init \
    --category envoy.filters.http \
    --language rust \
    --name me.filters.http.my_http_filter \
    my_http_filter 
```

检查

运行命令：

```shell
$ tree -a my_http_filter
```
应该看到类似于以下的输出：
```shell
my_http_filter
├── .cargo
│   └── config
├── .getenvoy
│   └── extension
│       └── extension.yaml
├── .gitignore
├── Cargo.toml
├── README.md
├── src
│   ├── config.rs
│   ├── factory.rs
│   ├── filter.rs
│   ├── lib.rs
│   └── stats.rs
└── wasm
    └── module
        ├── Cargo.toml
        └── src
            └── lib.rs
```

#### 3. 构建扩展

运行命令：

```shell
$ getenvoy extension build
```
应该看到类似于以下的输出：
```shell
Updating crates.io index
Downloaded envoy-sdk v0.1.0
...
Compiling envoy-sdk v0.1.0
...
Finished dev [unoptimized + debuginfo] target (s) in 23.57s
Copying *.wasm file to 'target/getenvoy/extension.wasm'
```

检查

运行命令：

```shell
$ tree target/getenvoy/
```
应该看到类似于以下的输出：
```shell
target/getenvoy
└── extension.wasm
```

#### 4. 运行单元测试

运行命令：

```shell
$ getenvoy extension test
```

检查

应该看到类似于以下的输出：

```shell
running 1 test
test tests::should_initialize ... ok
test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

#### 5. 在 Envoy 中运行扩展

让我们用较困难的方式完成这部分工作。与其使用一条简单的自动化命令，不如手动完成每一步。

##### 1. 下载 Envoy 二进制文件

需要去下载和扩展开发版本相同的 Envoy

运行命令：

```shell
$ cat .getenvoy/extension/extension.yaml
```
应该看到类似于以下的输出：
```shell
…

# Runtime the extension is being developed against.

runtime:
  envoy:
    version: wasm:1.15
```
为了下载该版本的 Envoy，运行命令：
```shell
$ getenvoy fetch wasm:1.15
```
应该看到类似于以下的输出：
```shell
fetching wasm:1.15/darwin
[Fetching Envoy] 100%
```

##### 2. 创建一个示例 Envoy 配置

运行命令：

```shell
$ getenvoy extension examples add
```
检查一下，运行命令：
```shell
$ tree .getenvoy/extension/examples
```
应该看到类似于以下的输出：
```shell
.getenvoy/extension/examples
└── default
  ├── README.md
  ├── envoy.tmpl.yaml
  ├── example.yaml
  └── extension.json
```

##### 3. 通过查看 README.md 文件了解更多关于示例配置的信息

##### 4. 快速浏览示例 Envoy 配置

运行命令：

```shell
$  cat .getenvoy/extension/examples/default/envoy.tmpl.yaml
```
应该看到类似于以下的输出：
```yaml
...
http_filters:
- name: envoy.filters.http.wasm
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
    config:
      configuration: {{.GetEnvoy.Extension.Config}}
      name: {{.GetEnvoy.Extension.Name}}
      root_id: {{.GetEnvoy.Extension.Name}}
      vm_config:
        vm_id: {{.GetEnvoy.Extension.Name}}
        runtime: envoy.wasm.runtime.v8
        code: {{.GetEnvoy.Extension.Code}}
- name: envoy.filters.http.router
...
```

注意，示例 Envoy 配置中包含了占位符 {{…}}，这些占位符会由 getenvoy CLI 解决。

##### 5. 使用该示例配置启动 Envoy

运行命令：

```shell
$ getenvoy extension run
```
应该看到类似于以下的输出：
```shell
info Envoy command: [$HOME/.getenvoy/builds/wasm/1.15/darwin/bin/envoy -c /tmp/getenvoy_extension_run732371719/envoy.tmpl.yaml]
...
[info][main] [external/envoy/source/server/server.cc:339] admin address: 127.0.0.1:9901
...
[info][config] [external/envoy/source/server/listener_manager_impl.cc:700] all dependencies initialized. starting workers
[info][main] [external/envoy/source/server/server.cc:575] starting main dispatch loop
```

此时 Envoy 已启动，扩展也可以使用了。

检查

为了测试 HTTP Filter 扩展，运行命令：

```shell
$ curl -i http://0.0.0.0:10000
```
在 Envoy 的输出中，应该看到类似于以下的输出：
```shell
my_http_filter: #2 new http exchange starts at 2020-07-01T18:22:51.623813+00:00 with config:
my_http_filter: #2 observing request headers
my_http_filter: #2 -> :authority: 0.0.0.0:10000
my_http_filter: #2 -> :path: /
my_http_filter: #2 -> :method: GET
my_http_filter: #2 -> user-agent: curl/7.64.1
my_http_filter: #2 -> accept: */*
my_http_filter: #2 -> x-forwarded-proto: http
my_http_filter: #2 -> x-request-id: 8902ca62-75a7-40e7-9b2e-cd7dc983b091
my_http_filter: #2 http exchange complete
```
由于现在你知道了运行扩展的背后都发生了什么，下次就可以用以下命令简单启动扩展：
```shell
$ getenvoy extension run
```

#### 增加一个新特性

让我们为扩展添加一个新特性：在代理的 HTTP 响应中注入一个额外的标头。

首先，更新扩展配置以保存注入的标头的名称（添加的行后添加了注释）：

在 src/config.rs 文件中

```rust
/// Configuration for a Sample HTTP Filter.
#[derive (Debug, Default, Deserialize)]
pub struct SampleHttpFilterConfig {#[serde (default)]{
#[serde(default)]
pub response_header_name: String, // 添加的代码
}
```

接着，添加 on_response_headers 方法到 SampleHttpFilter 中：

在 src/filter.rs 文件中

```rust
/// Called when HTTP response headers have been received. 当 HTTP 响应头被接收时调用
///
/// Use `filter_ops` to access and mutate response headers. 使用 filter_ops 访问和变异响应头
fn on_response_headers (
    &mut self,
    _num_headers: usize,
    _end_of_stream: bool,
    filter_ops: &dyn http::ResponseHeadersOps,
) -> Result<http::FilterHeadersStatus> {if !self.config.response_header_name.is_empty () {
        filter_ops.set_response_header (
            &self.config.response_header_name,
            "injected by WebAssembly extension"
        )?;
    }
    Ok (http::FilterHeadersStatus::Continue)
}
```

最后，在默认的示例设置中更新扩展配置。

在 `.getenvoy/extension/examples/default/extension.json` 文件中

```{"response_header_name":"my-header"}```

检查

为了确认变更，重启示例设置：

```shell
$ getenvoy extension run
```
发出以下示例请求：
```sh
$ curl -i localhost:10000
```
应该看到类似于下面的输出：
```sh
HTTP/1.1 200 OK
content-length: 22
content-type: text/plain
date: Tue, 07 Jul 2020 18:36:23 GMT
server: envoy
x-envoy-upstream-service-time: 0
my-header: injected by WebAssembly extension
 
Hi from mock service!
```

注意到一条额外的标头被注入到响应中。

#### 增加一个新指标

Envoy 大力支持对新行为的可观察性。

让我们更新扩展以暴露关于其新行为的度量。具体来说，提供一个计数器，显示被额外的标头注入了的 HTTP 响应的数量。 

编辑源码如下（添加的行后加入了注释）：

在 src/stats.rs 文件中

```rust
use envoy::host::stats::Counter;

/// Sample stats.
pub struct SampleHttpFilterStats {requests_total: Box<dyn Counter>,
   responses_injected_total: Box<dyn Counter>,              //added code 新增行
} 

impl SampleHttpFilterStats {
   pub fn new (requests_total: Box<dyn Counter>,
       responses_injected_total: Box<dyn Counter>,          //added code 新增行
   ) -> Self {
       SampleHttpFilterStats {
           requests_total,
           responses_injected_total,                        //added code 新增行
       }
   }

   pub fn requests_total (&self) -> &dyn Counter {&*self.requests_total}

   pub fn responses_injected_total (&self) -> &dyn Counter { //added code 新增行
       &*self.responses_injected_total
   }
}
```
在 src/factory.rs 中
```rust
/// Creates a new factory.
pub fn new (clock: &'a dyn Clock, stats: &dyn Stats) -> Result<Self> {
    let stats = SampleHttpFilterStats::new (stats.counter ("examples.http_filter.requests_total")?,
        stats.counter ("examples.http_filter.responses_injected_total")?, //added code 新增行
    );
    // Inject dependencies on Envoy host APIs
    Ok (SampleHttpFilterFactory {config: Rc::new (SampleHttpFilterConfig::default ()),
        stats: Rc::new (stats),
        clock,
    })
}
```
在 src/filter.rs 中
```rust
/// Called when HTTP response headers have been received.
///
/// Use `filter_ops` to access and mutate response headers.
fn on_response_headers (
    &mut self,
    _num_headers: usize,
    _end_of_stream: bool,
    filter_ops: &dyn http::ResponseHeadersOps,
) -> Result<http::FilterHeadersStatus> {if !self.config.response_header_name.is_empty () {
        filter_ops.set_response_header (
            &self.config.response_header_name,
           "injected by WebAssembly extension",
        )?;
        self.stats.responses_injected_total ().inc ()?; //added code
    }
    Ok (http::FilterHeadersStatus::Continue)
}
```

检查

重启示例设置，发出示例请求并检查 Envoy 的指标：

```$ getenvoy extension run```

```sh
$ curl -i localhost:10000
$ curl -i localhost:10000

$ curl -s localhost:9901/stats | grep responses_injected_total
```
应该看到类似于以下的输出：
```
examples.http_filter.responses_injected_total: 2
```

我们对使用 [GetEnvoy 扩展工具包](https://www.getenvoy.io/reference/getenvoy_extension_toolkit_reference/) 的开发流程的简单介绍到此结束。

### 结束语

目前为止，我们展示了使用 GetEnvoy 开发 Envoy 扩展是多么容易。

结合 [getenvoy CLI](https://www.getenvoy.io/) 的便利和 [Envoy Rust SDK](https://docs.rs/envoy-sdk/) 的指引，你可以轻松胜任这些工作。

除了上面演示的 [HTTP Filter](https://docs.rs/envoy-sdk/0.1.0/envoy_sdk/extension/filter/http/index.html) 扩展外，你还可以使用该工具包开发其他类型的 Envoy 扩展，比如 [Network Filter](https://docs.rs/envoy-sdk/0.1.0/envoy_sdk/extension/filter/network/index.html) 和 [Access Logger](https://docs.rs/envoy-sdk/0.1.0/envoy_sdk/extension/access_logger/index.html)。

### 未来计划

在未来的几个月里，我们将为 GetEnvoy 添加一些新特性。

一方面，我们将把重点转移到扩展用户体验上，为用户提供能够轻松发现和使用扩展的方法。 

另一方面，我们将继续改善开发者流程的用户体验。对更多编程语言和更多扩展类型的支持将会到来。 

敬请关注 GetEnvoy 的进一步更新！请与我们分享你在 Rust 中的 Envoy 扩展！

