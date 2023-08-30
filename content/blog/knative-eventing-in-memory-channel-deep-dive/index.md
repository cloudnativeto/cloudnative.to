---
title: "Knative Eventing in-memory-channel 实现原理解析"
date: 2019-02-22T14:08:59+08:00
draft: false
authors: ["牛秋霖"]
summary: "本文不对基本概念做介绍，本文主要是基于 Kubernetes Event Source example 为例分析 in-memory-channel 的实现原理。"
tags: ["knative","serverless"]
categories: ["serverless"]
keywords: ["service mesh","服务网格","knative","serverless"]
---

关于 Knative eventing 的基本概念可以参考：

- <https://github.com/knative/docs/blob/master/eventing/README.md>
- <https://thenewstack.io/knative-enables-portable-serverless-platforms-on-kubernetes-for-any-cloud/>

本文不对基本概念做介绍，本文主要是基于 [Kubernetes Event Source example](https://github.com/knative/docs/blob/master/eventing/samples/kubernetes-event-source/README.md) 为例分析 [in-memory-channel](https://github.com/knative/eventing/tree/master/config/provisioners/in-memory-channel) 的实现原理。

在运行 [Kubernetes Event Source example](https://github.com/knative/docs/blob/master/eventing/samples/kubernetes-event-source/README.md) 之前要保证已经安装了 [in-memory-channel](https://github.com/knative/eventing/tree/master/config/provisioners/in-memory-channel) , 下面先从 in-memory-channel controller 开始介绍 channel 的工作机制。

## in-memory-channel controller

in-memory-channel 安装好以后就会自动创建一个 controller 和 in-memory-channel-dispatcher。dispatcher 启动 http 服务接受 event，并根据 event 所属 channel 自动寻找相关的 subscription 然后把事件发送出去。因为这是一个基于内存实现的 channel 所以仅仅是转发一下事件不能用于生产环境，在生产环境可以使用 gcppubsub、kafka 以及 natss 等存储介质。

in-memory-channel controller 监听 channel 资源如果发现有 channel 的 provisioner 是自己就开始做 EventResource 到 channel 的 feed(目前是基于 istio 的 virtualService 实现的)

通过上面的介绍我们发现 channel 其实是一个虚拟的概念作用仅仅是提供一个分组功能，有点儿像是 kubernetes 中的 service 的概念，channel 的作用是：

- 提供一种事件从事件源路由到 consumer 的介质
- 绑定事件源和 channel (sink)
- 把 consumer 绑定到 channel(subscription)
- 把接收到的消息 dispatch 到相应的 subscription
- channel 是可以有自己的后端存储的，自己的后端存储可以是任何消息中间件，in-memory 只保存在内存中
- 目前 channel 接收和 dispatch eventing 都是基于 http 协议的 ([CloudEvent 在设计上是支持很多协议的](https://github.com/cloudevents/spec/blob/v0.1/spec.md#protocol)， [但是目前 knative 只实现了 http 协议](https://github.com/knative/eventing/blob/master/docs/spec/interfaces.md#addressable))

in-memory channel controller 发现如果有 channel 的 provisioner 是 ClusterChannelProvisioner 会做如下三件事情：

- 创建一个 service，这个 service 就是 event Resource 向自己发送事件时使用的 service，并且 service 会写入到 channel 的 Status.Address.Hostname 字段。channel 这是一个[地址可达](https://github.com/knative/eventing/blob/master/docs/spec/interfaces.md#addressable)的资源

- 创建一个 Istio 的 VirtualService，作用是把 Channel 的 service 转换到 in-memory channel dispatcher service 从而达到 channel 和 provisioner *绑定* 的效果

- 配置 Channel 的 subscriptions

  不过配置 subscriptions 的动作不是在接收到 channel cr 的时候触发的。in-memory-channel controller 会 watch subscriptions 资源，当有 subscriptions 创建或者修改的时候就把相关的 subscription 绑定到 channel 上 ( [subscribable.subscribers](https://github.com/knative/eventing/blob/master/docs/spec/spec.md#group-eventingknativedevv1alpha1))

## 创建一个 testchannel

**创建 channel**

```yaml
apiVersion: eventing.knative.dev/v1alpha1
kind: Channel
metadata:
  name: testchannel
spec:
  provisioner:
    apiVersion: eventing.knative.dev/v1alpha1
    kind: ClusterChannelProvisioner
    name: in-memory-channel
```

channel 定义中的 provisioner 是 channel 的实现实体 (如果把 channel 比喻成 service/endpoint 的话那么 provisioner 就相当于是 service 对应的 Pod)。channel 本身其实只是一个概念、一个定义。具体的实现都是 provisioner 来做的。channel 使用哪个 provisioner 就相当于是使用哪一种实现（是不是有一种 StorageClass 的感觉？）。目前 knative 支持的实现有：

- in-memory 一般只在测试时使用
- gcppubsub
- kafka
- natss

channel 创建提交以后会创建出现下面这样的一个 channel 资源，和一个 kubernetes serivce 资源

```bash
NAME                                       AGE
channel.eventing.knative.dev/testchannel   7d

NAME                                    TYPE           CLUSTER-IP       EXTERNAL-IP                                           PORT(S)           AGE
service/testchannel-channel-9j22r       ClusterIP      10.102.124.54    <none>                                                80/TCP            7d3h
```

这个 service/testchannel-channel-9j22r service 并没有对应到真实的 pod, 因为 channel 只是一个概念具体的实现是需要对应的 provisioner 来实现的，并且 channel 的 status 里面会记录到当前 channel 的 hostname

```yaml
... ...
status:
  address:
    hostname: testchannel-channel-9j22r.default.svc.cluster.local
```

我们以 in-memory-channel provisioner controller 为例说明，在 in-memory-channel 的实现中是通过 istio 的一个 VirtualService 实现的，把到这个 service 的访问直接跳转到 in-memory-channel-dispatcher.knative-eventing.svc.cluster.local 这个 service。而 in-memory-channel-dispatcher.knative-eventing.svc.cluster.local 这个 service 就是 in-memory-channel controller 实现创建的。in-memory-channel controller *通过 istio 的 VirtualService 实现了事件源和 channel 的绑定*

## 创建 k8s 事件源

k8s 事件源的定义如下：

```yaml
apiVersion: sources.eventing.knative.dev/v1alpha1
kind: KubernetesEventSource
metadata:
  name: testevents
spec:
  sink:
    apiVersion: eventing.knative.dev/v1alpha1
    kind: Channel
    name: testchannel
```

事件源通过 spec.sink 定义事件需要发送到哪个 channel 上去。

K8S 事件源会生成相应的 Deployment 用于收集 kubernetes 事件并发送到相应的 channel，pod 的 --sink= 启动参数就是到目标 channel 的 url。--sink 这个参数的 url 就是根据 KubernetesEventSource crd 的 spec.sink 信息获取到目标 channel 然后取的其 status.address.hostname 字段

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: testevents-n5t2w-qzhbv
... ...
spec:
  ... ...
    spec:
      containers:
      - args:
        - --namespace=default
        - --sink=http://testchannel-channel-9j22r.default.svc.cluster.local/
        env:
        - name: SINK
          value: http://testchannel-channel-9j22r.default.svc.cluster.local/
```

当 testevents-n5t2w-qzhbv pod 发送事件到 `http://testchannel-channel-9j22r.default.svc.cluster.local/` 时请求会被 sidecar 中的 istio-proxy 转发到 `http://in-memory-channel-dispatcher.knative-eventing.svc.cluster.local/` (Knative 就是通过 istio 的 virtualService 实现的 eventSource 到 channel 的绑定) 从而达到事件转发到 in-memory-channel 的能力。接下来 in-memory-channel 的 dispatcher 把接收到的时候转发给响应的 subscription 就完成了实践的整个生命周期的流转。

## 总结

我们来汇总一下 Knative eventing 涉及到的几个关键概念及其之间的关系。

- event producers
- eventSource
- channel
- provisioners
- subscription
- consumers

下面我们以 [Kubernetes Event Source example](https://github.com/knative/docs/blob/master/eventing/samples/kubernetes-event-source/README.md) 来说明每一个概念对应的角色：

- event producers:

  [Kubernetes Event Source example](https://github.com/knative/docs/blob/master/eventing/samples/kubernetes-event-source/README.md) 是演示如何把 kubernetes 中的事件发送到 channel 并通过 subscription 最终触发 message-dumper 函数执行的例子。这其中 kubernetes 集群就是事件的最初生产者，所以 kubernetes 集群就是 event producers

- eventSource

  eventSource 不是 event producers，eventSource 是把 event producers 生成的事件 *接入* 到 Knative 体系中，其实是一个和外部系统的适配层

- channel

  是一个逻辑概念，主要是对事件本身、事件的存储以及事件的 subscription 向下传递路径做一个分组归类，每一个 channel 都有一个 status.address.hostname 字段，这个字段确定了如何把事件发送到这个 channel

- provisioners

  provisioners 是 channel 的存储介质，可以使用 gcpsubsub、kafka 以及 natss 等产品支持。provisioners 是 channel crd 在创建的时候指定的。这个设计和 kubernetes 的 StorageClass 是一脉相承的。因为 eventSource 是通过 channel 的 status.address.hostname 向 channel post 事件的，所以 in-memory-channel 这个 provisioners 通过 istio virtualService 的方式 *在 eventSource 的 sidecar 中劫持了* 发向 channel 的事件，直接转发给了 provisioners，从而实现了 provisioners 和 channel 的动态绑定的功能

- subscription

  subscription 是一个独立的 crd，一个 channel 可以对应多个 subscription，当 provisioners watch 到一个新的 subscription 是就建立自己管理的 channel 和 subscription 的绑定关系 (在 channel 的 spec 中增加到 subscription 的引用列表)。当有事件发送到 channel 时 provisioners 就自动把事件转发给相关的 subscription

- consumers

  消费事件的角色，和 channel 一样，consumers 也必须是一个地址可达的资源，并通过 status.address.hostname 字段指明如何访问到此 consumer。consumers 是通过 subscription 建立和 channel 的关联，从而达到消费事件的目的

### 参考文档

- [Knative Install on a Kubernetes Cluster](https://github.com/knative/docs/blob/master/install/Knative-with-any-k8s.md)
- <https://github.com/knative/eventing/blob/master/docs/spec/overview.md>
- <https://github.com/knative/eventing/blob/master/docs/spec/spec.md>
- <https://github.com/knative/eventing/blob/master/docs/spec/interfaces.md>
