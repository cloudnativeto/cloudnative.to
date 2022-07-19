---
title: "Istio安全之服务间访问控制RBAC"
date: 2019-03-25T11:04:02+08:00
draft: false
authors: ["陈洪波"]
summary: "Istio提供了非常易用的安全解决方案，包括服务间身份验证mTLS，服务间访问控制RBAC，以及终端用户身份验证JWT等，本文主要介绍如何使用服务间访问控制，同时涉及双向TLS。"
tags: ["istio"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格","istio"]
---

本文为翻译文章，[点击查看原文](http://hbchen.com/post/servicemesh/2019-03-09-istio-rbac-quick-start/)。

Istio提供了非常易用的安全解决方案，包括服务间身份验证`mTLS`，服务间访问控制`RBAC`，以及终端用户身份验证`JWT`等，本文主要介绍如何使用服务间访问控制，同时涉及`双向TLS`。

- Istio版本 **1.1.0**
- 在的[github.com/hb-go/micro-mesh](https://github.com/hb-go/micro-mesh)中有结合示例的[RBAC配置实践](https://github.com/hb-go/micro-mesh/tree/master/deploy/k8s/rbac)可以参考


**要实现`RBAC`主要理解以下几个类型的`yaml`配置，以及之间的关系：**

- [双向TLS](#双向tls)
    - `Policy`或`MeshPolicy`，上游`server`开启TLS
    - `DestinationRule`，下游`client`开启TLS
- [RBAC](#rbac)
    - `ClusterRbacConfig`/`RbacConfig`，启用授权及范围
    - `ServiceRole`，角色权限规则
    - `ServiceRoleBinding`，角色绑定规则
- [Optional](#optional)
    - `ServiceAccount`，`ServiceRoleBinding`.`subjects`的`user`条件
    
假设场景
---
- 网格内`service-1`、`service-2`开启RBAC访问控制
- 仅`service-1`授权给`ingressgateway`访问，`service-2`则不能被`ingressgateway`访问

![auth-adapter](https://raw.githubusercontent.com/hb-chen/hbchen.com/master/static/img/istio-tls-rbac.png)
    
## 双向TLS

- [Istio文档-认证策略](https://istio.io/zh/docs/concepts/security/#%E8%AE%A4%E8%AF%81)
    - [认证策略](https://istio.io/zh/docs/concepts/security/#%E8%AE%A4%E8%AF%81%E7%AD%96%E7%95%A5)
- [Istio文档-基础认证策略](https://istio.io/zh/docs/tasks/security/authn-policy/)
    - [为网格中的所有服务启用双向 TLS 认证](https://istio.io/zh/docs/tasks/security/authn-policy/#%E4%B8%BA%E7%BD%91%E6%A0%BC%E4%B8%AD%E7%9A%84%E6%89%80%E6%9C%89%E6%9C%8D%E5%8A%A1%E5%90%AF%E7%94%A8%E5%8F%8C%E5%90%91-tls-%E8%AE%A4%E8%AF%81)

### 1.上游`server`开启TLS

***[策略范围说明](##)***

- **网格范围策略**：在网格范围存储中定义的策略，没有目标选择器部分。网格中最多只能有**一个网格范围**的策略。
- **命名空间范围的策略**：在命名空间范围存储中定义的策略，名称为 default 且没有目标选择器部分。每个命名空间最多只能有**一个命名空间范围**的策略。
- **特定于服务的策略**：在命名空间范围存储中定义的策略，具有非空目标选择器部分。命名空间可以具有**零个，一个或多个特定于服务**的策略。

策略范围可以分别由`Policy`、`MeshPolicy`设置，`Policy`可以选择对**命名空间**所有服务生效，也可以指定`targets`对**特定服务**生效，`MeshPolicy`则是整个网格内生效，对于**命名空间范围**和**网格范围**名称都只能为`default`。</br>
同时配置多个策略时使用最窄匹配策略，**特定服务>命名空间范围>网格范围**，如果多个**特定于服务的策略**与服务匹配，则随机选择一个。下面是不同策略范围的具体配置参考：

**`Policy`特定于服务的策略**

- `targets`支持`name`以及`ports`列表

```yaml
apiVersion: "authentication.istio.io/v1alpha1"
kind: "Policy"
metadata:
  name: "policy-name"
spec:
  targets:
  - name: service-name-1
  - name: service-name-2
    ports:
    - number: 8080
  peers:
  - mtls: {}
---
```

**`Policy`命名空间范围的策略**
```yaml
apiVersion: "authentication.istio.io/v1alpha1"
kind: "Policy"
metadata:
  name: "default"
  namespace: "namespace-1"
spec:
  peers:
  - mtls: {}
---
```

**`MeshPolicy`网格范围策略**
```yaml
apiVersion: "authentication.istio.io/v1alpha1"
kind: "MeshPolicy"
metadata:
  name: "default"
spec:
  peers:
  - mtls: {}
---
```

### 2.下游`client`开启TLS

`client`端TLS由目标规则`DestinationRule`配置，在流量策略`trafficPolicy`中开启`tls`

- [Istio参考配置-通信路由#DestinationRule](https://istio.io/zh/docs/reference/config/istio.networking.v1alpha3/#destinationrule)
- [Istio参考配置-通信路由#TrafficPolicy](https://istio.io/zh/docs/reference/config/istio.networking.v1alpha3/#trafficpolicy)

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: service-name-1
spec:
  host: service-host-1
  # NOTE: 开启TLS
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
  subsets:
  - name: v1
    labels:
      version: v1
---
```

**TLS`mode`说明**

| mode值       | 描述                                                         |
| ------------ | ------------------------------------------------------------ |
| DISABLE      | 不要为上游端点使用 TLS。                                     |
| SIMPLE       | 向上游端点发起 TLS 连接。                                    |
| MUTUAL       | 发送客户端证书进行验证，用双向 TLS 连接上游端点。            |
| ISTIO_MUTUAL | 发送客户端证书进行验证，用双向 TLS 连接上游端点。和 MUTUAL 相比，这种方式使用的双向 TLS 证书系统是由 Istio 生成的。如果使用这种模式，TLSSettings 中的其他字段应该留空。 |


## RBAC

- [Istio文档-授权](https://istio.io/zh/docs/concepts/security/#%E6%8E%88%E6%9D%83)
    - [启用授权](https://istio.io/zh/docs/concepts/security/#%E5%90%AF%E7%94%A8%E6%8E%88%E6%9D%83)
    - [授权策略](https://istio.io/zh/docs/concepts/security/#%E6%8E%88%E6%9D%83%E7%AD%96%E7%95%A5)
- [Istio文档-基于角色的访问控制](https://istio.io/zh/docs/tasks/security/role-based-access-control/)
    - [服务级的访问控制](https://istio.io/zh/docs/tasks/security/role-based-access-control/#%E6%9C%8D%E5%8A%A1%E7%BA%A7%E7%9A%84%E8%AE%BF%E9%97%AE%E6%8E%A7%E5%88%B6)
- [Istio文档-迁移 RbacConfig 到 ClusterRbacConfig](https://istio.io/zh/docs/setup/kubernetes/upgrade/#%E8%BF%81%E7%A7%BB-rbacconfig-%E5%88%B0-clusterrbacconfig)
    - *这里使用的`ClusterRbacConfig`*
- [Istio参考配置-授权](https://istio.io/zh/docs/reference/config/authorization/)
  

有关`RbacConfig`、`ServiceRole`、`ServiceRoleBinding`的属性结构Istio文档有详细的配置可以参考:[Istio参考配置-授权-RBAC](https://istio.io/zh/docs/reference/config/authorization/istio.rbac.v1alpha1/)

### 1.开启授权`ClusterRbacConfig`

```yaml
apiVersion: "rbac.istio.io/v1alpha1"
kind: ClusterRbacConfig
metadata:
  name: default
  namespace: istio-system
spec:
  mode: 'ON_WITH_INCLUSION'
  inclusion:
    #namespaces: ["namespace-1"]
    services: ["service-name-1.namespace-1.svc.cluster.local", "service-name-2.namespace-1.svc.cluster.local"]
  # NOTE: ENFORCED/PERMISSIVE，严格或宽容模式
  enforcement_mode: ENFORCED
---
```
`enforcement_mode`可以选择`ENFORCED`严格模式，或`PERMISSIVE`宽容模式，宽容模式便于授权策略需要**变更时进行验证测试**，[Istio任务-授权许可模式](https://istio.io/zh/docs/tasks/security/role-based-access-control/#%E6%8E%88%E6%9D%83%E8%AE%B8%E5%8F%AF%E6%A8%A1%E5%BC%8F)任务中有更具体的场景介绍。

**模式`mode`说明**

| mode值            | 描述                                                         |
| ----------------- | ------------------------------------------------------------ |
| OFF               | 关闭 Istio RBAC，RbacConfig 的所有配置将会失效，且 Istio RBAC Policies 不会执行。 |
| ON                | 为所有 services 和 namespaces 启用 Istio RBAC。              |
| ON_WITH_INCLUSION | 仅针对 inclusion 字段中指定的 services 和 namespaces 启用 Istio RBAC。其它不在 inclusion 字段中的 services 和 namespaces 将不会被 Istio RBAC Policies 强制执行。 |
| ON_WITH_EXCLUSION | 针对除了 exclusion 字段中指定的 services 和 namespaces，启用 Istio RBAC。其它不在 exclusion 字段中的 services 和 namespaces 将按照 Istio RBAC Policies 执行。 |

### 2.角色权限规则`ServiceRole`
`namespace` + `services` + `paths` + `methods` 一起定义了如何访问服务，其中`services`必选，另外有`constraints`可以指定其它约束，支持的约束参考[Istio参考配置-授权-约束和属性#支持的约束](https://istio.io/zh/docs/reference/config/authorization/constraints-and-properties/#%E6%94%AF%E6%8C%81%E7%9A%84%E7%BA%A6%E6%9D%9F)
```yaml
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRole
metadata:
  name: service-role-1
  namespace: default
spec:
  rules:
  - services: ["service-name-1.namespace-1.svc.cluster.local"]
    methods: ["*"]
    # NOTE: 根据约束需要修改
    constraints:
    - key: request.headers[version]
      values: ["v1", "v2"]
---
```
### 3.角色绑定规则`ServiceRoleBinding`
`user` + `properties` 一起定义授权给谁，支持的属性参考[Istio参考配置-授权-约束和属性#支持的属性](https://istio.io/zh/docs/reference/config/authorization/constraints-and-properties/#%E6%94%AF%E6%8C%81%E7%9A%84%E5%B1%9E%E6%80%A7)
```yaml
apiVersion: "rbac.istio.io/v1alpha1"
kind: ServiceRoleBinding
metadata:
  name: service-rb-1
  namespace: default
spec:
  subjects:
  # NOTE: 需要添加 ServiceAccount
  - user: "cluster.local/ns/namespace-1/sa/service-account-2"
    # NOTE: 根据属性需要修改
    properties:
      source.namespace: "default"
  # NOTE: ingressgateway授权
  - user: "cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"
  roleRef:
    kind: ServiceRole
    name: "service-role-1"
---
```

## Optional

### 部署实例添加`ServiceAccount`
对于需要要在`ServiceRoleBinding`的`subjects`条件中授权的`user`，需要在部署实例时指定`serviceAccountName`，如前面`ServiceRoleBinding`配置要允许`service-2`访问`service-1`，则部署`service-2`时需要配置`serviceAccountName: service-account-2`

```yaml
# NOTE: 创建ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: service-account-2
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: service-name-2-v1
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: service-name-2
        version: v1
    spec:
      # NOTE: 为部署实例指定serviceAccountName
      serviceAccountName: service-account-2
      containers:
      - name: service-name-2-v1
        command: [
          "/main"
        ]
        image: hbchen/service-2:v0.0.1
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 9080
---
```

## 总结
Istio服务网格可以很方便的实现**服务间访问控制**，通过服务级的授权开关，再结合`ServiceRole`、`ServiceRoleBinding`的约束和属性条件，可以实现细粒度的访问控制。本文未涉及Istio的终端用户身份验证，后面会结合`Ingress`、`Egress`的`TLS`和`JWT`一起分析边缘流量相关的安全问题。
