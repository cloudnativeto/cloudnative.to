---
title: "Kubernetes Gateway API 深入解读和落地指南"
date: 2023-05-05T15:00:00+08:00
draft: false
authors: ["张启航"]
summary: "本文介绍了 Kubernetes 网关 API，该 API 旨在提供一种在 Kubernetes 中管理网关和负载均衡器的标准方法。文章解释了 Kubernetes 网关 API 的核心组件和概念，并且详细介绍了如何使用网关 API 来配置和管理网关和负载均衡器。文章还介绍了一些常见的网关实现，例如 Istio 和 Contour，以及如何使用它们与 Kubernetes 网关 API 进行集成。最后，文章还讨论了 Kubernetes 网关 API 的未来发展方向。"
tags: ["Kubernetes","Gateway"]
categories: ["Kubernetes"]
---

本文介绍了 Kubernetes 网关 API，该 API 旨在提供一种在 Kubernetes 中管理网关和负载均衡器的标准方法。文章解释了 Kubernetes 网关 API 的核心组件和概念，并且详细介绍了如何使用网关 API 来配置和管理网关和负载均衡器。文章还介绍了一些常见的网关实现，例如 Istio 和 Contour，以及如何使用它们与 Kubernetes 网关 API 进行集成。最后，文章还讨论了 Kubernetes 网关 API 的未来发展方向。

## 背景

Kubernetes Gateway API 是 Kubernetes 1.18 版本引入的一种新的 API 规范，是 Kubernetes 官方正在开发的新的 API，Ingress 是 Kubernetes 已有的 API。Gateway API 会成为 Ingress 的下一代替代方案。Gateway API 提供更丰富的功能，支持 TCP、UDP、TLS 等，不仅仅是 HTTP。Ingress 主要面向 HTTP 流量。Gateway API 具有更强的扩展性，通过 CRD 可以轻易新增特定的 Gateway 类型，比如 AWS Gateway 等。Ingress 的扩展相对较难。Gateway API 支持更细粒度的流量路由规则，可以精确到服务级别。Ingress 的最小路由单元是路径。

Gateway API 的意义和价值：

* 作为 Kubernetes 官方项目，Gateway API 能够更好地与 Kubernetes 本身集成，有更强的可靠性和稳定性。

* 支持更丰富的流量协议，适用于服务网格等更复杂的场景，不仅限于 HTTP。可以作为 Kubernetes 的流量入口 API 进行统一。

* 具有更好的扩展性，通过 CRD 可以轻松地支持各种 Gateway 的自定义类型，更灵活。

* 可以实现细粒度的流量控制，精确到服务级别的路由，提供更强大的流量管理能力。

综上，Gateway API 作为新一代的 Kubernetes 入口 API，有更广泛的应用场景、更强大的功能、以及更好的可靠性和扩展性。对于生产级的 Kubernetes 环境，Gateway API 是一个更好的选择。本篇文章将深入解读 Kubernetes Gateway API 的概念、特性和用法，帮助读者深入理解并实际应用 Kubernetes Gateway API，发挥其在 Kubernetes 网络流量管理中的优势。

## 发展现状

### 版本现状

Gateway API 目前还处于开发阶段，尚未发布正式版本。其版本发展现状如下：

* v1beta1: 当前的主要迭代版本，Gateway API  进入了 beta 版本，这意味着我们可以在生产中使用 Gateway API 能力了，目前 beta 版本仅支持 HTTP 协议，TCP 协议、UDP 协议、gRPC 协议、TLS 协议均为 alpha 版本。

* v1.0: 首个正式 GA 版本，API 稳定，可以用于生产环境。但功能还会持续完善。

### 可用场景

下面简单整理了一下 HTTPRoute 的一些可用场景：

* 多版本部署：如果您的应用程序有多个版本，您可以使用 HTTPRoute 来将流量路由到不同的版本，以便测试和逐步升级。例如，您可以将一部分流量路由到新版本进行测试，同时保持旧版本的运行。

* A/B 测试：HTTPRoute 可以通过权重分配来实现 A/B 测试。您可以将流量路由到不同的后端服务，并为每个服务指定一个权重，以便测试不同版本的功能和性能。

* 动态路由：HTTPRoute 支持基于路径、请求头、请求参数和请求体等条件的动态路由。这使得您可以根据请求的不同属性将流量路由到不同的后端服务，以满足不同的需求。

* 重定向：HTTPRoute 支持重定向，您可以将某些请求重定向到另一个 URL 上，例如将旧的 URL 重定向到新的 URL。

### 周边生态

目前，尽管 Gateway API 还处于开发阶段，但已经有部分项目表示支持或计划支持 Gateway API。主要包括：

* Istio 是最流行的服务网格项目之一，Istio 1.9 版本计划引入实验性的 Gateway API 支持。用户可以通过 Gateway 和 HTTPRoute 资源来配置 Istio 的 Envoy 代理。

* Linkerd 是另一个流行的服务网格项目，Linkerd 2.10 版本添加了 Gateway API 支持。用户可以使用 Gateway API 资源来配置 Linkerd 的代理。

* Contour 是一个 Kubernetes Ingress Controller，Contour 1.14.0 版本添加 Gateway API 支持，可以使用 Gateway 和 HTTPRoute 来配置 Contour。

* Flagger 是一款 Kubernetes 的蓝绿部署和 A/B 测试工具，Flagger 0.25 版本添加了对 Gateway API 的支持，可以使用 Gateway 和 HTTPRoute 构建 Flagger 的流量路由。

* HAProxy Ingress Controller 支持 Gateway API，可以使用 Gateway 和 HTTPRoute 构建 HAProxy 的配置。

* Traefik 是著名的开源边缘路由器，Traefik 2.5 版本开始支持 Gateway API 并逐步淘汰 Ingress 支持。

除此之外，Apisix、Envoy gateway、Higress 等开源项目也支持或打算支持 Gateway API，各大云服务商都在积极跟进 Gateway API 进展，预计未来会在相应的服务中提供 Gateway API 支持。可以看出，尽管 Gateway API 还不算成熟和稳定，但由于其强大的功能和作为 Kubernetes 官方项目的影响力，已经获得大量项目的支持和兼容。服务网格、API 网关以及各大云服务商都将是 Gateway API 的重点生态。

### 未来规划

* 完善功能和稳定性：继续完善 Gateway API 的功能和稳定性，以确保其能够应对不同场景的需求。

* 管理规模：针对大规模 Kubernetes 集群的需求，优化 Gateway API 的性能和扩展性，使其能够管理更多的网关和路由规则。

* 增强安全性：加强 Gateway API 的安全性，包括在传输过程中的加密、身份验证等方面，以确保网络流量的安全性。

* 完善文档和社区支持：完善 Gateway API 的文档和社区支持，以帮助用户更好地使用和了解该项目。

## Gateway API 规范解读

### 基础概念

Kubernetes Gateway API 定义了三种基本资源类型：GatewayClass、Gateway、Route。

- **Gatewayclass:** 一组共享通用配置和行为的 Gateway 集合，与 IngressClass、StorageClass 类似，需要知道 Gateway API 并不会创建真正的网关，真正的网关是由一些支持 Gateway API 的社区（基础设备提供商）所提供的 Controller 所创建，如 Envoy、Istio、Nginx。GatewayClass，Gatewayclass 的作用就是绑定一个 Controller 定义一种网关类型。
- **Gateway:** 可以说成 GatewayClass 的具体实现，声明后由 GatewayClass 的基础设备提供商提供一个具体存在的 Pod，充当了进入 Kubernetes 集群的流量的入口，负责流量接入以及往后转发，同时还可以起到一个初步过滤的效果。
- **Route:** 真实的路由，定义了特定协议的规则，用于将请求从 Gateway 映射到 Kubernetes 服务。目前只有 HTTPRoute 进入了 v1beta 版本，是比较稳定的版本，后续  TCPRoute、UDPRoute、GRPCRoute、TLSRoute 等也会陆续进入 beta 版本达到生产可用，这里将只对 HTTPRoute 进行介绍。

关于他们三者之间的关系，官方文档也给了一幅非常清晰的结构图，如下图所示，在我看来，图片主要强调了面向角色的特点，官方想表达意思是 GatewayClass 由基础设施供应商提供，Gateway 资源由集群工程师创建，基本环境搭建完成后，开发者便可以轻松创建 HTTPRoute 将自己的业务代理出来。

![](https://static.goodrain.com/wechat/gateway-api-indepth/1.png)

### 工作原理

#### 结构图

![](https://static.goodrain.com/wechat/gateway-api-indepth/2.png)

#### GatewayClass

通过部署 GatewayClass 绑定下游实现提供的 Controller，为集群提供一种网关能力，这里可以看作是一种注册声明吧，将你的下游实现注册到集群中供 Gateway 绑定使用。Controller 可以看作监听 Gateway 资源的 Operator。

```Bash
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller #绑定的 Controller 名称
```

#### Gateway

Gateway 资源是一个中间层，需要定义所要监听的端口、协议、TLS 配置等信息，可以将网络流量的管理和控制集中到一个中心化的位置，提高集群的可用性和安全性。配置完成后，由 GatewayClass 绑定的 Controller 为我们提供一个具体存在 Pod 作为流量入口，需要注意的是，各家实现在此处还是略有不同，比如说 Envoy 当你创建 Gateway 资源后，Envoy Controller 会创建一个 Deployment 资源为你提供入口流量 Pod，然而 Nginx 则是自己本身就是流量入口 Pod 不会创建新的。

```YAML
spec:
  gatewayClassName: envoy #绑定的 GatewayClass 名称。
  listeners: # 定义了一些监听项，供 Route 进行绑定
  - allowedRoutes: #定义流量转发范围
      namespaces:
        from: All #允许 Gateway 往所有的 Namespace 的 Pod 转发流量。
    name: http #监听项名称。
    port: 8088 #监听项所占用的端口
    hostname： www.gateway.*.com #定义一个域名，一般为泛域名、匹配来自该域名的流量。
    protocol: HTTP #定义协议，HTTP或者HTTPS 
  - allowedRoutes:
      namespaces:
        from: All
    name: https
    port: 8443
    protocol: HTTPS
    tls:  #为 HTTPS 配置加密协议
      mode: Terminate #加密协议类型，Terminate 或 Passthrough
      certificateRefs:
      - kind: Secret
        name: cafe-secret
        namespace: default
```

**协议类型：**

- **Terminate**：将加密的流量解密并将明文流量转发到后端服务。这种模式需要在网关处配置证书和密钥，以便对客户端和服务器之间的流量进行加密和解密，确保数据安全性。
- **Passthrough：**将加密的流量原样转发到后端服务。这种模式不需要在网关处配置证书和密钥，因为 TLS 连接只在后端服务处终止。这种模式适用于需要将 TLS 流量直接传递到后端服务的场景，如需要对后端服务进行更细粒度的访问控制或流量监控的情况。

#### HTTPRoute

HTTPRoute 便跟你的业务密切相关了，在这里定义详细的规则，将流量代理到对应的业务服务上。

```YAML
#HTTPRoute A
spec:
  parentRefs: #绑定 Gateway 监听项
  - name: gateway #Gateway 资源名称
    namespace: envoy #Gateway所在命名空间
    sectionName: http #监听项名称
  hostnames:  #为路由配置域名
  - "www.gateway.example.com" #可配置泛域名,可配置多个
  rules: #配置详细的路由规则，可配置多个，下面有对各种规则类型的详细解析
  - matches: #匹配条件
    - path:  #路径匹配
        type: PathPrefix #路径类型：Exact 完全匹配/PathPrefix 前缀匹配/RegularExpression 正则匹配
        value: /gateway 
    filters: #高级设置
    - type: requestHeaderModifier #加工请求头
      requestHeaderModifier: #支持 set 覆盖/add 添加/remove 删除
        set:
        - name: service
          value: goodrain
    - type: RequestRedirect #请求重定向
      requestRedirect: 
        scheme: https # 重定向所使用的协议，http/https
        hostname: www.baidu.com #重定向的域名
        port: 8443 #重定向所使用的端口
        statusCode: 301 #重定向状态码：301 永久的重定向/302 临时重定向
-----------------
#HTTPRoute B
spec:
  parentRefs: 
  - name: gateway 
    namespace: envoy 
    sectionName: https
  hostnames:  
  - "www.gateway.example.com" 
  rules: 
  - matches: 
    - headers: #请求头匹配
      - name: service 
        value: goodrain
    backendRefs: #后端路由
    - name: goodrain-v1 # service 名称
      port: 80 #service 端口
      weight: 80 #权重
    - name: goodrain-v2
      port: 80
      weight: 20
```

**规则类型：**

- **matches:** 由一个或多个匹配条件组成，这些匹配条件可以基于 HTTP 请求的各种属性（如请求方法、路径、头部、查询参数等）进行匹配，从而确定哪些请求应该被路由到该规则对应的后端服务。
- **filters:** 对传入请求进行更细粒度的控制，例如修改请求的头部、转发请求到其他服务、将请求重定向到不同的 URL 等。它们由一组规则组成，每个规则都包含一个或多个过滤器。这些过滤器可以在请求被路由到后端服务之前或之后进行处理，以实现各种不同的功能。
- **backendRefs:** 用来指定后端服务的引用，它包含一个后端服务的列表，每个服务由名称和端口号组成，可以使用不同的负载均衡算法，将请求路由到后端服务的其中一个实例中，实现负载均衡。

深入了解以后，我们可以看出来 HTTPRoute 的用法非常的灵活，可以通过将不同的规则组合搭配，来创建一条适合我们业务的路由，就拿上面的 yaml 为例，整体流量走向如下图所示，当 http 协议的请求流量进入后，按照规则匹配，流量会向下转发到 HTTPRoute A 的路由上，HTTPRoute A 按照规则顺序，先对请求进行加工处理添加请求头，之后将请求重定向到 HTTPRoute B 上，再由 HTTPRoute 将流量按照权重比例路由到对应的后端服务。

需要注意的是，规则集有优先级，当同时存在多个规则（rule）的时候，流量会从上往下进行匹配，只要有匹配上流量会直接代理到其对应的后端或重定向到对应的路由。

## Gateway API 快速上手

整理一下部署思路，如果在业务中使用 Gateway API 我们都需要做什么。

- Kubernetes Gateway API 基础 CRD。[安装网关 API CRD 地址](https://gateway-api.sigs.k8s.io/guides/#installing-gateway-api)。
- Gateway API 下游实现，即基础设备供应商。（包含 GatewayClass 资源）[下游实现地址](https://gateway-api.sigs.k8s.io/implementations/)。
- 创建 Gateway，定义基础的路由方式供 HTTPRoute 选择。根据上面的字段解释自行编写。
- 创建 HTTPRoute 设置规则绑定自己的业务。根据上面的字段解释自行编写。

下面以 Envoy 提供的 demo 为例，串一下整体流程

### 安装 Gateway API CRD 和 Envoy Controller

```Bash
kubectl apply -f https://github.com/envoyproxy/gateway/releases/download/v0.3.0/install.yaml
```

**查看安装效果**

```Bash
# 查看安装的 CRD 资源
kubectl get crd |grep networking.k8s.io

# 查看安装的 envoy controller
kubectl get pod -n envoy-gateway-system
```

### 安装 Gateway、HTTPRoute 及示例应用

```Bash
kubectl apply -f https://github.com/envoyproxy/gateway/releases/download/v0.3.0/quickstart.yaml
```

#### 内部 GatewayClass 资源

资源的 controllerName 属性字段配置绑定了 envoy 的 controller

```Bash
apiVersion: gateway.networking.k8s.io/v1beta1
kind: GatewayClass
metadata:
  name: eg
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
```

#### 内部 Gateway 资源

资源的 gatewayClassName 属性字段配置绑定了 gatewayclass 资源名称 eg，同时提供了一个 对内监听端口为 80，协议类型为 http 的监听项。

```Bash
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: eg
spec:
  gatewayClassName: eg
  listeners:
    - name: http
      protocol: HTTP
      port: 80
```

#### 内部的 HTTPRoute 资源

资源的 parentRefs 属性字段配置绑定了 gateway 资源名称 eg。域名为 www.example.com，代理的后端服务类型选择了 service，名称为 backend，服务端口为 3000。

```SQL
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: backend
spec:
  parentRefs:
    - name: eg
  hostnames:
    - "www.example.com"
  rules:
    - backendRefs:
        - group: ""
          kind: Service
          name: backend
          port: 3000
          weight: 1
      matches:
        - path:
            type: PathPrefix
            value: /
```

**查看安装效果**

```Bash
# 查看安装的 gatewayclass 资源
kubectl get gatewayclass

# 查看安装的 gateway 资源
kubectl get gateway

# 查看安装的 httproute 资源
kubectl get httproute

#查看由 Controller 提供的流量入口 Pod。
kubectl get pod -n envoy-gateway-system

#查看路由解析地址,其中 nodeport 类型的 svc 便是你的解析地址。
kubectl get svc -n envoy-gateway-system|grep LoadBalancer

#访问
curl --resolve www.example.com:31830:xx.xxx.xx.xxx --header "Host: www.example.com"  http://www.example.com:31830/get                                           
```

## Gateway API 生产指南

Gateway API 使用到生产需要考虑易用性、可管理性和稳定性因素：

- **易用性**：Gateway API 扩展了很多配置内容，如果直接写 yaml 上手难度较大，而且容易出错，所以需要有一个基于 UI 的管理工具。
- **可管理性**：Gateway API 支持分角色管理和使用，跟平台工程的思路一致，但要用到生产需要有一个分权限和角色的平台。
- **稳定性**：Gateway API 当前的实现中，Envoy 和 Nginx 可以用到生产环境。 

基于以上因素，在生产环境需要 Gateway API 的管理工具，当前相对成熟的工具可以选择 Rainbond，它运行 Kubernetes 基础上，它也是平台工程的设计思路，提供 web 界面管理 Kubernetes 的资源，包括 Gateway API，对使用者不需要写 Yaml 文件，能区分管理员角色和普通开发者角色，管理员可以通过管理界面安装兼容的 Gateway API 的实现，比如 Envoy 和 Nginx，安装好的网关，普通开发者只需要配置业务的路由就可以使用，不用关心是哪一种实现。

**具体落地过程：**

### 在 Kubernetes 上安装 Rainbond

参考安装文档： [基于 Kubernetes 安装 Rainbond ](https://www.rainbond.com/docs/installation/install-with-helm/)

### 管理员安装 Gateway API 的网关实现

通过 Rainbond 提供的应用市场，搜索 GatewayAPI 会出来三个应用，先安装 GatewayAPI-Base，再安装 GatewayAPI-Envoy 或 Gateway-Nginx，当然也可以两个都装。

![](https://static.goodrain.com/wechat/gateway-api-indepth/3.png)

### 管理员配置 Gateway  API 的资源

在`平台管理 / 扩展 / 能力` 点击对应资源的编辑，配置 Gateway 和 GatewayClass 资源。

![](https://static.goodrain.com/wechat/gateway-api-indepth/4.png)

### 开发者配置业务路由

开发者在自己开发的应用中配置网关，如果同时安装多个网关实现，可以先选择网关类型，然后通过界面配置 HTTPRoute 字段。

![](https://static.goodrain.com/wechat/gateway-api-indepth/5.png)

**补充说明：**

- Rainbond 当前版本只支持 HTTPRoute，其他类型的 Route 暂时不支持；
- 从 Rainbond 应用市场只能安装 Envoy 和 Nginx 两种网关实现，要支持更多网关实现需要 Rainbond 先支持或自己制作插件；
- 资料参考：[Rainbond 的 Gateway API 插件制作实践](https://www.rainbond.com/blog/gatewayapi)。