---
title: "Service Mesh 深度学习系列 part2—istio 源码分析之 pilot-discovery 模块分析"
date: 2018-07-17T17:32:31+08:00
draft: false
authors: ["丁轶群"]
summary: "本文是谐云科技 CTO 丁轶群博士对 Istio 0.8 版本代码中的 pilot-discovery 的深度源码解析。"
tags: ["istio"]
categories: [service mesh"]
keywords: ["service mesh","istio","envoy"]
---

本文分析的 istio 代码版本为 0.8.0，commit 为 0cd8d67，commit 时间为 2018 年 6 月 18 日。 

本文为`Service Mesh深度学习系列`之一：

- [Service Mesh 深度学习系列 part1—istio 源码分析之 pilot-agent 模块分析](/blog/istio-service-mesh-source-code-pilot-agent-deepin)
- [Service Mesh 深度学习系列 part2—istio 源码分析之 pilot-discovery 模块分析](/blog/istio-service-mesh-source-code-pilot-discovery-module-deepin)
- [Service Mesh 深度学习系列 part3—istio 源码分析之 pilot-discovery 模块分析（续）](/blog/istio-service-mesh-source-code-pilot-discovery-module-deepin-part2)


## pilot 总体架构 
![Istio pilot 总体架构图](006tKfTcgy1ftczrqzgw5j31kw0t1q7o.jpg)

首先我们回顾一下 pilot 总体架构，上面是[官方关于 pilot 的架构图](https://github.com/istio/old_pilot_repo/blob/master/doc/design.md)，因为是 old_pilot_repo 目录下，可能与最新架构有出入，仅供参考。所谓的 pilot 包含两个组件：pilot-agent 和 pilot-discovery。图里的 agent 对应 pilot-agent 二进制，proxy 对应 Envoy 二进制，它们两个在同一个容器中，discovery service 对应 pilot-discovery 二进制，在另外一个跟应用分开部署的单独的 deployment 中。   

1. **discovery service**：从 Kubernetes apiserver list/watch `service`、`endpoint`、`pod`、`node`等资源信息，监听 istio 控制平面配置信息（Kubernetes CRD），翻译为 Envoy 可以直接理解的配置格式。
2. **proxy**：也就是 Envoy，直接连接 discovery service，间接地从 Kubernetes apiserver 等服务注册中心获取集群中微服务的注册情况
3. **agent**：本文分析对象 pilot-agent，生成 Envoy 配置文件，管理 Envoy 生命周期
4. **service A/B**：使用了 istio 的应用，如 Service A/B的进出网络流量会被proxy接管

> 对于模块的命名方法，本文采用模块对应源码 main.go 所在包名称命名法。其他 istio 分析文章有其他命名方法。比如 pilot-agent 也被称为 istio pilot，因为它在 Kubernetes 上的部署形式为一个叫 istio-pilot 的 deployment。

## pilot-discovery 的部署存在形式
pilot-discovery 是单独二进制，被封装在`Dockerfile.pilot`里，在`istio-docker.mk`里被 build 成`$(HUB)/pilot:$(TAG)`镜像。

根据`istio-pilot.yaml.tmpl`，在 Kubernetes 环境下，pilot 镜像并非 sidecar 的一部分，也不是 daemonset 在每个机器上都有，而是单独部署成一个 replica=1 的 deployment。  

## pilot-discovery 的功能简述
pilot-discovery 扮演服务注册中心、istio 控制平面到 Envoy 之间的桥梁作用。pilot-discovery 的主要功能包括：

1. 监控服务注册中心（如 Kubernetes）的服务注册情况。在 Kubernetes 环境下，会监控`service`、`endpoint`、`pod`、`node`等资源信息。监控 istio 控制面信息变化，在 Kubernetes 环境下，会监控包括`RouteRule`、`VirtualService`、`Gateway`、`EgressRule`、`ServiceEntry`等以 Kubernetes CRD 形式存在的 istio 控制面配置信息。
2. 将上述两类信息合并组合为 Envoy 可以理解的（即遵循 Envoy data plane api 的）配置信息，并将这些信息以 gRPC 协议提供给 Envoy

## pilot-discovery 主要功能分析之一：初始化

pilot-discovery 的初始化主要在 pilot-discovery 的`init`方法和在`discovery`命令处理流程中调用的`bootstrap.NewServer`完成：

1. pilot-discovery 的`init`方法为 pilot-discovery 的`discovery`命令配置一系列 flag 及其默认值。flag 值被保存在 bootstrap 包的`PilotArgs`对象中 
2. `bootstrap.NewServer`利用`PilotArgs`构建 bootstrap 包下的`server`对象

`bootstrap.NewServer`工作流程如下。

### 1. 创建 Kubernetes apiserver client（initKubeClient 方法）

根据服务注册中心配置是否包含 Kubernetes（一个 istio service mesh 可以连接多个服务注册中心）创建`kubeClient`，保存在`Server.kubeClient`成员中。`kubeClient`有两种创建方式：

1. 用户提供 kubeConfig 文件，可以在 pilot-discovery 的`discovery`命令的`kubeconfig` flag 中提供文件路径，默认为空。
2. 当用户没有提供 kubeConfig 配置文件时，使用 in cluster config 配置方式，也就是让 pilot-discovery 通过所在的运行环境，也就是运行着的 Kubernetes pod 环境，感知集群上下文，自动完成配置。client-go 库的注释说这种方式可能有问题：Using the inClusterConfig.  This might not work

### 2. 多集群 Kubernetes 配置（initClusterRegistryies 方法）

istio 支持使用一个 istio control plane 来管理跨多个 Kubernetes 集群上的 service mesh。这个叫“multicluster”功能的具体描述参考[官方文档](https://istio.io/docs/setup/Kubernetes/multicluster-install/)，当前此特性成熟度仅是[alpha 水平](https://istio.io/about/feature-stages/)。Istio 的控制平面组件（如 pilot-discovery）运行所在的 Kubernetes 集群叫本地集群，通过这个 istio 控制面板连接的其他 Kubernetes 集群叫远程集群（remote cluster）。remote cluster 信息被保存在`Server.clusterStore`成员中，里面包含一个 map，将`Metadata`映射成`RemoteCluster`对象。`clusterStore`的具体创建流程如下：

1. 检测上一步骤是否创建好`kubeClient`。否，则直接报错返回

2. 检测服务注册中心中是否包含 Mock 类型，是的话直接返回

3. 如果 pilot-discovery `discovery`命令的 flag `clusterRegistriesConfigMap`不为空，则从本地 Kubernetes 集群中读取一个包含远程 Kubernetes 集群访问信息的 configmap（configmap 所在的默认命名空间为`“istio-system”`，名字通过 discovery 命令 flag `clusterRegistriesConfigMap`设定）。 

  这个 configmap 包含 Kubernetes 远程集群的访问信息，其形式为键值对。其 key 为 cluster 唯一标识符，value 为一个使用 yaml 或 json 编码的`Cluster`对象。  `Cluster`对象的 Annotations 指定一个本地 Kubernetes 集群中的 secret（secret 所在命名空间对应的 annotation key 为`config.istio.io/accessConfigSecret`，默认为`istio-system`，secret 名称对应 annotation key 为`config.istio.io/accessConfigSecretNamespace`）。 
  到本地 Kubernetes 集群中读取 secret 内容，根据这个内容构建保存在`clusterStore`中的 RemoteCluster 对象，对应一个远程 Kubernetes 集群。 

### 3. 读取 mesh 配置（initMesh 方法） 

mesh 配置由`MeshConfig`结构体定义，包含`MixerCheckServer`、`MixerReportServer`、`ProxyListenPort`、`RdsRefreshDelay`、`MixerAddress`等一些列配置。这里读取默认 mesh 配置文件"/etc/istio/config/mesh"（用户可以通过 discovery 命令的 flag `meshConfig`提供自定义值）。如果配置文件读取失败，也可以从 Kubernetes 集群中读取 configmap 获得默认的配置。作为测试，这里也读取 flag 来覆盖 mesh 配置的`MixerCheckServer`和`MixerReportServer`（但是这两个 flag 在 pilot-discovery 的 init 方法中并没有配置）

### 4. 配置 MixerSan（initMixerSan 方法） 

如果 mesh 配置中的控制平面认证策略为 mutual TLS(默认为 none)，则配置 mixerSan

### 5. 初始化与配置存储中心的连接（initConfigController 方法）  

对 istio 做出的各种配置，比如 route rule、virtualservice 等，需要保存在配置存储中心（config store）内，istio 当前支持 2 种形式的 config store:

**i) 文件存储**

通过 pilot-discovery `discovery`命令的`configDir` flag 来设置配置文件的文件系统路径，默认为`“configDir”`。后续使用 pilot/pkg/config/memory 包下的 controller 和 pilot/pkg/config/monitor 持续监控配置文件的变化。

**ii) Kubernetes CRD**

以 Kubernetes apiserver 作为 config store 的情况下，config store 的初始化流程如下：

1. 读取 pilot-discovery `discovery`命令的`kubeconfig` flag 配置的 kubeconfig 配置文件，flag 默认为空。

2. 注册 Kubernetes CRD 资源。注册的资源类型定义在 bootstrap 包下的全局变量`ConfigDescriptor`变量里，包括：`RouteRule`、 `VirtualService`、 `Gateway`、 
  `EgressRule`、 `ServiceEntry`、 `DestinationPolicy`、 `DestinationRule`、 `HTTPAPISpec`、 `HTTPAPISpecBinding`、 `QuotaSpec`、 `QuotaSpecBinding`、 `AuthenticationPolicy`,
  `AuthenticationMeshPolicy`、 `ServiceRole`、 `ServiceRoleBinding`、 `RbacConfig`。其中`RouteRule`、 `EgressRule`、 `DestinationPolicy`、 `HTTPAPISpec`、 `HTTPAPISpecBinding`、 `QuotaSpec`、 `QuotaSpecBinding`、 `ServiceRole`、 `ServiceRoleBinding`、 `RbacConfig`对应 istio v1alpha2 版本 api，`VirtualService`、`Gateway`、`ServiceEntry`、`DestinationRule`对应 istio v1alpha3 版本 api

  以文件作为 config store 显然不灵活，所以我们可以说 istio 的流量管理策略等控制面信息存储依赖 Kubernetes 的 apiserver。那么当使用 cloud foundry 等其他非 Kubernetes 平台作为服务注册中心的时候，istio 就需要实现一个“假的”Kubernetes apiserver，不过目前这个工作并没完成，详见社区的一些[相关讨论](https://groups.google.com/forum/#!topic/istio-dev/bhMpHikwrp0)。  

  CRD 资源注册完成之后将创建 config controller，搭建对 CRD 资源 Add、Update、Delete 事件的处理框架。对该框架的处理会在本文"pilot-discovery 主要功能分析之二：istio 控制面信息监控与处理"中描述。

### 6. 配置与服务注册中心（service registry）的连接（initServiceControllers 方法）

istio 需要从服务注册中心（service registry）获取服务注册的情况。代表 pilot-discovery 的 server 对象包含一个`ServiceController`对象，一个`ServiceController`对象包含一个或多个 service controller(是的，这两个名字只有大小写区别)。每个 service controller 负责连接服务注册中心并同步相关的服务注册信息。

当前 istio 支持的服务注册中心类型包括 ConfigRegistry, MockRegistry, Kubernetes, Consul, Eureka 和 CloudFoundry。不过仅对 Kubernetes 服务注册中心的支持成熟度达到 stable 水平，其他服务注册中心的集成工作成熟度还都处于 alpha 水平。

`ServiceController`对象的结构体定义在 aggregate 包下，从包名可以看出一个`ServiceController`对象是对多个 service controller 的聚合。所谓聚合，也就是当对`ServiceController`操作时，会影响到其聚合的所有 service controller。比如，当我们向`ServiceController`注册一个服务注册信息变更事件处理 handler 时，实际上会将 handler 注册到所有的 service controller 上。

具体 service controller 对服务注册信息的变更处理流程框架将在本文“pilot-discovery 主要功能分析之三：服务注册信息监控与处理”中描述。

### 7. 初始化 discovery 服务（initDiscoveryService）

istio service mesh 中的 envoy sidecar 通过连接 pilot-discovery 的 discovery 服务获取服务注册情况、流量控制策略等控制面的控制信息。discovery 服务的初始化主要包括如下几步：

**i) 创建对外提供 REST 协议的 discovery 服务的 discovery service 对象**

istio 代码在 2018 年 6 月的一次 commit（e99cad5）中删除了大量与 Envoy v1 版本的 data plane api 相关代码。当前版本的 istio 中，作为 sidecar 的 Envoy 已经不再使用 REST 协议获取控制面信息。与 v1 版本 Envoy data plane api 相关的`cds`、`rds`、`lds`相关代码都已被删除，仅残留`sds`部分代码。因此作为`sds`的残留功能，用户依然可以访问`"/v1/registration"`URL 访问与服务`endpoint`相关的信息，但 Envoy 并不会访问这个 URL。discovery service 默认通过 8080 端口对外提供服务，可以通过 pilot-discovery 的`discovery`命令的`httpAddr` flag 自定义端口

**ii) 创建对外提供 gRPC 协议 discovery 服务的 Envoy xds server**

所谓的`xds`代表 Envoy v2 data plane api 中的`eds`、 `cds`、 `rds`、 `lds`、 `hds`、 `ads`、 `kds`等一系列 api。Envoy xds server 默认通过 15010 和 15012 端口对外提供服务，可以通过 pilot-discovery 的`discovery`命令的`grpcAddr` 、`secureGrpcAddr`flag 自定义端口。  

与 Envoy xds server 相关代码分析我们将在系列文章的下一篇分析。

### 8. 打开运行情况检查端口（initMonitor 方法）

pilot-discovery 默认打开 9093 端口（端口号可以通过 pilot-discovery discovery 命令的`monitoringAddr` flag 自定义），对外提供 HTTP 协议的自身运行状态检查监控功能。当前提供`/metrics`和`/version`两个运行状况和基本信息查询 URL。

### 9. 监控多 Kubernetes 集群中远程集群访问信息变化（initMultiClusterController 方法）

当使用一个 istio 控制面构建跨多个 Kubernetes 集群的 service mesh 时，远程 Kubernetes 集群的访问信息保存在 secret 中，此处使用 list/watch 监控 secret 资源的变化。

> 关于上面第五点说的两种 config store，代码里实际上还有第三种，通过`PilotArgs.Config.Controller`配置。但 pilot-discovery 的`init`函数里没找到对应 flag。  

以上一系列初始化不候通过 bootstrap 包的`NewServer`函数带起，在此过程中 pilot-discovery 已经启动一部分协程，开始一些控制逻辑的循环执行。比如在上述第九步中的多 Kubernetes 集群访问信息（secret 资源）的监控，在`initMonitor`方法中，实际上已经启动协程，利用 client-go 库开始对 secret 信息的监控（list/watch）与处理。

而 pilot-discovery 的其他控制逻辑则要在 bootstrap 包下的`Server.Start`方法启动，而`Start`方法的逻辑是顺序执行之前初始化过程中在`server`对象上注册的一系列启动函数（`startFunc`）。本文接下来分析 pilot-discovery 的其他主要控制逻辑。TODO 整理有哪些 startfunc

## pilot-discovery 主要功能分析之二：istio 控制面信息监控与处理

istio 的用户可以通过 istioctl 创建`route rule`、`virtualservice`等实现对服务网络中的流量管理等配置建。而这些配置需要保存在 config store 中。在当前的 istio 实现中，config store 以 Kubernetes CRD 的形式将`virtualservice`等存储在 Kubernetes apiserver 之后的 etcd 中。

在前面 pilot-discovery 初始化第五步骤中 pilot-discovery 已经完成了`RouteRule`、`VirtualService`等 CRD 资源在 Kubernetes apiserver 上的注册，接下来 pilot-discovery 还需要在 initConfigController 方法中通过 config controller 搭建 CRD 资源对象处理的框架。config controller 包含以下 3 个部分：

**1. client**

client 是一个 rest client 集合，用于连接 Kubernetes apiserver，实现对 istio CRD资源的list/watch。具体而言，为每个CRD资源的group version (如`config.istio.io/v1alpha2`、`networking.istio.io/v1alpha3`) 创建一个 rest client。该 rest client 里包含了连接 Kubernetes apiserver 需要用到的`apimachinary`、`client-go`等库里的对象，如`GroupVersion`、`RESTClient`等。

**2. queue**

用于缓存 istio CRD 资源对象（如`virtual-service`、`route-rule`等）的 Add、Update、Delete 事件的队列，等待后续由 config controller 处理。详见本文后续描述

**3. kinds**

为每种 CRD 资源（如`virtual-service`、`route-rule`等）创建一个用于 list/watch 的 SharedIndexInformer（Kubernetes client-go 库里的概念）。

pilot-discovery 在完成 config controller 的创建之后，向 server 对象注册`startFunc`，从而在后续 server start 的时候启动 config controller 的主循环逻辑（config controller 的 Run 方法），完成与 istio 控制面信息相关的监控与处理。config controller 主循环主要包括两方面：

1. 利用`client-go`库里的SharedIndexInformer实现对CRD资源的list/watch，为每种CRD资源的Add、Update、Delete事件创建处理统一的流程框架。这个流程将 Add、Update、Delete 事件涉及到的 CRD 资源对象封装为一个 Task 对象，并将之 push 到 config controller 的 queue 成员里。Task 对象除了包含 CRD 资源对象之外，还包含事件类型（如 Add、Update、Delete 等），以及处理函数 ChainHandler。ChainHandler 支持多个处理函数的串联。 
2. 启动协程逐一处理 CRD 资源事件（queue.run），处理方法是调用每个从 queue 中取出的 Task 对象上的 ChainHandler

这个流程执行结束之后，只是搭建了 CRD 资源对象变更事件的处理框架，真正 CRD 变更事件的处理逻辑要等到下面在 discovery service 中将相应的 handler 注册到 ChainHandler 当中。

## pilot-discovery 主要功能分析之三：服务注册信息监控与处理

istio 需要从服务注册中心（service registry）获取服务注册的情况。当前版本中 istio 可以对接的服务注册中心类型包括 Kubernetes、Consul 等。本小节以 Kubernetes 服务注册中心为例，分析 istio 对服务注册信息的变更处理流程框架。

pilot-discovery 初始化第六步中通过构建 service controller 实现对 Kubernetes 服务注册信息的监控。pilot-discovery 在完成 service controller 的创建之后，会向 server 对象（server 对象代表 pilot-discovery 组件）注册`startFunc`，从而在后续 server start 的时候启动 service controller 的主循环逻辑（service controller 的 Run 方法），完成服务注册信息的监控与处理。service controller 主循环主要包括两方面：

**1.** 利用`client-go`库里的`SharedIndexInformer`监控 Kubernetes 中的`service`，`endpoints`, `node`和`pod`资源（默认 resync 间隔为 60 秒，可以通过 pilot-discovery discovery 命令的`resync` flag 配置）。与 config controller 对于 CRD 资源的处理方式类似，所有`service`，`endpoints`等资源的 Add，Update 和 Delete 事件都采用统一处理框架。

**i) 将事件封装为 Task 对象，包含：**

​	a) 事件涉及的资源对象

​	b) 事件类型：Add、Update 和 Delete

​	c) Handler：ChainHandler。ChainHandler 支持多个处理函数的串联

**ii) 将 Task 对象 push 到 service controller 的 queue 成员里。**

**2.** 启动协程逐一处理服务注册信息变更事件（queue.run），处理方法是调用每个从 queue 中取出的 Task 对象上的 ChainHandler


这个流程执行结束之后，只是搭建了服务注册信息变更事件的处理框架，真正服务注册变更事件的处理逻辑要等到下面在 discovery service 中将相应的 handler 注册到 ChainHandler 当中。
## pilot-discovery 主要功能分析之四：Envoy 控制面信息服务
pilot-discovery 创建 Envoy xds server 对外提供 gRPC 协议 discovery 服务。所谓的`xds`代表 Envoy v2 data plane api 中的`eds`、 `cds`、 `rds`、 `lds`、 `hds`、 `ads`、 `kds`等 api。与 Envoy xds server 相关代码分析我们将在系列文章的下一篇分析。


## 本文作者

丁轶群博士

谐云科技 CTO

2004 年作为高级技术顾问加入美国道富银行 (浙江) 技术中心，负责分布式大型金融系统的设计与研发。2011 年开始领导浙江大学开源云计算平台的研发工作，是浙江大学 SEL 实验室负责人，2013 年获得浙江省第一批青年科学家称号，CNCF 会员，多次受邀在 Cloud Foundry, Docker 大会上发表演讲，《Docker：容器与容器云》主要作者之一。
