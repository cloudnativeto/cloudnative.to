---
title: "Rego 不好用？用 Pipy 实现 OPA"
description: "本文带你如何使用 Pipy 实现策略即代码做镜像检查。"
author: "[张晓辉（Addo Zhang）](https://atbug.com)"
image: "/images/blog/opa.jpg"
categories: ["其他"]
tags: ["opa","open policy agent","policy"]
date: 2021-08-08T11:00:42+08:00
type: "post"
---

还不知道 Pipy 是什么的同学可以看下 [GitHub](https://github.com/flomesh-io/pipy) 。

> Pipy 是一个轻量级、高性能、高稳定、可编程的网络代理。Pipy 核心框架使用 C++ 开发，网络 IO 采用 ASIO 库。 Pipy 的可执行文件仅有 5M 左右，运行期的内存占用 10M 左右，因此 Pipy 非常适合做 Sidecar proxy。
> 
> Pipy 内置了自研的 pjs 作为脚本扩展，使得Pipy 可以用 JS 脚本根据特定需求快速定制逻辑与功能。
> 
> Pipy 采用了模块化、链式的处理架构，用顺序执行的模块来对网络数据块进行处理。这种简单的架构使得 Pipy 底层简单可靠，同时具备了动态编排流量的能力，兼顾了简单和灵活。通过使用 REUSE_PORT 的机制（主流 Linux 和 BSD 版本都支持该功能），Pipy 可以以多进程模式运行，使得 Pipy 不仅适用于 Sidecar 模式，也适用于大规模的流量处理场景。 在实践中，Pipy 独立部署的时候用作“软负载”，可以在低延迟的情况下，实现媲美硬件的负载均衡吞吐能力，同时具有灵活的扩展性。

在玩过几次 Pipy 并探究其工作原理后，又有了更多的想法。

* [初探可编程网关 Pipy](https://mp.weixin.qq.com/s/l8JzYRn350fjuCAOoo8pcg)
* [可编程网关 Pipy 第二弹：编程实现 Metrics 及源码解读](https://mp.weixin.qq.com/s/_IeRXp9EJnVsvDfg8tUr1A)
* [可编程网关 Pipy 第三弹：事件模型设计](https://mp.weixin.qq.com/s/iQWunpazsw86X3kEkB1rJw)

在使用OPA的时候，一直觉得Rego不是那么顺手，使用pipy js来写规则的想法油然而生。今天就一起试试这个思路。果然，不试不知道，一试发现太多的惊喜～Pipy不止于“代理”，更有很多可以适用的场景：

* 极小的单一可执行文件（single binary）使得 pipy 可能是最好的 “云原生 sidecar”
* sidecar 不仅仅是代理，还可以做控制器，做运算单元
* proxy 的串路结构适合各种管控类的操作，比如访问控制
* Pipy js 的扩展能力和快速编程能力，很适合做 “规则引擎”，或者用最近流行的说法 “云原生的规则引擎”。对比 OPA 我认为它完全够格做一个 “羽量级规则执行引擎”

现在我更倾向于定义 pipy 是一个 “云原生的流量编程框架”，代理只是其底层的核心能力，叠加了 pipy js 以后，上层可以做的事情很多，“流量滋养万物”。

在 [使用 Open Policy Agent 实现可信镜像仓库检查](https://cloudnative.to/blog/image-trusted-repository-with-open-policy-agent/) 之后，就在想 Pipy 是否一样可以做到，将内核替换成 Pipy + 规则。所以今天大部分内容和上面这篇是相似的。

来，一起看看这个“不务正业”的 Pipy 如何实现 Kubernetes 的准入控制器 来做镜像的检查。

## 环境

继续使用 minikube

```shell
minikube start
```

## 创建部署 Pipy 的命名空间

```shell
kubectl create namespace pipy 
kubens pipy
kubectl label ns pipy pipy/webhook=ignore #后面解释
```

## 规则

在 OPA 中，通过 `kube-mgmt` 容器监控 `configmap` 的改动，将 Policy 推送到同 pod 的 opa 容器中。

对于 Pipy 为了渐变，直接使用挂载的方式将保存了规则的 `configmap` 挂载到 Pipy
的容器中。

*实际的使用中，Pipy 支持轮训的方式检查控制平面中规则的变更，并实时加载；也可以实现与 OPA 的 kube-mgmt 同样的逻辑。*

实现了[上一讲功能](https://atbug.com/image-trusted-repository-with-open-policy-agent/)的 pipy 规则如下：

```shell
cat > pipy-rule.js <<EOF
pipy({
  _repoPrefix: '192.168.64.1', //192.168.64.1:5000 是笔者本地容器运行的一个私有仓库。
  _tagSuffix: ':latest',
})

.listen(6443, {
  tls: {
    cert: os.readFile('/certs/tls.crt').toString(),
    key: os.readFile('/certs/tls.key').toString(),
  },
})
  .decodeHttpRequest()
  .replaceMessage(
    msg => (
        ((req, result, invalids, reason) => (
            req = JSON.decode(msg.body),
            invalids = req.request.object.spec.containers.find(container => (
              (!container.image.startsWith(_repoPrefix) ? (
                reason = `${container.image} repo not start with ${_repoPrefix}`,
                console.log(reason),
                true
              ) : (false))
              ||
              (container.image.endsWith(_tagSuffix) ? (
                reason = `${container.image} tag end with ${_tagSuffix}`,
                console.log(reason),
                true
              ) : (false)
            ))),
            invalids != undefined ? (
              result = {
                "apiVersion": "admission.k8s.io/v1beta1",
                "kind": "AdmissionReview",
                "response": {
                    "allowed": false,
                    "uid": req.request.uid,
                    "status": {
                        "reason": reason,
                    },
                },
              }
            ) : (
              result = {
                "apiVersion": "admission.k8s.io/v1beta1",
                "kind": "AdmissionReview",
                "response": {
                    "allowed": true,
                    "uid": req.request.uid
                },
              }
            ),

            console.log(JSON.encode(result)),
            
            new Message({
              'status' : 200,
              'headers': {
                'Content-Type': 'application/json'
              }
              }, JSON.encode(result))
        ))()
    )
  )
  .encodeHttpResponse()  
EOF
```

将规则保存在 configmap 中：

```shell
kubectl create configmap pipy-rule --from-file=pipy-rule.js
```

## 在 Kubernetes 上部署 Pipy

Kubernetes 与准入控制器（[Admission Controller](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)）的通信需要使用 TLS。配置 TLS，使用 `openssl` 创建证书颁发机构（certificate authority CA）和 OPA 的证书/秘钥对。

```shell
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -days 100000 -out ca.crt -subj "/CN=admission_ca"
```

为 OPA 创建 TLS 秘钥和证书：

```shell
cat >server.conf <<EOF
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name
prompt = no
[req_distinguished_name]
CN = pipy.pipy.svc
[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth, serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = pipy.pipy.svc
EOF
```

> 注意 `CN` 和 `alt_names` 必须与后面创建 Pipy service 的匹配。

```shell
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -config server.conf
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 100000 -extensions v3_req -extfile server.conf
```

为 OPA 创建保存 TLS 凭证的 Secret：

```shell
kubectl create secret tls pipy-server --cert=server.crt --key=server.key
```

将 Pipy 部署为准入控制器（admission controller）。为了方便调试，我们使用启动 Pipy 的时候打开了控制台。


```yaml
kind: Service
apiVersion: v1
metadata:
  name: pipy
  namespace: pipy
spec:
  selector:
    app: pipy
  ports:
  - name: https
    protocol: TCP
    port: 443
    targetPort: 6443
  - name: gui # 方便调试
    protocol: TCP
    port: 6060
    targetPort: 6060
  - name: http
    protocol: TCP
    port: 6080
    targetPort: 6080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: pipy
  namespace: pipy
  name: pipy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pipy
  template:
    metadata:
      labels:
        app: pipy
      name: pipy
    spec:
      containers: 
        - name: pipy
          image: pipy:latest
          imagePullPolicy: IfNotPresent
          args:
            - "pipy"
            - "/opt/data/pipy-rule.js"
            - "--gui-port=6060" # 方便调试
            # - "--log-level=debug"
          ports:
          - name: gui
            containerPort: 6060
            protocol: TCP
          - name: http
            containerPort: 6080
            protocol: TCP  
          - name: https
            containerPort: 6443
            protocol: TCP
          volumeMounts:
            - readOnly: true
              mountPath: /certs
              name: pipy-server
            - readOnly: false
              mountPath: /opt/data
              name: pipy-rule
      volumes:
        - name: pipy-server
          secret:
            secretName: pipy-server
        - name: pipy-rule
          configMap:
            name: pipy-rule

```

暴露控制台的访问：

```shell
kubectl expose deploy pipy --name pipy-node --type NodePort
kubectl get svc pipy-port
minikube service --url pipy-node -n pipy
# 找到控制台端口
```

接下来，生成将用于将 Pipy 注册为准入控制器的 manifest。

```shell
cat > webhook-configuration.yaml <<EOF
kind: ValidatingWebhookConfiguration
apiVersion: admissionregistration.k8s.io/v1beta1
metadata:
  name: pipy-validating-webhook
webhooks:
  - name: validating-webhook.pipy.flomesh-io.cn
    namespaceSelector:
      matchExpressions:
      - key: pipy/webhook
        operator: NotIn
        values:
        - ignore
    rules:
      - operations: ["CREATE", "UPDATE"]
        apiGroups: ["*"]
        apiVersions: ["*"]
        resources: ["pods"]
    clientConfig:
      caBundle: $(cat ca.crt | base64 | tr -d '\n')
      service:
        namespace: pipy
        name: pipy
EOF
```

生成的配置文件包含 CA 证书的 base64 编码，以便可以在 Kubernetes API 服务器和 OPA 之间建立 TLS 连接。

```shell
kubectl apply -f webhook-configuration.yaml
```

## 测试

`pod-bad-repo.yaml`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: web-server
  name: web-server
  namespace: default
spec:
  containers:
  - image: nginx:1.21.1
    name: web-server
    resources: {}
  dnsPolicy: ClusterFirst
  restartPolicy: Always
status: {}
```


```shell
kubectl apply -f pod-bad-repo.yaml
Error from server (nginx:1.21.1 repo not start with 192.168.64.1): error when creating "pod-bad-repo.yaml": admission webhook "validating-webhook.pipy.flomesh-io.cn" denied the request: nginx:1.21.1 repo not start with 192.168.64.1
```

`pod-bad-tag.yaml`

```yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: web-server
  name: web-server
  namespace: default
spec:
  containers:
  - image: 192.168.64.1:5000/nginx:latest
    name: web-server
    resources: {}
  dnsPolicy: ClusterFirst
  restartPolicy: Always
status: {}
```

```shell
kubectl apply -f pod-bad-tag.yaml
Error from server (192.168.64.1:5000/nginx:latest tag end with :latest): error when creating "pod-bad-tag.yaml": admission webhook "validating-webhook.pipy.flomesh-io.cn" denied the request: 192.168.64.1:5000/nginx:latest tag end with :latest
```

`pod-ok.yaml`

```yaml
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: web-server
  name: web-server
  namespace: default
spec:
  containers:
  - image: 192.168.64.1:5000/nginx:1.21.1
    name: web-server
    resources: {}
  dnsPolicy: ClusterFirst
  restartPolicy: Always
status: {}
```

```shell
kubectl apply -f pod-ok.yaml
pod/web-server created
```

## 总结

OPA 哪哪都好，唯一缺点就是其引进的 `Rego` 语言抬高了使用的门槛。而 Pipy 的规则是通过 JavaScrip 来编写的，前端的同学一样可以完成规则的编写。完全替代可能夸张了一些，但确实在部分场景下可以替代 OPA。

玩到这里，你会发现有了规则，加上功能强大的过滤器（现在我喜欢叫他们 Hook 了），Pipy 的可玩性非常强。

比如[OPA: Kubernetes 准入控制策略 Top 5](https://mp.weixin.qq.com/s/lfU3XKP2oAPOLNkxdR2KVg)，比如...。大胆的想象吧。

想写一个系列，就叫“如何把 Pipy 玩坏”？
