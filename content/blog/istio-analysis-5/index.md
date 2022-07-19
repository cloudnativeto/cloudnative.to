---
title: "Istio 庖丁解牛五：多集群网格实现分析"
date: 2019-07-30T11:24:01+08:00
draft: false
authors: ["钟华"]
summary: "在 istio 的应用场景中，异地多集群网格是其中最复杂的场景之一，本文将对「多网络单控制面」的搭建和连通过程进行分析。"
tags: ["istio"]
categories: ["istio"]
keywords: ["service mesh","服务网格","istio"]
---

## 1.多集群网格背景介绍

Istio 并不是单一领域的技术，它综合了诸多服务治理领域的解决方案和最佳实践。在模型上，istio 提供了多个层次的抽象，以适配不同的平台场景; 在实际应用上，istio 提供了若干可选的开源系统和技术，并合理的将这些系统组合在一起，以实现服务网格中的「连接」、「安全」、「控制」和「可观测性」。

![image-20190729153848023](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2019-07-29-135253.png)

在 istio 的应用场景中，异地多集群网格是其中最复杂的场景之一。istio 在 1.1 后提供了三种多集群的连通拓扑：

1. 多控制面
2. 单网络单控制面
3. 多网络单控制面

第一种「多控制面连通拓扑」，严格的讲每个 kubernetes 集群仍然是独立的服务网格，各网格之间服务实例无法共享，互相访问不透明. 应用场景有限，实现简单。

第二种「单网络单控制面拓扑」，实现了多 kubernetes 集群融合为一个服务网格，但是该种拓扑对网络有严格的要求: 需要所有集群处于同一个扁平网络，pod ip 互通且不重叠，使用 VPN 连通多集群网络是常见的一个选项。 不过这些网络需求在实际环境可能难以满足，也限制了该拓扑的应用场景。

第三种「多网络单控制面」，同样实现了多 kubernetes 集群融合为一个服务网格，且在网络上没有上述限制，每个多 kubernetes 集群是一个独立的网络，甚至可以分布于不同地域。 但其实现也最复杂，该拓扑模型可以实现「地域感知路由」、「异地容灾」等高级应用场景。

本文将对第三种「多网络单控制面」的搭建和连通过程进行分析:

![Shared Istio control plane topology spanning multiple Kubernetes clusters using gateways](https://istio.io/docs/setup/kubernetes/install/multicluster/shared-gateways/diagram.svg)

本文约定术语:

- 集群: 指单个 kubernetes 集群。

- 主集群: 特指在「多网络单控制面」拓扑中，包含控制面的 kubernetes 集群。

- 子集群:  特指在「多网络单控制面」拓扑中，不包含控制面的 kubernetes 集群。

- 网格:  特指在「多网络单控制面」拓扑中，所有 kubernetes 集群组成的唯一服务网格。

- 网络: 在「多网络单控制面」拓扑中，每个 kubernetes 集群都有独立的网络。

在该拓扑中，只有主集群中存在一个控制面，所有集群都可以包含数据面，所有数据面的服务实例共享且可以透明互通。我们可以简单描述该拓扑的连通需求:

- 主集群控制面需要获得所有集群的服务发现数据，也就是控制面需要能访问所有集群的 kube api。
- 子集群的数据面需要能主动联通主集群控制面，因此主集群需要通过 ingress gateway，将控制面组件暴露给子集群使用。
- 所有包含数据面的集群，需要将内部业务服务，通过 ingress gateway 暴露出去，用以实现整个网格的服务互通。
- 主集群控制面需要知悉整个网格的网络拓扑，每个服务实例也需要标记自身所处网络。 这是因为每个具体服务实例收到的 xDS 数据，都是和自身所处的网络强相关的。

本文将尝试在广州和新加坡地域各自创建一个 kubernetes 集群，在广州集群创建 istio 控制面，然后将 2 个集群进行连通，实现「多网络单控制面」的多集群服务网格。

相关代码汇总于: <https://github.com/zhongfox/multicluster-demo>

------

## 2. 主集群配置

首先分别在广州和新加坡地域创建好 kubernetes 集群，并获得 kube api 访问凭证存于本地，kube config context 分别命名为 guangzhou 和 singapore.

在广州集群上，安装好单集群 istio 组件:

![image-20190729231121442](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2019-07-29-151144.png)

### 2.1 主集群访问子集群 kube api

istio 控制面只存在于广州主集群中，控制面需要能获取到所有集群的服务发现数据，因此主集群中需要配置子集群的访问凭证:

使用 guangzhou kube context:

```plain
% kubectl config use-context guangzhou
```

将 singapore 集群访问凭证存到 guangzhou 集群的 secret 中:

```plain
% kubectl --context=guangzhou -n istio-system create secret \
  generic singapore-secret --from-file singapore
```

同时需要给该 secret 设置 label `istio/multiCluster=true`:

```plain
kubectl label --context=guangzhou secret singapore-secret istio/multiCluster=true -n istio-system
```

在 Pilot 源码中，会创建 SecretController 来 list/watch lable `istio/multiCluster=true` 的 secret，并实例化 remoteKubeController，作为网格服务发现数据的来源之一。

![image-20190729172916130](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2019-07-29-135224.png)

### 2.2 将控制面组件暴露给子集群使用

在主集群中创建 ingress gateway `meshexpansion-gateway` 将 Pilot，Mixer 和 citadel 暴露给子集群使用:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: meshexpansion-gateway
  namespace: istio-system
  labels:
    app: gateways
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 15011
      protocol: TCP
      name: tcp-pilot
    hosts:
    - "*"
  - port:
      number: 8060
      protocol: TCP
      name: tcp-citadel
    hosts:
    - "*"
  - port:
      number: 15004
      name: tls-mixer
      protocol: TLS
    tls:
      mode: AUTO_PASSTHROUGH
    hosts:
    - "*"
```

该 gateway 要生效，还需要配置相关的 VirtualService:

1. 创建 VirtualService `meshexpansion-vs-pilot`，将主集群 Pilot 通过 gateway 暴露给子集群使用.
2. 创建 VirtualService `meshexpansion-vs-citadel`，将主集群 Citadel 通过 gateway 暴露给子集群使用.

以上配置在[install/primarycluster-meshexpansion-gateway.yaml](https://github.com/zhongfox/multicluster-demo/blob/master/install/primarycluster-meshexpansion-gateway.yaml)中，等同于执行:

```plain
% kubectl apply -f install/primarycluster-meshexpansion-gateway.yaml
```

以上步骤配置完毕后，我们还需要将网格中对 Pilot，Mixer 的访问调整为以上端口，包括:

1) 网格全局配置:

```plain
% kubectl -nistio-system edit cm istio

......
defaultConfig:
  discoveryAddress: istio-pilot.istio-system:15011
......
mixerCheckServer: istio-policy.istio-system.svc.cluster.local:15004
mixerReportServer: istio-telemetry.istio-system.svc.cluster.local:15004
```

2) 控制面中 `istio-ingressgateway` `istio-egressgateway`的启动参数，修改对 pilot 的访问地址，从 15010(HTTP 端口)改为 15011(mTLS 端口):

```plain
- --discoveryAddress
- istio-pilot:15011
```

![image-20190729173048701](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2019-07-29-135216.png)

### 2.3 数据面创建 ingress gateway

每个包含数据面的集群，都需要提供 ingress gateway，使得其他集群数据面可以访问本集群数据面服务:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: cluster-aware-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    tls:
      mode: AUTO_PASSTHROUGH
    hosts:
    - "*.local"
```

以上配置在[install/primarycluster-cluster-aware-gateway.yaml](https://github.com/zhongfox/multicluster-demo/blob/master/install/primarycluster-cluster-aware-gateway.yaml)中，等同于执行:

```plain
% kubectl apply -f install/primarycluster-cluster-aware-gateway.yaml
```

![image-20190729173523592](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2019-07-29-135209.png)

#### 关于 mTLS 和 AUTO_PASSTHROUGH

通常来说，istio Ingress Gateway 需要配套指定服务的 VirtualService，用以指定 ingress 流量的后端服务. 但在此拓扑中，该 ingress Gateway 需要作为本数据面所有服务的流量入口. 也就是所有服务共享单个 ingress gateway (单个 IP)，这里其实是利用了 TLS 中的 [SNI(Server Name Indication)](https://en.wikipedia.org/wiki/Server_Name_Indication)。

> SNI(Server Name Indication)指定了 TLS 握手时要连接的 主机名。 SNI 协议是为了支持同一个 IP(和端口)支持多个域名

传统的 Ingress Gateway 承载的是南北流量(server-client)，这里的 Ingress Gateway 属于网格内部流量，承载的是东西流量(server-server).

设置`AUTO_PASSTHROUGH`，可以允许服务无需配置 VirtualService，而直接使用 TLS 中的 SNI 值来表示 upstream，服务相关的 service/subset/port 都可以编码到 SNI 内容中.

我们看看以上的 Gateway `cluster-aware-gateway` 443 端口开启`AUTO_PASSTHROUGH` 后的 xDS 效果:

![image-20190730103626893](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2019-07-30-023631.png)

其中 Listener Filter `envoy.listener.tls_inspector` 会检测传输是否是 TLS，如果是的话，会进一步提取 SNI (或者 ALPN)，SNI 信息在后续 FilterChain 中可以用来路由。

Network Filter `envoy.filters.network.sni_cluster` 会利用 SNI 信息来判断 upstream cluster，该 filter 不会影响非 TLS 的连接。

### 2.4 控制面 mTLS 认证

1) 控制面组件`citadel`负责管理网格内的证书，我们需要给 citadel 提供 ca 证书、秘钥和根证书:

```plain
% kubectl -n istio-system create secret generic cacerts \
  --from-file=certs/ca-cert.pem --from-file=certs/ca-key.pem \
  --from-file=certs/root-cert.pem --from-file=certs/cert-chain.pem
```

2) 创建好 secret 后，我们需要将其挂载到 citadel pod 中:

```yaml
     volumeMounts:
     - name: cacerts
       mountPath: /etc/cacerts
       readOnly: true
 ......
 volumes:
 - name: cacerts
   secret:
    secretName: cacerts
    optional: true
```

3) 并将其传入 citadel 启动参数:

```plain
- --self-signed-ca=false
- --signing-cert=/etc/cacerts/ca-cert.pem
- --signing-key=/etc/cacerts/ca-key.pem
- --root-cert=/etc/cacerts/root-cert.pem
- --cert-chain=/etc/cacerts/cert-chain.pem
```

4) 更新网格全局配置，设置`controlPlaneAuthPolicy`为`MUTUAL_TLS`

```plain
% kubectl -nistio-system edit cm istio
......
defaultConfig:
  controlPlaneAuthPolicy: MUTUAL_TLS
```

5) 控制面组件 istio-pilot、istio-telemetry、istio-policy 的 sidecar，以及 istio-ingressgateway，istio-egressgateway 增加启动参数以支持控制面 mTLS 认证:

```plain
- --controlPlaneAuthPolicy
- MUTUAL_TLS
```

#### 关于 ControlPlaneAuth

控制面组件开启`MUTUAL_TLS`，最终会体现到控制面组件(telemetry/policy/pilot)的 envoy xDS 中:

```yaml
tls_context:
  common_tls_context:
    alpn_protocols:
    - h2
    tls_certificates:
    - certificate_chain:
        filename: /etc/certs/cert-chain.pem
      private_key:
        filename: /etc/certs/key.pem
    validation_context:
      trusted_ca:
        filename: /etc/certs/root-cert.pem
  require_client_certificate: true
```

![image-20190729173651673](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2019-07-29-135204.png)

### 2.4 开启服务间 mTLS 认证

使用 istio CRD `MeshPolicy`开启网格全局 mTLS:

```yaml
apiVersion: "authentication.istio.io/v1alpha1"
kind: "MeshPolicy"
metadata:
  name: "default"
  labels:
    app: security
    chart: security
    heritage: Tiller
    release: istio
spec:
  peers:
  - mtls: {}
```

以上配置会开启网格内流量的服务端和客户端 TLS 认证，需要注意的是，客户端 TLS 认证会被关联的 DestinationRule 里的`tls`属性覆盖， 所以如果使用了 DestinationRule，需要在 DestinationRule 中显示指定开启 mTLS:

```yaml
tls:
  mode: ISTIO_MUTUAL
```

另外在全局 mtls 认证会有些例外: 比如 k8s api server 没有 sidecar，所以客户端访问 api server 需要禁用 mtls:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: "api-server"
  namespace: istio-system
  labels:
    app: security
spec:
  host: "kubernetes.default.svc.cluster.local"
  trafficPolicy:
    tls:
      mode: DISABLE
```

以上配置在[install/primarycluster-services-mtls.yaml](https://github.com/zhongfox/multicluster-demo/blob/master/install/primarycluster-services-mtls.yaml)中，等同于执行:

```plain
% kubectl apply -f install/primarycluster-services-mtls.yaml
```

![image-20190729173735897](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2019-07-29-135158.png)

------

## 3. 子集群配置

### 3.1 部署子集群 istio 配置

获取主集群控制面的 gateway 地址，作为子集群访问控制面的入口地址:

```plain
export CONTROL_PANEL_GW=$(kubectl --context guangzhou -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
```

参考<https://istio.io/docs/setup/kubernetes/install/multicluster/shared-gateways/#setup-cluster-2>，安装子集群 istio 配置:

```plain
% helm template --name istio-remote --namespace=istio-system \
  --values install/kubernetes/helm/istio/values-istio-remote.yaml \
  --set global.mtls.enabled=true \
  --set gateways.enabled=true \
  --set security.selfSigned=false \
  --set global.controlPlaneSecurityEnabled=true \
  --set global.createRemoteSvcEndpoints=true \
  --set global.remotePilotCreateSvcEndpoint=true \
  --set global.remotePilotAddress=${CONTROL_PANEL_GW} \
  --set global.remotePolicyAddress=${CONTROL_PANEL_GW} \
  --set global.remoteTelemetryAddress=${CONTROL_PANEL_GW} \
  --set gateways.istio-ingressgateway.env.ISTIO_META_NETWORK="network2" \
  --set global.network="network2" \
  install/kubernetes/helm/istio > istio-remote.yaml
```

该文件内容较多，输出内容可以参考<https://github.com/zhongfox/multicluster-demo/blob/master/install/istio-remote-1.1.11.yaml>

将输出内容部署到新加坡集群中:

```plain
% kubectl config use-context singapore
% kubectl create ns istio-system
% kubectl apply -f istio-remote.yaml
```

子集群同样需要创建 mTLS 认证所需的 secret:

```plain
% kubectl create secret generic cacerts -n istio-system --from-file=certs/ca-cert.pem --from-file=certs/ca-key.pem --from-file=certs/root-cert.pem --from-file=certs/cert-chain.pem
```

### 3.2 子集群配置解读

 子集群中并没有安装 istio 控制面组件，也不存在任何 istio CRD，以上操作在子集群中创建了若干 kubernetes 原生资源，用以实现子集群和主集群的连通，我们看看其中的一些重要配置:

![image-20190729161910641](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2019-07-29-135151.png)

在新加坡集群中，并没有 pilot、telemetry、policy 等组件 Pod，但是存在相关的 Headless Service (ClusterIP 为 None)，并添加它们的 endpoints 指向广州主集群的控制面 ingress Gateway IP，以此实现单控制面共享。

------

## 4. 网络拓扑配置

控制面需要知悉整个网格的网络拓扑，每个服务实例也需要标记自身所处网络. 这是因为每个具体服务实例收到的 xDS 数据，都是和自身所处的网络强相关的。

1) 获取各集群的 ingress gateway ip:

```plain
% export GZ_INGRESS=$(kubectl -n istio-system --context guangzhou get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

% export SG_INGRESS=$(kubectl -n istio-system --context singapore get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
```

2) 将各集群 ip 配置到网格全局配置中(替换 IP):

```yaml
% kubectl --context guangzhou -n istio-system edit cm istio

meshNetworks: |-
  networks:
    network1:
      endpoints:
      - fromRegistry: Kubernetes
      gateways:
      - address: ${GZ_INGRESS}
        port: 443
    network2:
      endpoints:
      - fromRegistry: singapore
      gateways:
      - address: ${SG_INGRESS}
        port: 443
```

3) 每个集群的网络标识需要独立设置，该标识是注入到 sidecar 的环境变量中，因此需要在各集群中修改 sidecar injector 配置:

广州主集群:

```plain
% kubectl --context guangzhou -nistio-system edit cm istio-sidecar-injector
......
env:
- name: ISTIO_META_NETWORK
  value: "network1"
```

新加坡子集群:

```plain
% kubectl --context singapore -nistio-system edit cm istio-sidecar-injector
......
env:
- name: ISTIO_META_NETWORK
  value: "network2"
```

4) 更新已有组件的网络标识: 控制面组件的 sidecar 并不是由`istio-sidecar-injector`注入的，因此需要手动修改它们的网络标识，包括`istio-ingressgateway` `istio-egressgateway`等:

```plain
kubectl --context=guangzhou -nistio-system edit deploy istio-ingressgateway
......
env:
- name: ISTIO_META_NETWORK
  value: "network1"
```

------

## 5. 多集群网格验证

至此，由广州和新加坡 2 个异地集群组成的服务网格已经搭建完成，我们来验证一下:

我们在 2 个集群中分别部署一套在线电子商城 demo( github.com/TencentCloudContainerTeam/tcm-demo)，其中的推荐系统(recommend)，广州集群部署 v1 版本，新加坡集群部署 v2 版本，其中 recommend v1 版本不包含 banner，recommend v2 版本会显示一个 image:

```plain
% kubectl --context guangzhou apply -f install/primarycluster-apps.yaml
% kubectl --context singapore apply -f install/subcluster-apps.yaml
```

![image-20190729175507376](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2019-07-29-135141.png)

创建 ingress gateway，放通对 mall 服务的访问流量:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: mall-gateway
  namespace: base
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*"
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: mall
  namespace: base
spec:
  hosts:
  - "*"
  gateways:
  - mall-gateway
  http:
  - route:
    - destination:
        host: mall
        port:
          number: 7000
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: mall
  namespace: base
spec:
  host: mall
  subsets:
  - labels:
      app: mall
    name: v1
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

等价于执行:

```plain
% kubectl --context guangzhou apply -f install/primarycluster-apps-routing.yaml
```

注意虽然以上流控 CRD 是 apply 到主集群，但是因为广州和新加坡共享一个控制面，因此这些流控设置在 2 个集群都会生效:

![image-20190729213030343](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2019-07-29-135135.png)

现在我们分别通过广州和新加坡地域的 ingress gateway IP 访问 mall 应用，多访问几次，可以发现，无论从哪里地域进入，随机的可以访问到 recommend v1 (无 banner)和 recommend v2 (有 banner)，证明 2 个地域的服务实例是透明共享的:

![image-20190729145727003](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2019-07-29-135126.png)

还可以通过工具 istioctl 查看 xDS 数据，比如我们查看广州集群 mall pod 获得的 xDS，其中有 2 个 recommend 服务的 endpoints:

![image-20190729150633160](https://zhongfox-blogimage-1256048497.cos.ap-guangzhou.myqcloud.com/2019-07-29-135120.png)

`172.25.0.26:7000`是广州集群的 recommend v1 pod，而`119.28.109.157:443`对应的是新加坡集群 recommend v2 pod. 这些服务实例对业务代码来说是透明的，访问 recommend 服务可以随机路由到任一集群。

本文主要对 istio 多集群网格的实现进行分析， 关于多集群网格的应用场景， 且看下回分解。
