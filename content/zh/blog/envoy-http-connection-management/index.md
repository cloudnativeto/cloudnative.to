---
title: "Envoy HTTP 连接管理"
description: "本文翻译自 Envoy 官方文档，介绍内置网路层过滤器 HTTP 连接管理器。"
author: "[Envoy 官方](https://www.envoyproxy.io/)"
translator: "[杨子锋 (Curtis)](https://github.com/fallingyang)"
image: "images/blog/envoy.png"
categories: ["service mesh"]
tags: ["Envoy"]
date: 2020-12-31T10:03:00+08:00
type: "post"
avatar: "/images/profile/envoy.png"
profile: "Envoy 是一种开放源代码边缘和服务代理，专为原生云应用程序而设计。"
type: "post"
avatar: "/images/profile/default.jpg"
---

本文译自 Envoy 官方文档 [HTTP connection management](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_connection_management)

## HTTP 连接管理

HTTP 是现代面向服务体系架构的重要组成部分，Envoy 实现了大量的 HTTP 特定功能。Envoy 内置了一个叫 [HTTP 连接管理器](https://cloudnative.to/envoy/configuration/http/http_conn_man/http_conn_man.html#config-http-conn-man) 的网络层过滤器。 此过滤器将原始字节转换为 HTTP 协议的消息和事件，例如，请求头接收、请求体数据接收、请求标尾 (trailers) 接收等。 过滤器同时处理所有 HTTP 连接和请求的通用功能，例如 [访问日志](https://cloudnative.to/envoy/intro/arch_overview/observability/access_logging.html#arch-overview-access-logs)、 [请求 ID 生成与追踪](https://cloudnative.to/envoy/intro/arch_overview/observability/tracing.html#arch-overview-tracing)、 [请求头/响应头的操作](https://cloudnative.to/envoy/configuration/http/http_conn_man/headers.html#config-http-conn-man-headers)、 [路由表](https://cloudnative.to/envoy/intro/arch_overview/http/http_routing.html#arch-overview-http-routing) 管理和 [统计](https://cloudnative.to/envoy/configuration/http/http_conn_man/stats.html#config-http-conn-man-stats)。

HTTP 连接管理器 [配置](https://cloudnative.to/envoy/configuration/http/http_conn_man/http_conn_man.html#config-http-conn-man)。

## HTTP 协议

Envoy 的 HTTP 连接管理器原生支持 HTTP/1.1、WebSockets 和 HTTP/2。现在还不支持 SPDY。Envoy HTTP 设计的首要目标是成为一个 HTTP/2 多路复用代理。在内部， HTTP/2 术语用于描述系统组件。例如，一个 HTTP 请求和响应发生在流上。一个编解码 API 被用来将不同的电报协议转换为流、请求、响应等协议无关的格式。 对于 HTTP/1.1 来说，编解码器将协议的串行/流功能转换成像 HTTP/2 的某些东西提供给更高层级。这意味着大部分代码不需要理解一个流是来自 HTTP/1.1 还是 HTTP/2 连接。

## HTTP 头清理

HTTP 连接管理器执行各种 [头清理](https://cloudnative.to/envoy/configuration/http/http_conn_man/header_sanitizing.html#config-http-conn-man-header-sanitizing) 操作为了安全因素。

## 路由表配置

每一个 [HTTP 连接管理过滤器](https://cloudnative.to/envoy/configuration/http/http_conn_man/http_conn_man.html#config-http-conn-man) 有一个相关的 [路由表](https://cloudnative.to/envoy/intro/arch_overview/http/http_routing.html#arch-overview-http-routing)。路由表可以使用下面两种之一来配置：

* 静态配置。
* 基于 [RDS API](https://cloudnative.to/envoy/configuration/http/http_conn_man/rds.html#config-http-conn-man-rds) 的动态配置。

## 重试插件配置

通常在重试期间，主机选择遵循与原始请求相同的过程。重试插件可以用来修改这种行为，它们分为两类：

* [主机谓词](https://cloudnative.to/envoy/api-v3/config/route/v3/route_components.proto.html#envoy-v3-api-field-config-route-v3-retrypolicy-retry-host-predicate)：这些谓词可以用来“拒绝”一个主机，将导致重新尝试主机选择。 可以指定任意数量的谓词，如果任何谓词拒绝主机，则主机将被拒绝。

    Envoy 支持以下内置的主机谓词

    * *envoy.retry_host_predicates.previous_hosts*：这将跟踪以前尝试过的主机并且拒绝已经尝试过的主机。
    * *envoy.retry_host_predicates.omit_canary_hosts*：这将拒绝任何被标记为金丝雀主机的主机。通过在过滤器元数据中为 `envoy.lb` 过滤器设置 `canary: true` 来标记主机。查看 [LbEndpoint](https://cloudnative.to/envoy/api-v3/config/endpoint/v3/endpoint_components.proto.html#envoy-v3-api-msg-config-endpoint-v3-lbendpoint) 获得更多信息。
    * *envoy.retry_host_predicates.omit_host_metadata*：这将拒绝任何符合预定义条件的主机。查看下面的配置示例获得更多信息。
* [优先级谓词](https://cloudnative.to/envoy/api-v3/config/route/v3/route_components.proto.html#envoy-v3-api-field-config-route-v3-retrypolicy-retry-priority)：这类谓词可以用来在为一个重试尝试选择优先级时调整负载的优先级。只可以定义 一个这样的谓词。

    Envoy 内置支持下面的优先级谓词

    * *envoy.retry_priorities.previous_priorities*：这将跟踪以前尝试过的优先级，并调整优先级负载，以便在后续重试中将其他优先级作为目标。

主机选择将会继续直到配置的谓词接受主机或者达到了配置的 [最大尝试次数](https://cloudnative.to/envoy/api-v3/config/route/v3/route_components.proto.html#envoy-v3-api-field-config-route-v3-retrypolicy-host-selection-retry-max-attempts)。

可以组合使用这些插件来影响主机选择和优先级。Envoy 也可以像添加过滤器一样通过自定义的重试插件进行扩展。

**配置示例**

例如，想要配置优先重试没有尝试过的主机，可以使用内置的 `envoy.retry_host_predicates.previous_hosts`：

```yaml
retry_policy:
  retry_host_predicate:
  - name: envoy.retry_host_predicates.previous_hosts
  host_selection_retry_max_attempts: 3
```

这将拒绝已经尝试过的主机，并且最多尝试 3 次主机选择。为了处理寻找一个可用主机过程中不可能发生（没有主机满足谓词）或者不太可能发生（唯一 合适的主机相对权重非常低）的情况，尝试次数的上限是有必要的。

根据主机的元数据拒绝主机，可以使用 `envoy.retry_host_predicates.omit_host_metadata`：

```yaml
retry_policy:
  retry_host_predicate:
  - name: envoy.retry_host_predicates.omit_host_metadata
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.retry.host.omit_host_metadata.v3.OmitHostMetadataConfig
      metadata_match:
        filter_metadata:
          envoy.lb:
            key: value
```

这将拒绝任何匹配元数据中存在（key，value）的主机。

配置在重试期间重试其他优先级，可以使用内置的 `envoy.retry_priorities.previous_priorities`。

```yaml
retry_policy:
  retry_priority:
    name: envoy.retry_priorities.previous_priorities
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.retry.priority.previous_priorities.v3.PreviousPrioritiesConfig
      update_frequency: 2
```

这将针对后续重试中尚未使用过的优先级。`update_frequency` 参数决定优先级负载应多长时间重新计算一次。

这些插件可以被组合使用，这将排除以前尝试过的主机和以前尝试过的优先级。

```yaml
retry_policy:
  retry_host_predicate:
  - name: envoy.retry_host_predicates.previous_hosts
  host_selection_retry_max_attempts: 3
  retry_priority:
    name: envoy.retry_priorities.previous_priorities
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.retry.priority.previous_priorities.v3.PreviousPrioritiesConfig
      update_frequency: 2
```

## 内部重定向

Envoy 支持处理 3xx 内部重定向，捕获可配置的 3xx 重定向响应，合成一个新的请求，将他发送给新路由匹配指定的上游，将重定向的响应作为对原始请求的响应返回。

内部重定向可以使用路由配置中的 [内部重定向策略](https://cloudnative.to/envoy/api-v3/config/route/v3/route_components.proto.html#envoy-v3-api-field-config-route-v3-routeaction-internal-redirect-policy) 字段来配置。 当重定向处理开启，任何来自上游的 3xx 响应，只要匹配到配置的 [redirect_response_codes](https://cloudnative.to/envoy/api-v3/config/route/v3/route_components.proto.html#envoy-v3-api-field-config-route-v3-internalredirectpolicy-redirect-response-codes) 的响应都将由 Envoy 来处理。

要成功地处理重定向，必须通过以下检查：

1. 响应码匹配到配置的 [redirect_response_codes](https://cloudnative.to/envoy/api-v3/config/route/v3/route_components.proto.html#envoy-v3-api-field-config-route-v3-internalredirectpolicy-redirect-response-codes)，默认是 302， 或者其他的 3xx 状态码（301, 302, 303, 307, 308）。
2. 拥有一个有效的、完全限定的 URL 的 location 头。
3. 该请求必须已被 Envoy 完全处理。
4. 请求不能包含请求体。
5. [allow_cross_scheme_redirect](https://cloudnative.to/envoy/api-v3/config/route/v3/route_components.proto.html#envoy-v3-api-field-config-route-v3-internalredirectpolicy-allow-cross-scheme-redirect) 是 true（默认是 false）， 或者下游请求的 scheme 和 location 头一致。
6. 给定的下游请求之前处理的内部重定向次数不超过请求或重定向请求命中的路由配置的 [最大重定向数](https://cloudnative.to/envoy/api-v3/config/route/v3/route_components.proto.html#envoy-v3-api-field-config-route-v3-internalredirectpolicy-max-internal-redirects)。
7. 全部 [谓词](https://cloudnative.to/envoy/api-v3/config/route/v3/route_components.proto.html#envoy-v3-api-field-config-route-v3-internalredirectpolicy-predicates) 接受目标路由。

任何失败都将导致重定向传递给下游。

由于重定向请求可能会在不同的路由之间传递，重定向链中的任何满足以下条件的路由都将导致重定向被传递给下游。

1. 没有启用内部重定向
2. 或者当重定向链命中的路由的 [最大重定向次数](https://cloudnative.to/envoy/api-v3/config/route/v3/route_components.proto.html#envoy-v3-api-field-config-route-v3-internalredirectpolicy-max-internal-redirects) 小于等于重定向链的长度。
3. 或者路由被 [谓词](https://cloudnative.to/envoy/api-v3/config/route/v3/route_components.proto.html#envoy-v3-api-field-config-route-v3-internalredirectpolicy-predicates) 拒绝。

有两个谓词可以创建一个有向无环图 (DAG) 来定义一个过滤器链，他们是 [先前的路由](https://cloudnative.to/envoy/api-v3/extensions/internal_redirect/previous_routes/v3/previous_routes_config.proto.html#envoy-v3-api-msg-extensions-internal-redirect-previous-routes-v3-previousroutesconfig) 谓词 和 [allow_listed_routes](https://cloudnative.to/envoy/api-v3/extensions/internal_redirect/allow_listed_routes/v3/allow_listed_routes_config.proto.html#envoy-v3-api-msg-extensions-internal-redirect-allow-listed-routes-v3-allowlistedroutesconfig)。 具体来说，*allow listed routes* 谓词定义的有向无环图（DAG）中各个节点的边，而 先前的路由 谓词定义了边的“访问”状态，如果是这样就可以避免循环。

第三个谓词 [safe_cross_scheme](https://cloudnative.to/envoy/api-v3/extensions/internal_redirect/safe_cross_scheme/v3/safe_cross_scheme_config.proto.html#envoy-v3-api-msg-extensions-internal-redirect-safe-cross-scheme-v3-safecrossschemeconfig) 被用来防止 HTTP -> HTTPS 的重定向。

一旦重定向通过这些检查，发送到原始上游的请求头将被修改为：

1. 将完全限定的原始请求 URL 放到 x-envoy-original-url 头中。
2. 使用 Location 头中的值替换 Authority/Host、Scheme、Path 头。

修改后的请求头将选择一个新的路由，通过一个新的过滤器链发送，然后把所有正常的 Envoy 请求都发送到上游进行清理。

> 请注意，HTTP 连接管理器头清理（例如清除不受信任的标头）仅应用一次。即使原始路由和第二个路由相同，每个路由的头修改也将同时应用于原始路由和第二路由，因此请谨慎配置头修改规则， 以避免重复不必要的请求头值。

一个简单的重定向流如下所示：

1. 客户端发送 GET 请求以获取 *http://foo.com/bar*
2. 上游 1 发送 302 响应码并携带 “*location: http://baz.com/eep*”
3. Envoy 被配置为允许原始路由上重定向，并发送新的 GET 请求到上游 2，携带请求头 “*x-envoy-original-url: http://foo.com/bar*” 获取 *http://baz.com/eep*
4. Envoy 将 *http://baz.com/eep* 的响应数据代理到客户端，作为对原始请求的响应。

## 超时

各种可配置的超时适用于 HTTP 连接及其组成的流。有关重要超时配置的概述，请参考 [此 FAQ 条目](https://cloudnative.to/envoy/faq/configuration/timeouts.html#faq-configuration-timeouts)。
