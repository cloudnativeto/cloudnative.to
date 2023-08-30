---
title: "教程 | 构建生产就绪的 Istio Adapter"
date: 2018-10-17T19:13:18+08:00
draft: false
authors: ["Venil Noronha"]
translators: ["马若飞"]
reviewer:  ["宋净超"]
summary: "本文通过示例讲解了如何创建并部署一个生产环境就绪的 Istio Adapter。"
tags: ["istio","tutorial"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","istio"]
---

本文为翻译文章，[点击查看原文](https://venilnoronha.io/set-sail-a-production-ready-istio-adapter)。

你已经浏览了 Istio Mixer Adapter 的[指南](https://github.com/istio/istio/wiki/Mixer-Out-Of-Process-Adapter-Dev-Guide) ，现在想要发布自己的 Adapter？这篇文章将教你创建自己的 Adapter，在生产环境的海洋中扬帆起航。

![Istio](006tNbRwly1fw3hlzj8krj304o06m3ya.jpg)

## 介绍

根据你对[Go](https://golang.org/)、[Protobufs](https://developers.google.com/protocol-buffers/)、[gRPC](https://grpc.io/)、[Istio](https://istio.io/)、[Docker](https://www.docker.com/)和[Kubernetes](https://kubernetes.io/)知识有所了解，你可能会发现发布 Istio Mixer Adapter 的过程很容易。本文假设你对这些技术有一些经验，并且根据 Istio 的 Wiki 已经能够完成至少一个演练。

就本文的目的而言，我将讨论如何构建一个消费[Metrics](https://preliminary.istio.io/docs/reference/config/policy-and-telemetry/templates/metric/)的 Istio Mixer Adapter。下面是简要步骤：

1. Istio Mixer - Adapter 接口架构
2. 创建一个简单的 Mixer Adapter
3. 将 Adapter 发布到 Docker Hub
4. 为 Adapter 编写 Kubernetes Config
5. 在 Istio 上部署和测试 Adapter

再次强调，我将尽最大努力在这篇文章里呈现所有重要的细节，让你的 Adapter 运行起来。

## Istio Mixer - Adapter 接口架构

让我们首先看看 Adapter 如何与 Istio Mixer 结合。Kubernetes 在一定程度上抽象了接口；了解这一点对我们来说很重要。

![Istio adapter 架构](006tNbRwly1fwbaovn3jgj31j00je0u9.jpg)

下面是对上述架构中的每个元素的简要描述。

- **Microservice**是在 Istio 上部署的用户应用程序
- **Proxy**是 Istio 组件，例如[Envoy Proxy](https://www.envoyproxy.io/)，控制[Service Mesh](https://en.wikipedia.org/wiki/Microservices#Service_Mesh)中的网络通信
- **Mixer**是 Istio 组件，它从 Proxy 接收指标 (和其他) 数据，并转发给其他组件 (在本例中是 Adapter)
- **Adapter**是我们正在构建的应用程序，通过 gRPC 消费来自 Mixer 的 Metrics
- **Operator**扮演负责配置和部署的角色，在本例中是 Istio 和 Adapter

需要注意的一点，每个组件都作为独立的进程运行，并且可能分布在网络上。此外，Mixer 还与 Adapter 建立了一个 gRPC 通道，以便为其提供用户的配置和 Metrics。

## 创建一个简单的 Mixer Adapter

简单起见，我将按照 [Mixer Out of Tree Adapter Walkthrough](https://github.com/istio/istio/wiki/Mixer-Out-of-Tree-Adapter-Walkthrough) 这篇文章建立一个简单的 Mixer Adapter。下面是概要，列出了创建消费 Metrics 的 Istio Mixer Adapter 的步骤：

1. 创建 Adapter 的配置文件`config.proto`
2. 创建`mygrpcadapter.go`文件，实现`HandleMetric(context.Context, *metric.HandleMetricRequest) (*v1beta11.ReportResult, error)`这个 gRPC API 的调用
3. 通过 `go generate ./...`生成配置文件
4. 创建`main.go`文件作为 gRPC 的服务端，并监听 API 调用
5. 为 Adapter 编写配置文件 `sample_operator_config.yaml`
6. 启动本地 Mixer 进程来测试和验证 Adapter
7. 配置项目
8. 添加必要的依赖包 (使用[Go Modules](https://github.com/golang/go/wiki/Modules)、 [Glide](https://glide.sh/)、[Dep](https://golang.github.io/dep/)等)
9. 通过启动本地 Mixer 进程来构建和测试 Adapter

## 发布 Adapter 到 Docker Hub

在本地安装和测试了`myootadapter`项目后，就可以构建并发布 Adapter 到[Docker Hub](https://hub.docker.com/)库了。在继续前请执行以下步骤：

1. 移动`mygrpcadapter/testdata/`目录下的内容到`operatorconfig`
2. 创建`Dockerfile`文件来保存创建 Docker 镜像的步骤
3. 最后，在`operatorconfig/`目录下创建一个名为`mygrpcadapter-k8s`的文件，稍后将使用它部署到 Kubernetes

完成了这些步骤后，你的项目结构会如下所示。

```bash
── myootadapter
   ├── Dockerfile
   ├── glide.lock # 是否出现此类文件取决于你使用的依赖包管理工具
   ├── glide.yaml
   ├── mygrpcadapter
   │   ├── cmd
   │   │   └── main.go
   │   ├── config
   │   │   ├── config.pb.go
   │   │   ├── config.proto
   │   │   ├── config.proto_descriptor
   │   │   ├── mygrpcadapter.config.pb.html
   │   │   └── mygrpcadapter.yaml
   │   └── mygrpcadapter.go
   └── operatorconfig
       ├── attributes.yaml
       ├── metrictemplate.yaml
       ├── sample_operator_config.yaml
       ├── mygrpcadapter-k8s.yaml
       └── mygrpcadapter.yaml
```

现在来构建 Docker 镜像并发布到 Docker Hub。

### 构建 Docker 镜像

[多阶段构建（multi-stage builds）](https://docs.docker.com/develop/develop-images/multistage-build/)模式可以被用来构建 Docker 镜像。将以下内容复制到`Dockerfile`中：

```dockerfile
FROM golang:1.11 as builder
WORKDIR /go/src/github.com/username/myootadapter/
COPY ./ .
RUN CGO_ENABLED=0 GOOS=linux \
    go build -a -installsuffix cgo -v -o bin/mygrpcadapter ./mygrpcadapter/cmd/

FROM alpine:3.8
RUN apk --no-cache add ca-certificates
WORKDIR /bin/
COPY --from=builder /go/src/github.com/username/myootadapter/bin/mygrpcadapter .
ENTRYPOINT [ "/bin/mygrpcadapter" ]
CMD [ "8000" ]
EXPOSE 8000
```

`CMD [ "8000" ]` 告诉 Docker，将`8000`作为参数，传递给定义在行`ENTRYPOINT [ "/bin/mygrpcadapter" ]`的入口。因为我们在这里把 gRPC 的监听端口改为了 `8000`，所以必须更新文件`sample_operator_config.yaml` 使其一致。把原来的配置 `address: "{ADDRESS}"` 用 `address: mygrpcadapter:8000`替换。

还需要更新`file_path`，在稍后创建的 Volume 中去存储输出数据。更新`file_path: "out.txt"`为`file_path: "/volume/out.txt"` 。然后将得到如下所示的配置：

```yaml
apiVersion: "config.istio.io/v1alpha2"
kind: handler
metadata:
 name: h1
 namespace: istio-system
spec:
 adapter: mygrpcadapter
 connection:
   address: "mygrpcadapter:8000"
 params:
   file_path: "/volume/out.txt"
```

现在，在 `myootadapter` 目录下运行命令来构建和标记 Docker 镜像：

```bash
docker build -t dockerhub-username/mygrpcadapter:latest .
```

### 发布镜像到 Docker Hub

首先，通过终端登录到 Docker Hub：

```bash
docker login
```

接下来，使用下面的命令发布镜像：

```bash
docker push dockerhub-username/mygrpcadapter:latest
```

## 为 Adapter 编写 Kubernetes 配置

现在让我们填写部署到 Kubernetes 的 Adapter 配置。将以下配置复制到我们之前创建的 yaml 文件`mygrpcadapter-k8s`中：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mygrpcadapter
  namespace: istio-system
  labels:
    app: mygrpcadapter
spec:
  type: ClusterIP
  ports:
  - name: grpc
    protocol: TCP
    port: 8000
    targetPort: 8000
  selector:
    app: mygrpcadapter
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: mygrpcadapter
  namespace: istio-system
  labels:
    app: mygrpcadapter
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: mygrpcadapter
      annotations:
        sidecar.istio.io/inject: "false"
        scheduler.alpha.kubernetes.io/critical-pod: ""
    spec:
      containers:
      - name: mygrpcadapter
        image: dockerhub-username/mygrpcadapter:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8000
        volumeMounts:
        - name: transient-storage
          mountPath: /volume
      volumes:
      - name: transient-storage
        emptyDir: {}
```

上面的配置定义了一个简单的服务，只有一个从`dockerhub-username/mygrpcadapter:latest`的镜像创建的副本。该服务可以被命名为`mygrpcadapter`，并通过端口`8000`访问。这就是如何让配置在`sample_operator_config.yaml` 文件的 `address: "mygrpcadapter:8000"` 指向这个特殊的 deployment 的方法。

同时，注意这些特殊的标记：

```yaml
annotations:
  sidecar.istio.io/inject: "false"
  scheduler.alpha.kubernetes.io/critical-pod: ""
```

它告诉 Kubernetes 调度器，不要自动注入 Istio 的 sidecar。这是因为我们并不需要在 Adapter 前面挂一个 Proxy。另外，第二个标注将这个 pod 标记为系统 critical 级别。

我们还创建了一个名为`transient-storage`的临时 volume，用于存储 Adapter 的输出，例如`out.txt`文件。配置如下所示：

```yaml
    volumeMounts:
    - name: transient-storage
      mountPath: /volume
  volumes:
  - name: transient-storage
    emptyDir: {}
```

## 通过 Istio 部署和测试 Adapter

为了简洁起见，我将依赖于项目文档 [部署 Istio](https://istio.io/zh/docs/setup/kubernetes/quick-start/)， [Bookinfo 应用](https://istio.io/zh/docs/examples/bookinfo/) 和 [确定 ingress IP 和端口](https://istio.io/zh/docs/tasks/traffic-management/ingress/#%E7%A1%AE%E5%AE%9A%E5%85%A5%E5%8F%A3-ip-%E5%92%8C%E7%AB%AF%E5%8F%A3)进行演示。

### 部署 Adapter

现在可以通过 Kubernetes 部署 Adapter：

```bash
kubectl apply -f operatorconfig/
```

`mygrpcadapter`服务会部署在`istio-system`的命名空间下。你可以执行下面的命令验证：

```bash
kubectl get pods -n istio-system
```

打印的日志如下：

```
NAME                                       READY     STATUS        RESTARTS   AGE
istio-citadel-75c88f897f-zfw8b             1/1       Running       0          1m
istio-egressgateway-7d8479c7-khjvk         1/1       Running       0          1m
.
.
mygrpcadapter-86cb6dd77c-hwvqd             1/1       Running       0          1m
```

也可以执行下面的命令查看 Adapter 的日志：

```bash
kubectl logs mygrpcadapter-86cb6dd77c-hwvqd -n istio-system
```

它应该打印下面的日志：

```
listening on "[::]:8000"
```

### 测试 Adapter

在终端执行下面的命令，或者在浏览器输入 URL `http://${GATEWAY_URL}/productpage` 发送请求到部署的 Bookinfo 应用：

```bash
curl -o /dev/null -s -w "%{http_code}\n" http://${GATEWAY_URL}/productpage
```

通过访问 Adapter 容器验证在`/volume/out.txt`文件中的输出：

```bash
kubectl exec mygrpcadapter-86cb6dd77c-hwvqd cat /volume/out.txt
```

你会看到如下的输出：

```bash
HandleMetric invoked with:
  Adapter config: &Params{FilePath:/volume/out.txt,}
  Instances: 'i1metric.instance.istio-system':
  {
		Value = 1235
		Dimensions = map[response_code:200]
  }
```

## 结论

Istio 提供了一种标准机制来管理和观测云环境下的微服务。Mixer 让开发人员能够轻松地将 Istio 扩展到自定义平台。我希望这篇指南让你对 Istio Mixer - Adapter 结合有一个初步了解，以及如何自己构建一个生产就绪的 Adapter！

------

去发布你自己的 Istio Mixer Adapter! 可以用[Wavefront by VMware Adapter for Istio](https://github.com/vmware/wavefront-adapter-for-istio) 这篇文章做参考。

如果你希望在[Istio 适配器](https://istio.io/zh/docs/reference/config/policy-and-telemetry/adapters/)页面上发布你的 Adapter，请参考这个[Wiki](https://github.com/istio/istio/wiki/Publishing-Adapters-and-Templates-to-istio.io)。

**免责声明**：本文仅属于作者本人，并不代表 VMware 的立场、策略或观点。

**Venil Noronha** 开源软件爱好者
