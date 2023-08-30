---
title: "kubernetes dashboard 在 ssl 的各种场景下的手动部署"
date: 2019-04-17T11:23:34+08:00
draft: false
authors: ["张浩"]
summary: "本文是对 Kubernetes 的 dashboard 有关 ssl 下各个场景的相关说明。"
tags: ["kubernetes","dashboard"]
categories: ["kubernetes"]
keywords: ["Kubernetes","dashboard"]
---

> 本文转载自[zhangguanzhang 的博客](https://zhangguanzhang.github.io/2019/02/12/dashboard/)。

旨在面向新手讲解手动部署过程，本文 dashboard 的暴露不会用 nodePort（不喜欢使用它）和 apiserver 的 web proxy 代理也就是`/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/`这种。

主要讲下四种场景方式：
- 纯 dashboard http 和 https 不惨合外部证书
- openssl 证书给 dashboard 当 https
- 个人向域名使用 https 小绿锁
- ingress tls 代理 http[s]的 dashboard
以及最后讲解的如何定义带权限的 token 去利用 token 登陆 dashboard。


先要理解的一点就是 JWT（JSON Web Tokens）思想，k8s 的很多 addon 都是 pod 形式跑的，addon 的 pod 都是要连接 kube-apiserver 来操作集群来减少运维的工作量和提供方便。addon 都是 pod，pod 操作和查看集群信息需要鉴权。

为此 k8s 使用了 RBAC 的思想（RBAC 思想不是 k8s 独有的），资源对象和对声明的资源对象的操作权限组合最终落实到`ServiceAccount`上，而每个名为`name`的 sa 会关联着一个名为`name-token-xxxxx`的 secret。

可以通过 kubectl describe 命令或者 api 看这个 secret 实际上就是个 token 和一个 ca.crt。下列命令列出缺省 sa default 的 token 和整个集群的 ca.crt（jsonpath 打印的时候敏感信息是 base64 编码需要自己解码）:

```bash
kubectl get secret -o jsonpath='{range .items[?(@.metadata.annotations.kubernetes\.io/service-account\.name=="default")].data}{"token: "}{.token}{"\n\n"}{"ca.crt: "}{.ca\.crt}{"\n"}{end}'
token: ZXlKaGJHY2lPaUpGVXpVeE1pSXNJbXR................

ca.crt: LS0tLS1CRUdJTiBDRVJUS..........................
```

每个 pod 都会被 kubelet 挂载 pod 声明的 ServiceAccount 关联的 secret 的里的 ca.crt 和 token 到容器里路径`/var/run/secrets/kubernetes.io/serviceaccount`。

部署的 yaml 的话不推荐直接使用官方的 yaml，我们需要看场景修改或者删减一些东西，这里先放下官方的 yaml 链接，后面以文件讲解。同时也推荐把本文看完了后再开始部署。

`https://raw.githubusercontent.com/kubernetes/dashboard/v1.10.1/src/deploy/recommended/kubernetes-dashboard.yaml`

全文我基本都是用的`hostNetwork`和`nodeName`固定在一台上，如果对 k8s 的几种 svc 和`hostNetwork`以及`hostPort`以及`Ingress`熟悉的话可以自己决定暴露方式。
这里我是使用的下面这种方式暴露出去，也就意味着我们不需要 svc 可以删掉官方 yaml 里最后那段`Dashboard Service`，访问的话用 node 的 ip 带上端口访问即可，改成大概下面这样：

```yaml
...
    spec:
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
      containers:
      - name: kubernetes-dashboard
        image: registry.cn-hangzhou.aliyuncs.com/google_containers/kubernetes-dashboard-amd64:v1.10.1
        ...
        ...
      nodeName: k8s-m1
      volumes:
...
```


## 纯 dashboard

分为两种：http 和开 https，其中开 https 又分为使用自带的 cert 和 openssl 生成的。

### 默认自带的 https

首先说说自带的 https，镜像默认的`entrypoint`是这样：

```yaml
...
            "Entrypoint": [
                "/dashboard",
                "--insecure-bind-address=0.0.0.0",
                "--bind-address=0.0.0.0"
            ],
...
```

默认定义的容器启动参数为下面这样：

```yaml
...
        args:
          - --auto-generate-certificates
...
```

这里我宿主机的 8443 被占用了，我修改了下 dashboard 的端口，后面同理：

```yaml
...
        ports:
        - containerPort: 5443
          protocol: TCP
        command:
          - /dashboard
          - --bind-address=0.0.0.0
        args:
          - --auto-generate-certificates
          - --port=5443
...
...
        livenessProbe:
          httpGet:
            scheme: HTTPS
            path: /
            port: 5443
...
```

`--auto-generate-certificates`从字面意思看是 dashboard 自己生成 https 的证书，但是实际上如下面的图这个证书 chrome 浏览器是不认的其他浏览器不清楚，chrome 打开后在网页上是没有无视警告继续的选项，可以自行去试试看，网上也没找到添加例外只找到了全局关闭非权威 SSL 警告。不推荐这种（或者说这种完全行不通？）

![browser-cannot-continue](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/general-kubernetes-dashboard/005BYqpggy1g22j058fljj30l30grjsz.jpg)

### 使用 http

使用 http 我们要小心有几个坑！
使用 http 我们只要使用选项`--insecure-port`修改成下面即可端口不一定需要和我一样，pod 的健康检查记得把``HTTPS`改成`HTTP`：

```yaml
        ports:
        - containerPort: 5443
          protocol: TCP
        command:
          - /dashboard
          - --insecure-bind-address=0.0.0.0
        args:
          - --insecure-port=5443
...
        livenessProbe:
          httpGet:
            scheme: HTTP
            path: /
            port: 5443

```

默认 http 是不需要登陆的，所有人进去都是可以的，我们可以注意到 dashboard 默认带了一个 sa 以及一个 Role：

```yaml
# ------------------- Dashboard Role & Role Binding ------------------- #
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: kubernetes-dashboard-minimal
  namespace: kube-system
rules:
  # Allow Dashboard to create 'kubernetes-dashboard-key-holder' secret.
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["create"]
  # Allow Dashboard to create 'kubernetes-dashboard-settings' config map.
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["create"]
  # Allow Dashboard to get, update and delete Dashboard exclusive secrets.
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["kubernetes-dashboard-key-holder", "kubernetes-dashboard-certs"]
  verbs: ["get", "update", "delete"]
  # Allow Dashboard to get and update 'kubernetes-dashboard-settings' config map.
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["kubernetes-dashboard-settings"]
  verbs: ["get", "update"]
  # Allow Dashboard to get metrics from heapster.
- apiGroups: [""]
  resources: ["services"]
  resourceNames: ["heapster"]
  verbs: ["proxy"]
- apiGroups: [""]
  resources: ["services/proxy"]
  resourceNames: ["heapster", "http:heapster:", "https:heapster:"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: kubernetes-dashboard-minimal
  namespace: kube-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: kubernetes-dashboard-minimal
subjects:
- kind: ServiceAccount
  name: kubernetes-dashboard
  namespace: kube-system
```

这样绕过登陆的话所有人都是上面的权限了，所以我们得使用选项`--enable-insecure-login`开启登陆界面，最终的 args 为下面：

```yaml
...
        args:
          - --insecure-port=5443
          - --enable-insecure-login=true
...
```

这样下进去是强制让登录了，但是 token 的话（后面说这个 token 如何创建和获取）是无法登陆的，找到 issue 说通过 kubectl proxy 出去的 http 和直接暴露的 http 将无法登陆（但是实际上我测了下百度浏览器可以登录）。

- https://github.com/kubernetes/dashboard/issues/3216
- https://github.com/kubernetes/dashboard/issues/2735

但是也不是意味着完全不能用这种方法，可以 sa kubernetes-dashboard 绑定到集群角色 cluster-admin 然后外面套层 nginx 的 auth 到它，然后配置 iptables 或者网络设备 ACL 让 dashboard 只收到来源 ip 是 nginx。

## openssl 生成证书给 dashboard 当 https 证书

如果我们使用 openssl 生成证书给 dashboard 使用的话，浏览器会有跳过继续前往页面的选项，能够在内网没域名下使用，我们内网给研发搭建 dashboard 目前就是这样使用的。具体就是 openssl 命令生成证书并根据证书生成 tls 类型的 secret：

```bash
mkdir certs
openssl req -nodes -newkey rsa:2048 -keyout certs/dashboard.key -out certs/dashboard.csr -subj "/C=/ST=/L=/O=/OU=/CN=kubernetes-dashboard"
openssl x509 -req -sha256 -days 10000 -in certs/dashboard.csr -signkey certs/dashboard.key -out certs/dashboard.crt
kubectl create secret generic kubernetes-dashboard-certs --from-file=certs -n kube-system
```

这里生成 secret 后我们先分析下官方的 yaml，我们可以用命令帮助`--help`查看到 dashboard 的默认 cert-dir 是`/certs`：

```bash
$ docker run --rm -ti --entrypoint /dashboard registry.cn-hangzhou.aliyuncs.com/google_containers/kubernetes-dashboard-amd64:v1.10.1 --help | grep cert-dir
      --default-cert-dir string          Directory path containing '--tls-cert-file' and '--tls-key-file' files. Used also when auto-generating certificates flag is set. (default "/certs")
```

而且可以注意到他有个挂载：

```yaml
...
        volumeMounts:
        - name: kubernetes-dashboard-certs
          mountPath: /certs
...
...
      volumes:
      - name: kubernetes-dashboard-certs
        secret:
          secretName: kubernetes-dashboard-certs
...
```

上面挂载的 secret 也是来源于官方 yaml 里的 secret，也就说默认情况下这个 secret 是给选项`--auto-generate-certificates`使用的：

```yaml
apiVersion: v1
kind: Secret
metadata:
  labels:
    k8s-app: kubernetes-dashboard
  name: kubernetes-dashboard-certs
  namespace: kube-system
type: Opaque
```

所以我们使用 openssl 部署 dashboard 的步骤是先上面 openssl 生成证书然后导入生成 secret，然后 yaml 里删掉`Dashboard Secret`然后修改 dashboard 的运行选项：

```yaml
...
        command:
          - /dashboard
          - --bind-address=0.0.0.0
        args:
          - --auto-generate-certificates
          - --port=5443
...
```

上面为啥我开了自动生成证书的选项呢，这个选项开启时不会覆盖我们的挂载的 certs 文件的同时它还是全局 https 的开关 - -坑了我好久。


## 个人向域名使用 https 小绿锁 (有单点故障风险)

这里是通过域名+https 访问，证书的话可以买的也可以免费签署的 SSL 证书都行。
我使用的是`acme.sh + token`使用`Let’s Encrypt`签署免费的 SSL 证书，也是我个人用的。另外 acme 申请证书的时候不一定非得通配符域名
安装 acme.sh 脚本：

```bash
curl  -s https://get.acme.sh | sh
# 设置别名方便使用命令
alias acme.sh=~/.acme.sh/acme.sh
```

DNS API，阿里云需要设置 RAM 策略对应为 AliyunDNSFullAccess，然后在控制台获取 API 的 token，腾讯的话确保域名解析是 dnspod，其他的域名提供商请查看 https://github.com/Neilpang/acme.sh/wiki/dnsapi。
例如阿里的话去阿里云上生成 token 然后下面执行：

```bash
export Ali_Key="yourkey"
export Ali_Secret="yoursecret"
# 申请证书
acme.sh --issue --dns dns_ali -d *.k8s.youdomain.com
```

域名在腾讯云的话确保 nameserver 设置的是 dnspod（好像默认就是这个），我们去 dnspod 的官网上使用登陆腾讯云的账号（例如我是 qq 登陆）后在开发者 api 里开启 dnspod 的 api token。
注意 token 在创建的时候只显示一次，记得截图发给自己的时候别点错地方关了，不然得再创建个。

![tx-dns-setting](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/general-kubernetes-dashboard/005BYqpgly1g22j058335j30js0c0t9g.jpg)

![dnspod-getToken](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/general-kubernetes-dashboard/005BYqpggy1g22j0563f6j31060gcq33.jpg)

```bash
export DP_Id="1234"
export DP_Key="sADDsdasdgdsfsdfsdfasfdsfasfasfds"
acme.sh --issue --dns dns_dp -d *.zhangguanzhang.com
```

运行后会看到文件路径：

![scriptOutput](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/general-kubernetes-dashboard/005BYqpgly1g22j0598m4j31hc0n3wfi.jpg)

前面证书生成以后，接下来需要把证书 copy 到真正需要用它的地方。
注意，默认生成的证书都放在安装目录下：`~/.acme.sh/`，请不要直接使用此目录下的文件，例如：不要直接让 nginx/apache 的配置文件使用这下面的文件。这里面的文件都是内部使用，而且目录结构可能会变化。
正确的使用方法是使用`--installcert`命令，并指定目标位置，然后证书文件会被 copy 到相应的位置。
COPY 证书，安装到 `~/cert` 目录中，cert 证书使用的是 fullchain cert，keyfile 和 fullchain 的证书名字随意，自己记住就行了。

```bash
mkdir -p ~/cert
acme.sh  --installcert  -d  *.zhangguanzhang.com   \
        --key-file           ~/cert/zhangguanzhang.com.key \
        --fullchain-file     ~/cert/zhangguanzhang.com.crt
```

然后从证书创建 tls 类型的 secret：

```bash
kubectl -n kube-system create secret tls kubernetes-dashboard-certs \
  --key ~/cert/zhangguanzhang.com.key \
  --cert ~/cert/zhangguanzhang.com.crt
```

删掉官方 yaml 文件里的`Dashboard Secret`，我们发现 tls 的 secret 是下面俩文件名：

```bash
$ kubectl -n kube-system get secrets kubernetes-dashboard-certs -o yaml
apiVersion: v1
data:
  tls.crt: ....
  tls.key: ....
kind: Secret
metadata:
  name: kubernetes-dashboard-certs
  namespace: kube-system
type: kubernetes.io/tls
```

我们修改运行参数关闭 insecure 和指定使用证书文件，这里用 5443 是因为我公网 ip 没备案，如果 ip 备案了可以 5443 改成 443（记得 yaml 其他地方端口也修改下）：

```yaml
...
        command:
          - /dashboard
        args:
          - --auto-generate-certificates
          - --bind-address=0.0.0.0
          - --port=5443
          - --tls-cert-file=tls.crt
          - --tls-key-file=tls.key
...
```

创建 dashboard 后在云上的域名控制台设置解析过来，通过 https 的域名访问。

![results](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/general-kubernetes-dashboard/005BYqpgly1g22j05at9mj31560mf40n.jpg)


## Ingress Controller 使用域名证书代理 dashboard

上面直接 dashboard 使用域名证书会有单点故障，所以实际应用我们可以用高可用的 ingress nginx（详见之前的文章）来代理集群内部的 dashboard
这里我使用的是`Ingress nginx`。
如果没域名的话可以使用 openssl 生成证书：

```bash
openssl req -x509 -nodes -days 10000 -newkey rsa:2048 -keyout tls.key -out tls.crt -subj "/CN=dashboard.example.com/O=dashboard.example.com"
```

从证书创建 tls 类型的 secret：

```bash
kubectl -n kube-system create secret tls dashboard-tls \
  --key ~/cert/zhangguanzhang.com.key \
  --cert ~/cert/zhangguanzhang.com.crt
```

官方 yaml 的 deploy 数量改多个后直接使用创建即可，然后创建下面 ingress：

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: dashboard-ingress
  namespace: kube-system
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /
    #nginx.ingress.kubernetes.io/secure-backends: "true"  该注释在0.18.0中被弃用，并在0.20.0发布后被删除，使用下面
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  tls:
  - hosts:
    - dashboard.example.com
    secretName: dashboard-tls
  rules:
  - host: dashboard.example.com
    http:
      paths:
      - backend:
          serviceName: kubernetes-dashboard
          servicePort: 443
```

如果 ingress 是 tls 的，dashboard 是 http 的可以去掉上面三个 annotations（这种情况我未测试，有兴趣可以自己试试）。

## token

dashboard 登陆的话可以选择 kubeconfig 和 token，kubeconfig 一般是集群外使用的，例如管理组件之间想和 apiserver tls 下通信都得使用 kubeconfig，里面实际上就是 ca 签署的客户端证书 + 各自 CN 和 O 签署的证书。而 token 里的 ca.crt 也是客户端证书和 kubeconfig 里`client-certificate-data`的是一样的，RBAC 落实在它那个 token 字段。
很多 addon 可以看到他们的`--help`选项看到也支持 kubeconfig 的，他们的默认逻辑是没有用 kubeconfig 选项下起来的时候会去查看 secret 路径`/var/run/secrets/kubernetes.io/serviceaccount`获取 token（也就是在 pod 里运行的请求逻辑），当然也并不意味着 token 一定在集群内用可以把 secret 的 token 获取到后制作成 kubeconfig。
dashboard 登陆的 token 如果使用管理员的话可以用 rbac 绑定集群管理员角色，这也是最常见的使用方法，像 kubectl 拥有集群管理员那样。如果对 RBAC 熟悉可以单独给不用部门生成不同权限的 RBAC 取 token 给人员登陆。

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dashboard     # sa 名字随意
  namespace: kube-system
  labels:
    k8s-app: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dashboard
  namespace: ""
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole     # 权限来源于集群角色
  name: cluster-admin   # 这个是集群管理员角色名
subjects:
  - kind: ServiceAccount
    name: dashboard    # 和上面名字一样
    namespace: kube-system
```

取它 token 用于登陆 dashboard，你在 dashboard web 上操作集群的时候实际上是拿着你登陆的 token 的去以 api 调用 kube-apiserver。

使用下面命令取上面创建的 sa 的 token：

```bash
kubectl -n kube-system get secret -o jsonpath='{range .items[?(@.metadata.annotations.kubernetes\.io/service-account\.name=="dashboard")].data}{.token}{end}' | base64 -d
xxxxxxxxxxxxxx
```

最后`Let’s Encrypt`的证书是一次 3 个月，可以看脚本官方文档去定时获取新的证书然后导入 <https://github.com/Neilpang/acme.sh/wiki/%E8%AF%B4%E6%98%8E> certmanager 和 acme.sh 一样的原理去调用 api 签署域名证书，有兴趣可以去试试

## 参考：

- [TLS termination - github.com](https://github.com/kubernetes/ingress-nginx/tree/master/docs/examples/tls-termination)
- [acme.sh wiki - github.com](https://github.com/Neilpang/acme.sh/wiki/dnsapi)
- [certmanager trusted github.com](https://github.com/kubernetes/dashboard/wiki/Certificate-management#public-trusted-certificate-authority)
