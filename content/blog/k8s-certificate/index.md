---
title: "一文带你彻底厘清 Kubernetes 中的证书工作机制"
summary: "在本文中，我将试图以一种比官方文档更容易理解的方式来说明 Kubernetes 和证书（Certificate）相关的工作机制，如果你也存在这方面的疑惑，希望这篇文章对你有所帮助。"
authors: ["赵化冰"]
categories: ["Kubernetes"]
tags: ["Kubernetes"]
date: 2020-05-21T06:00:00+08:00
---

接触 Kubernetes 以来，我经常看到 Kubernetes 在不同的地方使用了证书（Certificate），在 Kubernetes 安装和组件启动参数中也需要配置大量证书相关的参数。但是 Kubernetes 的文档在解释这些证书的工作机制方面做得并不是太好。经过大量的相关阅读和分析工作后，我基本弄清楚了 Kubernetes 中证书的使用方式。在本文中，我将试图以一种比官方文档更容易理解的方式来说明 Kubernetes 证书相关的工作机制，如果你也存在这方面的疑惑，希望这篇文章对你有所帮助。

## Kubernetes 组件的认证方式

首先让我们来看一下 Kubernetes 中的组件：在 Kubernetes 中包含多个以独立进程形式运行的组件，这些组件之间通过 HTTP/gRPC 相互通信，以协同完成集群中应用的部署和管理工作。

![components-of-kubernetes.png](https://zhaohuabing.com/img/2020-05-19-k8s-certificate/components-of-kubernetes.png)
kubernetes 组件，图片来源[kubernetes.io](https://kubernetes.io/zh/docs/concepts/overview/components/)

从图中可以看到，Kubernetes 控制平面中包含了 etcd，kube-api-server，kube-scheduler，kube-controller-manager 等组件，这些组件会相互进行远程调用，例如 kube-api-server 会调用 etcd 接口存储数据，kube-controller-manager 会调用 kube-api-server 接口查询集群中的对象状态；同时，kube-api-server 也会和在工作节点上的 kubelet 和 kube-proxy 进行通信，以在工作节点上部署和管理应用。

以上这些组件之间的相互调用都是通过网络进行的。在进行网络通信时，通信双方需要验证对方的身份，以避免恶意第三方伪造身份窃取信息或者对系统进行攻击。为了相互验证对方的身份，通信双方中的任何一方都需要做下面两件事情：

* 向对方提供标明自己身份的一个证书
* 验证对方提供的身份证书是否合法，是否伪造的？

在 Kubernetes 中使用了数字证书来提供身份证明，我们可以把数字证书简单理解为我们在日常生活中使用的“身份证”，上面标注了证书拥有者的身份信息，例如名称，所属组织机构等。为了保证证书的权威性，会采用一个通信双方都信任的 CA（证书机构，Certificate Authority）来颁发证书。这就类似于现实生活中颁发“身份证”的政府机构。数字证书中最重要的内容实际上是证书拥有者的公钥，该公钥代表了用户的身份。本文假设读者已经了解数字证书和 CA 的基本原理，如果你对此不太清楚，或者希望重新温习一下相关知识，可以先阅读一下这篇文章[《数字证书原理》](https://zhaohuabing.com/post/2020-03-19-pki)。

![](https://zhaohuabing.com/img/2020-05-19-k8s-certificate/ca.png)<br>
CA （证书机构），图片来源[www.trustauth.cn](https://www.trustauth.cn/ca-question/1791.html)

在 Kubernetes 的组件之间进行通信时，数字证书的验证是在协议层面通过 TLS 完成的，除了需要在建立通信时提供相关的证书和密钥外，在应用层面并不需要进行特殊处理。采用 TLS 进行验证有两种方式：

* 服务器单向认证：只需要服务器端提供证书，客户端通过服务器端证书验证服务的身份，但服务器并不验证客户端的身份。这种情况一般适用于对 Internet 开放的服务，例如搜索引擎网站，任何客户端都可以连接到服务器上进行访问，但客户端需要验证服务器的身份，以避免连接到伪造的恶意服务器。
* 双向 TLS 认证：除了客户端需要验证服务器的证书，服务器也要通过客户端证书验证客户端的身份。这种情况下服务器提供的是敏感信息，只允许特定身份的客户端访问。

在 Kubernetes 中，各个组件提供的接口中包含了集群的内部信息。如果这些接口被非法访问，将影响集群的安全，因此组件之间的通信需要采用双向 TLS 认证。即客户端和服务器端都需要验证对方的身份信息。在两个组件进行双向认证时，会涉及到下面这些证书相关的文件：

* 服务器端证书：服务器用于证明自身身份的数字证书，里面主要包含了服务器端的公钥以及服务器的身份信息。
* 服务器端私钥：服务器端证书中包含的公钥所对应的私钥。公钥和私钥是成对使用的，在进行 TLS 验证时，服务器使用该私钥来向客户端证明自己是服务器端证书的拥有者。
* 客户端证书：客户端用于证明自身身份的数字证书，里面主要包含了客户端的公钥以及客户端的身份信息。
* 客户端私钥：客户端证书中包含的公钥所对应的私钥，同理，客户端使用该私钥来向服务器端证明自己是客户端证书的拥有者。
* 服务器端 CA 根证书：签发服务器端证书的 CA 根证书，客户端使用该 CA 根证书来验证服务器端证书的合法性。
* 客户端 CA 根证书：签发客户端证书的 CA 根证书，服务器端使用该 CA 根证书来验证客户端证书的合法性。

下面这张来自[The magic of TLS, X509 and mutual authentication explained](https://medium.com/sitewards/the-magic-of-tls-x509-and-mutual-authentication-explained-b2162dec4401) 文章中的图形象地解释了双向 TLS 认证的原理。如果你需要了解更多关于 TLS 认证的原理，可以阅读一下 medium 上的原文。

![](https://zhaohuabing.com/img/2020-05-19-k8s-certificate/mutual-tls.png)

图片来源[The magic of TLS, X509 and mutual authentication explained](https://medium.com/sitewards/the-magic-of-tls-x509-and-mutual-authentication-explained-b2162dec4401)

## Kubernetes 中使用到的CA和证书

Kubernetes 中使用了大量的证书，本文不会试图覆盖到所有可能使用到的证书，但会讨论到主要的证书。理解了这些证书的使用方法和原理后，也能很快理解其他可能遇到的证书文件。下图标识出了在 kubernetes 中主要使用到的证书和其使用的位置：

![](https://zhaohuabing.com/img/2020-05-19-k8s-certificate/kubernetes-certificate-usage.png)

Kubernetes 中使用到的主要证书

上图中使用序号对证书进行了标注。图中的箭头表明了组件的调用方向，箭头所指方向为服务提供方，另一头为服务调用方。为了实现 TLS 双向认证，服务提供方需要使用一个服务器证书，服务调用方则需要提供一个客户端证书，并且双方都需要使用一个 CA 证书来验证对方提供的证书。为了简明起见，上图中只标注了证书使用方提供的证书，并没有标注证书的验证方验证使用的 CA 证书。图中标注的这些证书的作用分别如下：

1. etcd 集群中各个节点之间相互通信使用的证书。由于一个 etcd 节点既为其他节点提供服务，又需要作为客户端访问其他节点，因此该证书同时用作服务器证书和客户端证书。

2. etcd 集群向外提供服务使用的证书。该证书是服务器证书。

3. kube-apiserver 作为客户端访问 etcd 使用的证书。该证书是客户端证书。

4. kube-apiserver 对外提供服务使用的证书。该证书是服务器证书。

5. kube-controller-manager 作为客户端访问 kube-apiserver 使用的证书，该证书是客户端证书。

6. kube-scheduler 作为客户端访问 kube-apiserver 使用的证书，该证书是客户端证书。

7. kube-proxy 作为客户端访问 kube-apiserver 使用的证书，该证书是客户端证书。

8. kubelet 作为客户端访问 kube-apiserver 使用的证书，该证书是客户端证书。

9. 管理员用户通过 kubectl 访问 kube-apiserver 使用的证书，该证书是客户端证书。

10. kubelet 对外提供服务使用的证书。该证书是服务器证书。

11. kube-apiserver 作为客户端访问 kubelet 采用的证书。该证书是客户端证书。

12. kube-controller-manager 用于生成和验证 service-account token 的证书。该证书并不会像其他证书一样用于身份认证，而是将证书中的公钥/私钥对用于 service account token 的生成和验证。kube-controller-manager  会用该证书的私钥来生成 service account token，然后以 secret 的方式加载到 pod 中。pod 中的应用可以使用该 token 来访问 kube-apiserver， kube-apiserver 会使用该证书中的公钥来验证请求中的 token。我们将在文中稍后部分详细介绍该证书的使用方法。

通过这张图，对证书机制比较了解的读者可能已经看出，我们其实可以使用多个不同的 CA 来颁发这些证书。只要在通信的组件中正确配置用于验证对方证书的 CA 根证书，就可以使用不同的 CA 来颁发不同用途的证书。但我们一般建议采用统一的 CA 来颁发 kubernetes 集群中的所有证书，这是因为采用一个集群根 CA 的方式比采用多个 CA 的方式更容易管理，可以避免多个CA 导致的复杂的证书配置、更新等问题，减少由于证书配置错误导致的集群故障。

## Kubernetes 中的证书配置

前面我们介绍了 Kubernetes 集群中主要使用到的证书。下面我们分别看一下如何将这些证书及其对应的私钥和 CA 根证书需要配置到 Kubernetes 中各个组件中，以供各个组件进行使用。这里假设使用一个集群根 CA 来颁发所有相关证书，因此涉及到 CA 的配置对应的证书文件名都是相同的。

### etcd 证书配置

需要在 etcd 的启动命令行中配置以下证书相关参数：

* etcd 对外提供服务的服务器证书及私钥。
* etcd 节点之间相互进行认证的 peer 证书、私钥以及验证 peer 的 CA。
* etcd 验证访问其服务的客户端的 CA。

```bash
/usr/local/bin/etcd \\
  --cert-file=/etc/etcd/kube-etcd.pem \\                   # 对外提供服务的服务器证书
  --key-file=/etc/etcd/kube-etcd-key.pem \\                # 服务器证书对应的私钥
  --peer-cert-file=/etc/etcd/kube-etcd-peer.pem \\         # peer 证书，用于 etcd 节点之间的相互访问
  --peer-key-file=/etc/etcd/kube-etcd-peer-key.pem \\      # peer 证书对应的私钥
  --trusted-ca-file=/etc/etcd/cluster-root-ca.pem \\       # 用于验证访问 etcd 服务器的客户端证书的 CA 根证书
  --peer-trusted-ca-file=/etc/etcd/cluster-root-ca.pem\\   # 用于验证 peer 证书的 CA 根证书
  ...
```

### kube-apiserver 证书配置

需要在 kube-apiserver 中配置以下证书相关参数：

* kube-apiserver 对外提供服务的服务器证书及私钥。
* kube-apiserver 访问 etcd 所需的客户端证书及私钥。
* kube-apiserver 访问 kubelet 所需的客户端证书及私钥。
* 验证访问其服务的客户端的 CA。
* 验证 etcd 服务器证书的 CA 根证书。
* 验证 service account token 的公钥。

```bash
/usr/local/bin/kube-apiserver \\ 
  --tls-cert-file=/var/lib/kubernetes/kube-apiserver.pem \\                             # 用于对外提供服务的服务器证书
  --tls-private-key-file=/var/lib/kubernetes/kube-apiserver-key.pem \\                  # 服务器证书对应的私钥
  --etcd-certfile=/var/lib/kubernetes/kube-apiserver-etcd-client.pem \\                 # 用于访问 etcd 的客户端证书
  --etcd-keyfile=/var/lib/kubernetes/kube-apiserver-etcd-client-key.pem \\              # 用于访问 etcd 的客户端证书的私钥
  --kubelet-client-certificate=/var/lib/kubernetes/kube-apiserver-kubelet-client.pem \\ # 用于访问 kubelet 的客户端证书
  --kubelet-client-key=/var/lib/kubernetes/kube-apiserver-kubelet-client-key.pem \\     # 用于访问 kubelet 的客户端证书的私钥
  --client-ca-file=/var/lib/kubernetes/cluster-root-ca.pem \\                           # 用于验证访问 kube-apiserver 的客户端的证书的 CA 根证书
  --etcd-cafile=/var/lib/kubernetes/cluster-root-ca.pem \\                              # 用于验证 etcd 服务器证书的 CA 根证书  
  --kubelet-certificate-authority=/var/lib/kubernetes/cluster-root-ca.pem \\            # 用于验证 kubelet 服务器证书的 CA 根证书
  --service-account-key-file=/var/lib/kubernetes/service-account.pem \\                 # 用于验证 service account token 的公钥
  ...
```

### 采用 kubeconfig 访问 kube-apiserver

Kubernetes 中的各个组件，包括kube-controller-mananger、kube-scheduler、kube-proxy、kubelet等，采用一个kubeconfig 文件中配置的信息来访问 kube-apiserver。该文件中包含了 kube-apiserver 的地址，验证 kube-apiserver 服务器证书的 CA 证书，自己的客户端证书和私钥等访问信息。

在一个使用 minikube 安装的集群中，生成的 kubeconfig 配置文件如下所示，这四个文件分别为 admin 用户， kube-controller-mananger、kubelet 和 kube-scheduler 的kubeconfig配置文件。

```bash
$ ls /etc/kubernetes/
admin.conf  controller-manager.conf  kubelet.conf  scheduler.conf
```

我们打开 controller-manager.conf 来看一下，为了节约篇幅，这里没有写出证书和私钥的完整内容。

```yaml
apiVersion: v1
clusters:
- cluster: 
    # 用于验证 kube-apiserver 服务器证书的 CA 根证书 
    certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX0tLS0tCg==
    server: https://localhost:8443
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: system:kube-controller-manager
  name: system:kube-controller-manager@kubernetes
current-context: system:kube-controller-manager@kubernetes
kind: Config
preferences: {}
users:
- name: system:kube-controller-manager
  user:
    # 用于访问 kube-apiserver 的客户端证书
    client-certificate-data: LS0tLS1CRUdJTiXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXQ0FURS0tLS0tCg==
    # 客户端证书对应的私钥
    client-key-data: LS0tLS1CRUdXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXtFWS0tLS0tCg==
```

可以看到，访问 kube-apiserver 所需要的相关证书内容已经被采用 base64 编码写入了文件中。其他几个文件中的内容也是类似的，只是配置的用户名和客户端证书有所不同。

在启动这些组件时，需要在参数中指出 kubeconfig 文件的路径，例如 kube-controller-manager 的启动命令如下。

```bash
 /usr/local/bin/kube-controller-manager \\
 --kubeconfig=/etc/kubernetes/controller-manager.conf 
 # 下面几个证书和访问 kube-apiserver 无关，我们会在后面介绍到
 --cluster-signing-cert-file=/var/lib/kubernetes/cluster-root-ca.pem             # 用于签发证书的 CA 根证书
 --cluster-signing-key-file=/var/lib/kubernetes/cluster-root-ca-key.pem          # 用于签发证书的 CA 根证书的私钥  
 --service-account-private-key-file=/var/lib/kubernetes/service-account-key.pem  # 用于对 service account token 进行签名的私钥
 ... 
```

### Service Account  证书

Kubernetes 中有两类用户，一类为 user account，一类为 service account。 service account 主要被 pod 用于访问 kube-apiserver。 在为一个 pod 指定了 service account  后，kubernetes 会为该 service account 生成一个 JWT token，并使用 secret 将该 service account token 加载到 pod 上。pod 中的应用可以使用 service account token 来访问 api server。service account 证书被用于生成和验证 service account token。该证书的用法和前面介绍的其他证书不同，因为实际上使用的是其公钥和私钥，而并不需要对证书进行验证。

我们可以看到 service account 证书的公钥和私钥分别被配置到了 kube-apiserver 和 kube-controller-manager 的命令行参数中，如下所示：

```bash
/usr/local/bin/kube-apiserver \\ 
  --service-account-key-file=/var/lib/kubernetes/service-account.pem \\          # 用于验证 service account token 的公钥
  ...
  
 /usr/local/bin/kube-controller-manager \\
 --service-account-private-key-file=/var/lib/kubernetes/service-account-key.pem  # 用于对 service account token 进行签名的私钥
 ... 
```

下图展示了 kubernetes 中生成、使用和验证 service account token  的过程。

![](https://zhaohuabing.com/img/2020-05-19-k8s-certificate/service-account-token.png)

#### 认证方法：客户端证书还是 token ？

我们可以看到，Kubernetes 提供了两种客户端认证的方法，控制面组件采用的是客户端数字证书;而在集群中部署的应用则采用了 service account token 的方式。为什么 Kubernetes 不为 service account 也生成一个证书，并采用该证书进行身份认证呢？ 实际上 Istio 就是这样做的，Istio 会自动为每个 service account 生成一个证书，并使用该证书来在 pod 中的应用之间建立双向 tls 认证。我没有找到 Kubernetes 这个设计决策的相关说明，如果你知道原因或对此有自己的见解，欢迎联系我进行探讨。

### Kubernetes 证书签发

Kubernetes 提供了一个  `certificates.k8s.io`  API，可以使用配置的 CA 根证书来签发用户证书。该 API 由 kube-controller-manager 实现，其签发证书使用的根证书在下面的命令行中进行配置。我们希望 Kubernetes 采用集群根 CA 来签发用户证书，因此在  kube-controller-manager  的命令行参数中将相关参数配置为了集群根 CA。

```bash
 /usr/local/bin/kube-controller-manager \\
 --cluster-signing-cert-file=/var/lib/kubernetes/cluster-root-ca.pem             # 用于签发证书的 CA 根证书
 --cluster-signing-key-file=/var/lib/kubernetes/cluster-root-ca-key.pem          # 用于签发证书的 CA 根证书的私钥  
 ... 
```

关于更多 Kubernetes 证书签发 API 的内容，可以参见 [管理集群中的 TLS 认证](https://kubernetes.io/zh/docs/tasks/tls/managing-tls-in-a-cluster/)。

### 使用 TLS bootstrapping 简化 Kubelet 证书制作

在安装 Kubernetes 时，我们需要为每一个工作节点上的 Kubelet 分别生成一个证书。由于工作节点可能很多，手动生成 Kubelet 证书的过程会比较繁琐。为了解决这个问题，Kubernetes 提供了 [TLS bootstrapping ](https://kubernetes.io/zh/docs/reference/command-line-tools-reference/kubelet-tls-bootstrapping/) 的方式来简化   Kubelet 证书的生成过程。其原理是预先提供一个 bootstrapping token，kubelet 通过该 kubelet 调用 kube-apiserver 的证书签发 API 来生成 自己需要的证书。要启用该功能，需要在 kube-apiserver 中启用 ```--enable-bootstrap-token-auth``` ，并创建一个 kubelet 访问 kube-apiserver 使用的 bootstrap token secret。如果使用 kubeadmin 安装，可以使用 ``` kubeadm token create ```命令来创建 token。

采用TLS bootstrapping 生成证书的流程如下：

1. 调用 kube-apiserver 生成一个 bootstrap token。
2. 将该 bootstrap token 写入到一个 kubeconfig 文件中，作为 kubelet 调用 kube-apiserver 的客户端验证方式。
3. 通过  ```--bootstrap-kubeconfig``` 启动参数将 bootstrap token 传递给 kubelet 进程。
4. Kubelet 采用bootstrap token 调用 kube-apiserver API，生成自己所需的服务器和客户端证书。
5. 证书生成后，Kubelet 采用生成的证书和 kube-apiserver 进行通信，并删除本地的 kubeconfig 文件，以避免 bootstrap token 泄漏风险。

## 小结

Kubernetes 中使用了大量的证书来确保集群的安全，弄清楚这些证书的用途和配置方法将有助于我们深入理解 kubernetes 的安装过程和组件的配置。本文是笔者在学习 过程中整理的 Kubernetes 集群中主要使用到的证书，由于笔者对 Kubernetes 的理解有限，文章中难免存在部分错误，欢迎指正。

## 参考文档
* [Kubernetes PKI 证书和要求](https://kubernetes.io/zh/docs/setup/best-practices/certificates/)
* [kubernetes the hard way](https://github.com/kelseyhightower/kubernetes-the-hard-wa)
* [Kubernetes 之 二进制安装(二) 证书详解](https://blog.51cto.com/13210651/2361208)
* [TLS bootstrapping](https://kubernetes.io/zh/docs/reference/command-line-tools-reference/kubelet-tls-bootstrapping/)
* [数字证书原理](https://zhaohuabing.com/post/2020-03-19-pki/)
