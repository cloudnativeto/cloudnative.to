---
title: "服务网格 Istio 之 pilot-xDS 接口笔记"
date: 2018-06-21T16:55:56+08:00
draft: false
authors: ["Tian Zhou"]
summary: "本篇总结 pilot 的 xDS 常用接口，顺便浏览了部分 pilot 实现，下篇总结下 istio 的流量管理和服务发现的实现。简单来说 istio 做为管理面，集合了配置中心和服务中心两个功能，并把配置发现和服务发现以一组统一的 xDS 接口提供出来，数据面的 envoy 通过 xDS 获取需要的信息来做服务间通信和服务治理。"
tags: ["istio","pilot"]
categories: ["istio"]
keywords: ["service mesh","istio"]
---

> 本文转载自[nino's blog](https://ninokop.github.io/2018/06/19/pilot-xDS/)。

本篇总结 pilot 的 xDS 常用接口，顺便浏览了部分 pilot 实现，下篇总结下 istio 的流量管理和服务发现的实现。简单来说 istio 做为管理面，集合了配置中心和服务中心两个功能，并把配置发现和服务发现以一组统一的 xDS 接口提供出来，数据面的 envoy 通过 xDS 获取需要的信息来做服务间通信和服务治理。

## api v1 reference

Istio 中部署 pilot 的启动方式是`pilot-discovery discovery`。初始化阶段依次 init 了各种模块，其中 discovery service 就是 xDS 相关实现。[envoy API reference](https://www.envoyproxy.io/docs/envoy/latest/) 可以查到 v1 和 v2 两个版本的 API 文档。[envoy control plane](https://github.com/envoyproxy/go-control-plane) 给了 v2 grpc 接口相关的数据结构和接口。

> [pilot-xDS](https://github.com/ninokop/nino-notes/blob/master/istio/pilot-xDS.md)是几个月前 0.6.0 版本的环境上实验的接口，今天在 0.8.0 上跑发现 RDS 和 CDS 都查不到配置了，心好累。追到对应版本的代码发现因为 routerule 的配置升级到 v1alpha3 routing API 之后，APIV1 只支持原来 route rule 配置，APIV2 才支持 virtual service 相关配置，所以 0.8.0 环境上 RDS 查不到信息。

### sDS

> **Tips** 最初看 xDS 的文档的时候，非常疑惑这些接口里的 service-key service-node cluster-name 到底是什么含义，在 0.6.0 版本中有个 cache_stats 接口，只要 envoy 调用过，这次查询记录就可以在 cache_stats 中看到。本节记录每个字段的含义和查询方式。

```bash
curl http://xx/v1/registration
curl http://xx/v1/registration/reviews.nino.svc.cluster.local\|http
curl http://xx/v1/registration/reviews.nino.svc.cluster.local\|http\|version=v2
```

**pilot/pkg/proxy/envoy/v1/discovery.go** 里 v1 接口文件中 register 函数完成了向 go-restful 注册服务。查询可以根据条件除了带上 service-key，还可以在末尾带上 labels，比如 version=v2。在 kube-service-registry 当中 service 的查询是通过 service endpoint 的 shared informer 查询的，可以很方便的匹配 labels。

```json
[{
   "service-key": "details.nino.svc.cluster.local|http",
   "hosts": [{
     "ip_address": "10.244.0.37",
     "port": 9080
   }]
  }, {
   "service-key": "reviews.nino.svc.cluster.local|http",
   "hosts": [{
     "ip_address": "10.244.0.38",
     "port": 9080
    }, {
     "ip_address": "10.244.0.41",
     "port": 9080
    }, {
     "ip_address": "10.244.0.42",
     "port": 9080
    }]
}]
```

### cDS

cDS 的接口里的 cluster_name 和 service_node 可以通过 envoy 启动参数配置。其中 cluster_name 可以通过 serviceCluster 配置，service_node 默认通过 ENVOY_TYPE、POD_NAME、POD_NAMESPACE 和 INSTANCE_IP 这些环境变量合成。

> /v1/{:cluster_name}/{:service_node}

```bash
curl http://xx/v1/clusters/productpage/sidecar~10.244.0.40~productpage-v1-
8666ffbd7c-mf5f4.nino~nino.svc.cluster.local
```

```json
{
  "clusters": [{
    "name": "in.9080",
    "connect_timeout_ms": 1000,
    "type": "static",
    "lb_type": "round_robin",
    "hosts": [{
      "url": "tcp://127.0.0.1:9080"
     }]
   },{
    "name": "out.ratings.nino.svc.cluster.local|http|version=v1",
    "service_name": "ratings.nino.svc.cluster.local|http|version=v1",
    "connect_timeout_ms": 1000,
    "type": "sds",
    "lb_type": "round_robin"
   },{
    "name": "out.reviews.nino.svc.cluster.local|http|version=v1",
    "service_name": "reviews.nino.svc.cluster.local|http|version=v1",
    "connect_timeout_ms": 1000,
    "type": "sds",
    "lb_type": "round_robin"
   },{
    "name": "out.reviews.nino.svc.cluster.local|http|version=v2",
    "service_name": "reviews.nino.svc.cluster.local|http|version=v2",
    "connect_timeout_ms": 1000,
    "type": "sds",
    "lb_type": "round_robin"
   }]
 }
```

### rDS

接口类似 cDS，通过 istioctl 创建了 route rule 之后可以通过 routes 查到结果。下面的例子是发布了关于 reviews 服务的权重规则。可以通过以下 RDS 接口查到对应的权重规则。

> /v1/{:route_config_name}/{:cluster_name}/{:service_node}

```bash
curl http://xx/v1/routes/9080/productpage/sidecar~10.244.0.40~
productpage-v1-8666ffbd7c-mf5f4.nino~nino.svc.cluster.local
```

```json
{
  "validate_clusters": true,
  "virtual_hosts": [
   {
    "name": "ratings.nino.svc.cluster.local|http",
    "domains": [
     "ratings:9080",
     "ratings",
     "ratings.nino:9080",
     "ratings.nino",
     "ratings.nino.svc:9080",
     "ratings.nino.svc",
     "ratings.nino.svc.cluster:9080",
     "ratings.nino.svc.cluster",
     "ratings.nino.svc.cluster.local:9080",
     "ratings.nino.svc.cluster.local",
     "10.101.178.48:9080",
     "10.101.178.48"
    ],
    "routes": [
     {
      "prefix": "/",
      "cluster": "out.ratings.nino.svc.cluster.local|http|version=v1",
      "timeout_ms": 0,
      "decorator": {
       "operation": "ratings-default"
      }
     }
    ]
   },
   {
    "name": "reviews.nino.svc.cluster.local|http",
    "domains": [
     "reviews:9080",
     "reviews",
     "reviews.nino:9080",
     "reviews.nino",
     "reviews.nino.svc:9080",
     "reviews.nino.svc",
     "reviews.nino.svc.cluster:9080",
     "reviews.nino.svc.cluster",
     "reviews.nino.svc.cluster.local:9080",
     "reviews.nino.svc.cluster.local",
     "10.108.121.171:9080",
     "10.108.121.171"
    ],
    "routes": [
     {
      "prefix": "/",
      "weighted_clusters": {
       "clusters": [
        {
         "name": "out.reviews.nino.svc.cluster.local|http|version=v1",
         "weight": 50
        },
        {
         "name": "out.reviews.nino.svc.cluster.local|http|version=v2",
         "weight": 50
        }
       ]
      },
      "timeout_ms": 0,
      "decorator": {
       "operation": "reviews-default"
      }
     }
    ]
   }
  ]
 }
```

## api v2 reference

### eds http debug

虽然 v2 是 grpc 的接口，但是 pilot 提供了`InitDebug`，可以通过 debug 接口查询服务和 routes 等服务和配置信息。比如下面是 edsz 的 debug 接口。

```bash
curl http://10.99.241.12:8080/debug/edsz
```

```json
[{
    "clusterName": "outbound|9080||reviews.nino.svc.cluster.local",
    "endpoints": [{
        "lbEndpoints": [{
            "endpoint": {
                "address": {
                    "socketAddress": {
                        "address": "10.244.0.56",
                        "portValue": 9080
                    }
                }
            }
        }, {
            "endpoint": {
                "address": {
                    "socketAddress": {
                        "address": "10.244.0.58",
                        "portValue": 9080
                    }
                }
            }
        }, {
            "endpoint": {
                "address": {
                    "socketAddress": {
                        "address": "10.244.2.25",
                        "portValue": 9080
                    }
                }
            }
        }]
    }]
}, {
    "clusterName": "outbound|9080|v3|reviews.nino.svc.cluster.local",
    "endpoints": [{
        "lbEndpoints": [{
            "endpoint": {
                "address": {
                    "socketAddress": {
                        "address": "10.244.0.58",
                        "portValue": 9080
                    }
                }
            }
        }]
    }]
}]
```

### eds grpc

在 envoy 的 go-control-plane 接口定义中 istio 需要实现以下接口，结果 pilot 只实现了 StreamEndpoints。看了下基本实现 eds 只需要 DiscoveryRequest 里的 ResourceNames 这个字段，其实跟 v1 的接口一样就是需要 service-key。NodeId 和 TypeUrl 可省略，后者默认就是 EndpointType。

```go
type EndpointDiscoveryServiceServer interface {
    StreamEndpoints(EndpointDiscoveryService_StreamEndpointsServer) error
    FetchEndpoints(context.Context, *DiscoveryRequest) (*DiscoveryResponse, error)
}

type EndpointDiscoveryService_StreamEndpointsServer interface {
    Send(*DiscoveryResponse) error
    Recv() (*DiscoveryRequest, error)
    grpc.ServerStream
}
```

这个 ResourceNames 支持两种格式，其中 v1 和 version=v1 可以没有，这个代表 labels 和新版定义的 subsets。eds 的解析里兼容两个版本的解析方式。

> outbound|http|v1|istioserver.pilot.svc.cluster.local
>
> istioserver.pilot.svc.cluster.local|http|version=v1

**istio/pilot/pkg/proxy/envoy/v2/eds.go**

```go
xds := xdsapi.NewEndpointDiscoveryServiceClient(conn)
edsstr, err := xds.StreamEndpoints(context.Background())
err = edsstr.Send(&xdsapi.DiscoveryRequest{
    ResourceNames: []string{"istioserver.pilot.svc.cluster.local|http|version=v1"},
	TypeUrl:       EndpointType,
})
res1, err := edsstr.Recv()
cla, err := getLoadAssignment(res1)
```

pilot 把这个响应`DiscoveryResponse`的 Resources 字段用`ClusterLoadAssignment`代替。客户端需要`getLoadAssignment`从 res1.Resources[0].Value 反序列化出真正的响应结构。

**github.com/envoyproxy/go-control-plane/envoy/api/v2/eds.pb.go**

```go
type ClusterLoadAssignment struct {
    ClusterName string 
    // List of endpoints to load balance to.
    Endpoints []envoy_api_v2_endpoint.LocalityLbEndpoints 
    // Load balancing policy settings.
    Policy *ClusterLoadAssignment_Policy
}
```

### ads grpc

查询 eds 还有另一种方式 ads，即 Aggregated Discovery Service，它封装了下面这个接口。istio 在实现过程中根据 typeUrl 识别 xDS 的类别。除了 eds 以外，其他 lds rds cds 都是由 ads 集成的，没有单独的 xds 接口了。

```go
type AggregatedDiscoveryServiceServer interface {
    // This is a gRPC-only API.
    StreamAggregatedResources(AggregatedDiscoveryService_StreamAggregatedResourcesServer) error
}
```

当类型选择为 EndpointType 时，查询结果跟 eds 一致，不过 ads 接口要求 NodeID 必须在 pilot 缓存中存在。

```go
xds := ads.NewAggregatedDiscoveryServiceClient(conn)
adser, err := xds.StreamAggregatedResources(context.Background())
err = adser.Send(&xdsapi.DiscoveryRequest{
    Node: &envoy_api_v2_core1.Node{
        Id: "sidecar~10.109.11.31~productpage-v1-586c4486b7-rk2rh.nino~nino.svc.cluster.local",
	},
    ResourceNames: []string{"istioserver.pilot.svc.cluster.local|http"},
    TypeUrl:       EndpointType,
})
res1, err := adser.Recv()
cla, err := getLoadAssignment(res1)
```

### cds http debug

通过 cdsz 可以看到每个 nodeID 对应的 clusters 的配置，如果系统中用户没有发布 subnets，从 cds 实际上查不到带 tag 或者说带 version 的信息。

> curl <http://10.99.241.12:8080/debug/cdsz>

```go
{
  "name": "outbound|8084||istioserver.pilot.svc.cluster.local",
  "type": "EDS",
  "edsClusterConfig": {
    "edsConfig": {
      "ads": {
      }
    },
    "serviceName": "outbound|8084||istioserver.pilot.svc.cluster.local"
  },
  "connectTimeout": "1.000s",
  "circuitBreakers": {
    "thresholds": [
      {
      }
    ]
  }
},
```

### cds grpc

cds 接口返回的数据是 Cluster，包含了所有这个服务的配置信息。但因为目前用不到就布列出来了，具体定义见文件 **github.com/envoyproxy/go-control-plane/envoy/api/v2/cds.pb.go**

```go
type Cluster struct {
    Name string 
    ...
    Type Cluster_DiscoveryType 
    EdsClusterConfig *Cluster_EdsClusterConfig 
    ConnectTimeout time.Duration 
    LbPolicy Cluster_LbPolicy 

    CircuitBreakers *envoy_api_v2_cluster.CircuitBreakers 
    ...
}
```

### rds grpc

rds 接口返回的数据结构是`RouteConfiguration`，这个 RouteConfiguration 对应的是新版本的路由配置格式，就是 virtual service 和 destination rules 这对规则。

**github.com/envoyproxy/go-control-plane/envoy/api/v2/rds.pb.go**

```go
type RouteConfiguration struct {
    Name string
    VirtualHosts []envoy_api_v2_route.VirtualHost 
    InternalOnlyHeaders []string 
    ResponseHeadersToAdd []*envoy_api_v2_core1.HeaderValueOption 
    ResponseHeadersToRemove []string 
    RequestHeadersToAdd []*envoy_api_v2_core1.HeaderValueOption 
    ValidateClusters *google_protobuf.BoolValue 
}
```

> 看了数据结构注释，在 RDS 当中 ResourceName 填的是 routeConfiguration 的名字。

```go
rds.Send(&xdsapi.DiscoveryRequest{
    ResponseNonce: time.Now().String(),
    Node: &envoy_api_v2_core1.Node{
        Id: "sidecar~10.244.0.58~reviews-v3-79fb5c99d5-d9k7b.nino~nino.svc.cluster.local",
    },
    ResourceNames: []string{"9080"},
    TypeUrl:       RouteType})
```

rds 的查询结果实例如下，我就是发布了一个 reviews 的 50%：50% 的权重规则。

```json
{
 "versionInfo": "2018-06-21 07:23:37.290525595 +0000 UTC m=+600.138437218",
 "resources": [
  {
   "@type": "type.googleapis.com/envoy.api.v2.RouteConfiguration",
   "name": "9080",
   "virtualHosts": [
    {
     "name": "productpage.nino.svc.cluster.local:9080",
     "domains": [
      "productpage.nino.svc.cluster.local",
      "productpage.nino.svc.cluster.local:9080",
      "productpage",
      "productpage:9080",
      "productpage.nino.svc.cluster",
      "productpage.nino.svc.cluster:9080",
      "productpage.nino.svc",
      "productpage.nino.svc:9080",
      "productpage.nino",
      "productpage.nino:9080",
      "10.109.11.31",
      "10.109.11.31:9080"
     ],
     "routes": [
      {
       "match": {
        "prefix": "/"
       },
       "route": {
        "cluster": "outbound|9080|v1|productpage.nino.svc.cluster.local",
        "useWebsocket": false
       },
       "decorator": {
        "operation": "productpage"
       }
      }
     ]
    },
    {
     "name": "reviews.nino.svc.cluster.local:9080",
     "domains": [
      "reviews.nino.svc.cluster.local",
      "reviews.nino.svc.cluster.local:9080",
      "reviews",
      "reviews:9080",
      "reviews.nino.svc.cluster",
      "reviews.nino.svc.cluster:9080",
      "reviews.nino.svc",
      "reviews.nino.svc:9080",
      "reviews.nino",
      "reviews.nino:9080",
      "10.109.242.124",
      "10.109.242.124:9080"
     ],
     "routes": [
      {
       "match": {
        "prefix": "/"
       },
       "route": {
        "weightedClusters": {
         "clusters": [
          {
           "name": "outbound|9080|v2|reviews.nino.svc.cluster.local",
           "weight": 50
          },
          {
           "name": "outbound|9080|v3|reviews.nino.svc.cluster.local",
           "weight": 50
          }
         ]
        },
        "useWebsocket": false
       },
       "decorator": {
        "operation": "reviews"
       }
      }
     ]
    }
   ],
   "validateClusters": false
  }
 ],
 "typeUrl": "type.googleapis.com/envoy.api.v2.RouteConfiguration",
 "nonce": "2018-06-21 07:23:59.18418814 +0000 UTC m=+622.032099759"
}
```

## 参考

- [envoy API reference](https://www.envoyproxy.io/docs/envoy/latest/)
- [envoy control plane](https://github.com/envoyproxy/go-control-plane)
- [istio 指南](https://istio.io/)
