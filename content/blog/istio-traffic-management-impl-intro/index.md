---
title: "Istio 流量管理实现机制深度解析"
date: 2018-10-08T19:29:58+08:00
draft: false
authors: ["赵化冰"]
summary: "本文尝试结合系统架构、配置文件和代码对 Istio 流量管理的架构和实现机制进行分析，以达到从整体上理解 Pilot 和 Envoy 的流量管理机制的目的。"
tags: ["istio"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","istio"]
---

> 本文由作者授权，转载自[赵化冰的博客](https://zhaohuabing.com)。

Istio 作为一个 service mesh 开源项目，其中最重要的功能就是对网格中微服务之间的流量进行管理，包括服务发现，请求路由和服务间的可靠通信。Istio 实现了 service mesh 的控制面，并整合 Envoy 开源项目作为数据面的 sidecar，一起对流量进行控制。

Istio 体系中流量管理配置下发以及流量规则如何在数据面生效的机制相对比较复杂，通过官方文档容易管中窥豹，难以了解其实现原理。本文尝试结合系统架构、配置文件和代码对 Istio 流量管理的架构和实现机制进行分析，以达到从整体上理解 Pilot 和 Envoy 的流量管理机制的目的。

# Pilot 高层架构

Istio 控制面中负责流量管理的组件为 Pilot，Pilot 的高层架构如下图所示：

![img](https://zhaohuabing.com/img/2018-09-25-istio-traffic-management-impl-intro/pilot-architecture.png)

Pilot Architecture（来自[Isio 官网文档](https://istio.io/docs/concepts/traffic-management/)[[1\]](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#ref01))



根据上图，Pilot 主要实现了下述功能：

## 统一的服务模型

Pilot 定义了网格中服务的标准模型，这个标准模型独立于各种底层平台。由于有了该标准模型，各个不同的平台可以通过适配器和 Pilot 对接，将自己特有的服务数据格式转换为标准格式，填充到 Pilot 的标准模型中。

例如 Pilot 中的 Kubernetes 适配器通过 Kubernetes API 服务器得到 kubernetes 中 service 和 pod 的相关信息，然后翻译为标准模型提供给 Pilot 使用。通过适配器模式，Pilot 还可以从 Mesos, Cloud Foundry, Consul 等平台中获取服务信息，还可以开发适配器将其他提供服务发现的组件集成到 Pilot 中。

## 标准数据面 API

Pilo 使用了一套起源于 Envoy 项目的[标准数据面 API](https://github.com/envoyproxy/data-plane-api/blob/master/API_OVERVIEW.md)[[2\]](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#ref02) 来将服务信息和流量规则下发到数据面的 sidecar 中。

通过采用该标准 API，Istio 将控制面和数据面进行了解耦，为多种数据面 sidecar 实现提供了可能性。事实上基于该标准 API 已经实现了多种 Sidecar 代理和 Istio 的集成，除 Istio 目前集成的 Envoy 外，还可以和 Linkerd, Nginmesh 等第三方通信代理进行集成，也可以基于该 API 自己编写 Sidecar 实现。

控制面和数据面解耦是 Istio 后来居上，风头超过 Service mesh 鼻祖 Linkerd 的一招妙棋。Istio 站在了控制面的高度上，而 Linkerd 则成为了可选的一种 sidecar 实现，可谓降维打击的一个典型成功案例！

数据面标准 API 也有利于生态圈的建立，开源，商业的各种 sidecar 以后可能百花齐放，用户也可以根据自己的业务场景选择不同的 sidecar 和控制面集成，如高吞吐量的，低延迟的，高安全性的等等。有实力的大厂商可以根据该 API 定制自己的 sidecar，例如蚂蚁金服开源的 Golang 版本的 Sidecar MOSN(Modular Observable Smart Netstub)（SOFAMesh 中 Golang 版本的 Sidecar)；小厂商则可以考虑采用成熟的开源项目或者提供服务的商业 sidecar 实现。

备注：Istio 和 Envoy 项目联合制定了 Envoy V2 API，并采用该 API 作为 Istio 控制面和数据面流量管理的标准接口。

## 业务 DSL 语言

Pilot 还定义了一套 DSL（Domain Specific Language）语言，DSL 语言提供了面向业务的高层抽象，可以被运维人员理解和使用。运维人员使用该 DSL 定义流量规则并下发到 Pilot，这些规则被 Pilot 翻译成数据面的配置，再通过标准 API 分发到 Envoy 实例，可以在运行期对微服务的流量进行控制和调整。

Pilot 的规则 DSL 是采用 K8S API Server 中的[Custom Resource (CRD)](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)[[3\]](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#ref03) 实现的，因此和其他资源类型如 Service Pod Deployment 的创建和使用方法类似，都可以用 Kubectl 进行创建。

通过运用不同的流量规则，可以对网格中微服务进行精细化的流量控制，如按版本分流，断路器，故障注入，灰度发布等。

# Istio 流量管理相关组件

我们可以通过下图了解 Istio 流量管理涉及到的相关组件。虽然该图来自 Istio Github old pilot repo, 但图中描述的组件及流程和目前 Pilot 的最新代码的架构基本是一致的。

![img](https://zhaohuabing.com/img/2018-09-25-istio-traffic-management-impl-intro/traffic-managment-components.png)

Pilot Design Overview (来自[Istio old_pilot_repo](https://github.com/istio/old_pilot_repo/blob/master/doc/design.md)[[4\]](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#ref04))



图例说明：图中红色的线表示控制流，黑色的线表示数据流。蓝色部分为和 Pilot 相关的组件。

从上图可以看到，Istio 中和流量管理相关的有以下组件：

## 控制面组件

### Discovery Services

对应的 docker 为 gcr.io/istio-release/pilot，进程为 pilot-discovery，该组件的功能包括：

- 从 Service provider（如 kubernetes 或者 consul）中获取服务信息
- 从 K8S API Server 中获取流量规则 (K8S CRD Resource)
- 将服务信息和流量规则转化为数据面可以理解的格式，通过标准的数据面 API 下发到网格中的各个 sidecar 中。

### K8S API Server

提供 Pilot 相关的 CRD Resource 的增、删、改、查。和 Pilot 相关的 CRD 有以下几种：

- **Virtualservice**：用于定义路由规则，如根据来源或 Header 制定规则，或在不同服务版本之间分拆流量。
- **DestinationRule**：定义目的服务的配置策略以及可路由子集。策略包括断路器、负载均衡以及 TLS 等。
- **ServiceEntry**：用 [ServiceEntry](https://istio.io/docs/reference/config/istio.networking.v1alpha3/#ServiceEntry) 可以向 Istio 中加入附加的服务条目，以使网格内可以向 istio 服务网格之外的服务发出请求。
- **Gateway**：为网格配置网关，以允许一个服务可以被网格外部访问。
- **EnvoyFilter**：可以为 Envoy 配置过滤器。由于 Envoy 已经支持 Lua 过滤器，因此可以通过 EnvoyFilter 启用 Lua 过滤器，动态改变 Envoy 的过滤链行为。我之前一直在考虑如何才能动态扩展 Envoy 的能力，EnvoyFilter 提供了很灵活的扩展性。

## 数据面组件

在数据面有两个进程 Pilot-agent 和 envoy，这两个进程被放在一个 docker 容器 gcr.io/istio-release/proxyv2 中。

### Pilot-agent

该进程根据 K8S API Server 中的配置信息生成 Envoy 的配置文件，并负责启动 Envoy 进程。注意 Envoy 的大部分配置信息都是通过 xDS 接口从 Pilot 中动态获取的，因此 Agent 生成的只是用于初始化 Envoy 的少量静态配置。在后面的章节中，本文将对 Agent 生成的 Envoy 配置文件进行进一步分析。

### Envoy

Envoy 由 Pilot-agent 进程启动，启动后，Envoy 读取 Pilot-agent 为它生成的配置文件，然后根据该文件的配置获取到 Pilot 的地址，通过数据面标准 API 的 xDS 接口从 pilot 拉取动态配置信息，包括路由（route），监听器（listener），服务集群（cluster）和服务端点（endpoint）。Envoy 初始化完成后，就根据这些配置信息对微服务间的通信进行寻址和路由。

## 命令行工具

kubectl 和 Istioctl，由于 Istio 的配置是基于 K8S 的 CRD，因此可以直接采用 kubectl 对这些资源进行操作。Istioctl 则针对 Istio 对 CRD 的操作进行了一些封装。Istioctl 支持的功能参见该[表格](https://istio.io/docs/reference/commands/istioctl)。

# 数据面标准 API

前面讲到，Pilot 采用了一套标准的 API 来向数据面 Sidecar 提供服务发现，负载均衡池和路由表等流量管理的配置信息。该标准 API 的文档参见[Envoy v2 API](https://www.envoyproxy.io/docs/envoy/latest/configuration/overview/v2_overview)[[5\]](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#ref05)。[Data Plane API Protocol Buffer Definition](https://github.com/envoyproxy/data-plane-api/tree/master/envoy/api/v2)[[6\]](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#ref06)) 给出了 v2 grpc 接口相关的数据结构和接口定义。

（备注：Istio 早期采用了 Envoy v1 API，目前的版本中则使用 V2 API，V1 已被废弃）。

## 基本概念和术语

首先我们需要了解数据面 API 中涉及到的一些基本概念：

- **Host**：能够进行网络通信的实体（如移动设备、服务器上的应用程序）。在此文档中，主机是逻辑网络应用程序。一块物理硬件上可能运行有多个主机，只要它们是可以独立寻址的。在 EDS 接口中，也使用“Endpoint”来表示一个应用实例，对应一个 IP+Port 的组合。
- **Downstream**：下游主机连接到 Envoy，发送请求并接收响应。
- **Upstream**：上游主机接收来自 Envoy 的连接和请求，并返回响应。
- **Listener**：监听器是命名网地址（例如，端口、unix domain socket 等)，可以被下游客户端连接。Envoy 暴露一个或者多个监听器给下游主机连接。在 Envoy 中，Listener 可以绑定到端口上直接对外服务，也可以不绑定到端口上，而是接收其他 listener 转发的请求。
- **Cluster**：集群是指 Envoy 连接到的逻辑上相同的一组上游主机。Envoy 通过服务发现来发现集群的成员。可以选择通过主动健康检查来确定集群成员的健康状态。Envoy 通过负载均衡策略决定将请求路由到哪个集群成员。

## XDS 服务接口

Istio 数据面 API 定义了 xDS 服务接口，Pilot 通过该接口向数据面 sidecar 下发动态配置信息，以对 Mesh 中的数据流量进行控制。xDS 中的 DS 表示 discovery service，即发现服务，表示 xDS 接口使用动态发现的方式提供数据面所需的配置数据。而 x 则是一个代词，表示有多种 discover service。这些发现服务及对应的数据结构如下：

- LDS (Listener Discovery Service) [envoy.api.v2.Listener](https://github.com/envoyproxy/data-plane-api/blob/master/envoy/api/v2/lds.proto)
- CDS (Cluster Discovery Service) [envoy.api.v2.RouteConfiguration](https://github.com/envoyproxy/data-plane-api/blob/master/envoy/api/v2/rds.proto)
- EDS (Endpoint Discovery Service) [envoy.api.v2.Cluster](https://github.com/envoyproxy/data-plane-api/blob/master/envoy/api/v2/cds.proto)
- RDS (Route Discovery Service) [envoy.api.v2.ClusterLoadAssignment](https://github.com/envoyproxy/data-plane-api/blob/master/envoy/api/v2/eds.proto)

## XDS 服务接口的最终一致性考虑

xDS 的几个接口是相互独立的，接口下发的配置数据是最终一致的。但在配置更新过程中，可能暂时出现各个接口的数据不匹配的情况，从而导致部分流量在更新过程中丢失。

设想这种场景：在 CDS/EDS 只知道 cluster X 的情况下，RDS 的一条路由配置将指向 Cluster X 的流量调整到了 Cluster Y。在 CDS/EDS 向 Mesh 中 Envoy 提供 Cluster Y 的更新前，这部分导向 Cluster Y 的流量将会因为 Envoy 不知道 Cluster Y 的信息而被丢弃。

对于某些应用来说，短暂的部分流量丢失是可以接受的，例如客户端重试可以解决该问题，并不影响业务逻辑。对于另一些场景来说，这种情况可能无法容忍。可以通过调整 xDS 接口的更新逻辑来避免该问题，对上面的情况，可以先通过 CDS/EDS 更新 Y Cluster，然后再通过 RDS 将 X 的流量路由到 Y。

一般来说，为了避免 Envoy 配置数据更新过程中出现流量丢失的情况，xDS 接口应采用下面的顺序：

1. CDS 首先更新 Cluster 数据（如果有变化）
2. EDS 更新相应 Cluster 的 Endpoint 信息（如果有变化）
3. LDS 更新CDS/EDS相应的Listener。
4. RDS 最后更新新增 Listener 相关的 Route 配置。
5. 删除不再使用的 CDS cluster 和 EDS endpoints。

## ADS 聚合发现服务

保证控制面下发数据一致性，避免流量在配置更新过程中丢失的另一个方式是使用 ADS(Aggregated Discovery Services)，即聚合的发现服务。ADS 通过一个 gRPC 流来发布所有的配置更新，以保证各个 xDS 接口的调用顺序，避免由于 xDS 接口更新顺序导致的配置数据不一致问题。

关于 XDS 接口的详细介绍可参考[xDS REST and gRPC protocol](https://github.com/envoyproxy/data-plane-api/blob/master/XDS_PROTOCOL.md)[[7\]](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#ref07)

# Bookinfo 示例程序分析

下面我们以 Bookinfo 为例对 Istio 中的流量管理实现机制，以及控制面和数据面的交互进行进一步分析。

## Bookinfo 程序结构

下图显示了 Bookinfo 示例程序中各个组件的 IP 地址，端口和调用关系，以用于后续的分析。

![img](https://zhaohuabing.com/img/2018-09-25-istio-traffic-management-impl-intro/bookinfo.png)

## xDS 接口调试方法

首先我们看看如何对 xDS 接口的相关数据进行查看和分析。Envoy v2 接口采用了 gRPC，由于 gRPC 是基于二进制的 RPC 协议，无法像 V1 的 REST 接口一样通过 curl 和浏览器进行进行分析。但我们还是可以通过 Pilot 和 Envoy 的调试接口查看 xDS 接口的相关数据。

### Pilot 调试方法

Pilot 在 9093 端口提供了下述[调试接口](https://github.com/istio/istio/tree/master/pilot/pkg/proxy/envoy/v2)[[8\]](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#ref08) 下述方法查看 xDS 接口相关数据。

```bash
PILOT=istio-pilot.istio-system:9093

# What is sent to envoy
# Listeners and routes
curl $PILOT/debug/adsz

# Endpoints
curl $PILOT/debug/edsz

# Clusters
curl $PILOT/debug/cdsz
```

### Envoy 调试方法

Envoy 提供了管理接口，缺省为 localhost 的 15000 端口，可以获取 listener，cluster 以及完整的配置数据导出功能。

```bash
kubectl exec productpage-v1-54b8b9f55-bx2dq -c istio-proxy curl http://127.0.0.1:15000/help
  /: Admin home page
  /certs: print certs on machine
  /clusters: upstream cluster status
  /config_dump: dump current Envoy configs (experimental)
  /cpuprofiler: enable/disable the CPU profiler
  /healthcheck/fail: cause the server to fail health checks
  /healthcheck/ok: cause the server to pass health checks
  /help: print out list of admin commands
  /hot_restart_version: print the hot restart compatibility version
  /listeners: print listener addresses
  /logging: query/change logging levels
  /quitquitquit: exit the server
  /reset_counters: reset all counters to zero
  /runtime: print runtime values
  /runtime_modify: modify runtime values
  /server_info: print server version/status information
  /stats: print server stats
  /stats/prometheus: print server stats in prometheus format
```

进入 productpage pod 中的 istio-proxy(Envoy) container，可以看到有下面的监听端口

- 9080: productpage 进程对外提供的服务端口
- 15001: Envoy 的入口监听器，iptable 会将 pod 的流量导入该端口中由 Envoy 进行处理
- 15000: Envoy 管理端口，该端口绑定在本地环回地址上，只能在 Pod 内访问。

```bash
kubectl exec t productpage-v1-54b8b9f55-bx2dq -c istio-proxy --  netstat -ln
 
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 0.0.0.0:9080            0.0.0.0:*               LISTEN      -               
tcp        0      0 127.0.0.1:15000         0.0.0.0:*               LISTEN      13/envoy        
tcp        0      0 0.0.0.0:15001           0.0.0.0:*               LISTEN      13/envoy  
```

## Envoy 启动过程分析

Istio 通过 K8s 的[Admission webhook](https://zhaohuabing.com/2018/05/23/istio-auto-injection-with-webhook)[[9\]](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#ref09) 机制实现了 sidecar 的自动注入，Mesh 中的每个微服务会被加入 Envoy 相关的容器。下面是 Productpage 微服务的 Pod 内容，可见除 productpage 之外，Istio 还在该 Pod 中注入了两个容器 gcr.io/istio-release/proxy_init 和 gcr.io/istio-release/proxyv2。

备注：下面 Pod description 中只保留了需要关注的内容，删除了其它不重要的部分。为方便查看，本文中后续的其它配置文件以及命令行输出也会进行类似处理。

```bash
ubuntu@envoy-test:~$ kubectl describe pod productpage-v1-54b8b9f55-bx2dq

Name:               productpage-v1-54b8b9f55-bx2dq
Namespace:          default
Init Containers:
  istio-init:
    Image:         gcr.io/istio-release/proxy_init:1.0.0
      Args:
      -p
      15001
      -u
      1337
      -m
      REDIRECT
      -i
      *
      -x

      -b
      9080,
      -d

Containers:
  productpage:
    Image:          istio/examples-bookinfo-productpage-v1:1.8.0
    Port:           9080/TCP
    
  istio-proxy:
    Image:         gcr.io/istio-release/proxyv2:1.0.0
    Args:
      proxy
      sidecar
      --configPath
      /etc/istio/proxy
      --binaryPath
      /usr/local/bin/envoy
      --serviceCluster
      productpage
      --drainDuration
      45s
      --parentShutdownDuration
      1m0s
      --discoveryAddress
      istio-pilot.istio-system:15007
      --discoveryRefreshDelay
      1s
      --zipkinAddress
      zipkin.istio-system:9411
      --connectTimeout
      10s
      --statsdUdpAddress
      istio-statsd-prom-bridge.istio-system:9125
      --proxyAdminPort
      15000
      --controlPlaneAuthPolicy
      NONE
```

### Proxy_init

Productpage 的 Pod 中有一个 InitContainer proxy_init，InitContrainer 是 K8S 提供的机制，用于在 Pod 中执行一些初始化任务。在 Initialcontainer 执行完毕并退出后，才会启动 Pod 中的其它 container。

我们看一下 proxy_init 容器中的内容：

```bash
ubuntu@envoy-test:~$ sudo docker inspect gcr.io/istio-release/proxy_init:1.0.0
[
    {
        "RepoTags": [
            "gcr.io/istio-release/proxy_init:1.0.0"
        ],

        "ContainerConfig": {
            "Env": [
                "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
            ],
            "Cmd": [
                "/bin/sh",
                "-c",
                "#(nop) ",
                "ENTRYPOINT [\"/usr/local/bin/istio-iptables.sh\"]"
            ],
            "Entrypoint": [
                "/usr/local/bin/istio-iptables.sh"
            ],
        },
    }
]
```

从上面的命令行输出可以看到，Proxy_init 中执行的命令是 istio-iptables.sh，该脚本源码较长，就不列出来了，有兴趣可以在 Istio 源码仓库的[tools/deb/istio-iptables.sh](https://github.com/istio/istio/blob/master/tools/deb/istio-iptables.sh)查看。

该脚本的作用是通过配置 iptable 来劫持 Pod 中的流量。结合前面 Pod 中该容器的命令行参数-p 15001，可以得知 Pod 中的数据流量被 iptable 拦截，并发向 Envoy 的 15001 端口。 -u 1337 参数用于排除用户 ID 为 1337，即 Envoy 自身的流量，以避免 Iptable 把 Envoy 发出的数据又重定向到 Envoy，形成死循环。

### Proxyv2

前面提到，该容器中有两个进程 Pilot-agent 和 envoy。我们进入容器中看看这两个进程的相关信息。

```bash
ubuntu@envoy-test:~$ kubectl exec   productpage-v1-54b8b9f55-bx2dq -c istio-proxy -- ps -ef

UID        PID  PPID  C STIME TTY          TIME CMD
istio-p+     1     0  0 Sep06 ?        00:00:00 /usr/local/bin/pilot-agent proxy sidecar --configPath /etc/istio/proxy --binaryPath /usr/local/bin/envoy --serviceCluster productpage --drainDuration 45s --parentShutdownDuration 1m0s --discoveryAddress istio-pilot.istio-system:15007 --discoveryRefreshDelay 1s --zipkinAddress zipkin.istio-system:9411 --connectTimeout 10s --statsdUdpAddress istio-statsd-prom-bridge.istio-system:9125 --proxyAdminPort 15000 --controlPlaneAuthPolicy NONE
istio-p+    13     1  0 Sep06 ?        00:47:37 /usr/local/bin/envoy -c /etc/istio/proxy/envoy-rev0.json --restart-epoch 0 --drain-time-s 45 --parent-shutdown-time-s 60 --service-cluster productpage --service-node sidecar~192.168.206.23~productpage-v1-54b8b9f55-bx2dq.default~default.svc.cluster.local --max-obj-name-len 189 -l warn --v2-config-only
```

Envoy 的大部分配置都是 dynamic resource，包括网格中服务相关的 service cluster, listener, route 规则等。这些 dynamic resource 是通过 xDS 接口从 Istio 控制面中动态获取的。但 Envoy 如何知道 xDS server 的地址呢？这是在 Envoy 初始化配置文件中以 static resource 的方式配置的。

#### Envoy 初始配置文件

Pilot-agent 进程根据启动参数和 K8S API Server 中的配置信息生成 Envoy 的初始配置文件，并负责启动 Envoy 进程。从 ps 命令输出可以看到 Pilot-agent 在启动 Envoy 进程时传入了 pilot 地址和 zipkin 地址，并为 Envoy 生成了一个初始化配置文件 envoy-rev0.json

Pilot agent 生成初始化配置文件的代码： <https://github.com/istio/istio/blob/release-1.0/pkg/bootstrap/bootstrap_config.go> 137 行

```go
// WriteBootstrap generates an envoy config based on config and epoch, and returns the filename.
// TODO: in v2 some of the LDS ports (port, http_port) should be configured in the bootstrap.
func WriteBootstrap(config *meshconfig.ProxyConfig, node string, epoch int, pilotSAN []string, opts map[string]interface{}) (string, error) {
	if opts == nil {
		opts = map[string]interface{}{}
	}
	if err := os.MkdirAll(config.ConfigPath, 0700); err != nil {
		return "", err
	}
	// attempt to write file
	fname := configFile(config.ConfigPath, epoch)

	cfg := config.CustomConfigFile
	if cfg == "" {
		cfg = config.ProxyBootstrapTemplatePath
	}
	if cfg == "" {
		cfg = DefaultCfgDir
	}
	......

	if config.StatsdUdpAddress != "" {
		h, p, err = GetHostPort("statsd UDP", config.StatsdUdpAddress)
		if err != nil {
			return "", err
		}
		StoreHostPort(h, p, "statsd", opts)
	}

	fout, err := os.Create(fname)
	if err != nil {
		return "", err
	}

	// Execute needs some sort of io.Writer
	err = t.Execute(fout, opts)
	return fname, err
}
```

可以使用下面的命令将 productpage pod 中该文件导出来查看其中的内容：

```bash
kubectl exec productpage-v1-54b8b9f55-bx2dq -c istio-proxy -- cat /etc/istio/proxy/envoy-rev0.json > envoy-rev0.json
```

配置文件的结构如图所示：

![img](https://zhaohuabing.com/img/2018-09-25-istio-traffic-management-impl-intro/envoy-rev0.png)

其中各个配置节点的内容如下：

##### Node

包含了 Envoy 所在节点相关信息。

```json
"node": {
    "id": "sidecar~192.168.206.23~productpage-v1-54b8b9f55-bx2dq.default~default.svc.cluster.local",
    //用于标识 envoy 所代理的 node（在 k8s 中对应为 Pod）上的 service cluster，来自于 Envoy 进程启动时的 service-cluster 参数
    "cluster": "productpage",  
    "metadata": {
          "INTERCEPTION_MODE": "REDIRECT",
          "ISTIO_PROXY_SHA": "istio-proxy:6166ae7ebac7f630206b2fe4e6767516bf198313",
          "ISTIO_PROXY_VERSION": "1.0.0",
          "ISTIO_VERSION": "1.0.0",
          "POD_NAME": "productpage-v1-54b8b9f55-bx2dq",
          "istio": "sidecar"
    }
  }
```

##### Admin

配置 Envoy 的日志路径以及管理端口。

```json
"admin": {
    "access_log_path": "/dev/stdout",
    "address": {
      "socket_address": {
        "address": "127.0.0.1",
        "port_value": 15000
      }
    }
  }
```

##### Dynamic_resources

配置动态资源，这里配置了 ADS 服务器。

```json
"dynamic_resources": {
    "lds_config": {
        "ads": {}
    },
    "cds_config": {
        "ads": {}
    },
    "ads_config": {
      "api_type": "GRPC",
      "refresh_delay": {"seconds": 1, "nanos": 0},
      "grpc_services": [
        {
          "envoy_grpc": {
            "cluster_name": "xds-grpc"
          }
        }
      ]
    }
  }```
```

##### Static_resources

配置静态资源，包括了xds-grpc和zipkin两个cluster。其中xds-grpc cluster对应前面dynamic_resources中ADS配置，指明了Envoy用于获取动态资源的服务器地址。

```json
"static_resources": {
    "clusters": [
    {
    "name": "xds-grpc",
    "type": "STRICT_DNS",
    "connect_timeout": {"seconds": 10, "nanos": 0},
    "lb_policy": "ROUND_ROBIN",

    "hosts": [
    {
    "socket_address": {"address": "istio-pilot.istio-system", "port_value": 15010}
    }
    ],
    "circuit_breakers": {
        "thresholds": [
      {
        "priority": "default",
        "max_connections": "100000",
        "max_pending_requests": "100000",
        "max_requests": "100000"
      },
      {
        "priority": "high",
        "max_connections": "100000",
        "max_pending_requests": "100000",
        "max_requests": "100000"
      }]
    },
    "upstream_connection_options": {
      "tcp_keepalive": {
        "keepalive_time": 300
      }
    },
    "http2_protocol_options": { }
    } ,
      {
        "name": "zipkin",
        "type": "STRICT_DNS",
        "connect_timeout": {
          "seconds": 1
        },
        "lb_policy": "ROUND_ROBIN",
        "hosts": [
          {
            "socket_address": {"address": "zipkin.istio-system", "port_value": 9411}
          }
        ]
      }
      
    ]
  }
```

##### Tracing

配置分布式链路跟踪。

```json
"tracing": {
    "http": {
      "name": "envoy.zipkin",
      "config": {
        "collector_cluster": "zipkin"
      }
    }
  }
```

##### Stats_sinks

这里配置的是和Envoy直连的metrics收集sink,和Mixer telemetry没有关系。Envoy自带stats格式的metrics上报。

```json
"stats_sinks": [
    {
      "name": "envoy.statsd",
      "config": {
        "address": {
          "socket_address": {"address": "10.103.219.158", "port_value": 9125}
        }
      }
    }
  ]
```

在Gist [https://gist.github.com/zhaohuabing/14191bdcf72e37bf700129561c3b41ae中可以查看该配置文件的完整内容。](https://gist.github.com/zhaohuabing/14191bdcf72e37bf700129561c3b41ae%E4%B8%AD%E5%8F%AF%E4%BB%A5%E6%9F%A5%E7%9C%8B%E8%AF%A5%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6%E7%9A%84%E5%AE%8C%E6%95%B4%E5%86%85%E5%AE%B9%E3%80%82)

## Envoy配置分析

### 通过管理接口获取完整配置

从Envoy初始化配置文件中，我们可以大致看到Istio通过Envoy来实现服务发现和流量管理的基本原理。即控制面将xDS server信息通过static resource的方式配置到Envoy的初始化配置文件中，Envoy启动后通过xDS server获取到dynamic resource，包括网格中的service信息及路由规则。

Envoy配置初始化流程：

![img](https://zhaohuabing.com/img/2018-09-25-istio-traffic-management-impl-intro/envoy-config-init.png)

1. Pilot-agent根据启动参数和K8S API Server中的配置信息生成Envoy的初始配置文件envoy-rev0.json，该文件告诉Envoy从xDS server中获取动态配置信息，并配置了xDS server的地址信息，即控制面的Pilot。
2. Pilot-agent使用envoy-rev0.json启动Envoy进程。
3. Envoy根据初始配置获得Pilot地址，采用xDS接口从Pilot获取到Listener，Cluster，Route等d动态配置信息。
4. Envoy根据获取到的动态配置启动Listener，并根据Listener的配置，结合Route和Cluster对拦截到的流量进行处理。

可以看到，Envoy中实际生效的配置是由初始化配置文件中的静态配置和从Pilot获取的动态配置一起组成的。因此只对envoy-rev0 .json进行分析并不能看到Mesh中流量管理的全貌。那么有没有办法可以看到Envoy中实际生效的完整配置呢？答案是可以的，我们可以通过Envoy的管理接口来获取Envoy的完整配置。

```bash
kubectl exec -it productpage-v1-54b8b9f55-bx2dq -c istio-proxy curl http://127.0.0.1:15000/config_dump > config_dump
```

该文件内容长达近7000行，本文中就不贴出来了，在Gist <https://gist.github.com/zhaohuabing/034ef87786d290a4e89cd6f5ad6fcc97> 中可以查看到全文。

### Envoy配置文件结构

![img](https://zhaohuabing.com/img/2018-09-25-istio-traffic-management-impl-intro/envoy-config.png)

文件中的配置节点包括：

#### Bootstrap

从名字可以大致猜出这是Envoy的初始化配置，打开该节点，可以看到文件中的内容和前一章节中介绍的envoy-rev0.json是一致的，这里不再赘述。

![img](https://zhaohuabing.com/img/2018-09-25-istio-traffic-management-impl-intro/envoy-config-bootstrap.png)

#### Clusters

在Envoy中，Cluster是一个服务集群，Cluster中包含一个到多个endpoint，每个endpoint都可以提供服务，Envoy根据负载均衡算法将请求发送到这些endpoint中。

在Productpage的clusters配置中包含static_clusters和dynamic_active_clusters两部分，其中static_clusters是来自于envoy-rev0.json的xDS server和zipkin server信息。dynamic_active_clusters是通过xDS接口从Istio控制面获取的动态服务信息。

![img](https://zhaohuabing.com/img/2018-09-25-istio-traffic-management-impl-intro/envoy-config-clusters.png)

Dynamic Cluster中有以下几类Cluster：

##### Outbound Cluster

这部分的Cluster占了绝大多数，该类Cluster对应于Envoy所在节点的外部服务。以details为例，对于Productpage来说,details是一个外部服务，因此其Cluster名称中包含outbound字样。

从details 服务对应的cluster配置中可以看到，其类型为EDS，即表示该Cluster的endpoint来自于动态发现，动态发现中eds_config则指向了ads，最终指向static Resource中配置的xds-grpc cluster,即Pilot的地址。

```json
{
 "version_info": "2018-09-06T09:34:19Z",
 "cluster": {
  "name": "outbound|9080||details.default.svc.cluster.local",
  "type": "EDS",
  "eds_cluster_config": {
   "eds_config": {
    "ads": {}
   },
   "service_name": "outbound|9080||details.default.svc.cluster.local"
  },
  "connect_timeout": "1s",
  "circuit_breakers": {
   "thresholds": [
    {}
   ]
  }
 },
 "last_updated": "2018-09-06T09:34:20.404Z"
}
```

可以通过Pilot的调试接口获取该Cluster的endpoint：

```bash
curl http://10.96.8.103:9093/debug/edsz > pilot_eds_dump
```

导出的文件长达1300多行，本文只贴出details服务相关的endpoint配置，完整文件参见:<https://gist.github.com/zhaohuabing/a161d2f64746acd18097b74e6a5af551>

从下面的文件内容可以看到，details cluster配置了1个endpoint地址，是details的pod ip。

```json
{
  "clusterName": "outbound|9080||details.default.svc.cluster.local",
  "endpoints": [
    {
      "locality": {

      },
      "lbEndpoints": [
        {
          "endpoint": {
            "address": {
              "socketAddress": {
                "address": "192.168.206.21",
                "portValue": 9080
              }
            }
          },
          "metadata": {
            "filterMetadata": {
              "istio": {
                  "uid": "kubernetes://details-v1-6764bbc7f7-qwzdg.default"
                }
            }
          }
        }
      ]
    }
  ]
}
```

##### Inbound Cluster

该类Cluster对应于Envoy所在节点上的服务。如果该服务接收到请求，当然就是一个入站请求。对于Productpage Pod上的Envoy，其对应的Inbound Cluster只有一个，即productpage。该cluster对应的host为127.0.0.1,即环回地址上productpage的监听端口。由于iptable规则中排除了127.0.0.1,入站请求通过该Inbound cluster处理后将跳过Envoy，直接发送给Productpage进程处理。

```json
{
   "version_info": "2018-09-14T01:44:05Z",
   "cluster": {
    "name": "inbound|9080||productpage.default.svc.cluster.local",
    "connect_timeout": "1s",
    "hosts": [
     {
      "socket_address": {
       "address": "127.0.0.1",
       "port_value": 9080
      }
     }
    ],
    "circuit_breakers": {
     "thresholds": [
      {}
     ]
    }
   },
   "last_updated": "2018-09-14T01:44:05.291Z"
}
```

##### BlackHoleCluster

这是一个特殊的Cluster，并没有配置后端处理请求的Host。如其名字所暗示的一样，请求进入后将被直接丢弃掉。如果一个请求没有找到其对的目的服务，则被发到cluste。

```json
{
   "version_info": "2018-09-06T09:34:19Z",
   "cluster": {
    "name": "BlackHoleCluster",
    "connect_timeout": "5s"
   },
   "last_updated": "2018-09-06T09:34:20.408Z"
}
```

#### Listeners

Envoy采用listener来接收并处理downstream发过来的请求，listener的处理逻辑是插件式的，可以通过配置不同的filter来插入不同的处理逻辑。Istio就在Envoy中加入了用于policy check和metric report的Mixer filter。

Listener可以绑定到IP Socket或者Unix Domain Socket上，也可以不绑定到一个具体的端口上，而是接收从其他listener转发来的数据。Istio就是利用了Envoy listener的这一特点实现了将来发向不同服务的请求转交给不同的listener处理。

##### Virtual Listener

Envoy创建了一个在15001端口监听的入口监听器。Iptable将请求截取后发向15001端口，该监听器接收后并不进行业务处理，而是根据请求目的地分发给其他监听器处理。该监听器取名为”virtual”（虚拟）监听器也是这个原因。

Envoy是如何做到按服务分发的呢？ 可以看到该Listener的配置项use_original_dest设置为true,该配置要求监听器将接收到的请求转交给和请求原目的地址关联的listener进行处理。

从其filter配置可以看到，如果找不到和请求目的地配置的listener进行转交，则请求将被发送到[BlackHoleCluster](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#blackholecluster),由于BlackHoleCluster并没有配置host，因此找不到对应目的地对应监听器的请求实际上会被丢弃。

```json
    {
     "version_info": "2018-09-06T09:34:19Z",
     "listener": {
      "name": "virtual",
      "address": {
       "socket_address": {
        "address": "0.0.0.0",
        "port_value": 15001
       }
      },
      "filter_chains": [
       {
        "filters": [
         {
          "name": "envoy.tcp_proxy",
          "config": {
           "stat_prefix": "BlackHoleCluster",
           "cluster": "BlackHoleCluster"
          }
         }
        ]
       }
      ],
      "use_original_dst": true
     },
     "last_updated": "2018-09-06T09:34:26.262Z"
    }
```

##### Inbound Listener

在Productpage Pod上的Envoy创建了Listener 192.168.206.23_9080，当外部调用Productpage服务的请求到达Pod上15001的”Virtual” Listener时，Virtual Listener根据请求目的地匹配到该Listener,请求将被转发过来。

```json
    {
     "version_info": "2018-09-14T01:44:05Z",
     "listener": {
      "name": "192.168.206.23_9080",
      "address": {
       "socket_address": {
        "address": "192.168.206.23",
        "port_value": 9080
       }
      },
      "filter_chains": [
       {
        "filters": [
         {
          "name": "mixer",
          "config": {
           "transport": {
            "check_cluster": "outbound|9091||istio-policy.istio-system.svc.cluster.local",
            "network_fail_policy": {
             "policy": "FAIL_CLOSE"
            },
            "report_cluster": "outbound|9091||istio-telemetry.istio-system.svc.cluster.local",
            "attributes_for_mixer_proxy": {
             "attributes": {
              "source.uid": {
               "string_value": "kubernetes://productpage-v1-54b8b9f55-bx2dq.default"
              }
             }
            }
           },
           "mixer_attributes": {
            "attributes": {
             "destination.port": {
              "int64_value": "9080"
             },
             "context.reporter.uid": {
              "string_value": "kubernetes://productpage-v1-54b8b9f55-bx2dq.default"
             },
             "destination.namespace": {
              "string_value": "default"
             },
             "destination.ip": {
              "bytes_value": "AAAAAAAAAAAAAP//wKjOFw=="
             },
             "destination.uid": {
              "string_value": "kubernetes://productpage-v1-54b8b9f55-bx2dq.default"
             },
             "context.reporter.kind": {
              "string_value": "inbound"
             }
            }
           }
          }
         },
         {
          "name": "envoy.tcp_proxy",
          "config": {
           "stat_prefix": "inbound|9080||productpage.default.svc.cluster.local",
           "cluster": "inbound|9080||productpage.default.svc.cluster.local"
          }
         }
        ]
       }
      ],
      "deprecated_v1": {
       "bind_to_port": false
      }
     },
     "last_updated": "2018-09-14T01:44:05.754Z"
    }
```

从上面的配置”bind_to_port”: false可以得知该listener创建后并不会被绑定到tcp端口上直接接收网络上的数据，因此其所有请求都转发自15001端口。

该listener配置的envoy.tcp_proxy filter对应的cluster为[“inbound|9080||productpage.default.svc.cluster.local”](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#inbound-cluster),该cluster配置的host为127.0.0.1:9080，因此Envoy会将该请求发向127.0.0.1:9080。由于iptable设置中127.0.0.1不会被拦截,该请求将发送到Productpage进程的9080端口进行业务处理。

除此以外，Listenter中还包含Mixer filter的配置信息，配置了策略检查(Mixer check)和Metrics上报(Mixer report)服务器地址，以及Mixer上报的一些attribute取值。

##### Outbound Listener

Envoy为网格中的外部服务按端口创建多个Listener，以用于处理出向请求。

Productpage Pod中的Envoy创建了多个Outbound Listener

- 0.0.0.0_9080 :处理对details,reviews和rating服务的出向请求
- 0.0.0.0_9411 :处理对zipkin的出向请求
- 0.0.0.0_15031 :处理对ingressgateway的出向请求
- 0.0.0.0_3000 :处理对grafana的出向请求
- 0.0.0.0_9093 :处理对citadel、galley、pilot、(Mixer)policy、(Mixer)telemetry的出向请求
- 0.0.0.0_15004 :处理对(Mixer)policy、(Mixer)telemetry的出向请求
- ……

除了9080这个Listener用于处理应用的业务之外，其他listener都是Istio用于处理自身组件之间通信使用的，有的控制面组件如Pilot，Mixer对应多个listener，是因为该组件有多个端口提供服务。

我们这里主要分析一下9080这个业务端口的Listenrer。和Outbound Listener一样，该Listener同样配置了”bind_to_port”: false属性，因此该listener也没有被绑定到tcp端口上，其接收到的所有请求都转发自15001端口的Virtual listener。

监听器name为0.0.0.0_9080,推测其含义应为匹配发向任意IP的9080的请求，从[bookinfo程序结构](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#bookinfo%E7%A8%8B%E5%BA%8F%E7%BB%93%E6%9E%84)可以看到该程序中的productpage,revirews,ratings,details四个service都是9080端口，那么Envoy如何区别处理这四个service呢？

首先需要区分入向（发送给productpage）请求和出向（发送给其他几个服务）请求：

- 发给productpage的入向请求，virtual listener根据其目的IP和Port首先匹配到[192.168.206.23_9080](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#inbound-listener)这个listener上，不会进入0.0.0.0_9080 listener处理。
- 从productpage外发给reviews、details和ratings的出向请求，virtual listener无法找到和其目的IP完全匹配的listener，因此根据通配原则转交给0.0.0.0_9080处理。

> 备注：
> \1. 该转发逻辑为根据Envoy配置进行的推测，并未分析Envoy代码进行验证。欢迎了解Envoy代码和实现机制的朋友指正。
> 2.根据业务逻辑，实际上productpage并不会调用ratings服务，但Istio并不知道各个业务之间会如何调用，因此将所有的服务信息都下发到了Envoy中。这样做对效率和性能理论上有一定影响，存在一定的优化空间。

由于对应到reviews、details和Ratings三个服务，当0.0.0.0_9080接收到出向请求后，并不能直接发送到一个downstream cluster中，而是需要根据请求目的地进行不同的路由。

在该listener的配置中，我们可以看到并没有像inbound listener那样通过envoy.tcp_proxy直接指定一个downstream的cluster，而是通过rds配置了一个[路由规则9080](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#routes)，在路由规则中再根据不同的请求目的地对请求进行处理。

```json
{
     "version_info": "2018-09-06T09:34:19Z",
     "listener": {
      "name": "0.0.0.0_9080",
      "address": {
       "socket_address": {
        "address": "0.0.0.0",
        "port_value": 9080
       }
      },
      "filter_chains": [
       {
        "filters": [
         {
          "name": "envoy.http_connection_manager",
          "config": {
           "access_log": [
            {
             "name": "envoy.file_access_log",
             "config": {
              "path": "/dev/stdout"
             }
            }
           ],
           "http_filters": [
            {
             "name": "mixer",
             "config": {
			  
			  ......

             }
            },
            {
             "name": "envoy.cors"
            },
            {
             "name": "envoy.fault"
            },
            {
             "name": "envoy.router"
            }
           ],
           "tracing": {
            "operation_name": "EGRESS",
            "client_sampling": {
             "value": 100
            },
            "overall_sampling": {
             "value": 100
            },
            "random_sampling": {
             "value": 100
            }
           },
           "use_remote_address": false,
           "stat_prefix": "0.0.0.0_9080",
           "rds": {
            "route_config_name": "9080",
            "config_source": {
             "ads": {}
            }
           },
           "stream_idle_timeout": "0.000s",
           "generate_request_id": true,
           "upgrade_configs": [
            {
             "upgrade_type": "websocket"
            }
           ]
          }
         }
        ]
       }
      ],
      "deprecated_v1": {
       "bind_to_port": false
      }
     },
     "last_updated": "2018-09-06T09:34:26.172Z"
    },
    
```

#### Routes

配置Envoy的路由规则。Istio下发的缺省路由规则中对每个端口设置了一个路由规则，根据host来对请求进行路由分发。

下面是9080的路由配置，从文件中可以看到对应了3个virtual host，分别是details、ratings和reviews，这三个virtual host分别对应到不同的[outbound cluster](https://zhaohuabing.com/post/2018-09-25-istio-traffic-management-impl-intro/#outbound-cluster)。

```json
{
     "version_info": "2018-09-14T01:38:20Z",
     "route_config": {
      "name": "9080",
      "virtual_hosts": [
       {
        "name": "details.default.svc.cluster.local:9080",
        "domains": [
         "details.default.svc.cluster.local",
         "details.default.svc.cluster.local:9080",
         "details",
         "details:9080",
         "details.default.svc.cluster",
         "details.default.svc.cluster:9080",
         "details.default.svc",
         "details.default.svc:9080",
         "details.default",
         "details.default:9080",
         "10.101.163.201",
         "10.101.163.201:9080"
        ],
        "routes": [
         {
          "match": {
           "prefix": "/"
          },
          "route": {
           "cluster": "outbound|9080||details.default.svc.cluster.local",
           "timeout": "0s",
           "max_grpc_timeout": "0s"
          },
          "decorator": {
           "operation": "details.default.svc.cluster.local:9080/*"
          },
          "per_filter_config": {
           "mixer": {
            ......

           }
          }
         }
        ]
       },
       {
        "name": "ratings.default.svc.cluster.local:9080",
        "domains": [
         "ratings.default.svc.cluster.local",
         "ratings.default.svc.cluster.local:9080",
         "ratings",
         "ratings:9080",
         "ratings.default.svc.cluster",
         "ratings.default.svc.cluster:9080",
         "ratings.default.svc",
         "ratings.default.svc:9080",
         "ratings.default",
         "ratings.default:9080",
         "10.99.16.205",
         "10.99.16.205:9080"
        ],
        "routes": [
         {
          "match": {
           "prefix": "/"
          },
          "route": {
           "cluster": "outbound|9080||ratings.default.svc.cluster.local",
           "timeout": "0s",
           "max_grpc_timeout": "0s"
          },
          "decorator": {
           "operation": "ratings.default.svc.cluster.local:9080/*"
          },
          "per_filter_config": {
           "mixer": {
           ......

            },
            "disable_check_calls": true
           }
          }
         }
        ]
       },
       {
        "name": "reviews.default.svc.cluster.local:9080",
        "domains": [
         "reviews.default.svc.cluster.local",
         "reviews.default.svc.cluster.local:9080",
         "reviews",
         "reviews:9080",
         "reviews.default.svc.cluster",
         "reviews.default.svc.cluster:9080",
         "reviews.default.svc",
         "reviews.default.svc:9080",
         "reviews.default",
         "reviews.default:9080",
         "10.108.25.157",
         "10.108.25.157:9080"
        ],
        "routes": [
         {
          "match": {
           "prefix": "/"
          },
          "route": {
           "cluster": "outbound|9080||reviews.default.svc.cluster.local",
           "timeout": "0s",
           "max_grpc_timeout": "0s"
          },
          "decorator": {
           "operation": "reviews.default.svc.cluster.local:9080/*"
          },
          "per_filter_config": {
           "mixer": {
            ......

            },
            "disable_check_calls": true
           }
          }
         }
        ]
       }
      ],
      "validate_clusters": false
     },
     "last_updated": "2018-09-27T07:17:50.242Z"
    }
```

## Bookinfo端到端调用分析

通过前面章节对Envoy配置文件的分析，我们了解到Istio控制面如何将服务和路由信息通过xDS接口下发到数据面中；并介绍了Envoy上生成的各种配置数据的结构，包括listener,cluster,route和endpoint。

下面我们来分析一个端到端的调用请求，通过调用请求的流程把这些配置串连起来，以从全局上理解Istio控制面的流量控制是如何在数据面的Envoy上实现的。

下图描述了一个Productpage服务调用Details服务的请求流程：

![img](https://zhaohuabing.com/img/2018-09-25-istio-traffic-management-impl-intro/envoy-traffic-route.png)

1. Productpage发起对Details的调用：`http://details:9080/details/0` 。

2. 请求被Pod的iptable规则拦截，转发到15001端口。

3. Envoy的Virtual Listener在15001端口上监听，收到了该请求。

4. 请求被Virtual Listener根据原目标IP（通配）和端口（9080）转发到0.0.0.0_9080这个listener。

   ```json
   {
    "version_info": "2018-09-06T09:34:19Z",
    "listener": {
     "name": "virtual",
     "address": {
      "socket_address": {
       "address": "0.0.0.0",
       "port_value": 15001
      }
     }
     ......
   
     "use_original_dst": true //请求转发给和原始目的 IP:Port 匹配的 listener
    },
   ```

5. 根据 0.0.0.0_9080 listener 的 http_connection_manager filter 配置，该请求采用“9080”route 进行分发。

   ```json
   {
    "version_info": "2018-09-06T09:34:19Z",
    "listener": {
     "name": "0.0.0.0_9080",
     "address": {
      "socket_address": {
       "address": "0.0.0.0",
       "port_value": 9080
      }
     },
     "filter_chains": [
      {
       "filters": [
        {
         "name": "envoy.http_connection_manager",
         "config": {
         ......
   
          "rds": {
           "route_config_name": "9080",
           "config_source": {
            "ads": {}
           }
          },
   
        }
       ]
      }
     ],
     "deprecated_v1": {
      "bind_to_port": false
     }
    },
    "last_updated": "2018-09-06T09:34:26.172Z"
   },
   
   {
    },
   ```

6. “9080”这个 route 的配置中，host name 为 details:9080 的请求对应的 cluster 为 outbound|9080||details.default.svc.cluster.local

   ```json
   {
    "version_info": "2018-09-14T01:38:20Z",
    "route_config": {
     "name": "9080",
     "virtual_hosts": [
      {
       "name": "details.default.svc.cluster.local:9080",
       "domains": [
        "details.default.svc.cluster.local",
        "details.default.svc.cluster.local:9080",
        "details",
        "details:9080",
        "details.default.svc.cluster",
        "details.default.svc.cluster:9080",
        "details.default.svc",
        "details.default.svc:9080",
        "details.default",
        "details.default:9080",
        "10.101.163.201",
        "10.101.163.201:9080"
       ],
       "routes": [
        {
         "match": {
          "prefix": "/"
         },
         "route": {
          "cluster": "outbound|9080||details.default.svc.cluster.local",
          "timeout": "0s",
          "max_grpc_timeout": "0s"
         },
           ......
   
          }
         }
        }
       ]
      },
   	   ......
   
   {
    },
   ```

7. outbound|9080||details.default.svc.cluster.local cluster 为动态资源，通过 eds 查询得到其 endpoint 为 192.168.206.21:9080。

   ```json
   {
   "clusterName": "outbound|9080||details.default.svc.cluster.local",
   "endpoints": [
   {
     "locality": {
   
     },
     "lbEndpoints": [
       {
         "endpoint": {
           "address": {
             "socketAddress": {
               "address": "192.168.206.21",
               "portValue": 9080
             }
           }
         },
        ......  
       }
     ]
   }
   ]
   }
   ```

8. 请求被转发到 192.168.206.21，即 Details 服务所在的 Pod，被 iptable 规则拦截，转发到 15001 端口。

9. Envoy 的 Virtual Listener 在 15001 端口上监听，收到了该请求。

10. 请求被 Virtual Listener 根据请求原目标地址 IP（192.168.206.21）和端口（9080）转发到 192.168.206.21_9080 这个 listener。

11. 根据 92.168.206.21_9080 listener 的 http_connection_manager filter 配置，该请求对应的 cluster 为 inbound|9080||details.default.svc.cluster.local。

    ```json
    {
     "version_info": "2018-09-06T09:34:16Z",
     "listener": {
      "name": "192.168.206.21_9080",
      "address": {
       "socket_address": {
        "address": "192.168.206.21",
        "port_value": 9080
       }
      },
      "filter_chains": [
       {
        "filters": [
         {
          "name": "envoy.http_connection_manager",
          ......
              
          "route_config": {
            "name": "inbound|9080||details.default.svc.cluster.local",
            "validate_clusters": false,
            "virtual_hosts": [
             {
              "name": "inbound|http|9080",
              "routes": [
                ......
                    
                "route": {
                 "max_grpc_timeout": "0.000s",
                 "cluster": "inbound|9080||details.default.svc.cluster.local",
                 "timeout": "0.000s"
                },
                ......
                    
                "match": {
                 "prefix": "/"
                }
               }
              ],
              "domains": [
               "*"
              ]
             }
            ]
           },
            ......
                
           ]
          }
         }
        ]
       }
      ],
      "deprecated_v1": {
       "bind_to_port": false
      }
     },
     "last_updated": "2018-09-06T09:34:22.184Z"
    }
    ```

12. inbound|9080||details.default.svc.cluster.local cluster 配置的 host 为 127.0.0.1:9080。

13. 请求被转发到 127.0.0.1:9080，即 Details 服务进行处理。

上述调用流程涉及的完整 Envoy 配置文件参见：

- Proudctpage:<https://gist.github.com/zhaohuabing/034ef87786d290a4e89cd6f5ad6fcc97>
- Details:<https://gist.github.com/zhaohuabing/544d4d45447b65d10150e528a190f8ee>

# 小结

本文介绍了 Istio 流量管理相关组件，Istio 控制面和数据面之间的标准接口，以及 Istio 下发到 Envoy 的完整配置数据的结构和内容。然后通过 Bookinfo 示例程序的一个端到端调用分析了 Envoy 是如何实现服务网格中服务发现和路由转发的，希望能帮助大家透过概念更进一步深入理解 Istio 流量管理的实现机制。

# 参考资料

1. [Istio Traffic Managment Concept](https://istio.io/docs/concepts/traffic-management/#pilot-and-envoy)
2. [Data Plane API](https://github.com/envoyproxy/data-plane-api/blob/master/API_OVERVIEW.md)
3. [kubernetes Custom Resource](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources)
4. [Istio Pilot Design Overview](https://github.com/istio/old_pilot_repo/blob/master/doc/design.md)
5. [Envoy V2 API Overview](https://www.envoyproxy.io/docs/envoy/latest/configuration/overview/v2_overview)
6. [Data Plane API Protocol Buffer Definition](https://github.com/envoyproxy/data-plane-api/tree/master/envoy/api/v2)
7. [xDS REST and gRPC protocol](https://github.com/envoyproxy/data-plane-api/blob/master/XDS_PROTOCOL.md)<https://github.com/istio/istio/tree/master/pilot/pkg/proxy/envoy/v2>
8. [Pilot Debug interface](https://github.com/istio/istio/tree/master/pilot/pkg/proxy/envoy/v2)
9. [Istio Sidecar 自动注入原理](https://zhaohuabing.com/2018/05/23/istio-auto-injection-with-webhook/)
