---
title: "教程 | 使用 Istio 在 Kubernetes 集群中实现金丝雀部署"
date: 2018-09-13T20:26:56+08:00
draft: false
authors: ["Kublr team"]
translators: ["甄中元"]
summary: "作为 Kublr 推出的 Istio 教程第二篇文章本教程将一步步带领你熟悉 Istio 指令并解释指令的作用，并在 Kubernetes 集群中实现金丝雀部署。"
tags: ["istio","kublr","kubernetes"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","kubernetes"]
---

![](0069RVTdgy1fv873bgdexj30to0dbgnw.jpg)

作为 Istio 教程第二篇文章本教程将一步步带领你熟悉指令并解释指令的作用。我们的[前一篇文章](http://www.servicemesher.com/blog/hands-on-canary-deployments-with-istio-and-kubernetes/)解析了 istio 原理、示例，以及使用它给开发和运维带来的好处。我们也已经演示在如何在 kubernetes 集群安装 Service Mesh。

在看这篇文章之前，如果你还没有 istio 的开发或测试集群，你可以使用我们自主开发的“Kublr in a box”工具，在 aws、azure 云环境或 VirtualBox 上运行的物理机上创建自己的 kubernetes 集群。

启动至少两个节点的集群。可以按照“快速入门”指南在你的集群上安装 service mesh。

安装完成后，你能在你的 kubernetes dashboard 的左侧边栏 pods 中查看已部署的 istio 组件。如下图所示：

![](0069RVTdgy1fv87am5p4hj30j90hd40g.jpg) 

我们将会启动一个自动化 sidecar 注入器，避免手动将 Istio sidecar 配置添加到每个部署的本地 YAML 文件中。“istio kube-inject”命令我们在前面的教程中已经介绍过。如果你的 kubernetes 的版本小于 1.9，应该使用手动的方式执行“kubectl create *.yaml”在我们的开始后续教程之前。

## 智能路由、金丝雀部署

教程的这部分我们的场景需要针对已经创建好的集群实现金丝雀部署。

可以想象一下你的组织有成百上千微服务，像 Hadoop 一样依赖几个大的数据仓库。或者，应用程序还有其他特定要求，这些要求将导致您复制大量数据并使用大量资源和预算来保留独立的“脚手架”集群以测试应用程序。保留这种脚手架环境是代价昂贵的。你能基于 kubernetes 上的 Service Mesh 实现金丝雀发布。

前一篇文章中，我们的实例程序有三个版本的 pod，这只是我们演示的复杂实例的一部分。我们需要在现有生产集群上测试新版本，而不会影响任何真实客户和用户，然而，我们希望利用完全相同的数据集群和其他依赖的微服务，这是一个真正的生产版本。这就是为什么我们不在单独的脚手架环境中测试它，而是进行金丝雀部署的原因。

首先创建“service”路由流量到 pod 上并创建四个 Deployment 副本，以模仿生产部署。yaml 文件如下：

```yaml
apiVersion: apps/v1beta1
kind: Deployment
metadata:
  name: web-v1
  namespace: default
spec:
  replicas: 4
  template:
    metadata:
      labels:
        app: website
        version: website-version-1
    spec:
      containers:
      - name: website-version-1
        image: kublr/kublr-tutorial-images:v1
        resources:
          requests:
            cpu: 0.1
            memory: 200
---
apiVersion: v1
kind: Service
metadata:
  name: website
spec:
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
    name: http
  selector:
    app: website
```

在集群中执行如下命令生成相应服务。

```bash
kubectl create -f my-application.yaml
```

如果您已经在以前的 Istio 教程中的执行过，只需通过对用于部署的旧文件运行 kubectl delete 来清理老的资源。因为本教程我们将使用不同的路由规则，旧的路由规则将干扰新的设置。

检查是否在仪表板中创建了 deployment 和 service：

![](0069RVTdgy1fv87a7rmw9j30z40nl41z.jpg) 

在发布下一个版本之前，我们希望准备 Istio Service Mesh 以将大多数请求路由到版本 1，并且只将特定的请求发送到版本 2。我们可以通过创建仅指向版本 1 的默认路由并基于 HTTP 头创建其他规则来实现。Envoy 代理将会把请求流量路由到应用程序的不同版本。

为 Service Mesh 入口节点的基本功能创建[Istio Gateway](https://istio.io/docs/reference/config/istio.networking.v1alpha3/)和[Virtual Service](https://istio.io/docs/reference/config/istio.networking.v1alpha3/)，所以我们能够通过 Istio Gateway 负载均衡器访问我们的应用程序。yaml 文件如下所示：

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: website-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*"
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: website-virtual-service
spec:
  hosts:
  - "*"
  gateways:
  - website-gateway
  http:
  - route:
    - destination:
        host: website
```

执行如下命令部署：

```bash
kubectl create -f istio-access.yaml
```

如果你看过上一篇文章，你应该知道我们还没有在 VirtualService 下定义“subset”，因为我们只部署了一个版本。仍然没有创建路由规则。

通过 Istio ingress gateway 节点测试访问。你能在这个节点的“istio-system”的 namespace 下发现服务列表。

![](0069RVTdgy1fv879ri2arj30zc0f741f.jpg) 

当导航到这个节点时，你应该看到实例程序的 v1 版本，因为它是唯一部署和在 VirtualService 中唯一可路由的版本。

![](0069RVTdgy1fv879yvt7mj30r207emxx.jpg) 

让我们分解您的请求在到达“version-1”pod 之前经过的步骤：

1. 外部负载均衡器将请求传递给 istio-ingressgateway 服务。我们的“website-gateway”被配置为拦截任何请求（hosts:“*”）并路由它们。
2. “VirtualService”是任何请求的网关和目标 pod 之间的链接，任何“host”（服务在集群内相互寻址时的 DNS 或 Kubernetes DNS）只能在一个 VirtualService 中定义。现在我们 VirtualService 对所有请求（hosts:"*"）应用它的规则。所以它将收到的请求路由到它所拥有的单个目的地：“website-version-1”。

在 VirtualService 定义中使用的 host 是 kuberntes 的“service”对象使用的一个名字，Destination 可以分为 subsets。如果我们想通过 label 区分我们的 pods 并分别在不同的场景定位他们（基于 URI 路径或者 http 头详细）。这种情况我们要添加 subset 如下所示：

```yaml
http:
  - route:
    - destination:
        host: website
        subset: something-that-is-defined-in-DestinationRule
```

在 DestinationRule 中定义的“Subsets”用于路由，此外通过 label 区分一个服务的 pod，我们可以使用自定义负载均衡策略，例如像下面一样，我们可以有名为“version-1”的 subset。

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: website
spec:
  host: website
  subsets:
  - name: version-1
    labels:
      version: website-version-1
```

当“VirtualService”使用我们在“spec.host”里的定义的目标服务名称时，将会路由到“version”为 website-version-1 的任意 pod（它是我们在“VirtualService”中“spec.http.route.destination.host”使用的 kubernetes 的 service 对象名称）。

请注意我们在“VirtualService”对象中的“spec.gateways”字段，我们的示例程序中没有 mesh 关键字，mesh 关键字将会使得在网格中的内部流量遵循已经定义的规则。在这种情况下，我们只为通过网关的外部流量设置规则。我们对内部和外部都设置流量路由规则（微服务之间，通过 Service mesh 相互寻址并访问彼此）。“gateways”定义部分看起来应该向下面一样。

```yaml
...
spec:
  hosts:
  - "*"
  gateways:
  - website-gateway
  - mesh
```

“mesh”是保留字，与“website-gateway”相对应，这是我们的网关自定义名称。

下一步是为新版本示例网站的 deployment 准备 Service Mesh。我们假设这是一个有真实流量流入的生产级别的集群，服务版本为 website-version-1，四个 pod 接受流量。通过创建一个单独的版本为“website-version-2”的网站 pod，如果这时要实现流量分割，可能会影响到已经存在的用户，这是应该避免发生的。提示一下，我们的“service”资源看起来应该是下面这样的：

```yaml
kind: Service
metadata:
  name: website
spec:
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
    name: http
  selector:
    app: website
```

任何有“app: website”label 的 pod 都会从这个 service 分到流量。它是我们在“VirtualService”定义中唯一指定的“service”，不管“version”存在不存在以及它的值是什么？

部署新的 pod 版本前，我们要创建 vservice subsets。此刻所有的 Envoy 数据面平面代理和 istio ingress 已经知道不要把生产流量路由到这个新的 pod 上（version-2），应该我们设置只有版本为“version-1”的 pods 才会接收我们没有特殊设置 HTTP 头的常规请求（QA 团队将在现实生活中使用它来测试生产集群环境中的金丝雀版本）。

为了学习需要，我们先创建一个只有单个 subset 的“DestinationRule”（只有 version-1 版本）。部署 version-2 的 pod，然后测试 subsets 规则是否起作用，发现我们没法访问“version-2”的网站。我们更新“DestinationRule”设置使用自定义 HTTP 头访问“version-2”。相关设置文件 website-versions.yaml 如下：

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: website
spec:
  host: website
  subsets:
  - name: version-1
    labels:
      version: website-version-1

```

执行如下命令部署：

```yaml
kubectl create -f website-versions.yaml
```

这样我们将创建一个名为“version-1”的 subset，该 subset 是具有“version：website-version-1”标签的任何 pod 以及在“website”服务定义中定义的任何其他标签。现在我们创建少量“version-2”的 pod，我们的金丝雀部署了一个新的、可能是错误的、我们不希望用户看到的版本，但我们必须在真实的生产环境中进行测试验证。下面是 version-2-deployment.yaml 文件：

```yaml
apiVersion: apps/v1beta1
kind: Deployment
metadata:
  name: web-v2
  namespace: default
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: website
        version: website-version-2
    spec:
      containers:
      - name: website-version-2
        image: kublr/kublr-tutorial-images:v2
        resources:
          requests:
            cpu: 0.1
            memory: 200
```

如果我们在此阶段部署“version-2”pod，会发生什么？我们不是通过创建“DestinationRule”仅仅路由到标有的“version：website-version-1”的 pod 来准备服务网格吗？是的，但是记住 subset 已经被添加到我的“VirtualService”定义中，不然它将会被忽略。“DestinationRule”资源只不过是“VirtualService”可以使用的“record”，然而，如果我们在 VirtualService 定义中没有提及它，则完全忽略它。我们需要更新虚拟服务定义，运行“kubectl get virtualservices”列出现有的资源，然后运行“kubectl edit virtualservice website-virtual-service”添加 subset。

```yaml
...
  http:
  - route:
    - destination:
        host: website
        subset: version-1
```

保存并退出文件编辑模式以应用修改后的资源。测试一下。在这个阶段，我们仍然可以加载网站，并刷新几次。现在，使用“kubectl create -f version-2-deployment.yaml”部署“version-2”并在仪表板中检查结果：

![](0069RVTdgy1fv87b2qxtyj30xo0lpgp1.jpg) 

在此刻我们有四个“version-1”pod 和一个“version-2”的金丝雀 pod。刷新几次 ingress endpoint 确信你被路由到“version-2”。现在我们准备去修改路由规则，并发送 HTTP 头中“qa”包含“canary-test”值的任何 HTTP 请求到“version-2”。

在此编辑“website-virtual-service”，这次添加匹配 header 部分：

```yaml
  http:
  - match:
    - headers:
        qa:
          exact: canary-test
    route:
    - destination:
        host: website
        subset: version-2
  - route:
    - destination:
        host: website
        subset: version-1
```

保存并退出，应用这些更改。要完成“version-2”的设置，我们还需要做一件事。你可能已经注意到，我们添加了一个匹配规则，该规则使用目标主机“website”及其 subset“version-2”，但此 subset 不存在。我们需要将它添加到“DestinationRule”中。使用“kubectl edit destinationrule website”进行编辑并添加新的 subset：

```yaml
spec:
  host: website
  subsets:
  - name: version-1
    labels:
      version: website-version-1
  - name: version-2
    labels:
      version: website-version-2
```

现在可以使用任何支持轻松修改发送到服务器的 HTTP 请求的工具来访问“version-2”。你可以使用 postman，或者它的 chorme 插件，它是非常有名的 api 和 http 测试工具，但是它的返回结果页却是文本类型的。所以我们将会使用另外一个 chrome 插件“[Modify Headers for Google Chrome](https://chrome.google.com/webstore/search/modify%20headers%20extension?hl=en)”。通过单击其图标安装并打开设置后，您可以添加任何页面请求的自定义 header（并轻松打开和关闭）：

![](0069RVTdgy1fv87cwrrpij30yf06jmy2.jpg)  

单击右上角的“加号”添加标题，填写名称和值，选择“添加”操作，然后单击“保存”。单击左上角的“开始播放”按钮（在我们的屏幕截图上显示“停止”的那个，因为它已经处于活动状态）。然后单击右侧规则“操作”部分中的“激活”按钮。使用此设置，再次加载入口页面以查看“version-2”蓝页！

![](0069RVTdgy1fv87db0lk9j30r207ndgn.jpg)

使用这个金丝雀部署，我们有一个带有新版应用程序的活跃 pod，与所有其他 pod 一样驻留在相同的负载均衡器下，在相同的环境（生产）中，我们可以在不影响真实用户的情况下执行所需的测试。

如果应用程序已通过所有内部测试并准备向用户显示，该怎么办？如果您还没准备好完全部署新版本，并且只想向小组用户展示它，请选择我们的“客户端应用程序”已经定期使用的特定标头（如果是移动客户端，例如使用标头发送其国家）并将其用作 subset。或根据每个目的地的权重选择不同的路由策略，以便为每个版本发送确切的流量百分比。

要对此进行测试，请尝试将 20％的流量发送到“version-2”，将 80％的流量发送到“version-1”，使用“kubectl edit virtualservice website-virtual-service”修改虚拟服务。它应如下所示：

```yaml
...
spec:
  gateways:
  - website-gateway
  hosts:
  - '*'
  http:
  - route:
    - destination:
        host: website
        subset: version-2
      weight: 20
    - destination:
        host: website
        subset: version-1
      weight: 80
```

现在尝试刷新页面。您会注意到蓝页（version-2）显示的频率低于绿页（version-1）。您可以尝试其他值并查看它如何影响路由。

这是我们的 Istio 服务网格教程系列的第二部分。如有其他 Kublr 问题，需要特定方案和应用程序的帮助，或提供反馈，请联系 Kublr。
