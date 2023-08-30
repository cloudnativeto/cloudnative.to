---
title: "Istio 安全设置笔记"
date: 2018-06-11T10:56:15+08:00
draft: false
authors: ["崔秀龙"]
summary: "Istio 为网格中的微服务提供了较为完善的安全加固功能，在不影响代码的前提下，可以从多个角度提供安全支撑，官方文档做了较为详细的介绍，但是也比较破碎，这里尝试做个简介兼索引，实现过程还是要根据官方文档进行。"
tags: ["istio","security"]
categories: ["service mesh"]
keywords: ["service mesh","istio","安全","服务网格"]
---

[Istio](https://istio.io/) 为网格中的微服务提供了较为完善的安全加固功能，在不影响代码的前提下，可以从多个角度提供安全支撑，[官方文档](https://istio.io/docs/tasks/security/)做了较为详细的介绍，但是也比较破碎，这里尝试做个简介兼索引，实现过程还是要根据官方文档进行。

Istio 的安全功能主要分为三个部分的实现：

1. 双向 TLS 支持。
2. 基于黑白名单的访问控制。
3. 基于角色的访问控制。
4. JWT 认证支持。

首先回顾一下 Istio 网格中的服务通信过程：

1. 利用自动或者手工注入，把 Envoy Proxy 注入到每个服务 Pod 中，用 Sidecar 的方式运行。
2. Pod 初始化过程里，使用 iptables 劫持所在 Pod 的**出入**流量。
3. 服务间的通信，从原来的直接通信，转换为现在的 Envoy 之间通信，Envoy 在这里同时作为客户端和服务端负载均衡组件。
4. Envoy 的工作过程中，可能会和 Mixer、Pilot 以及 Citadel 等组件发生互动。

## 双向 TLS 支持

双向 TLS 支持主要针对的是通信方面，把明文传输的服务通信，通过转换为 Envoy 之间的加密通信。这一安全设置较为基础，可以在全局、Namespace 或者单个服务的范围内生效。

这一功能主要通过两个 Istio CRD 对象来完成：

### Policy

例如 [Basic Authentication Policy](https://istio.io/docs/tasks/security/authn-policy/) 中的一个样例，用于给单个服务设置 mtls：

```yaml
apiVersion: "authentication.istio.io/v1alpha1"
kind: "Policy"
metadata:
  name: "example-2"
spec:
  targets:
  - name: httpbin
  peers:
  - mtls:
```

其中 `target` 是可选项，如果去掉的话，作用域将扩展到整个 Namespace。

### DestinationRule

同样的一个例子里面的目标规则如下：

```yaml
apiVersion: "networking.istio.io/v1alpha3"
kind: "DestinationRule"
metadata:
  name: "example-2"
spec:
  host: httpbin.bar.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
    portLevelSettings:
    - port:
        number: 1234
      tls:
        mode: ISTIO_MUTUAL
```

这个也很容易理解，这一规则用于指派对该地址的访问方式：

- `tls.mode = DISABLE`，这个服务缺省是不开启 tls 支持的，如果取值 `ISTIO_MUTUAL`，则代表这个地址（服务）的所有端口都开启 TLS。
- `port...ISTIO_MUTUAL`，只针对这一个端口启用 mTLS 支持。

创建 Policy 之后，Citadel 会生成证书文件，并传递给 Envoy，我们可以在 Envoy 容器（kube-proxy）的 `/etc/certs/` 目录中看到这几个 `*.pem` 文件。如果使用 `openssl x509 -text -noout` 查看 `cert-chain.pem` 的证书内容，会看到 spiffe 编码的 ServiceAccount 内容来作为 SAN：

```yaml
 X509v3 Subject Alternative Name:
            URI:spiffe://cluster.local/ns/default/sa/default
```

规则生效之后，原有的服务间调用是没有差异的，但是如果在网格之外，就必须 https，结合上面谈到的证书来访问目标服务才能完成访问。

> 另外这里也提供了[外部 CA 的支持](https://istio.io/docs/tasks/security/plugin-ca-cert/)，可以使用已有的证书体系来替换网格内的自签发体系。

## 基于黑白名单的访问控制

### 黑名单

下面的例子来自[官方](https://raw.githubusercontent.com/istio/istio/release-0.8/samples/bookinfo/kube/mixer-rule-deny-label.yaml)，禁止 Reviews 的 v3 版本访问 Ratings 服务。

首先使用 `denier` 适配器定义一个拒绝响应

```yaml
apiVersion: "config.istio.io/v1alpha2"
kind: denier
metadata:
  name: denyreviewsv3handler
spec:
  status:
    code: 7
    message: Not allowed
```

这里不需要额外属性输入，因此采用了 `checknothing` 模板：

```yaml
apiVersion: "config.istio.io/v1alpha2"
kind: checknothing
metadata:
  name: denyreviewsv3request
spec:
```

最后使用 `rule` 对象把这两者联系起来，并配合一个表达式来使之生效：

```yaml
apiVersion: "config.istio.io/v1alpha2"
kind: rule
metadata:
  name: denyreviewsv3
spec:
  match: destination.labels["app"] == "ratings" && source.labels["app"]=="reviews" && source.labels["version"] == "v3"
  actions:
  - handler: denyreviewsv3handler.denier
    instances: [ denyreviewsv3request.checknothing ]
```

### 白名单

官方案例设置了一个允许 `v2` 和 `v3` 版本访问 `ratings` 服务的白名单。

白名单适配器要使用的是 `listchecker`，提供了一个允许访问的数组。

```yaml
apiVersion: config.istio.io/v1alpha2
kind: listchecker
metadata:
  name: whitelist
spec:
  # providerUrl: 可以从外部 URL 获取列表内容
  overrides: ["v1", "v2"]  # 静态列表
  blacklist: false
```

需要使用一个模板将 Pod 标签转换为 `listchecker` 的版本列表。

```yaml
apiVersion: config.istio.io/v1alpha2
kind: listentry
metadata:
  name: appversion
spec:
  value: source.labels["version"]
```

最后使用 Rule 进行连接：

```yaml
apiVersion: config.istio.io/v1alpha2
kind: rule
metadata:
  name: checkversion
spec:
  match: destination.labels["app"] == "ratings"
  actions:
  - handler: whitelist.listchecker
    instances:
    - appversion.listentry
```

> 注意：如果开启了 mTLS，可以使用 `source.user == "cluster.local/ns/default/sa/bookinfo-productpage"` 的形式来匹配 ServiceAccount。

## RBAC

> Helm 安装时，需要设置 `global.rbacEnabled: true`。

RBAC 提供较细粒度的访问控制。另外其中所使用的 `ServiceRole` 和 `ServiceRoleBinding` 也更直观、更加易于管理。

例如来自[官方 Task](https://istio.io/docs/tasks/security/role-based-access-control/) 的 `ServiceRole` 定义，这个角色允许对指定服务进行只读访问：

```yaml
apiVersion: "config.istio.io/v1alpha2"
kind: ServiceRole
metadata:
  name: productpage-viewer
  namespace: default
spec:
  rules:
  - services: ["productpage.default.svc.cluster.local"]
    methods: ["GET"]
```

如果在 Namespace 级别进行设置，则可以这样：

```yaml
...
  rules:
  - services: ["*"]
    methods: ["GET"]
    constraints:
    - key: "app"
      values: ["productpage"]
...
```

和 Kubernetes 的 Rolebinding 类似，把用户和角色绑定起来，才能最后生效。

例如：

```yaml
  - user: alice@yahoo.com
```

或者

```yaml
  - properties:
      service: "reviews"
      namespace: "abc"
```

> `subject` 的内容，同样属于 Adapter 模型的实现范围，因此其可选项目仍然是由 Template 的输入产生的。具体样例可以参考 [bookinfo 的 rbac 样板](https://github.com/istio/istio/blob/release-0.8/samples/bookinfo/kube/istio-rbac-enable.yaml)

## JWT 认证

没有外部认证的需求，因此就先不理了 lol。

## 参考链接

- 安全任务：https://istio.io/docs/tasks/security
- Istio RBAC 参考：https://istio.io/docs/reference/config/istio.rbac.v1alpha1/
- Istio Adapters 参考：https://istio.io/docs/reference/config/policy-and-telemetry/adapters/
- Bookinfo 示例：https://github.com/istio/istio/blob/release-0.8/samples/bookinfo/kube/

