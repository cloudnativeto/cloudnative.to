---
title: "【译】初识 NGINX 服务网格"
description: "本文翻译自 Nginx 官方博客初识 NGINX 服务网格。"
author: "Nginx"
translator: "[Lis](https://github.com/hmtai)"
image: "/images/blog/introducing-nginx-service-mesh.png"
categories: ["Service Mesh"]
tags: ["Service Mesh"]
date: 2020-10-13T23:00:00+08:00
avatar: "./images/nginx.jpeg"
profile: "由 Nginx 公司开发，一个完全集成的轻量级服务网格，它利用 NGINX Plus 支持的数据平面来管理 Kubernetes 环境中的容器流量。"
type: "post"
---
本文译自 [Introducing NGINX Service Mesh](https://www.nginx.com/blog/introducing-nginx-service-mesh/amp/)。

此版本 NGINX Service Mesh (NSM) 是一个高度集成的轻量级的服务网格的开发版本，它利用 [NGINX Plus](https://www.nginx.com/products/nginx/) 支持的数据平面来管理 Kubernetes 环境中的容器流量。NSM 可以免费 [下载](https://downloads.f5.com/)。非常希望广大开发者们能在开发和测试环境中尝试一下，期待你们在 GitHub 仓库留下对 NSM 的反馈。

随着部署规模的扩大并且变得越来越复杂，微服务的落地也变得很有挑战。服务之间的通信错综复杂，在系统中调试问题可能会更加困难，并且服务增多意味着需要管理更多的资源。

NSM 通过使用户集中配置来解决以上挑战：

- 安全——如今安全比以往任何时候都更加重要，数据泄露每年可能使组织损失数百万美元的收入和声誉。NSM 确保所有通信均经过 mTLS 加密，因此网络上没有敏感数据可被黑客窃取。通过访问控制可以定义策略来控制哪些服务可以相互通信。
- 流量管理——在部署应用程序的一个新版本时，用户可能希望先限制新版本应用程序接收的流量，以防可能存在 bug。使用 NSM 智能容器流量管理，用户可以指定限制流量到新服务的策略，并随着时间的推移逐渐增加流量。限流和断路器等功能使用户可以完全控制流经服务的流量。
- 可视化——管理数千个服务对于调试和可见性可能是一个噩梦。 NSM 通过内置的 Grafana 仪表板在 NGINX Plus 中显示可用的全套指标来帮助用户解除这个噩梦。此外，Open Tracing 的集成实现了细粒度的事务跟踪。
- 混合部署——如果用户的企业像大多数企业一样，整个基础架构不完全在 Kubernetes 中运行。 NSM 确保不会遗漏运行在 Kubernetes 以外的应用程序。通过 NGINX Kubernetes Ingress Controller 集成，它们务可以与网格服务通信，反之亦然。

NSM 通过将加密和身份验证无缝应用于容器流量来确保零信任环境中的应用程序安全。它具有对进出流量的可观察性和洞察力，来帮助用户快速准确地部署和解决问题。它还提供了细粒度的流量控制，使 DevOps 团队可以部署和优化应用程序组件，同时使 Dev 团队可以构建并轻松连接其分布式应用程序。

## 什么是 NGINX 服务网格？

NSM 有一个用于东西向（服务到服务）流量的统一数据平面，以及一个本地集成的用于南北向流量的 NGINX Plus 入口控制器，它由单独的一个控制平面进行管理。

控制平面是为 NGINX Plus 数据平面设计和优化的，并定义了分配给 NGINX Plus 边车容器的流量管理规则。

![image](https://user-images.githubusercontent.com/37067719/96204792-c5539680-0f97-11eb-843e-2298c9cd111b.png)

通过 NSM，边车容器代理与网格中的每个服务一同部署，它们与以下开源解决方案集成：
- Grafana —— Prometheus 指标的可视化；内置的 NSM 仪表板可帮助您入门
- Kubernetes Ingress controllers ——管理网格的入口和出口流量
- SPIRE ——证书颁发机构，用于管理，分发和轮换网格的证书
- NATS ——可伸缩的消息传递平面，用于从控制平面向边车容器传递消息，例如路由更新
- Open Tracing ——分布式跟踪（同时支持 Zipkin 和 Jaeger）
- Prometheus ——从 NGINX Plus 边车容器中收集和存储指标，例如请求数，连接数和 SSL 握手数

## 功能和组件

NGINX Plus 作为数据平面跨越了边车代理（东西方流量）和入口控制器（南北流量），同时拦截和管理服务容器之间的流量。功能包括：
- TLS (mTLS) 身份验证
- 负载均衡
- 高可用性
- 限速
- 熔断
- 蓝绿和金丝雀部署
- 访问控制

## NGINX 服务网格入门

要开始使用 NSM，您首先需要：
- 有一个可以访问的 Kubernetes 环境。 NGINX Service Mesh 可以支持多个 Kubernetes 平台，包括 Amazon Kubernetes 弹性容器服务 (EKS)，Azure Kubernetes 服务 (AKS)，Google Kubernetes 引擎 (GKE)，VMware vSphere 和独立的裸机群集。
- 在要安装 NSM 的机器上安装 kubectl 命令行程序。
- 下载 NGINX Service Mesh 发布包。该软件包包括 NSM 镜像，需要将镜像上传到 Kubernetes 集群可访问的私有容器仓库中。该软件包还包括用于部署 NSM 的 nginx-meshctl 二进制文件。

要使用默认设置部署 NSM，请运行以下命令。在部署过程中，该跟踪确认网格组件的成功部署，最后确认 NSM 在其自己的命名空间中运行：

```
$ DOCKER_REGISTRY=your-Docker-registry ; MESH_VER=0.6.0 ; \
 ./nginx-meshctl deploy  \
  --nginx-mesh-api-image "${DOCKER_REGISTRY}/nginx-mesh-api:${MESH_VER}" \
  --nginx-mesh-sidecar-image "${DOCKER_REGISTRY}/nginx-mesh-sidecar:${MESH_VER}" \
  --nginx-mesh-init-image "${DOCKER_REGISTRY}/nginx-mesh-init:${MESH_VER}" \
  --nginx-mesh-metrics-image "${DOCKER_REGISTRY}/nginx-mesh-metrics:${MESH_VER}"
Created namespace "nginx-mesh".
Created SpiffeID CRD.
Waiting for Spire pods to be running...done.
Deployed Spire.
Deployed NATS server.
Created traffic policy CRDs.
Deployed Mesh API.
Deployed Metrics API Server.
Deployed Prometheus Server nginx-mesh/prometheus-server.
Deployed Grafana nginx-mesh/grafana.
Deployed tracing server nginx-mesh/zipkin.
All resources created. Testing the connection to the Service Mesh API Server...
Connected to the NGINX Service Mesh API successfully.
NGINX Service Mesh is running.
```

对于其他命令选项，包括非默认设置，请运行：

```
$ nginx-meshctl deploy –h
```

要验证 NSM 控制平面在 nginx-mesh 命名空间中是否正常运行，请运行：

```
$ kubectl get pods –n nginx-mesh
NAME                                 READY   STATUS    RESTARTS   AGE
grafana-6cc6958cd9-dccj6             1/1     Running   0          2d19h
mesh-api-6b95576c46-8npkb            1/1     Running   0          2d19h
nats-server-6d5c57f894-225qn         1/1     Running   0          2d19h
prometheus-server-65c95b788b-zkt95   1/1     Running   0          2d19h
smi-metrics-5986dfb8d5-q6gfj         1/1     Running   0          2d19h
spire-agent-5cf87                    1/1     Running   0          2d19h
spire-agent-rr2tt                    1/1     Running   0          2d19h
spire-agent-vwjbv                    1/1     Running   0          2d19h
spire-server-0                       2/2     Running   0          2d19h
zipkin-6f7cbf5467-ns6wc              1/1     Running   0          2d19h
```

根据设置手动或自动注入策略的部署选项，默认情况下，NGINX Sidecar 代理会注入已部署的应用程序中。要了解如何禁用自动注入，请参阅我们的 [文档](https://docs.nginx.com/nginx-service-mesh/usage/inject-sidecar-proxy/)。
例如，如果我们将 **sleep** 应用程序部署在**默认**名称空间中，然后检查 Pod，我们会看到两个容器正在运行—— **sleep** 应用程序和关联的 NGINX Plus 边车容器：

```
$ kubectl apply –f sleep.yaml 
$ kubectl get pods –n default
NAME                     READY   STATUS    RESTARTS   AGE
sleep-674f75ff4d-gxjf2   2/2     Running   0          5h23m
```

您还可以通过运行以下命令以将 Sidecar 暴露到本地，从而使用 [本地 NGINX Plus 仪表板](https://www.nginx.com/products/nginx/live-activity-monitoring) 监视 sleep 应用程序：

```
$ kubectl port-forward sleep-674f75ff4d-gxjf2 8080:8886
```

然后在浏览器中导航到 http://localhost:8080/dashboard.html 您还可以连接到 Prometheus 服务器以监视 **sleep** 应用程序。

您可以在 Kubernetes 中使用自定义资源来配置流量策略，例如访问控制，速率限制和熔断。有关更多信息，请参见 [文档](https://docs.nginx.com/nginx-service-mesh/)。

## 总结

NGINX Service Mesh 可从 [F5 portal](https://login.f5.com/resource/login.jsp?ctx=719748) 免费下载。请在您的开发和测试环境中试用，然后在 [GitHub](https://github.com/nginxinc/nginx-service-mesh/issues) 上提交您的反馈。
要试用 NGINX Plus Ingress Controller，请立即开始 30 天免费试用，或与我们联系以讨论您的应用用例。
