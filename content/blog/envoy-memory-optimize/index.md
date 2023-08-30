---
title: "如何降低 Istio 服务网格中 Envoy 的内存开销？"
date: 2019-11-18T11:40:00+08:00
draft: false
authors: ["赵化冰"]
summary: "在 Istio 服务网格中，每个 Envoy 占用的内存也许并不算多，但所有 sidecar 增加的内存累积起来则是一个不小的数字。在进行商用部署时，我们需要考虑如何优化并减少服务网格带来的额外内存消耗。"
categories: ["service mesh"]
tags: ["istio"]
keywords: ["service mesh","服务网格","istio", "envoy"]
aliases: ["/blog/201911-envoy-memory-optimize"]
---

## Envoy 的内存占用

在 Istio 服务网格中，每个 Envoy 占用的内存也许并不算多，但所有 sidecar 增加的内存累积起来则是一个不小的数字。在进行商用部署时，我们需要考虑如何优化并减少服务网格带来的额外内存消耗。

下面是在我环境中的一个实测数据：

Envoy 配置中的 Listener 和 Cluster 数量

* Listener 数量  175
* Cluster 数量   325
* endpoint 数量  466

内存占用情况

```bash
$ sudo docker stats 2e8fb
CONTAINER           CPU %               MEM USAGE / LIMIT     MEM %               NET I/O             BLOCK I/O           PIDS
2e8fb               0.75%               105.9 MiB / 256 MiB   41.39%              0 B / 0 B           0 B / 0 B           165
```

从上面的数据可以看到，在一个有 325 个 cluster 和 175 个 Listener 的服务网格中，一个 Envoy 的实际内存占用量达到了 100M 左右；网格中一共有 466 个实例，则所有 Envoy 占用的内存达到了 466*100M=46.6G，这些增加的内存消耗是一个不容小视的数据。

## 减少 TCMalloc 预留系统内存

根据[Istio 官方文档](https://istio.io/docs/concepts/performance-and-scalability/#cpu-and-memory)，Envoy 占用的内存大小和其配置相关，和请求处理速率无关。在一个较大的 namespace 中，Envoy 大约占用 50M 内存。然而对于多大为“较大”，Istio 官方文档并未给出一个明确的数据。

通过 Envoy 的管理端口查看上面环境中一个 Envoy 内存分配的详细情况：

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

各个指标的详细说明参见[Envoy 文档](https://www.envoyproxy.io/docs/envoy/latest/api-v2/admin/v2alpha/memory.proto.html)。从上面的数据可以看到 Envoy 真正使用的内存为 50M 左右，和官方文档一致。但由于 Envoy 采用了[TCMalloc](https://gperftools.github.io/gperftools/tcmalloc.html)作为内存管理器，导致其占用内存大于 Envoy 实际使用内存。

TCMalloc 的内存分配效率比 glibc 的 malloc 更高，但会预留系统内存，导致程序占用内存大于其实际所需内存。从前面的 Envoy admin 接口的输出可以看到 TCMalloc 预留的内存为 100M 左右，远远大于了 Envoy 实际所需的内存数量。

根据 Envoy 的实际内存占用情况，将 container 的最大内存限制调整为 60M 后再运行，Envoy 可以正常启动。再次用 docker stat 命令查看，其消耗的内存也在 60M 以内。

## 通过优化配置降低 Envoy 内存占用

即使将内存降低到 50M，在一些对资源要求比较严格的环境，例如边缘计算的场景中，网格中这些 Envoy 内存累加在一起也是不能接受的，因此需要想办法进一步降低 Envoy 的资源使用。 

根据 Envoy 的这个 github issue[（Per listener and per cluster memory overhead is too high #4196）](https://github.com/envoyproxy/envoy/issues/4196)和[Istio 文档](https://istio.io/docs/concepts/performance-and-scalability/#cpu-and-memory)可以得知，Envoy 占用的内存和其配置的 Listener 和 Cluster 个数是成线性关系的，Listener 和 Cluster 越多，Envoy 占用的内存越大，因此一个自然的想法就是通过减少 Pilot 为 Envoy 创建的 Listener 和 Cluster 数量来降低 Envoy 的内存开销。

### 按 nampese 对配置进行隔离

在 Istio 1.3 中，Pilot 在创建 Listener 和 Cluster 时已经按照 namespace 对 Service 进行了隔离，Pilot 缺省只会为 Envoy 创建和其代理服务在同一个 namespace 中的 Service 相关的 Listener 和 Cluster。按照 namespace 进行隔离在一定程度上减少了 Envoy 中的 Listener 和 Cluster 数量，但还是太过于粗犷，对内存的优化效果有限。

在实际的产品部署中，一个 namespace 中往往会部署大量相关的微服务，这些微服务在逻辑上属于同一个业务系统，但并不是 namespace 中的任意两个微服务之间都存在访问关系，因此按照 namespace 进行隔离还是会导致 Envoy 中存在大量该 sidecar 不需要的 Listener 和 Cluster 配置。

### 按服务访问关系进行细粒度隔离

在一个微服务运用中，一个服务访问的其他服务一般不会超过 10 个，而一个 namespace 中可能部署多达上百个微服务，导致 Envoy 中存在大量冗余配置，导致不必要的内存消耗。最合理的做法是只为一个 sidecar 配置该 sidecar 所代理服务需要访问的外部服务相关的配置。

Istio 提供了[Siedecar](https://istio.io/docs/reference/config/networking/sidecar/) CRD，用于对 Pilot 向 sidecar 下发的缺省配置进行更细粒度的调整。下面以 Bookinfo 示例程序说明如何调整一个 sidecar 的配置。

在 Bookinfo 示例程序中，几个微服务之间的调用关系如下：

![](https://istio.io/docs/examples/bookinfo/withistio.svg)

从图中可以看到，reviews 服务只需要访问 ratings 服务，因此在 reviews 的 sidecar 中只需要 ratings 服务相关的 outbound 配置。

但是通过查询 reviews pod 中 proxy 的配置，可以看到 Pilot 下发的缺省配置信息中包含了 reviews，productpage，details 这些它并不需要的 outbound cluster 信息，这些 outbound cluster 会导致额外的内存消耗。

```bash
master $ kubectl exec reviews-v3-54c6c64795-2tzjc -c istio-proxy curl 127.0.0.1:15000/clusters|grep 9080|grep added_via_api::true|grep outbound

outbound|9080||reviews.default.svc.cluster.local::added_via_api::true
outbound|9080||details.default.svc.cluster.local::added_via_api::true
outbound|9080||ratings.default.svc.cluster.local::added_via_api::true
outbound|9080||productpage.default.svc.cluster.local::added_via_api::true
```

下面通过 sidecar 来对 reviews 服务的 sidecar 进行配置，只为 ratings 服务创建相关的 outbound cluster。

创建一个 sidecar.yaml 文件，对 reviews 服务进行配置。

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

在 Istio 中运用该 sidecar 配置。

```bash
master $ kubectl apply -f sidecar.yaml
sidecar.networking.istio.io/reviews created
```

再查看 Reviews Pod 中的 Envoy 配置，配置中的 outbound cluster 只包含 ratings 服务，去掉了其他无关的服务相关的配置。

```bash
master $ kubectl exec reviews-v1-75b979578c-x7g46 -c istio-proxy curl 127.0.0.1:15000/clusters|grep 9080|grep added_via_api::true|grep outbound

outbound|9080||ratings.default.svc.cluster.local::added_via_api::true
```

在本文开始的环境中再进行测试，通过该方法去掉无关配置，只保留 5 个左右相关的 outbound service，可以把 Envoy 的内存控制在 15M 以内。

## 总结

在 Istio 服务网格中，伴随应用部署的 Envoy sidecar 导致了较大的内存占用。通过对 sidecar 镜像的内存进行限制，并通过 Pilot 对 sidecar 的缺省配置按照服务的实际关联关系进行细化调整，可以对 Envoy 的内存占用进行优化，减少 Istio 服务网格部署对内存的额外消耗。

## 参考文档

* [Envoy Admin: Memory](https://www.envoyproxy.io/docs/envoy/latest/api-v2/admin/v2alpha/memory.proto.html)
* [TCMalloc : Thread-Caching Malloc](https://gperftools.github.io/gperftools/tcmalloc.html)
* [Istio Performance and Scalability](https://istio.io/docs/concepts/performance-and-scalability/#cpu-and-memory)
* [Per listener and per cluster memory overhead is too high #4196](https://github.com/envoyproxy/envoy/issues/4196)
* [Istio Traffic Management: Sidecar](https://istio.io/docs/reference/config/networking/sidecar)
