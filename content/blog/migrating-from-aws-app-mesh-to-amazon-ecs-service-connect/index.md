---
title: "AWS 宣布将停用 App Mesh，鼓励用户迁移至 Amazon ECS Service Connect"
summary: "近日，AWS 官方博客发布公告，宣布将于 2026 年 9 月 30 日正式停用 AWS App Mesh 服务。从 2024 年 9 月 24 日起，新用户将无法再使用 App Mesh。这一消息引起了云原生社区的广泛关注。AWS 建议现有的 App Mesh 用户开始规划迁移到 Amazon ECS Service Connect，以充分利用其改进的特性和功能。"
authors: ["云原生社区"]
categories: ["Service Mesh"]
tags: ["Amazon ECS","AWS App Mesh","AWS Fargate"]
draft: false
date: 2024-10-08T16:08:47+08:00
---

近日，AWS [官方博客](https://aws.amazon.com/blogs/containers/migrating-from-aws-app-mesh-to-amazon-ecs-service-connect/)发布公告，宣布将于**2026 年 9 月 30 日**正式停用 AWS App Mesh 服务。从**2024 年 9 月 24 日**起，新用户将无法再使用 App Mesh。AWS 建议现有的 App Mesh 用户开始规划迁移到 Amazon ECS Service Connect，以充分利用其改进的特性和功能。

## Amazon ECS Service Connect 的优势

在 2022 年的 re:Invent 大会上，AWS 推出了[Amazon ECS Service Connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html)，这是一种连接 Amazon Elastic Container Service（Amazon ECS）中微服务的新方式。Service Connect 通过内置的健康检查、异常检测和重试机制，显著提高了容器化微服务的可靠性。此外，它还能将应用层网络指标发送到 Amazon CloudWatch，增强了系统的可观测性。

与 App Mesh 不同，Service Connect 使用了 AWS 托管的网络数据平面，消除了管理 sidecar 代理的繁琐工作。这意味着开发者可以更专注于业务逻辑，而无需处理底层网络管理的细节。

## 迁移策略：从 App Mesh 到 Service Connect

由于 Amazon ECS 服务不能同时属于 App Mesh Mesh 和 Service Connect 命名空间，因此迁移过程需要重新创建 Amazon ECS 服务。为了避免服务中断，AWS 建议采用[蓝绿部署](https://docs.aws.amazon.com/whitepapers/latest/overview-deployment-options/bluegreen-deployments.html)的迁移策略。这种方法允许在新旧环境之间逐步切换流量，确保迁移的平滑过渡。

在迁移过程中，可以利用多种流量控制手段，如 [Amazon Route 53 加权路由](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html)、[Amazon CloudFront 持续部署](https://aws.amazon.com/blogs/networking-and-content-delivery/achieving-zero-downtime-deployments-with-amazon-cloudfront-using-blue-green-continuous-deployments/)或[应用程序负载均衡器的多目标组路由](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html#rule-action-types)，实现流量的细粒度转移。

需要注意的是，两个环境之间的网络是隔离的，即在 App Mesh 环境中运行的服务无法直接与 Service Connect 环境中的服务通信。因此，完整的迁移策略对于确保服务的连续性至关重要。

## 功能对比：App Mesh vs. Service Connect

下面是 App Mesh 和 Service Connect 在关键功能方面的对比：

| **功能**         | **App Mesh**                                                 | **Service Connect**                                          |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **网络可靠性**   | 使用 Envoy 的异常检测、健康检查和重试机制，可以对这些参数进行细粒度的调整。 | 使用 Envoy 的异常检测、健康检查和重试机制，提供默认配置，用户只能调整超时时间。 |
| **高级流量路由** | 支持通过虚拟路由器在多个虚拟节点之间实现高级流量路由，如 AB 测试和金丝雀发布。 | 目前不支持高级流量路由功能。                                 |
| **可观测性**     | 用户需要自行收集和监控流量指标。                             | 自动将应用层的网络指标发送到 Amazon CloudWatch，用户可直接查看，降低了监控的复杂性。 |
| **安全性**       | 支持 TLS 加密通信，可与 AWS PCA 的通用证书结合，支持双向的 mTLS 认证。 | 支持 TLS 加密通信，但不支持双向认证，只能使用 AWS PCA 的短期证书。 |
| **资源共享**     | 可通过 AWS 资源访问管理器（AWS RAM）在多个 AWS 账户之间共享 Mesh，支持跨账户服务通信。 | 目前不支持在多个账户之间共享命名空间，所有服务需部署在同一 AWS 账户内。 |

## 结语

AWS 宣布停用 App Mesh 并鼓励用户迁移至 Amazon ECS Service Connect，体现了其在简化服务网格管理和提升用户体验方面的战略方向。对于云原生社区的开发者和企业而言，这是一个重新评估和优化服务架构的契机。

我们建议所有仍在使用 App Mesh 的用户，尽快制定迁移计划，充分利用 Service Connect 带来的优势。有关详细的迁移步骤和实践经验，请参考 AWS 提供的 [Amazon ECS 文档](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html) 和 [Amazon ECS Immersion Day workshop](https://catalog.workshops.aws/ecs-immersion-day/en-US/60-networking/ecs-service-connect)，获取更多技术支持。
