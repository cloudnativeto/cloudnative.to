---
title: "AWS App Mesh vs Istio"
date: "2019-10-15T16:58:27+08:00"
draft: false
authors: ["马若飞"]
summary: "本文从架构和功能等方面较为全面的对比了 AWS App Mesh 和 Istio 两个服务网格产品。"
categories: ["service mesh"]
tags: ["istio"]
---

作者：马若飞，lead software engineer in FreeWheel，《Istio 实战指南》作者，ServiceMesher 社区管委会成员。

## 前言

近两年随着微服务架构的流行，服务网格（Service Mesh）技术受到了越来越多的人关注，并拥有了大批的拥趸。目前市面上比较成熟的开源服务网格主要有下面几个：Linkerd，这是第一个出现在公众视野的服务网格产品，由 Twitter 的 finagle 库衍生而来，目前由 Buoyant 公司负责开发和维护；Envoy，Lyft 开发并且是第一个从 CNCF 孵化的服务网格产品，定位于通用的数据平面或者单独作为 Sidecar 代理使用；Istio，由 Google、IBM、Lyft 联合开发的所谓第二代服务网格产品，控制平面的加入使得服务网格产品的形态更加完整。

服务网格技术作为构建云原生应用的重要一环，逐渐的被越来越多的人和厂商认可，并看好它的发展前景。在 Istio 大红大紫的今天，作为和 Google 在云服务市场竞争的 Amazon 来说，自然不愿错失这块巨大的蛋糕。他们在今年 4 月份发布了自己的服务网格产品：AWS App Mesh。本文会聚焦于 Istio 和 App Mesh 这两个产品，通过横向的对比分析让大家对它们有一个更深入的认识。

## 概念

### 产品定位

从官方的介绍来看，Istio 和 App Mesh 都比较明确的表示自己是一种服务网格产品。Istio 强调了自己在连接、安全、控制和可视化 4 个方面的能力；而 App Mesh 主要强调了一致的可见性和流量控制这两方面能力，当然也少不了强调作为云平台下的产品的好处：托管服务，无需自己维护。

从某种程度上讲，Istio 是一个相对重一点的解决方案，提供了不限于流量管理的各个方面的能力；而 App Mesh 是更加纯粹的服务于运行在 AWS 之上的应用并提供流控功能。笔者认为这和它目前的产品形态还不完善有关（后面会具体提到）。从与 AWS 内部开发人员的沟通中可以感觉到，App Mesh 应该是一盘很大的棋，目前只是初期阶段而已。

### 核心术语

和 AWS 里很多产品一样，App Mesh 也不是独创，而是基于 Envoy 开发的。AWS 这样的闭环生态必然要对其进行改进和整合。同时，也为了把它封装成一个对外的服务，提供适当的 API 接口，在 App Mesh 这个产品中提出了下面几个重要的技术术语，我们来一一介绍一下。

- 服务网格（Service mesh）：服务间网络流量的逻辑边界。这个概念比较好理解，就是为使用 App mesh 的服务圈一个虚拟的边界。
- 虚拟服务（Virtual services）：是真实服务的抽象。真实服务可以是部署于抽象节点的服务，也可以是间接的通过路由指向的服务。
- 虚拟节点（Virtual nodes）：虚拟节点是指向特殊工作组（task group）的逻辑指针。例如 AWS 的 ECS 服务，或者 Kubernetes 的 Deployment。可以简单的把它理解为是物理节点或逻辑节点的抽象。
- Envoy：AWS 改造后的 Envoy（未来会合并到 Envoy 的官方版本），作为 App Mesh 里的数据平面，Sidecar 代理。
- 虚拟路由器（Virtual routers）：用来处理来自虚拟服务的流量。可以理解为它是一组路由规则的封装。
- 路由（Routes）：就是路由规则，用来根据这个规则分发请求。

![appmesh](appmesh.png)

上面的图展示了这几个概念的关系：当用户请求一个虚拟服务时，服务配置的路由器根据路由策略将请求指向对应的虚拟节点，这些节点本质上是 AWS 里的 EKS 或者 ECS 的节点。

那么这些 App Mesh 自创的术语是否能在 Istio 中找到相似甚至相同的对象呢？我归纳了下面的表格来做一个对比：

| App Mesh                      | Istio                                                        |
| ----------------------------- | ------------------------------------------------------------ |
| 服务网格（Service mesh）      | Istio 并未显示的定义这一概念，我们可以认为在一个集群中，由 Istio 管理的服务集合，它们组成的网络拓扑即是服务网格。 |
| 虚拟服务（Virtual services）  | Istio 中也存在虚拟服务的概念。它的主要功能是定义路由规则，使请求可以根据这些规则被分发到对应的服务。从这一点来说，它和 App Mesh 的虚拟服务的概念基本上是一致的。 |
| 虚拟节点（Virtual nodes）     | Istio 没有虚拟节点的概念，可以认为类似 Kubernetes 里的 Deployment。 |
| 虚拟路由器（Virtual routers） | Istio 也没有虚拟路由器的概念。                                |
| 路由（Routes）                | Istio 中的目标规则（DestinationRule）和路由的概念类似，为路由设置一些策略。从配置层面讲，其中的子集（subset）和 App Mesh 路由里选择的目标即虚拟节点对应。但 Istio 的目标规则更加灵活，也支持更多的路由策略。 |

从上面的对比看出，App Mesh 目前基本上实现了最主要的流量控制（路由）的功能，但像超时重试、熔断、流量复制等高级一些的功能还没有提供，有待进一步完善。

## 架构

AWS App Mesh 是一个商业产品，目前还没有找到架构上的技术细节，不过我们依然可以从现有的、公开的文档或介绍中发现一些有用的信息。

![arch1](arch.png)

从这张官网的结构图中可以看出，每个服务的橙色部分就是 Sidecar 代理：Envoy。而中间的 AWS App Mesh 其实就是控制平面，用来控制服务间的交互。那么这个控制平面具体的功能是什么呢？我们可以从今年的 AWS Summit 的一篇 PPT 中看到这样的字样：

>控制平面用来把逻辑意图转换成代理配置，并进行分发。

![arch2](./aws-summit-appmesh.png)

熟悉 Istio 架构的朋友有没有觉得似曾相识？没错，这个控制平面的职责和 Pilot 基本一致。由此可见，不管什么产品的控制平面，也必须具备这些核心的功能。

那么在平台的支持方面呢？下面这张图展示了 App Mesh 可以被运行在如下的基础设施中，包括 EKS、ECS、EC2 等等。当然，这些都必须存在于 AWS 这个闭环生态中。

![arch3](https://www.allthingsdistributed.com/images/appmesh.png)

而 Istio 这方面就相对弱一些。尽管 Istio 宣称是支持多平台的，但目前来看和 Kubernetes 还是强依赖。不过它并不受限于单一的云平台，这一点有较大的优势。

从可观测性来看，App Mesh 依然发挥了自家生态的优势，可以方便的接入 CloudWatch、X-Ray 对服务进行观测。另外，App Mesh 也提供了更大的灵活性，可以在虚拟节点里配置服务后端（可以是虚拟服务或者 ARN），流量可以出站到这些配置的服务。这一点来说，和 Istio 的 Mixer 又有了异曲同工之妙。Mixer 通过插件方式为 Istio 提供了极大的可扩展性，App Mesh 在这一点上也不算落下风。

Istio 的架构大家都非常熟悉了，这里就不再赘述了，感兴趣的同学可以直接去[官网](https://istio.io/docs/concepts/what-is-istio/)查看。

## 功能与实现方式

### 部署

Istio 部署后类似一个网一样附着在你的 Kubernetes 集群上，控制平面会使用你设置的资源；而 App Mesh 是一种托管方式，只会使用 Envoy 代理。完整安装后的 Istio 需要添加 50 个左右的 CRD，而 App Mesh 只添加了 3 个 CRD：`meshes.appmesh.k8s.aws`，`virtualnodes.appmesh.k8s.aws`和`virtualservices.appmesh.k8s.aws`。这一点也反映出了功能上的区别。

### 流量控制

尽管两者的数据平面都是基于 Envoy，但它们提供的流量控制能力目前还是有比较大的差距的。在路由的设置方面，App Mesh 提供了相对比较丰富的匹配策略，基本能满足大部分使用场景。下面是 App Mesh 控制台里的路由配置截图，可以看出，除了基本的 URI 前缀、HTTP Method 和 Scheme 外，也支持请求头的匹配。

![appmesh-route](appmeshroute.png)

Istio 的匹配策略更加完善，除了上面提到的，还包括 HTTP Authority，端口匹配，请求参数匹配等，具体信息可以从官方文档的虚拟服务[设置](https://istio.io/docs/reference/config/networking/v1alpha3/virtual-service/#HTTPMatchRequest)查看。下面两段 yaml 分别展示了两个产品在虚拟服务配置上的差异。

App Mesh 配置：

```yaml
apiVersion: appmesh.k8s.aws/v1beta1
kind: VirtualService
metadata:
  name: my-svc-a
  namespace: my-namespace
spec:
  meshName: my-mesh
  routes:
    - name: route-to-svc-a
      http:
        match:
          prefix: /
        action:
          weightedTargets:
            - virtualNodeName: my-app-a
              weight: 1
```

Istio 配置：

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: ratings-route
spec:
  hosts:
  - ratings.prod.svc.cluster.local
  http:
  - match:
    - headers:
        end-user:
          exact: jason
      uri:
        prefix: "/ratings/v2/"
      ignoreUriCase: true
    route:
    - destination:
        host: ratings.prod.svc.cluster.local
```

另外一个比较大的不同是，App Mesh 需要你对不同版本的服务分开定义（即定义成不同的虚拟服务），而 Istio 是通过目标规则 `DestinationRule` 里的子集 `subsets` 和路由配置做的关联。本质上它们没有太大区别。

除了路由功能外，App Mesh 就显得捉襟见肘了。就在笔者撰写本文时，AWS 刚刚添加了重试功能。而 Istio 借助于强大的 Envoy，提供了全面的流量控制能力，如超时重试、故障注入、熔断、流量镜像等。

### 安全

在安全方面，两者的实现方式具有较大区别。默认情况下，一个用户不能直接访问 App Mesh 的资源，需要通过 AWS 的[IAM 策略](https://docs.aws.amazon.com/app-mesh/latest/userguide/IAM_policies.html)给用户授权。比如下面的配置是容许用户用任意行为去操作网格内的任意资源：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "appmesh:*"
            ],
            "Resource": "*"
        }
    ]
}
```

而虚拟节点间的授权方面，App Mesh 目前只有 TLS 访问的支持，且仅仅是预览版（Preview）并未正式发布。下面的配置展示了一个虚拟节点只容许`tls`方式的访问：

```json
{
   "meshName" : "app1",
   "spec" : {
      "listeners" : [
         {
            "portMapping" : {
               "port" : 80,
               "protocol" : "http"
            },
            "tls" : {
               "mode" : "STRICT",
               "certificate" : {
                  "acm" : {
                     "certificateArn" : "arn:aws:acm:us-west-2:123456789012:certificate/12345678-1234-1234-1234-123456789012"
                  }
               }
            }
         }
      ],
      "serviceDiscovery" : {
         "dns" : {
            "hostname" : "serviceBv1.mesh.local"
         }
      }
   },
   "virtualNodeName" : "serviceBv1"
}
```

而 Istio 中端到端的认证是支持 mTLS 的，同时还支持 JWT 的用户身份认证。下面的配置分别展示了这两种认证方式：

```yaml
apiVersion: "authentication.istio.io/v1alpha1"
kind: "Policy"
metadata:
  name: "reviews"
spec:
  targets:
  - name: reviews
  peers:
  - mtls: {}
```

```yaml
origins:
- jwt:
    issuer: "https://accounts.google.com"
    jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
    trigger_rules:
    - excluded_paths:
      - exact: /health
```

Istio 的授权是通过 RBAC 实现的，可以提供基于命名空间、服务和 HTTP 方法级别的访问控制。这里就不具体展示了，大家可以通过官网[文档](https://istio.io/docs/concepts/security/#authorization-policy)来查看。

### 可观察性

一般来说，可以通过三种方式来观察你的应用：指标数据、分布式追踪、日志。Istio 在这三个方面都有比较完整的支持。指标方面，可以通过 Envoy 获取请求相关的数据，同时还提供了服务级别的指标，以及控制平面的指标来检测各个组件的运行情况。通过内置的 Prometheus 来收集指标，并使用 Grafana 展示出来。分布式追踪也支持各种主流的 OpenTracing 工具，如 Jaeger、Zipkin 等。访问日志一般都通过 ELK 去完成收集、分析和展示。另外，Istio 还拥有 Kiali 这样的可视化工具，给你提供整个网格以及微服务应用的拓扑视图。总体来说，Istio 在可观察方面的能力是非常强大的，这主要是因为 Mixer 组件的插件特性带来了巨大的灵活性。

App Mesh 在这方面做的也不错。在如下图虚拟节点的配置中可以看到，你可以配置服务的后端基础设施，这样流量就可以出站到这些服务。同时，在日志收集方面，也可以配置到本地日志，或者是其他的日志系统。

![amob](appmeshob.png)

另一方面，AWS 又一次发挥了自己闭环生态的优势，提供了 App Mesh 与自家的 CloudWatch、X-Ray 这两个监控工具的整合。总的来说，App Mesh 在可观察性上也不落下风。

## 总结

AWS App Mesh 作为一个今年 4 月份才发布的产品，在功能的完整性上和 Istio 有差距也是情有可原的。从 App Mesh 的[Roadmap](https://github.com/aws/aws-app-mesh-roadmap/projects/1)可以看出，很多重要的功能，比如熔断已经在开发计划中。以笔者与 AWS 的开发人员了解的信息来看，他们还是相当重视这个产品，优先级很高，进度也比较快，之前还在预览阶段的重试功能在上个月也正式发布了。另外，App Mesh 是可以免费使用的，用户只需要对其中的实例资源付费即可，没有额外费用。App Mesh 一部分的开发重点是和现有产品的整合，比如 Roadmap 列出的使用 AWS Gateway 作为 App Mesh 的 Ingress。借助着自己的生态优势，这种整合即方便快捷的完善了 App Mesh，同时又让生态内的产品结合的更紧密，使得闭环更加的牢固，不得不说是一步好棋。

和 App Mesh 目前只强调流控能力不同，Istio 更多的是把自己打造成一个更加完善的、全面的服务网格系统。架构优雅，功能强大，但性能上受到质疑。在产品的更迭上貌似也做的不尽如人意（不过近期接连发布了 1.3 到 1.3.3 版本，让我们对它的未来发展又有了期待）。Istio 的优势在于 3 大顶级技术公司加持的强大资源，加上开源社区的反哺，控制好的话容易形成可持续发展的局面，并成为下一个明星级产品。但目前各大厂商都意识到了网格的重要性并推出自己的产品（AWS App Mesh，Kong 的 Kuma 等），竞争也会逐渐激烈。未来是三分天下还是一统山河，让我们拭目以待。

## 参考

[what is app mesh](https://docs.aws.amazon.com/app-mesh/latest/userguide/what-is-app-mesh.html)

[aws app mesh roadmap](https://github.com/aws/aws-app-mesh-roadmap/projects/1)

[Redefining application communications with AWS App Mesh](https://www.allthingsdistributed.com/2019/03/redefining-application-communications-with-aws-app-mesh.html)

[istio offical](https://istio.io/)



