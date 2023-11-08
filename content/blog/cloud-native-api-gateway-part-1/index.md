---
title: "构建云原生微服务网关 - 篇一：Ambassador"
date: 2019-08-01T20:15:43+08:00
draft: false
authors: ["陆培尔"]
summary: "在微服务架构中，API 网关是一个十分重要的存在。在云原生时代，API 网关有了新的定义和发展。本系列文章尝试分析目前主流的云原生微服务网关，并比较各自的优劣。"
tags: ["ambassador","api gateway"]
categories: ["Service Mesh"]
keywords: ["ambassador","kubernetes native"]
---

> 在微服务架构中，API 网关是一个十分重要的存在。一方面它为外部的流量访问提供了统一的入口，使得可以方便的进行防火墙的策略实施；另一方面，可以在网关处进行流量控制、认证、授权、灰度发布、日志收集、性能分析等各种高级功能，使得业务功能与非业务功能有效解耦，给予了系统架构更大的灵活性。本系列文章尝试分析目前主流的云原生微服务网关，并比较它们各自的优劣。

## 网关选型标准

其实 kubernetes 本身有一个 ingress controller，基于 Nginx 或 HAProxy 等 7 层代理进行流量的转发。不过 ingress 只能进行简单的反向代理，不支持流控、灰度、认证、授权等网关必备的功能。所以一般意义认为，ingress 是一个 7 层 http 代理，而非 api 网关。本系列主要分析 Ambassador、Traefik、Kong 等具备**微服务**所需能力的网关产品。

## 什么是 Ambassador？

这里引用官网的一段描述

> Ambassador 是一个基于 Envoy proxy 构建的，kubernetes 原生的开源微服务网关。Ambassador 在构建之初就致力于支持多个独立的团队，这些团队需要为最终用户快速发布、监控和更新服务。Ambassador 还具有 Kubernetes ingress 和负载均衡的能力。

注意这里的几个关键词：**Envoy**，**kubernetes 原生**，**微服务**。现在市面上网关产品不少，不过 Kubernetes 原生的产品倒真的不多。传统的网关产品一般是基于 rest api 或者 yaml 文件来进行配置（谁让这些老大哥出来的早呢，他们火的时候 k8 还没出来呢），而 Ambassador 完全基于 k8s 标准的 annotation 或者 CRD 来进行各类配置，没错，非常的**native**。

## Ambassador 架构

![](14871146-0dcae8cb18297b27.png)

了解 istio 的同学，看到这张图会有十分熟悉的感觉，没错，Ambassador 也是具有控制平面和数据平面的。数据平面自然是老伙计 Envoy，Ambassador 的控制平面负责监听 k8s 中的 Service 资源的变化，并将配置下发 Envoy，实际的流量转发通过 Envoy 来完成。（感觉就是一个轻量级的 istio）

具体流程如下：

1. 服务所有者在 kubernetes manifests 中定义配置 (通过 annotation 或者 CRD)。
2. 当 manifest 应用到集群时，kubernetes api 会将更改通知 Ambassador。
3. Ambassador 解析更改并将配置转换为一种中间语义。Envoy 的配置由该 IR 生成。
4. 新的配置通过基于 gRPC 的聚合发现服务（ADS）api 传递给 Envoy。
5. 流量通过重新配置的 Envoy，而不会断开任何连接。

## 扩展性和可用性

Ambassador 依靠 Kubernetes 实现扩展性、高可用性和持久性。所有 Ambassador 配置都直接存储在 Kubernetes 中（etcd），没有数据库。Ambassador 被打包成一个单独的容器，其中包含控制平面和一个 Ambassador 代理实例。默认情况下，Ambassador 部署为 kubernetes deployment，可以像其他 kubernetes deployment 一样进行扩展和管理。

## 与其他网关产品比较

目前主流的网关产品可以分为三类：

- 托管的 API 网关，比如 [Amazon api gateway](https://aws.amazon.com/api-gateway/)
- 传统的 API 网关，比如 [Kong](https://getkong.org/)
- 7 层代理，比如 [Traefik](https://traefik.io/), [NGINX](http://nginx.org/), [HAProxy](http://www.haproxy.org/), or [Envoy](https://www.Envoyproxy.io/), 或者是基于这些代理的 Ingress controllers

所有这些托管的和传统的 API 网关的问题是：

- 不是自服务的。传统 API 网关上的管理接口不是为开发人员自服务而设计的，为开发人员提供的安全性和可用性有限。
- 不是 Kubernetes 原生的。它们通常使用 REST apis 进行配置，这使得采用云原生模式（如 GitOps 和声明式配置）变得很困难。
- 为 API 管理而设计，而非微服务。

一般来说，7 层代理可以用作 API 网关，但需要额外的定制开发来支持微服务用例。事实上，许多 API 网关都将 API 网关所需的附加功能打包在 L7 代理之上。Ambassador 使用 Envoy，而 Kong 使用 Nginx。

## Istio

Istio 是一个基于 Envoy 的开源服务网格。服务网格用于管理东/西流量，而 API 网关用于管理南/北流量。一般来说，我们发现南/北流量与东/西流量有很大不同（比如说，在南北流量中你无法控制客户端）。

## 安装 Ambassador

Ambassador 安装非常的简单，直接使用 helm 安装。如果对于 helm 还不是很了解，可以参考我之前的文章 [helm 介绍](https://www.jianshu.com/p/290f27841b8d)。
使用 helm 安装只需要执行如下命令：

```bash
helm install --name my-release stable/ambassador
```

 这边插播一下，推荐使用微软 azure 的 charts 镜像`http://mirror.azure.cn/kubernetes/charts/`，基本和官方的同步，且可以正常访问，阿里云的 charts 不知道为什么更新很不及时。
安装完后可以看到有两个 pods

```bash
$ kubectl get pods
NAME                          READY     STATUS    RESTARTS   AGE
ambassador-3655608000-43x86   1/1       Running   0          2m
ambassador-3655608000-w63zf   1/1       Running   0          2m
```

如果都是都是 running 状态，这样 Ambassador 就安装完成了
接下来我们部署一下官网的应用

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: tour
  annotations:
    getambassador.io/config: |
      ---
      apiVersion: ambassador/v1
      kind: Mapping
      name: tour-ui_mapping
      prefix: /
      service: tour:5000
      ---
      apiVersion: ambassador/v1
      kind: Mapping
      name: tour-backend_mapping
      prefix: /backend/
      service: tour:8080
      labels:
        ambassador:
          - request_label:
            - backend
spec:
  ports:
  - name: ui
    port: 5000
    targetPort: 5000
  - name: backend
    port: 8080
    targetPort: 8080
  selector:
    app: tour
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tour
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tour
  strategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: tour
    spec:
      containers:
      - name: tour-ui
        image: quay.io/datawire/tour:ui-0.2.4
        ports:
        - name: http
          containerPort: 5000
      - name: quote
        image: quay.io/datawire/tour:backend-0.2.4
        ports:
        - name: http
          containerPort: 8080
        resources:
          limits:
            cpu: "0.1"
            memory: 100Mi
```

这个 pod 里面有两个容器，分别是前端的 ui 以及后端的 backend。注意 annotation 里面的`getambassador.io/config`部分，这就是 ambassador 的配置了，分别定义了两个注释，kind 是`Mapping`，定义了前后端的匹配路径，服务名称及端口。这个配置的意思是，凡是匹配上`/`的，全部走 tour 的 5000 端口，凡是匹配上`/backend`的，全部走 tour 的 8080 端口（对应的就是 tour 的 service 配置）。也可以使用 CRD 方式配置，ambassador 已经默认创建了一组 crd

```bash
[root@MiWiFi-R1CM-srv zuul]# kubectl get crds|grep ambassador
authservices.getambassador.io                  2019-07-27T11:40:58Z
consulresolvers.getambassador.io               2019-07-27T11:40:58Z
kubernetesendpointresolvers.getambassador.io   2019-07-27T11:40:58Z
kubernetesserviceresolvers.getambassador.io    2019-07-27T11:40:58Z
mappings.getambassador.io                      2019-07-27T11:40:58Z
modules.getambassador.io                       2019-07-27T11:40:58Z
ratelimitservices.getambassador.io             2019-07-27T11:40:58Z
tcpmappings.getambassador.io                   2019-07-27T11:40:58Z
tlscontexts.getambassador.io                   2019-07-27T11:40:58Z
tracingservices.getambassador.io               2019-07-27T11:40:58Z
```

其中 mapping 就是核心资源，用于路由的转发配置，下面是一个 mapping 资源配置示例

```yaml
apiVersion: v1
items:
- apiVersion: getambassador.io/v1
  kind: Mapping
  metadata:
    annotations:
      kubectl.kubernetes.io/last-applied-configuration: |
        {"apiVersion":"getambassador.io/v1","kind":"Mapping","metadata":{"annotations":{},"name":"nginx","namespace":"default"},"spec":{"prefix":"/nginx","service":"nginx:80"}}
    creationTimestamp: "2019-07-27T13:36:38Z"
    generation: 1
    name: nginx
    namespace: default
    resourceVersion: "420594"
    selfLink: /apis/getambassador.io/v1/namespaces/default/mappings/nginx
    uid: 8f1f4d33-b073-11e9-be4c-0800279f163b
  spec:
    prefix: /nginx
    service: nginx:80
kind: List
metadata:
  resourceVersion: ""
  selfLink: ""
```

一旦你修改了 service 里面的 annotation 设置，ambassador 的控制面会自动将变更下发给 Envoy，全程不需要中断服务。（也要感谢 Envoy 强大的 xDS api）

下面我们来看一下 Ambassador 的几个使用场景：

## 用例

### 用例 1：边缘（南/北）路由

这个是平时最常见的使用场景，网关位于整个集群的入口处，统一去做一些流控、鉴权等方面的工作：

![](14871146-45238040cc6650c4.png)

该场景的关注点在于：

- 控制/路由入口流量的能力
- 卸载请求
  - 认证（比如要求所有入口流量都必须要进过认证）
  - 加密（TLS 终端及传输加密）
  - 重试及超时

saas service 中的真实用例：

![](14871146-7db0c08aafed66b9.png)

### 用例 2：内部（南/北）路由

通常来说，企业内部的系统架构会比较复杂，会有多集群或者多租户，比如一个 kubernetes 的集群和一个 vm 的集群（可能是 openstack），那么在集群之间的流量就是内部的南/北流量，集群之间的流量交互可以通过 ambassador 完成。

![](14871146-90750413b7c7e9f5.png)

此场景的关注点在于：

- 控制/路由多租户流量的能力
- 卸载请求
  - 匹配（基于 headers）
  - 重试及超时

saas service 中的真实用例：

![](14871146-23acd24daab3455b.png)

### 用例 3：内部（东/西）路由

这个场景中 Ambassador 已经作为集群内部东西向流量的代理了，配合它自己的控制平面，有点 service mesh 的意思了。区别在于，Ambassador 在这个集群里是处于一个中心节点的位置（一个或一组 ambassador 实例），属于 server proxy 的范畴，而不是 service mesh 里面的 client proxy（sidecar）。这种架构其实和传统的 esb 更加的接近。

![](14871146-8cec66e2dc3b82c1.png)

此场景关注点：

- 控制/路由任意流量的能力（南北向+东西向）
- 卸载请求
  - 服务发现
  - 负载均衡
  - 访问控制

大家可以看到，已经非常接近于 service mesh 的能力了（也许 ambassador 以后也会出一个 service mesh 产品？）

saas service 的真实用例：

![](14871146-605fcdf1a7987640.png)

服务网格的真实用例（与 istio 集成）：

![](14871146-dbefbeb1c9fcf405.png)

### 用例 4：流量镜像

此场景中可以把流量复制一份到其他服务中（影子流量），通常用于监控、测试等场景

![](14871146-85a3899f164466c2.png)

- 测试代码、发布包的能力
- 利用真实的流量/负载
- 最小化重复资源

> 注意：上面所描述的几个典型场景其实不光可以使用 Ambassador，而是适用于各类使用 api gateway 或者 proxy 的场景。

## 配置

Ambassador 不同版本之间配置方式的变更如下图所示，configmap 方式是早期使用方式，目前已经被废弃了，现在更推荐使用 CRD 方式。

![](14871146-d2aac8fb2c0cbeda.png)

### 加密的配置方式

![](14871146-f9231001054176b2.png)

### 认证的配置方式

![](14871146-38b74b7b5ed93f2e.png)

### 路由的配置方式

![](14871146-64fc6ccdef6a0386.png)

### 跟踪的配置方式

![](14871146-2ed98f1ea3c98531.png)

## Ambassador 的不足

Ambassador 和同类的网关产品类似，分为社区版及商业版，社区版提供了最基础的路由、限速、TLS 加密、跟踪、认证（需要自己实现 external third party authentication service）等能力，但是微服务网关中十分重要的 OAuth2 集成认证、RBAC、custom filter 等功能都是需要在 pro 版中才能实现，这是比较遗憾的一点。尤其是 custom filter，根据我们目前的经验，一个能力完整、功能丰富的微服务网关，必然会引入 custom filter。而 custom filter 也需要使用 Golang 进行编写，对于不熟悉 Golang 的开发人员来说也会比较痛苦。

## 总结

Ambassador 作为一个较新推出的开源微服务网关产品，与 kubernetes 结合的相当好，基于 annotation 或 CRD 的配置方式与 k8s 浑然一体，甚至让人感觉这就是 k8s 自身功能的一部分，真正做到了`kubernetes native`。而底层基于 Envoy 进行流量代理，也让人不需要太担心性能问题。对于路由、加密、基础认证、链路跟踪等场景，可尝试使用。而对于像`custom filter`、`rbac`、`advanced rate limiting`等场景有需求的用户，使用 pro 版本可满足要求。本人也与 Ambassador 开发团队进行了联系，遗憾的是 Ambassador 目前在国内尚未有 reseller，若使用 pro 版，后期技术支持的便利性也是需要考虑的问题。

## 参考文献

- [https://www.getambassador.io](https://www.getambassador.io/)
- Using Ambassador to build Cloud-Native Applications - Steve Flanders, Omnition @ KubeCon 2019, Shanghai
