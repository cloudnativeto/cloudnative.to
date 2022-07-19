---
title: "Istio 庖丁解牛四：pilot discovery"
date: 2019-05-13T18:24:01+08:00
draft: false
authors: ["钟华"]
summary: "Pilot 译为领航员, 在mesh中负责路由领航, 是istio控制面的核心组件。"
tags: ["istio"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","istio"]
---

> 作者: 钟华，腾讯云容器产品中心高级工程师，热衷于容器、微服务、service mesh、istio、devops 等领域技术

今天我们来解析istio控制面组件Pilot, Pilot为整个mesh提供了标准的服务模型, 该标准服务模型独立于各种底层平台, Pilot以插件方式对接不同的服务发现平台, 解析用户输入的流控配置, 转换为统一的服务发现和流量控制模型, 并以xDS方式下发到数据面。

Pilot 译为`领航员`, 在mesh中负责路由领航, 是istio控制面的核心组件。

在组件拓扑中, Pod  `istio-pilot`包括`istio-proxy`(sidecar)和`discovery`2个容器, pilot核心能力由容器 `discovery`中执行的命令`pilot-discovery discovery`提供。

![1.jpg](https://i.loli.net/2019/05/13/5cd8da4f2019872241.jpg)
[查看高清原图](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/istio-analysis-3/006tKfTcgy1g187dn7s1tj315m0u0x6t.jpg)

在源代码中, package [github.com/istio/istio/tree/master/pilot/cmd](https://github.com/istio/istio/tree/master/pilot/cmd) 有三个命令的入口:

- sidecar-injector: 在前面文章中有过介绍。
- pilot-discovery: 控制面pilot核心服务, 本文重点分析。
- pilot-agent: istio 里sidecar中主进程, 用于启动和管控envoy, 后续文章中进行分析。

------

## 1. Pilot 设计

下图展示了当前istio(1.1.X) 中Pilot 的流程设计:

![2.jpg](https://i.loli.net/2019/05/13/5cd8da4ed477225375.jpg)
<center>A conceptual diagram for Pilot’s current design（图片来自<a href="https://drive.google.com/drive/u/0/folders/0AIS5p3eW9BCtUk9PVA">Isio Community Doc</a>)</center>

从图中可以看出Pilot的处理流程可以抽象为3层:

#### 1.1 Config Ingestion Layer:

Pilot 关注的`Config`有2大类(图中进行了颜色区别):

* **Istio Config**: 用户侧提供的流控管理配置, 特别的, 在K8s平台中表现为CRD, 如VirtualService、DestinationRule等。

* **Service Discovery Config**: 服务发现配置, 包括Services、Endpoints、Nodes等。

下文中分别以`Istio Config`和`Service Discovery Config`来表示以上2类数据。

Config Ingestion Layer 以插件化的方式对接各种服务发现平台, 这些对接逻辑以in-process方式内嵌在pilot进程中. 包括Kubernetes, Consul, file-based config plugin, MCP 方式等。

#### 1.2 Core Data Model Layer:

Core Data Model Layer 会缓存上一层(Config Ingestion Layer)获取的配置信息,  根据`Istio Config`和`Service Discovery Config`数据的不同特点, 该层分别使用不同的控制器对其进行处理和存储. 并将来自不同平台的配置信息抽象为统一的服务发现模型, 如Service, ServiceInstance, Registry 等。

#### 1.3 Proxy Serving Layer:

Proxy Serving Layer 负责将上层(Core Data Model Layer)的抽象模型, 转换为具体的xDS协议数据, 并下发到订阅这些数据的数据面。

本文将尝试对`pilot-discovery discovery`的处理流程进行分析, 重点关注pilot对k8s平台的适配实现. 后续将对Config转换为Pilot Model和xDS进行分析。

------

## 2. pilot 初始化流程

命令`pilot-discovery discovery`将创建并启动discoveryServer:

```go
// Create the server for the discovery service.
discoveryServer, err := bootstrap.NewServer(serverArgs)
......
// Start the server
if err := discoveryServer.Start(stop); err != nil {
  return fmt.Errorf("failed to start discovery service: %v", err)
}
```

其中函数`bootstrap.NewServer`按照以下顺序对discoveryServer进行初始化, 步骤清晰明了:

```go
// 略掉错误处理代码
func NewServer(args PilotArgs) (*Server, error) {
  ......

  //对于k8s 平台场景, 初始化kubeClient, 后续使用
  s.initKubeClient(&args);

  // 网格初始化
  s.initMesh(&args);
  s.initMeshNetworks(&args)

  // 初始化处理Istio Config的控制器
  s.initConfigController(&args)

  // 初始化处理Service Discovery Config的控制器
  s.initServiceControllers(&args)

  // 初始化xDS服务端
  s.initDiscoveryService(&args)

  s.initMonitor(&args)
  s.initClusterRegistries(&args)
  ......
}
```

------

## 3. 网格配置初始化

Config 一词在源码中使用泛滥, 除了上面提及的:`Istio Config`和`Service Discovery Config`外, Istio 还有2个全局配置集:

- `mesh`:

  该配置集为数据面envoy实例提供全局的配置(由pilot下发), 包括mixer地址, 是否开启链路跟踪, 以及其他重要配置开关和默认值等。

  参考配置说明: <https://istio.io/docs/reference/config/istio.mesh.v1alpha1/#MeshConfig>

- `meshNetworks`:

  该配置集提供了多集群mesh中网络配置, 主要包括如何在三层网络中路由到各网络的endpoints, 以及各网络独立的服务发现配置。

  参考配置说明: <https://istio.io/docs/reference/config/istio.mesh.v1alpha1/#MeshNetworks>

我们称以上2个配置集为「网格配置」, 在源码中, 网格配置初始化入口:

```go
s.initMesh(&args);
s.initMeshNetworks(&args)
```

istio 控制面使用一个名为「istio」的config map, 作为网格的全局配置:

```yaml
% kubectl -n istio-system get configmap istio -o yaml

apiVersion: v1
data:
  mesh:
    ......
  meshNetworks:
    ......
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
```

该configmap的2个data域「mesh」和「meshNetworks」, 分别对应上面的2个网格配置集: . 用户可以通过修改该ConfigMap, 进行网格特定行为调整。

在pilot容器定义中, 默认会将该ConfigMap挂载到`/etc/istio/config`目录, 2个配置集文件将分别位于`/etc/istio/config/mesh`和`/etc/istio/config/meshNetworks`

```yaml
    image: gcr.io/istio-release/pilot
    ......
    volumeMounts:
    - mountPath: /etc/istio/config
      name: config-volume
  ......
  volumes:
  - configMap:
      name: istio
    name: config-volume
```

该configMap作为投射卷(projected volume) , kubernetes 会自动维护ConfigMap到文件系统的更新, 因此pilot只需要通过文件系统watch 这2个配置文件变化, 即可实现运行时配置动态修改, 无需重启pilot。

pilot在watch到「网格配置」变化后, 会触发xDS的重新计算, 并将新的xSD下发到数据面, 从而使得配置修改得以生效。

------

## 4. Config 控制器

控制器模式在k8s里使用非常广泛, 典型的k8s控制器利用informer/reflector 对资源进行List/Watch, 获得资源更新事件, 事件对象入队列, 缓存object到indexer, 然后在控制循环中进行自定义处理。

Pilot对`Service Discovery Config`和`Istio Config`两大类数据的处理, 也是使用控制器模式, 不过Pilot中Config 控制器有特殊之处, 因为适配多种平台, Config 有多种来源可能, 除了k8s informer, 还可能是MCP, 文件系统, 或者consul client等等. 一个典型的Config 控制器, 可以用下图来描述:

![3.jpg](https://i.loli.net/2019/05/13/5cd8da4f0f5eb79281.jpg)

上图左边是描述Config来源, 右边描述Config 控制器的结构, 可以划分为三个部分:

- Config 控制器要求实现「Controller interface」, 主要接口包括: 为指定config type 添加处理器, 以及启动控制器消费Task的`Run`方法。
- Config 控制器要求实现「Store Interface」, 主要包括对config 的访问接口. write interfaces 如Create, Update, Delete 主要是提供给 Config Ingestion Layer 使用, read interfaces 如Get, List 主要提供给 Proxy Serving Layer 使用。
- Config 控制器还包括的其他组件: 主要是 task queue 和 type-handlers 存储。

Config 控制器会按需构造特定的config 更新事件来源, 如k8s informer、MCP等,  同时通过实现Controller interface, 允许为不同的config type, 添加不同的处理器链, 存储到 type-handlers中. 在接收到config 更新事件后,  Pilot 会将event、object和该type对应的handlers包装成Task,  push到queue中. 最终在`Run`方法中启动对queue中Task的消费。

具体的, Pilot `Service Discovery Config`和`Istio Config`都按照上述控制器模式实现, 下面分别介绍。

------

## 5. Istio Config 控制器

Istio Config 控制器用于处理istio 流控CRD, 如VirtualService、DestinationRule 等, 和Istio Config 控制器相关的interface主要有:

- pilot/pkg/model.ConfigStore

  `ConfigStore`对象利用client-go库从Kubernetes获取route rule、virtual service等CRD形式存在控制面信息，转换为model包下的Config对象，对外提供`Get`、`List`、`Create`、`Update、Delete`等CRUD服务。

  这是一种「Store Interface」

- pilot/pkg/model.IstioConfigStore

  interface `IstioConfigStore` 通过 embed 方式扩展了接口`ConfigStore`。其主要目的是为访问route rule、virtual service等数据提供更加方便的接口。相对于`ConfigStore`提供的`Get`、`List`、`Create`、`Update、Delete`方法，IstioConfigStore直接提供更为方便的RouteRules、VirtualServices等方法。

  这是一种「Store Interface」

- pilot/pkg/model.ConfigStoreCache

  interface `ConfigStoreCache`  通过 embed 方式扩展了接口`ConfigStore`, `ConfigStoreCache`的主要扩展有: 注册Config变更事件处理函数`RegisterEventHandler `、开始处理流程的`Run` 方法等。

  这是一种「Controller Interface」, 同时也是「Store Interface」

如上所述, inferface `ConfigStoreCache`包括了上一节中要求的2类接口, 目前实现了interface `ConfigStoreCache`的Istio Config 控制器主要有以下三种:

- 以k8s List/Watch方式获取config。

  具体实现位于 `pilot\pkg\config\kube\crd.controller`

- 以MCP方式从`ConfigSources`获取, pilot 作为MCP client, `ConfigSources`从全局配置mesh config中获取。

  具体实现位于 `pilot\pkg\config\coredatamodel.Controller`

- 从本地文件系统中获取, 主要用于测试场景。

  具体实现位于` pilot\pkg\config\memory.controller`

#### 5.1 k8s List/Watch config 控制器

我们以在第一种方式k8s List/Watch的Config 控制器为例分析:

```go
// pilot\pkg\config\kube\crd.controller
type controller struct {
  client *Client
  queue  kube.Queue
  kinds  map[string]cacheHandler
}
```

该controller 同时实现了interface `IstioConfigStore`和`ConfigStoreCache`,  queue 和kinds 属性是用于存储Task的队列和type-handlers的map。

该controller对象在初始化过程中, 会为指定的 istio CRD 创建一个k8s informer, 这些CRD主要是:

```go
IstioConfigTypes = ConfigDescriptor{
  VirtualService,
  Gateway,
  ServiceEntry,
  DestinationRule,
  EnvoyFilter,
  Sidecar,
  HTTPAPISpec,
  HTTPAPISpecBinding,
  QuotaSpec,
  QuotaSpecBinding,
  AuthenticationPolicy,
  AuthenticationMeshPolicy,
  ServiceRole,
  ServiceRoleBinding,
  AuthorizationPolicy,
  RbacConfig,
  ClusterRbacConfig,
}
```

并为每个informer 创建EventHandler, 在EventHandler中会将新的config event 包装为Task, 并push 到queue中。

Run 方法进行queue中Task消费, Task中包括了事件类型, 对象, 以及处理函数链:

```go
type Task struct {
  handler Handler
  obj     interface{}
  event   model.Event
}
```

至此, 我们看到了event的 生产和消费, 但不涉及event/Task 是如何消费的。

通过调用`RegisterEventHandler`可以添加event/Task的处理器。

但是还没有看到`RegisterEventHandler`的调用, 也就是每种类型的config, 有哪些处理函数, 这个在下文中补充。

#### 5.2 Istio Config UML

![4.jpg](https://i.loli.net/2019/05/13/5cd8da4f5e69c79772.jpg)

------

## 6. Service Discovery Config 控制器

Service Discovery Config 控制器用于处理各平台服务发现数据, 如Services、Endpoints、Nodes等, 和Service Discovery Config 控制器相关的interface主要有:

- pilot/pkg/model.ServiceDiscovery

  对服务发现资源(service/instance等)提供访问方法, 如`Services()` `InstancesByPort()`等。

  这是一种「Store Interface」

- pilot/pkg/model.Controller

  注册Config变更事件处理函数, 包括`AppendServiceHandler()` `AppendInstanceHandler()`, 另外还有控制器启动的`Run()`方法。

  这是一种「Controller Interface」

如上所述, 只要实现了以上2个interface, 就可以作为Service Discovery Config 控制器, Pilot 中实现了以上interface的有:

- 对接k8s 服务发现的控制器

  具体实现位于 `pilot\pkg\serviceregistry\kube.Controller`

- 对接istio CRD ServiceEntry 的服务发现控制器

  具体实现位于 `pilot\pkg\serviceregistry\external.ServiceEntryStore`

- 对接consul 服务发现的控制器

  具体实现位于 `pilot\pkg\serviceregistry\consul.Controller`

以上控制器带上ClusterID后, 被包装为Registry:

```go
// Registry specifies the collection of service registry related interfaces
type Registry struct {
  // Name is the type of the registry - Kubernetes, Consul, etc.
  Name serviceregistry.ServiceRegistry
  // ClusterID is used when multiple registries of the same type are used,
  // for example in the case of K8S multicluster.
  ClusterID string
  model.Controller
  model.ServiceDiscovery
}
```

因为Pilot允许同时对接多个服务发现平台, 因此在实际使用中会将多个Registry聚合在一起使用:

```go
// pilot\pkg\serviceregistry\aggregate.Controller
type Controller struct {
  registries []Registry
  storeLock  sync.RWMutex
}
```

该聚合控制器也实现了以上2个interface。

#### 6.1 k8s Service Discovery Config 控制器

下面我们重点看看k8s Service Discovery Config 控制器的实现:

`pilot\pkg\serviceregistry\kube.Controller`同时实现了上述2个interface, 利用client-go库从Kubernetes获取`pod` 、`service`、`node`、`endpoint`，并将这些CRD转换为istio中Service、ServiceInstance等统一抽象模型。

```go
type Controller struct { // k8s service/node/ep的controller
  ......
  queue     Queue
  services  cacheHandler
  endpoints cacheHandler
  nodes     cacheHandler
  pods      *PodCache

  servicesMap map[model.Hostname]*model.Service
  ......
}

// NewController creates a new Kubernetes controller
// Created by bootstrap and multicluster (see secretcontroler).
func NewController(client kubernetes.Interface, options ControllerOptions) *Controller {
  ......
  svcInformer := sharedInformers.Core().V1().Services().Informer()
  out.services = out.createCacheHandler(svcInformer, "Services")

  epInformer := sharedInformers.Core().V1().Endpoints().Informer()
  out.endpoints = out.createEDSCacheHandler(epInformer, "Endpoints")

  nodeInformer := sharedInformers.Core().V1().Nodes().Informer()
  out.nodes = out.createCacheHandler(nodeInformer, "Nodes")

  podInformer := sharedInformers.Core().V1().Pods().Informer()
  out.pods = newPodCache(out.createCacheHandler(podInformer, "Pod"), out)

  return out
}
```

总结主要信息:

- k8s Service Discovery Config 控制器订阅的资源变更包括: Services、Endpoints、Nodes、Pod。
- 没有统一的type-handlers, 而是拆分到了多个属性中, 如代码所示包括Controller的属性services, endpoints, nodes和pods。

类似Istio Config 控制器,  k8s Service Discovery Config 控制器订阅的资源变更事件也会包装成Task, push 到queue中等待消费, 不在赘述。

#### 6.2 Service Discovery Config UML

![5.jpg](https://i.loli.net/2019/05/13/5cd8da4f370d893939.jpg)

------

## 7. xDS 服务端

通过上述2类控制器, Pilot 已经可以获得`Istio Config` 和 `Service Discovery Config`的更新, 接下来需要将这些不同平台的数据转换成统一的服务和路由模型, 然后通过xDS下发给数据面代理。

目前pilot默认创建一个gRPC Server 提供xDS 订阅服务, 在Pilot源码里叫做DiscoveryServer, 简单说下DiscoveryServer的主要逻辑:

该gRPC Server 需要实现2个接口:

```go
// AggregatedDiscoveryServiceServer is the server API for AggregatedDiscoveryService service.
type AggregatedDiscoveryServiceServer interface {
  // This is a gRPC-only API.
  StreamAggregatedResources(AggregatedDiscoveryService_StreamAggregatedResourcesServer) error
  DeltaAggregatedResources(AggregatedDiscoveryService_DeltaAggregatedResourcesServer) error
}
```

接口`StreamAggregatedResources`主要逻辑:

1. DiscoveryServer接受下游的订阅请求, 根据请求的xDS类型, 返回指定的资源, 如CDS/EDS/LDS/RDS。

2. DiscoveryServer将连接对象缓存到map中, key为下游node ID 加上连接计数器. 当检测到配置发生变化, 将会触发这些连接上的xDS重新push到下游. 这些配置变化可能是`Istio Config`、`Service Discovery Config`或者网格全局配置集。

`DeltaAggregatedResources`是增量xDS订阅接口, 目前在istio中还未实现。

#### 7.1 DiscoveryServer UML

![6.jpg](https://i.loli.net/2019/05/13/5cd8da4f7a8c483759.jpg)

------

## 8. Pilot 演进路线

查阅社区讨论和源码分析, Pilot目前的不足主要有这些方面:

- 多个控制面组件都依赖istio CRD, 如pilot, mixer等, 它们各自去订阅并处理这些CRD, 导致各组件中代码逻辑重复, 项目臃肿。
- Pilot 项目臃肿的另一个原因是, 以`in-process`方式对接各平台的配置获取和处理, Pilot和这些平台之间并没有明确的接口依赖约定, istio 和其他平台出现接口和数据格式的兼容性, 会是一个潜在风险. (要重视墨菲定律)。
- Pilot 性能问题: Pilot在关注的配置发生变化后, 会重新计算xDS数据, 并触发持有连接的xDS全量下发, DiscoveryServer也没有对配置变化的内容进行分析, 因而存在重复和无用的xDS push. 截止版本1.1, 增量xDS订阅接口在Pilot中还未实现。

下图是社区对Pilot解耦的方案提议:

![7.jpg](https://i.loli.net/2019/05/13/5cd8da4f7a4d082918.jpg)
<center>Mesh Configuration APIs proposal（图片来自<a href="https://drive.google.com/drive/u/0/folders/0AIS5p3eW9BCtUk9PVA">Isio Community Doc</a>)</center>

简要说明:

- 使用统一配置管理器(`Galley`)来处理istio CRD的处理, 通过MCP进行下发, Galley作为MCP 服务端, Pilot/Mixer等作为MCP 客户端. 在istio 1.1 中, Galley的以上功能已经发布, 并作为默认的配置处理方式, 只是1.1 中还保留了旧的实现代码, Pilot/Mixer 可以选择独立List/Watch Istio CRD, 未来随着Galley功能的增强和稳定, 旧的实现应该会被移除。
- 提议设计新的gRPC双向流协议: Mesh Configuration Protocol (MCP), 对配置进行抽象, 聚合和传输. (类似xDS gRPC), 以此将Pilot中配置对接逻辑从in-process 逐步改造为out-of-process方式。

------

以上对Pilot的能力和结构进行了分析, 下一篇文章将分析Pilot是如何将Config 转为为xDS。


