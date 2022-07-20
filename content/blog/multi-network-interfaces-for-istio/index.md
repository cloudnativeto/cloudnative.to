---
title: "拥抱NFV，Istio 1.1 将支持多网络平面"
date: 2018-12-19T17:55:08+08:00
draft: false
authors: ["赵化冰"]
summary: "随着Kubernetes在NFV（网络功能虚拟化）领域中的逐渐应用，已经出现多个Kubernetes的多网络平面解决方案，Istio也需要考虑支持多网络平面，以为5G的微服务化架构提供服务通讯和管控的基础设施。"
tags: ["istio","NFV"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","NFV","knitter","中兴通讯"]
---

> 本文转载自[赵化冰的博客](https://zhaohuabing.com)。

Istio 1.0版本只支持在单个网络，即Mesh中的服务只能连接在一个网络上。虽然在架构设计上是开放的，但从目前的代码来看，Istio的内部实现还是和Kubernetes高度集成的。由于Kubernetes集群中Pod缺省只支持一个网络接口，因此Istio也存在该限制并不让人意外。

随着Kubernetes在NFV（网络功能虚拟化）领域中的逐渐应用，已经出现多个Kubernetes的多网络平面解决方案，Istio也需要考虑支持多网络平面，以为5G的微服务化架构提供服务通讯和管控的基础设施。

## 什么是多网络平面？

多网络平面是一个电信行业的常用术语，即将一个电信设备或者系统同时连接到多个网络上。简而言之，就是一个主机上有多个物理或者虚拟的网络接口，这些接口分别连接到不同的网络,这些网络之间一般是相互独立的。由于电信系统对可靠性的要求非常高，因此系统会通过配置多网络平面来避免不同网络流量的相互影响，提高系统的健壮性。

## 为什么需要多网络平面？

但在一些应用场景下，多网络平面是一个必须支持的重要特性。例如在电信系统中，一般都是有多个网络平面的，电信系统中使用多个网络平面的原因如下：

- 按功能对不同网络进行隔离，以避免相互影响。例如管理流量，控制流量和数据流量分别采用不同的网络平面。
- 通过多个网络的汇聚/绑定，提供网络设计冗余，增强系统的网络健壮性。
- 支持按照不同的网络提供不同的SLA（服务等级），例如语音(低延迟)和视频流量（高带宽）具有不同的特点，需要分别对待。
- 通过网络隔离提高系统的安全性，例如为不同的租户分配不同的网络。
- 在单个网络带宽有限的情况下，通过多个网络接口增加网络的系统带宽。

在电信的NFV（网络功能虚拟化）领域中，已经有多个针对Kubernetes的多网络平面解决方案。其中一个[Kubernetes推荐的方案](https://kubernetes.io/docs/concepts/cluster-administration/networking/)是中兴通讯提供的[Knitter](https://github.com/ZTE/Knitter/)开源实现。下图展示了Knitter是如何实现Kubernetes的多网络平面支持的。

![](006tNbRwgy1fyc7fxczghj30zz0gu0vc.jpg)

Kubernetes多网络平面开源项目[Knitter](https://github.com/ZTE/Knitter/)

除了NFV的应用场景，Istio也支持除Kubernetes之外的其他部署环境，例如虚机和裸金属部署。在这些场景下，一个Host具有多个网络接口的场景也是很常见的，例如同时需要被内部和外部网络访问的Host就会有两个网络接口。

## Istio在多网络平面下的问题

在1.0版本中，Pilot在创建Inbound listener时未考虑多网络平面的情况，因此在Envoy所在节点存在多个IP时的处理逻辑存在问题。

下图描述了在多网络平面场景下 Istio 1.1存在的问题。

![](006tNbRwgy1fyc7gf6gcaj30m809zgnf.jpg)

Istio在多网络平面场景下的问题

## 服务注册

1. Envoy所在节点存在两个网络接口，分别连接到10.75.8.0/24和192.168.10.0/24两个网络上。
2. Service A被注册到Service Registry中，使用的是第二个网络接口的IP，即10.75.8.101。

## Envoy初始化

1. Envoy通过xDS接口向Pilot获取配置信息。
2. Envoy在xDS请求中携带了第一个网络接口的IP，即192.168.10.63。
3. Pilot从xDS请求中解析出Envoy所在节点的IP，即192.168.10.63。
4. Pilot用Envoy节点IP来和Service Registry中所有Service Instance的IP进行对比。
5. 由于Service A的注册IP10.75.8.101和节点IP192.168.10.63不一致，Pilot错误判断该节点上没有Service A的Instance，为Service A创建了一个Outbound Listener。

## 服务请求

1. 节点的网络接口10.75.8.101上收到一个来自downstream的请求，被重定向到Envoy。
2. Envoy在15001端口上收到该请求，要求访问Service A
3. Envoy根据Pilot下发的配置将该请求交由在Service A端口的Outbound Listener，该Listener将请求分发到Service A的Outbound Cluster上，对应IP地址为10.75.8.101。
4. Envoy将请求发送到10.75.8.101，经过TCP/IP协议栈处理后，进入第二个网络接口，被Iptable拦截，再次被作为入向请求转发到Envoy的15001端口。 上述流程形成了一个死循环，最终导致Envoy由于文件描述符被用光 而crash。

## 如何支持多网络平面

从上面的描述可以看到，要支持多网络平面，Istio需要修改Pilot生成Outbound Listener的代码实现，下图描述了修改后的处理逻辑。

![](006tNbRwgy1fyc7gnvm1vj30m80ac760.jpg)

Istio多网络平面解决方案

## 服务注册（流程不变）

1. Envoy所在节点存在两个网络接口，分别连接到10.75.8.0/24和192.168.10.0/24两个网络上。
2. Service A被注册到Service Registry中，使用的是第二个网络接口的IP，即10.75.8.101。

## Envoy初始化（增加多网络平面处理逻辑）

1. Envoy通过xDS接口向Pilot获取配置信息。
2. Envoy在xDS请求中携带所在节点上的所有网络接口的IP，在本例中即192.168.10.63和10.75.8.101。
3. Pilot从xDS请求中解析出Envoy所在节点的所有IP，在本例中即192.168.10.63和10.75.8.101。
4. Pilot用Envoy节点IP来和Service Registry中所有Service Instance的IP进行对比。
5. 由于Service A的注册IP 10.75.8.101和节点的两个IP之一相同，Pilot判断该节点上存在Service A的Instance，为Service A创建了一个Inbound Listener。

## 服务请求

1. 节点的网络接口10.75.8.101上收到一个来自downstream的请求，被重定向到Envoy。
2. Envoy在15001端口上收到该请求，要求访问Service A
3. Envoy根据Pilot下发的配置将该请求交由在Service A端口的Inbound Listener，该Listener将请求分发到Service A的Inbound Cluster上，对应IP地址为127.0.0。1。
4. Envoy将请求发送到127.0.0.1的Service A进程的服务端口上进行处理。

该修改方案已实现并提交PR合入到Istio 代码中，在1月份发布的Istio 1.1 Release中将会正式支持。

RP: <https://github.com/istio/istio/pull/9688>
Issue: <https://github.com/istio/istio/issues/9441>

## 参考资料

1. <https://kubernetes.io/docs/concepts/cluster-administration/networking/>
2. <https://github.com/ZTE/Knitter/>

