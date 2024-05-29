---
title: "全手动部署 prometheus-operator 监控 Kubernetes 集群遇到的坑"
date: 2019-01-08T17:40:30+08:00
draft: false
authors: ["张浩"]
summary: "Prometheus所有的监控的agent底层最终都是查询的/proc和/sys里的信息推送，本文分享了当收集宿主机信息的agent跑在pod中时会遇到的问题。"
tags: ["kubernetes","prometheus","operator"]
categories: ["kubernetes"]
keywords: ["kubernetes","prometheus","operator"]
---

## 写这篇文章原因

所有监控的agent底层最终都是查询的/proc和/sys里的信息推送(如果错了轻喷)，因为在Kubernetes中收集宿主机信息方面也想用pod跑，会面临到问题。

常见的zabbix_agent默认读取fs的/proc和/sys，容器跑agent会导致读取的不是宿主机的/proc和/sys。

而 prometheus 的`node-exporter`有选项`--path.procfs`和`--path.sysfs`来指定从这俩选项的值的 proc 和 sys 读取，容器跑`node-exporter`只需要挂载宿主机的/proc和/sys到容器fs的某个路径挂载属性设置为readonly后用这两个选项指定即可，zabbix4.0看了文档和容器都找不到类似选项应该不支持。

虽说上 prometheus 但是 Kubernetes 监控这方面，经常看到如下问题：

- 如何部署
- 用 prometheus 的话 pod ip 会变咋整之类的
- 我的target怎么是0/0
- 官方 yaml 怎么用
- operator 和传统的 prometheus 有啥差异
- operator 相对手动部署的 prometheus 有啥优秀之处
- .....

上面问题里大多都是对 prometheus-operator 不了解的，也就是说大多不看官方文档的，这里我几个例子加介绍说说怎样部署`prometheus-operator`，和一些常见的坑。
另外网上大多是helm部署的以及管理组件是二进制下有几个target是0/0发现不了的解决办法。

需要看懂本文要具备一下知识点：

- svc 实现原理和会应用以及 svc 和 endpoint 关系
- 了解 prometheus(不是 operator 的) 工作机制
- 知道什么是 metrics(不过有了 prometheus-operator 似乎不是必须)

## 速补基础

### 什么是 metrics

前面知识点第一条都考虑到 Kubernetes 集群监控了想必都会了，第二条因为有 operator 的存在不太关心底层可能不太急需可以后面去稍微学学，第三条无论 etcd 还是 k8s 的管理组件基本都有 metrics 端口。

这里来介绍啥什么是 metrics：

例如我们要查看 etcd 的 metrics，先查看 etcd 的运行参数找到相关的值，这里我是所有参数写在一个 yml 文件里，非 yml 自行查看 systemd 文件或者运行参数找到相关参数和值即可。

```bash
[root@k8s-m1 ~]# ps aux | grep -P '/etc[d] '
root      13531  2.8  0.8 10631072 140788 ?     Ssl   2018 472:58 /usr/local/bin/etcd --config-file=/etc/etcd/etcd.config.yml
[root@k8s-m1 ~]# cat /etc/etcd/etcd.config.yml
...
listen-client-urls: 'https://172.16.0.2:2379'
...
client-transport-security:
  ca-file: '/etc/etcd/ssl/etcd-ca.pem'
  cert-file: '/etc/etcd/ssl/etcd.pem'
  key-file: '/etc/etcd/ssl/etcd-key.pem'
...
```

我们需要两部分信息：

- listen-client-urls 的 httpsurl，我这里是`https://172.16.0.2:2379`
- 允许客户端证书信息

然后使用下面的 curl，带上各自证书路径访问 https 的 url 执行

```bash
curl --cacert /etc/etcd/ssl/etcd-ca.pem --cert /etc/etcd/ssl/etcd.pem --key /etc/etcd/ssl/etcd-key.pem https://172.16.0.2:2379/metrics
```

也可以 etcd 用选项和值`--listen-metrics-urls http://interface_IP:port`设置成非 https 的 metrics 端口可以不用证书即可访问，我们会看到 etcd 的 metrics 输出信息如下：

```bash
....
grpc_server_started_total{grpc_method="RoleList"，grpc_service="etcdserverpb.Auth"，grpc_type="unary"} 0
grpc_server_started_total{grpc_method="RoleRevokePermission"，grpc_service="etcdserverpb.Auth"，grpc_type="unary"} 0
grpc_server_started_total{grpc_method="Snapshot"，grpc_service="etcdserverpb.Maintenance"，grpc_type="server_stream"} 0
grpc_server_started_total{grpc_method="Status"，grpc_service="etcdserverpb.Maintenance"，grpc_type="unary"} 0
grpc_server_started_total{grpc_method="Txn"，grpc_service="etcdserverpb.KV"，grpc_type="unary"} 259160
grpc_server_started_total{grpc_method="UserAdd"，grpc_service="etcdserverpb.Auth"，grpc_type="unary"} 0
grpc_server_started_total{grpc_method="UserChangePassword"，grpc_service="etcdserverpb.Auth"，grpc_type="unary"} 0
grpc_server_started_total{grpc_method="UserDelete"，grpc_service="etcdserverpb.Auth"，grpc_type="unary"} 0
grpc_server_started_total{grpc_method="UserGet"，grpc_service="etcdserverpb.Auth"，grpc_type="unary"} 0
grpc_server_started_total{grpc_method="UserGrantRole"，grpc_service="etcdserverpb.Auth"，grpc_type="unary"} 0
grpc_server_started_total{grpc_method="UserList"，grpc_service="etcdserverpb.Auth"，grpc_type="unary"} 0
grpc_server_started_total{grpc_method="UserRevokeRole"，grpc_service="etcdserverpb.Auth"，grpc_type="unary"} 0
grpc_server_started_total{grpc_method="Watch"，grpc_service="etcdserverpb.Watch"，grpc_type="bidi_stream"} 86
# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds.
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total 28145.45
# HELP process_max_fds Maximum number of open file descriptors.
# TYPE process_max_fds gauge
process_max_fds 65536
# HELP process_open_fds Number of open file descriptors.
# TYPE process_open_fds gauge
process_open_fds 121
# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 1.46509824e+08
# HELP process_start_time_seconds Start time of the process since unix epoch in seconds.
# TYPE process_start_time_seconds gauge
process_start_time_seconds 1.54557786888e+09
# HELP process_virtual_memory_bytes Virtual memory size in bytes.
# TYPE process_virtual_memory_bytes gauge
process_virtual_memory_bytes 1.0886217728e+10
```

同理 kube-apiserver 也有 metrics 信息

```bash
$ kubectl get --raw /metrics
...
rest_client_request_latency_seconds_bucket{url="https://[::1]:6443/apis?timeout=32s"，verb="GET"，le="0.512"} 39423
rest_client_request_latency_seconds_bucket{url="https://[::1]:6443/apis?timeout=32s"，verb="GET"，le="+Inf"} 39423
rest_client_request_latency_seconds_sum{url="https://[::1]:6443/apis?timeout=32s"，verb="GET"} 24.781942557999795
rest_client_request_latency_seconds_count{url="https://[::1]:6443/apis?timeout=32s"，verb="GET"} 39423
# HELP rest_client_requests_total Number of HTTP requests， partitioned by status code， method， and host.
# TYPE rest_client_requests_total counter
rest_client_requests_total{code="200"，host="[::1]:6443"，method="GET"} 2.032031e+06
rest_client_requests_total{code="200"，host="[::1]:6443"，method="PUT"} 1.106921e+06
rest_client_requests_total{code="201"，host="[::1]:6443"，method="POST"} 38
rest_client_requests_total{code="401"，host="[::1]:6443"，method="GET"} 17378
rest_client_requests_total{code="404"，host="[::1]:6443"，method="GET"} 3.546509e+06
rest_client_requests_total{code="409"，host="[::1]:6443"，method="POST"} 29
rest_client_requests_total{code="409"，host="[::1]:6443"，method="PUT"} 20
rest_client_requests_total{code="422"，host="[::1]:6443"，method="POST"} 1
rest_client_requests_total{code="503"，host="[::1]:6443"，method="GET"} 5
# HELP ssh_tunnel_open_count Counter of ssh tunnel total open attempts
# TYPE ssh_tunnel_open_count counter
ssh_tunnel_open_count 0
# HELP ssh_tunnel_open_fail_count Counter of ssh tunnel failed open attempts
# TYPE ssh_tunnel_open_fail_count counter
ssh_tunnel_open_fail_count 0
```

这种就是 prometheus 的定义的 metrics 格式规范，缺省是在 http(s) 的 url 的/metrics 输出。
而 metrics 要么程序定义输出 (模块或者自定义开发)，要么用官方的各种 exporter(node-exporter，mysqld-exporter，memcached_exporter...) 采集要监控的信息占用一个 web 端口然后输出成 metrics 格式的信息，prometheus server 去收集各个 target 的 metrics 存储起来 (tsdb)。
用户可以在 prometheus 的 http 页面上用 promQL(prometheus 的查询语言) 或者 (grafana 数据来源就是用)api 去查询一些信息，也可以利用 pushgateway 去统一采集然后 prometheus 从 pushgateway 采集 (所以 pushgateway 类似于 zabbix 的 proxy)，prometheus 的工作架构如下图：

![](006tNc79ly1fyzbj3vh0vj30ms0db406.jpg)

### 为什么需要 prometheus-operator

因为是 prometheus 主动去拉取的，所以在 k8s 里 pod 因为调度的原因导致 pod 的 ip 会发生变化，人工不可能去维持，自动发现有基于 DNS 的，但是新增还是有点麻烦。

Prometheus-operator 的本职就是一组用户自定义的 CRD 资源以及 Controller 的实现，Prometheus Operator 这个 controller 有 RBAC 权限下去负责监听这些自定义资源的变化，并且根据这些资源的定义自动化的完成如 Prometheus Server 自身以及配置的自动化管理工作。

在 Kubernetes 中我们使用 Deployment、DamenSet、StatefulSet 来管理应用 Workload，使用 Service、Ingress 来管理应用的访问方式，使用 ConfigMap 和 Secret 来管理应用配置。我们在集群中对这些资源的创建，更新，删除的动作都会被转换为事件 (Event)，Kubernetes 的 Controller Manager 负责监听这些事件并触发相应的任务来满足用户的期望。这种方式我们成为声明式，用户只需要关心应用程序的最终状态，其它的都通过 Kubernetes 来帮助我们完成，通过这种方式可以大大简化应用的配置管理复杂度。

而除了这些原生的 Resource 资源以外，Kubernetes 还允许用户添加自己的自定义资源 (Custom Resource)。并且通过实现自定义 Controller 来实现对 Kubernetes 的扩展，不需要用户去二开 k8s 也能达到给 k8s 添加功能和对象。

因为 svc 的负载均衡，所以在 K8S 里监控 metrics 基本最小单位都是一个 svc 背后的 pod 为 target，所以 prometheus-operator 创建了对应的 CRD: `kind: ServiceMonitor` ，创建的`ServiceMonitor`里声明需要监控选中的 svc 的 label 以及 metrics 的 url 路径的和 namespaces 即可。

工作架构如下图所示。

![](006tNc79ly1fyzbjl4ql8j31dw0t2djs.jpg)

## Demo 部署学习

### 获取相关文件

先获取相关文件后面跟着文件来讲，直接用 git 客户端拉取即可，不过文件大概 30 多 M，没梯子基本拉不下来。

```bash
git clone https://github.com/coreos/prometheus-operator.git
```

拉取不下来可以在<a href="https://www.katacoda.com/courses/kubernetes">katacoda 的网页</a>上随便一个课程的机器都有 docker 客户端，可以 git clone 下来后把文件构建进一个 alpine 镜像然后推到 dockerhub 上，再在自己的机器 docker run 这个镜像的时候 docker cp 到宿主机上。

Prometheus Operator 引入的自定义资源包括：

- Prometheus
- ServiceMonitor
- Alertmanager

用户创建了 prometheus-operator(也就是上面监听三个 CRD 的各种事件的 controller) 后，用户可以利用`kind: Prometheus`这种声明式创建对应的资源。
下面我们部署简单的例子学习 prometheus-operator

### 创建 prometheus-operator 的 pod

拉取到文件后我们先创建 prometheus-operator：

```bash
$ cd prometheus-operator
$ kubectl apply -f bundle.yaml
clusterrolebinding.rbac.authorization.k8s.io/prometheus-operator created
clusterrole.rbac.authorization.k8s.io/prometheus-operator created
deployment.apps/prometheus-operator created
serviceaccount/prometheus-operator created
```

确认 pod 运行，以及我们可以发现 operator 的 pod 在有 RBAC 下创建了一个 APIService：

```bash
$ kubectl get pod
NAME                                   READY     STATUS    RESTARTS   AGE
prometheus-operator-6db8dbb7dd-djj6s   1/1       Running   0          1m
$ kubectl get APIService | grep monitor
v1.monitoring.coreos.com               2018-10-09T10:49:47Z
```

查看这个 APISerivce

```bash
$ kubectl get --raw /apis/monitoring.coreos.com/v1
{
  "kind": "APIResourceList"，
  "apiVersion": "v1"，
  "groupVersion": "monitoring.coreos.com/v1"，
  "resources": [
    {
      "name": "alertmanagers"，
      "singularName": "alertmanager"，
      "namespaced": true，
      "kind": "Alertmanager"，
      "verbs": [
        "delete"，
        "deletecollection"，
        "get"，
        "list"，
        "patch"，
        "create"，
        "update"，
        "watch"
      ]
    }，
    {
      "name": "prometheuses"，
      "singularName": "prometheus"，
      "namespaced": true，
      "kind": "Prometheus"，
      "verbs": [
        "delete"，
        "deletecollection"，
        "get"，
        "list"，
        "patch"，
        "create"，
        "update"，
        "watch"
      ]
    }，
    {
      "name": "servicemonitors"，
      "singularName": "servicemonitor"，
      "namespaced": true，
      "kind": "ServiceMonitor"，
      "verbs": [
        "delete"，
        "deletecollection"，
        "get"，
        "list"，
        "patch"，
        "create"，
        "update"，
        "watch"
      ]
    }，
    {
      "name": "prometheusrules"，
      "singularName": "prometheusrule"，
      "namespaced": true，
      "kind": "PrometheusRule"，
      "verbs": [
        "delete"，
        "deletecollection"，
        "get"，
        "list"，
        "patch"，
        "create"，
        "update"，
        "watch"
      ]
    }
  ]
}
```

这个是因为 bundle.yml 里有如下的`CLusterRole`和对应的`ClusterRoleBinding`来让 prometheus-operator 有权限对`monitoring.coreos.com`这个 apiGroup 里的这些 CRD 进行所有操作

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus-operator
rules:
- apiGroups:
  - apiextensions.k8s.io
  resources:
  - customresourcedefinitions
  verbs:
  - '*'
- apiGroups:
  - monitoring.coreos.com
  resources:
  - alertmanagers
  - prometheuses
  - prometheuses/finalizers
  - alertmanagers/finalizers
  - servicemonitors
  - prometheusrules
  verbs:
  - '*'
```

同时我们查看到 pod 里的 log 发现 operator 也在集群里创建了对应的 CRD

```bash
$ kubectl logs prometheus-operator-6db8dbb7dd-dkhxc
ts=2018-10-09T11:21:09.389340424Z caller=main.go:165 msg="Starting Prometheus Operator version '0.26.0'."
level=info ts=2018-10-09T11:21:09.491464524Z caller=operator.go:377 component=prometheusoperator msg="connection established" cluster-version=v1.11.3
level=info ts=2018-10-09T11:21:09.492679498Z caller=operator.go:209 component=alertmanageroperator msg="connection established" cluster-version=v1.11.3
level=info ts=2018-10-09T11:21:12.085147219Z caller=operator.go:624 component=alertmanageroperator msg="CRD created" crd=Alertmanager
level=info ts=2018-10-09T11:21:12.085265548Z caller=operator.go:1420 component=prometheusoperator msg="CRD created" crd=Prometheus
level=info ts=2018-10-09T11:21:12.099210714Z caller=operator.go:1420 component=prometheusoperator msg="CRD created" crd=ServiceMonitor
level=info ts=2018-10-09T11:21:12.118721976Z caller=operator.go:1420 component=prometheusoperator msg="CRD created" crd=PrometheusRule
level=info ts=2018-10-09T11:21:15.182780757Z caller=operator.go:225 component=alertmanageroperator msg="CRD API endpoints ready"
level=info ts=2018-10-09T11:21:15.383456425Z caller=operator.go:180 component=alertmanageroperator msg="successfully synced all caches"
$ kubectl get crd
NAME                                    CREATED AT
alertmanagers.monitoring.coreos.com     2018-10-09T11:21:11Z
prometheuses.monitoring.coreos.com      2018-10-09T11:21:11Z
prometheusrules.monitoring.coreos.com   2018-10-09T11:21:12Z
servicemonitors.monitoring.coreos.com   2018-10-09T11:21:12Z
```

### 相关 CRD 介绍

这四个 CRD 作用如下

- <span style="font-size: 1.2em;color: #333;font-weight:bold">Prometheus</span>: 由 Operator 依据一个自定义资源`kind: Prometheus`类型中，所描述的内容而部署的 Prometheus Server 集群，可以将这个自定义资源看作是一种特别用来管理 Prometheus Server 的 StatefulSets 资源。
- <span style="font-size: 1.2em;color: #333;font-weight:bold">ServiceMonitor</span>: 一个 Kubernetes 自定义资源 (和`kind: Prometheus`一样是 CRD)，该资源描述了 Prometheus Server 的 Target 列表，Operator 会监听这个资源的变化来动态的更新 Prometheus Server 的 Scrape targets 并让 prometheus server 去 reload 配置 (prometheus 有对应 reload 的 http 接口`/-/reload`)。而该资源主要通过 Selector 来依据 Labels 选取对应的 Service 的 endpoints，并让 Prometheus Server 通过 Service 进行拉取（拉）指标资料 (也就是 metrics 信息)，metrics 信息要在 http 的 url 输出符合 metrics 格式的信息，ServiceMonitor 也可以定义目标的 metrics 的 url。
- <span style="font-size: 1.2em;color: #333;font-weight:bold">Alertmanager</span>：Prometheus Operator 不只是提供 Prometheus Server 管理与部署，也包含了 AlertManager，并且一样通过一个 `kind: Alertmanager` 自定义资源来描述信息，再由 Operator 依据描述内容部署 Alertmanager 集群。
- <span style="font-size: 1.2em;color: #333;font-weight:bold">PrometheusRule</span>:对于 Prometheus 而言，在原生的管理方式上，我们需要手动创建 Prometheus 的告警文件，并且通过在 Prometheus 配置中声明式的加载。而在 Prometheus Operator 模式中，告警规则也编程一个通过 Kubernetes API 声明式创建的一个资源。告警规则创建成功后，通过在 Prometheus 中使用想 servicemonitor 那样用`ruleSelector`通过 label 匹配选择需要关联的 PrometheusRule 即可。

### 部署 kind: Prometheus

现在我们有了 prometheus 这个 CRD，我们部署一个 prometheus server 只需要如下声明即可。

```bash
$ cat<<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
---
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: prometheus
spec:
  serviceMonitorSelector:
    matchLabels:
      team: frontend
  serviceAccountName: prometheus
  resources:
    requests:
      memory: 400Mi
EOF
```

因为负载均衡，一个 svc 下的一组 pod 是监控的最小单位，要监控一个 svc 的 metrics 就声明创建一个`servicemonitors`即可。

### 部署一组 pod 及其 svc

首先，我们部署一个带 metrics 输出的简单程序的 deploy，该镜像里的主进程会在 8080 端口上输出 metrics 信息。

```bash
$ cat<<EOF | kubectl apply -f -
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: example-app
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: example-app
    spec:
      containers:
      - name: example-app
        image: zhangguanzhang/instrumented_app
        ports:
        - name: web
          containerPort: 8080
EOF
```

创建对应的 svc。

```bash
$ cat<<EOF | kubectl apply -f -
kind: Service
apiVersion: v1
metadata:
  name: example-app
  labels:
    app: example-app
spec:
  selector:
    app: example-app
  ports:
  - name: web
    port: 8080
EOF
```

### 部署 kind: ServiceMonitor

现在创建一个`ServiceMonitor`来告诉 prometheus server 需要监控带有 label `app: example-app`的 svc 背后的一组 pod 的 metrics。

```bash
$ cat<<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: example-app
  labels:
    team: frontend
spec:
  selector:
    matchLabels:
      app: example-app
  endpoints:
  - port: web
EOF
```

默认情况下`ServiceMonitor`和监控对象必须是在相同 Namespace 下的，如果要关联非同 ns 下需要下面这样设置值。

```yaml
spec:
  namespaceSelector:
    matchNames:
    - target_ns_name
```

如果希望 ServiceMonitor 可以关联任意命名空间下的标签，则通过以下方式定义：

```yaml
spec:
  namespaceSelector:
    any: true
```

如果需要监控的 Target 对象启用了 BasicAuth 认证，那在定义 ServiceMonitor 对象时，可以使用 endpoints 配置中定义 basicAuth 如下所示 basicAuth 中的`password`和`username`值来源于同 ns 下的一个名为`basic-auth`的 Secret。

```yaml
spec
  endpoints:
  - basicAuth:
      password:
        name: basic-auth
        key: password
      username:
        name: basic-auth
        key: user
    port: web
---
apiVersion: v1
kind: Secret
metadata:
  name: basic-auth
type: Opaque
data:
  user: dXNlcgo= # base64 编码后的用户名
  password: cGFzc3dkCg== # base64 编码后的密码
```

上面要注意的是我创建 prometheus server 的时候有如下值。

```yaml
  serviceMonitorSelector:
    matchLabels:
      team: frontend
```

该值字面意思可以知道就是指定 prometheus server 去选择哪些`ServiceMonitor`，这个概念和 svc 去选择 pod 一样，可能一个集群跑很多 prometheus server 来监控各自选中的`ServiceMonitor`，如果想一个 prometheus server 监控所有的则`spec.serviceMonitorSelector: {}`为空即可，而 namespaces 的范围同样的设置`spec.serviceMonitorSelector: {}`，后面官方的 prometheus 实例里我们可以看到设置了这两个值。

给 prometheus server 设置相关的 RBAC 权限。

```bash
$ cat<<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRole
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources:
  - nodes
  - services
  - endpoints
  - pods
  verbs: ["get"， "list"， "watch"]
- apiGroups: [""]
  resources:
  - configmaps
  verbs: ["get"]
- nonResourceURLs: ["/metrics"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: prometheus
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: prometheus
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: default
EOF
```

创建 svc 使用`NodePort`方便我们访问 prometheus 的 web 页面，生产环境不建议使用`NodePort`。

```bash
$ cat<<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: prometheus
spec:
  type: NodePort
  ports:
  - name: web
    nodePort: 30900
    port: 9090
    protocol: TCP
    targetPort: web
  selector:
    prometheus: prometheus
EOF
```

打开浏览器访问`ip:30900`进入 target 发现已经监听起来了，对应的 config 里也有配置生成和导入。

![](006tNc79ly1fyzbkz9djqj314c0fv41z.jpg)

![](006tNc79ly1fyzblkgpcnj30r80q8juf.jpg)

先清理掉上面的，然后我们使用官方提供的全套 yaml 正式部署`prometheus-operator`。

```bash
kubectl delete svc prometheus example-app
kubectl delete ClusterRoleBinding prometheus 
kubectl delete ClusterRole prometheus
kubectl delete ServiceMonitor example-app
kubectl delete deploy example-app
kubectl delete  sa prometheus
kubectl delete prometheus prometheus
kubectl delete -f bundle.yaml
```

## 部署官方的 prometheus-operator

### 分类文件

官方把所有文件都放在一起，这里我分类下。

```bash
cd contrib/kube-prometheus/manifests/
mkdir -p operator node-exporter alertmanager grafana kube-state-metrics prometheus serviceMonitor adapter
mv *-serviceMonitor* serviceMonitor/
mv 0prometheus-operator* operator/
mv grafana-* grafana/
mv kube-state-metrics-* kube-state-metrics/
mv alertmanager-* alertmanager/
mv node-exporter-* node-exporter/
mv prometheus-adapter* adapter/
mv prometheus-* prometheus/
$ ll
total 40
drwxr-xr-x 9 root root 4096 Jan  6 14:19 ./
drwxr-xr-x 9 root root 4096 Jan  6 14:15 ../
-rw-r--r-- 1 root root   60 Jan  6 14:15 00namespace-namespace.yaml
drwxr-xr-x 3 root root 4096 Jan  6 14:19 adapter/
drwxr-xr-x 3 root root 4096 Jan  6 14:19 alertmanager/
drwxr-xr-x 2 root root 4096 Jan  6 14:17 grafana/
drwxr-xr-x 2 root root 4096 Jan  6 14:17 kube-state-metrics/
drwxr-xr-x 2 root root 4096 Jan  6 14:18 node-exporter/
drwxr-xr-x 2 root root 4096 Jan  6 14:17 operator/
drwxr-xr-x 2 root root 4096 Jan  6 14:19 prometheus/
drwxr-xr-x 2 root root 4096 Jan  6 14:17 serviceMonitor/
```

### 部署 operator

先创建 ns 和 operator，quay.io 仓库拉取慢，可以使用我脚本拉取，其他镜像也可以这样去拉，不过在 apply 之前才能拉，一旦被 docker 接手拉取就只能漫长等。

```bash
kubectl apply -f .
curl -s https://zhangguanzhang.github.io/bash/pull.sh | bash -s -- quay.io/coreos/prometheus-operator:v0.26.0
kubectl apply -f operator/
```

确认状态运行正常再往后执行，这里镜像是 quay.io 仓库的可能会很慢耐心等待或者自行修改成能拉取到的。

```bash
$ kubectl -n monitoring get pod
NAME                                   READY     STATUS    RESTARTS   AGE
prometheus-operator-56954c76b5-qm9ww   1/1       Running   0          24s
```

### 部署整套 CRD

创建相关的 CRD，这里镜像可能也要很久。

```bash
kubectl apply -f adapter/
kubectl apply -f alertmanager/
kubectl apply -f node-exporter/
kubectl apply -f kube-state-metrics/
kubectl apply -f grafana/
kubectl apply -f prometheus/
kubectl apply -f serviceMonitor/
```

可以通过 get 查看整体状态，这里镜像原因会等待很久，我们可以先往后看几个坑的地方。

```bash
kubectl -n monitoring get all
```

### 常见坑的说明和解决方法

#### 坑一

![](006tNc79ly1fyzbmiknc2j30vc07n0u2.jpg)
这里要注意有一个坑，二进制部署 k8s 管理组件和新版本 kubeadm 部署的都会发现在 prometheus server 的页面上发现`kube-controller`和`kube-schedule`的target为0/0也就是上图所示。这是因为serviceMonitor是根据label去选取svc的，我们可以看到对应的`serviceMonitor`是选取的 ns 范围是`kube-system`。

```bash
$ grep -2 selector serviceMonitor/prometheus-serviceMonitorKube*
serviceMonitor/prometheus-serviceMonitorKubeControllerManager.yaml-    matchNames:
serviceMonitor/prometheus-serviceMonitorKubeControllerManager.yaml-    - kube-system
serviceMonitor/prometheus-serviceMonitorKubeControllerManager.yaml:  selector:
serviceMonitor/prometheus-serviceMonitorKubeControllerManager.yaml-    matchLabels:
serviceMonitor/prometheus-serviceMonitorKubeControllerManager.yaml-      k8s-app: kube-controller-manager
--
serviceMonitor/prometheus-serviceMonitorKubelet.yaml-    matchNames:
serviceMonitor/prometheus-serviceMonitorKubelet.yaml-    - kube-system
serviceMonitor/prometheus-serviceMonitorKubelet.yaml:  selector:
serviceMonitor/prometheus-serviceMonitorKubelet.yaml-    matchLabels:
serviceMonitor/prometheus-serviceMonitorKubelet.yaml-      k8s-app: kubelet
--
serviceMonitor/prometheus-serviceMonitorKubeScheduler.yaml-    matchNames:
serviceMonitor/prometheus-serviceMonitorKubeScheduler.yaml-    - kube-system
serviceMonitor/prometheus-serviceMonitorKubeScheduler.yaml:  selector:
serviceMonitor/prometheus-serviceMonitorKubeScheduler.yaml-    matchLabels:
serviceMonitor/prometheus-serviceMonitorKubeScheduler.yaml-      k8s-app: kube-scheduler
```

而 kube-system 里默认只有这俩 svc，且没有符合上面的 label。

```bash
$ kubectl -n kube-system get svc
NAME                      TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)         AGE
kube-dns                  ClusterIP   10.96.0.10   <none>        53/UDP，53/TCP   139m
kubelet                   ClusterIP   None         <none>        10250/TCP       103m
```

但是却有对应的 ep(没有带任何 label) 被创建，这点想不通官方什么鬼操作，另外这里没有 kubelet 的 ep，我博客部署的二进制的话会有。

```bash
$ kubectl get ep -n kube-system
NAME                      ENDPOINTS                                                AGE
kube-controller-manager   <none>                                                   139m
kube-dns                  10.244.1.2:53，10.244.8.10:53，10.244.1.2:53 + 1 more...   139m
kube-scheduler            <none>                                                   139m
```

#### 解决办法

所以这里我们创建两个管理组建的 svc，名字无所谓，关键是 svc 的 label 要能被 servicemonitor 选中，svc 的选择器的 label 是因为 kubeadm 的 staticPod 的 label 是这样，如果是二进制部署的这俩 svc 的 selector 部分不能要。

```yaml
apiVersion: v1
kind: Service
metadata:
  namespace: kube-system
  name: kube-controller-manager
  labels:
    k8s-app: kube-controller-manager
spec:
  selector:
    component: kube-controller-manager
  type: ClusterIP
  clusterIP: None
  ports:
  - name: http-metrics
    port: 10252
    targetPort: 10252
    protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  namespace: kube-system
  name: kube-scheduler
  labels:
    k8s-app: kube-scheduler
spec:
  selector:
    component: kube-scheduler
  type: ClusterIP
  clusterIP: None
  ports:
  - name: http-metrics
    port: 10251
    targetPort: 10251
    protocol: TCP
```

二进制的话需要我们手动填入 svc 对应的 ep 的属性，我集群是 HA 的，所有有三个，仅供参考，别傻傻得照抄，另外这个 ep 的名字得和上面的 svc 的名字和属性对应上：

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  labels:
    k8s-app: kube-controller-manager
  name: kube-controller-manager
  namespace: kube-system
subsets:
- addresses:
  - ip: 172.16.0.2
  - ip: 172.16.0.7
  - ip: 172.16.0.8
  ports:
  - name: http-metrics
    port: 10252
    protocol: TCP
---
apiVersion: v1
kind: Endpoints
metadata:
  labels:
    k8s-app: kube-scheduler
  name: kube-scheduler
  namespace: kube-system
subsets:
- addresses:
  - ip: 172.16.0.2
  - ip: 172.16.0.7
  - ip: 172.16.0.8
  ports:
  - name: http-metrics
    port: 10251
    protocol: TCP
```

这里不知道为啥 kubeadm 部署的没有 kubelet 这个 ep，我博客二进制部署后是会有 kubelet 这个 ep 的 (好像 metrics server 创建的)，下面仅供参考，IP 根据实际写。另外 kubeadm 部署下 kubelet 的 readonly 的 metrics 端口 (默认是 10255) 不会开放可以删掉 ep 的那部分 port：

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  labels:
    k8s-app: kubelet
  name: kubelet
  namespace: kube-system
subsets:
- addresses:
  - ip: 172.16.0.14
    targetRef:
      kind: Node
      name: k8s-n2
  - ip: 172.16.0.18
    targetRef:
      kind: Node
      name: k8s-n3
  - ip: 172.16.0.2
    targetRef:
      kind: Node
      name: k8s-m1
  - ip: 172.16.0.20
    targetRef:
      kind: Node
      name: k8s-n4
  - ip: 172.16.0.21
    targetRef:
      kind: Node
      name: k8s-n5
  ports:
  - name: http-metrics
    port: 10255
    protocol: TCP
  - name: cadvisor
    port: 4194
    protocol: TCP
  - name: https-metrics
    port: 10250
    protocol: TCP
```

至于 prometheus server 的服务访问，别再用效率不行的`NodePort`了，上 ingress controller 吧，怎么部署参照我博客<a href="https://zhangguanzhang.github.io/2018/10/06/IngressController/">IngressController</a>。

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: prometheus-ing
  namespace: monitoring
spec:
  rules:
  - host: prometheus.monitoring.k8s.local
    http:
      paths:
      - backend:
          serviceName: prometheus-k8s
          servicePort: 9090
---
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: grafana-ing
  namespace: monitoring
spec:
  rules:
  - host: grafana.monitoring.k8s.local
    http:
      paths:
      - backend:
          serviceName: grafana
          servicePort: 3000
---
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: alertmanager-ing
  namespace: monitoring
spec:
  rules:
  - host: alertmanager.monitoring.k8s.local
    http:
      paths:
      - backend:
          serviceName: alertmanager-main
          servicePort: 9093
```

#### 坑二

访问 prometheus server 的 web 页面我们发现即使创建了 svc 和注入对应 ep 的信息在 target 页面发现 prometheus server 请求被拒绝。

![](006tNc79ly1fyzbmvpd9bj31g80jndlf.jpg)

在宿主机上我们发现 127.0.0.1 才能访问，网卡 ip 不能访问 (这里是另一个环境找的，所以 ip 是 192 不是前面的 172)

```bash
$ hostname -i
192.168.15.223
$ curl -I http://192.168.15.223:10251/metrics
curl: (7) Failed connect to 192.168.15.223:10251; Connection refused
$ curl -I http://127.0.0.1:10251/metrics
HTTP/1.1 200 OK
Content-Length: 30349
Content-Type: text/plain; version=0.0.4
Date: Mon， 07 Jan 2019 13:33:50 GMT
```

#### 解决办法

修改管理组件 bind 的 ip。

如果使用 kubeadm 启动的集群，初始化时的 config.yml 里可以加入如下参数

```yaml
controllerManagerExtraArgs:
  address: 0.0.0.0
schedulerExtraArgs:
  address: 0.0.0.0
```

已经启动后的使用下面命令更改就会滚动更新

```bash
sed -ri '/--address/s#=.+#=0.0.0.0#' /etc/kubernetes/manifests/kube-*
```

二进制的话查看是不是 bind 的 0.0.0.0 如果不是就修改成 0.0.0.0，多块网卡如果只想 bind 一个网卡就写对应的主机上的网卡 ip，写 0.0.0.0 就会监听所有网卡的对应端口。

### 访问相关页面

通过浏览器查看`prometheus.monitoring.k8s.local`与`grafana.monitoring.k8s.local`是否正常，若沒问题就可以看到下图结果，grafana 初始用股名和密码是 admin。

![](006tNc79ly1fyzbnfx054j31l40u0qaw.jpg)

![](006tNc79ly1fyzbnrpze3j31hc0q2dke.jpg)

## 最后

可以多看看官方写的 yaml，里面有更多的字段没介绍可以看 yaml 来了解。

## 参考文档

- https://github.com/coreos/prometheus-operator/tree/master/Documentation
- https://github.com/coreos/prometheus-operator/tree/master/contrib/kube-prometheus
- https://coreos.com/operators/prometheus/docs/latest/user-guides/getting-started.html
