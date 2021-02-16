---
title: "如何降低Istio服务网格中Envoy的内存开销？"
date: 2019-11-18T11:40:00+08:00
draft: false
image: "/images/blog/201911-envoy-memory-optimize.jpg"
author: "赵化冰"
reviewer: ["罗广明"]
reviewerlink: ["https://guangmingluo.github.io/guangmingluo.io/"]
authorlink: "https://zhaohuabing.com"
originallink: "https://zhaohuabing.com/post/2019-11-15-envoy-memory-optimize/"
description: "在Istio服务网格中，每个Envoy占用的内存也许并不算多，但所有sidecar增加的内存累积起来则是一个不小的数字。在进行商用部署时，我们需要考虑如何优化并减少服务网格带来的额外内存消耗。"
categories: ["service mesh"]
tags: ["istio"]
keywords: ["service mesh","服务网格","istio", "envoy"]
type: "post"
avatar: "/images/profile/default.jpg"
---

## Envoy的内存占用

在Istio服务网格中，每个Envoy占用的内存也许并不算多，但所有sidecar增加的内存累积起来则是一个不小的数字。在进行商用部署时，我们需要考虑如何优化并减少服务网格带来的额外内存消耗。

下面是在我环境中的一个实测数据：

Envoy配置中的Listener和Cluster数量

* Listener数量  175
* Cluster数量   325
* endpoint数量  466

内存占用情况

```bash
$ sudo docker stats 2e8fb
CONTAINER           CPU %               MEM USAGE / LIMIT     MEM %               NET I/O             BLOCK I/O           PIDS
2e8fb               0.75%               105.9 MiB / 256 MiB   41.39%              0 B / 0 B           0 B / 0 B           165
```

从上面的数据可以看到，在一个有325个cluster和175个Listener的服务网格中，一个Envoy的实际内存占用量达到了100M左右；网格中一共有466个实例，则所有Envoy占用的内存达到了466*100M=46.6G，这些增加的内存消耗是一个不容小视的数据。

## 减少TCMalloc预留系统内存

根据[Istio官方文档](https://istio.io/docs/concepts/performance-and-scalability/#cpu-and-memory)，Envoy占用的内存大小和其配置相关，和请求处理速率无关。在一个较大的namespace中，Envoy大约占用50M内存。然而对于多大为“较大”，Istio官方文档并未给出一个明确的数据。

通过Envoy的管理端口查看上面环境中一个Envoy内存分配的详细情况：

```bash
$ sudo docker exec 2e8fb curl http://127.0.0.1:15000/memory
{
 "allocated": "50315720",                //Envoy实际占用内存
 "heap_size": "102637568",               //TCMalloc预留的系统内存
 "pageheap_unmapped": "4603904",
 "pageheap_free": "9183232",
 "total_thread_cache": "27784296"
}
```

各个指标的详细说明参见[Envoy文档](https://www.envoyproxy.io/docs/envoy/latest/api-v2/admin/v2alpha/memory.proto.html)。从上面的数据可以看到Envoy真正使用的内存为50M左右，和官方文档一致。但由于Envoy采用了[TCMalloc](https://gperftools.github.io/gperftools/tcmalloc.html)作为内存管理器，导致其占用内存大于Envoy实际使用内存。

TCMalloc的内存分配效率比glibc的malloc更高，但会预留系统内存，导致程序占用内存大于其实际所需内存。从前面的Envoy admin 接口的输出可以看到TCMalloc预留的内存为100M左右，远远大于了Envoy实际所需的内存数量。

根据Envoy的实际内存占用情况，将container的最大内存限制调整为60M后再运行，Envoy可以正常启动。再次用docker stat命令查看，其消耗的内存也在60M以内。

## 通过优化配置降低Envoy内存占用

即使将内存降低到50M，在一些对资源要求比较严格的环境，例如边缘计算的场景中，网格中这些Envoy内存累加在一起也是不能接受的，因此需要想办法进一步降低Envoy的资源使用。 

根据Envoy的这个github issue[（Per listener and per cluster memory overhead is too high #4196）](https://github.com/envoyproxy/envoy/issues/4196)和[Istio文档](https://istio.io/docs/concepts/performance-and-scalability/#cpu-and-memory)可以得知，Envoy占用的内存和其配置的Listener和Cluster个数是成线性关系的，Listener和Cluster越多，Envoy占用的内存越大，因此一个自然的想法就是通过减少Pilot为Envoy创建的Listener和Cluster数量来降低Envoy的内存开销。

### 按nampese对配置进行隔离

在Istio 1.3中，Pilot在创建Listener和Cluster时已经按照namespace对Service进行了隔离，Pilot缺省只会为Envoy创建和其代理服务在同一个namespace中的Service相关的Listener和Cluster。按照namespace进行隔离在一定程度上减少了Envoy中的Listener和Cluster数量，但还是太过于粗犷，对内存的优化效果有限。

在实际的产品部署中，一个namespace中往往会部署大量相关的微服务，这些微服务在逻辑上属于同一个业务系统，但并不是namespace中的任意两个微服务之间都存在访问关系，因此按照namespace进行隔离还是会导致Envoy中存在大量该sidecar不需要的Listener和Cluster配置。

### 按服务访问关系进行细粒度隔离

在一个微服务运用中，一个服务访问的其他服务一般不会超过10个，而一个namespace中可能部署多达上百个微服务，导致Envoy中存在大量冗余配置，导致不必要的内存消耗。最合理的做法是只为一个sidecar配置该sidecar所代理服务需要访问的外部服务相关的配置。

Istio提供了[Siedecar](https://istio.io/docs/reference/config/networking/sidecar/) CRD，用于对Pilot向sidecar下发的缺省配置进行更细粒度的调整。下面以Bookinfo示例程序说明如何调整一个sidecar的配置。

在Bookinfo示例程序中，几个微服务之间的调用关系如下：

![](https://istio.io/docs/examples/bookinfo/withistio.svg)

从图中可以看到，reviews服务只需要访问ratings服务，因此在reviews的sidecar中只需要ratings服务相关的outbound配置。

但是通过查询reviews pod中proxy的配置，可以看到Pilot下发的缺省配置信息中包含了reviews， productpage，details这些它并不需要的outbound cluster信息，这些outbound cluster会导致额外的内存消耗。

```bash
master $ kubectl exec reviews-v3-54c6c64795-2tzjc -c istio-proxy curl 127.0.0.1:15000/clusters|grep 9080|grep added_via_api::true|grep outbound

outbound|9080||reviews.default.svc.cluster.local::added_via_api::true
outbound|9080||details.default.svc.cluster.local::added_via_api::true
outbound|9080||ratings.default.svc.cluster.local::added_via_api::true
outbound|9080||productpage.default.svc.cluster.local::added_via_api::true
```

下面通过sidecar来对reviews服务的sidecar进行配置，只为ratings服务创建相关的outbound cluster。

创建一个sidecar.yaml文件，对reviews服务进行配置。

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Sidecar
metadata:
  name: reviews
  namespace: default
spec:
  workloadSelector:
    labels:
      app: reviews
  egress:
  - hosts:
    - "./ratings.default.svc.cluster.local"
```

在Istio中运用该sidecar配置。

```bash
master $ kubectl apply -f sidecar.yaml
sidecar.networking.istio.io/reviews created
```

再查看Reviews Pod中的Envoy配置，配置中的outbound cluster只包含ratings服务，去掉了其他无关的服务相关的配置。

```bash
master $ kubectl exec reviews-v1-75b979578c-x7g46 -c istio-proxy curl 127.0.0.1:15000/clusters|grep 9080|grep added_via_api::true|grep outbound

outbound|9080||ratings.default.svc.cluster.local::added_via_api::true
```

在本文开始的环境中再进行测试，通过该方法去掉无关配置，只保留5个左右相关的outbound service，可以把Envoy的内存控制在15M以内。

## 总结

在Istio服务网格中，伴随应用部署的Envoy sidecar导致了较大的内存占用。通过对sidecar镜像的内存进行限制，并通过Pilot对sidecar的缺省配置按照服务的实际关联关系进行细化调整，可以对Envoy的内存占用进行优化，减少Istio服务网格部署对内存的额外消耗。

## 参考文档

* [Envoy Admin: Memory](https://www.envoyproxy.io/docs/envoy/latest/api-v2/admin/v2alpha/memory.proto.html)
* [TCMalloc : Thread-Caching Malloc](https://gperftools.github.io/gperftools/tcmalloc.html)
* [Istio Performance and Scalability](https://istio.io/docs/concepts/performance-and-scalability/#cpu-and-memory)
* [Per listener and per cluster memory overhead is too high #4196](https://github.com/envoyproxy/envoy/issues/4196)
* [Istio Traffic Management: Sidecar](https://istio.io/docs/reference/config/networking/sidecar)