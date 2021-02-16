---
date: "2019-09-06T18:00:00+08:00"
draft: false
image: "/images/blog/006tKfTcgy1ftnl1osmwjj30rs0kub1t.jpg"
translator: "[马若飞](https://github.com/malphi)"
reviewer:  ["孙海洲"]
reviewerlink:  ["https://github.com/haiker2011"]
title: "AWS App Mesh - 云应用的服务网格"
description: "本文演示了如何在AWS控制台创建一个App Mesh"
categories: ["service mesh"]
tags: ["AppMesh"]
type: "post"
avatar: "/images/profile/default.jpg"
---

## 编者按

本文简要介绍了AWS App Mesh的基本概念，并通过一个示例演示了如何在AWS的控制台创建一个App Mesh的服务网格。

## 前言

[AWS App Mesh](https://aws.amazon.com/app-mesh/) 可以帮助你运行和监控大规模的HTTP和TCP服务。你可以用一致的方式来路由和监控流量，获得发现问题的能力，并在失败或代码更改后重新路由流量。App Mesh使用开源的[Envoy](https://www.envoyproxy.io/)代理，让你可以使用来自AWS合作伙伴和开源社区的各种工具。

服务可以运行在[AWS Fargate](https://aws.amazon.com/fargate/)， [Amazon EC2](https://aws.amazon.com/ec2/)，[Amazon ECS](https://aws.amazon.com/ecs/)， [Amazon Elastic Container Service for Kubernetes](https://aws.amazon.com/eks/) 或 [Kubernetes](https://aws.amazon.com/kubernetes/)上。每个服务的所有进出流量都经过Envoy代理，以便对其进行路由、可视化、测量和记录。这种额外的间接层让你可以用任何想要的语言构建服务，而不必使用一组公共的通信库。

## App Mesh基本概念

在深入了解之前，让我们先来回顾一下App Mesh里的重要概念和组件：

[**服务网格**](https://docs.aws.amazon.com/app-mesh/latest/userguide/meshes.html) – 网络流量在其服务之间的逻辑边界。网格可以包含虚拟服务、虚拟节点、虚拟路由器和路由。

[**虚拟服务**](https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_services.html) – 直接（由虚拟节点）或间接（通过虚拟路由器）提供的服务的抽象（逻辑名称）。网格中的服务使用逻辑名称引用和使用其他服务。

[**虚拟节点**](https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_nodes.html) – 特定任务组（如ECS服务或Kubernetes部署）或运行在一个或多个EC2实例上的逻辑指针。每个虚拟节点可以通过**侦听器**接受入流量，并通过**后端**连接到其他虚拟节点。此外，每个节点都有一个服务发现配置（当前是DNS名称），允许其他节点发现任务、pod或实例的IP地址。

[**虚拟路由器**](https://docs.aws.amazon.com/app-mesh/latest/userguide/virtual_routers.html) – 网格中一个或多个虚拟服务的处理器。每个虚拟路由器监听特定端口上的HTTP通信。

[**路由**](https://docs.aws.amazon.com/app-mesh/latest/userguide/routes.html) – 路由使用基于URL的前缀匹配将流量路由到虚拟节点，每个节点都有可选的权重。权重可用于测试生产环境中的新服务，同时逐渐增加它们处理的流量。

把它们放在一起，每个服务网格包含一组服务，可以通过路由指定的URL路径访问这些服务。网格中，服务通过名称相互引用。

可以从App Mesh控制台、App Mesh CLI或App Mesh API访问App Mesh。我将展示如何使用控制台创建网格，并对CLI做简要的介绍。

## 使用App Mesh控制台

在控制台创建服务网格和组件。打开[App Mesh Console](https://console.aws.amazon.com/appmesh/landing-page) 并点击开始使用：

![img](https://media.amazonwebservices.com/blog/2019/am_console_1.png)

输入我的网格和第一个虚拟服务（以后可以添加多个）的名称，点击下一步：

![img](https://media.amazonwebservices.com/blog/2019/am_step1_2.png)

定义第一个虚拟节点：

![img](https://media.amazonwebservices.com/blog/2019/am_step2_1.png)

点击额外配置来设置特定的服务后端（其他服务是指一个可以调用的服务）和日志记录：

![img](https://media.amazonwebservices.com/blog/2019/am_step2_p2_2.png)

通过协议（HTTP或TCP）和端口来定义节点的监听器，设置健康检查选项，点击下一步：

![img](https://media.amazonwebservices.com/blog/2019/am_step2_p3_1.png)

然后，定义虚拟路由器和它的路由：

![img](https://media.amazonwebservices.com/blog/2019/am_step3_p1_1.png)

可以按百分比在多个虚拟节点（目标）之间分配流量，还可以对入流量使用基于前缀的路由：

![img](https://media.amazonwebservices.com/blog/2019/am_step3_p2_1.png)

最后再检查一下我的设置并点击创建网格服务：

![img](https://media.amazonwebservices.com/blog/2019/am_review_1.png)

组件很快被创建并且可以准备使用了。

![img](https://media.amazonwebservices.com/blog/2019/am_ready_1.png)

最后一步，如[App Mesh 使用手册](https://docs.aws.amazon.com/app-mesh/latest/userguide/getting_started.html)中所描述，更新我的任务定义（Amazon ECS或AWS Fargate）或pod规范（Amazon EKS或Kubernetes），以引用Envoy容器映像和代理容器映像。如果我的服务运行在EC2实例上，需要在那里部署Envoy。

## 使用AWS App Mesh命令行

App Mesh可以让你以一个简单的JSON形式描述每个类型的组件，并提供了[命令行工具](https://docs.aws.amazon.com/cli/latest/reference/appmesh/)来创建每一个组件（`create-mesh`, `create-virtual-service`, `create-virtual-node`, and `create-virtual-router`）。例如，可以像这样定义一个虚拟路由：

```json
{
  "meshName": "mymesh",
  "spec": {
        "listeners": [
            {
                "portMapping": {
                    "port": 80,
                    "protocol": "http"
                }
            }
        ]
    },
  "virtualRouterName": "serviceA"
}
```

并使用一条命令创建它：

```bash
$ aws appmesh create-virtual-router --cli-input-json file://serviceA-router.json
```

## 当前可用

AWS App Mesh现在是可用的，你可以现在就开始使用它，包括的区域有美国东部（维吉尼亚），美国东部（俄亥俄州），美国西部（俄勒冈州），美国西部（加利福尼亚），加拿大（中央）、欧洲（爱尔兰），欧洲（法兰克福），欧洲（伦敦），亚太（孟买），亚太（东京），亚太（悉尼），亚太（新加坡）和亚太（首尔）。