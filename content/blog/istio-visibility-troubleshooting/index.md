---
title: "Istio 可见性与故障排查：监控控制平面的关键指标"
summary: "本文介绍了 Istio 控制平面的关键监控指标，包括延迟、流量、错误和饱和度，帮助提高诊断效率。"
authors: ["Ric Hincapié"]
translators: ["云原生社区"]
categories: ["Istio"]
tags: ["Istio","可观测性","Istiod"]
draft: false
date: 2025-01-10T11:53:24+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://tetrate.io/blog/istio-visibility-and-troubleshooting-key-metrics-for-monitoring-the-control-plane/
---

Istio 服务网格拥有丰富的功能，为数百家公司的 Kubernetes 环境提供了更高的安全性、敏捷性和弹性。这些功能都由一个可扩展、无状态且松耦合的组件——**Istiod** 来协调。Istiod 是 Istio 的核心软件组件，持续接收 Kubernetes API 的更新，将配置和更新传递给 sidecar，同时还充当它们的 CA 授权中心。此外，它还生成了大量的指标。

尽管 **Istiod** 在开箱即用的情况下表现优异，但如果没有适当的维护，其性能可能无法长久保持最佳状态；尤其是当网格扩展到组织内的多个团队时，其承担的责任加重，更需要小心维护。

因此，服务网格运维人员必须密切关注 **Istiod** 生成的关键指标。这些指标不仅能帮助预防问题，还能在发生问题时快速诊断是否与网格相关。因为作为一个额外的网络层，Istio 参与了数据路径的每一步操作，而你需要工具和信息来回答这样的问题：“**我遇到的问题是否与服务网格有关？**”

除了控制平面，Istio 还包括一个由注入到 Pod 和网关中的 Envoy sidecar 组成的数据平面。我将在后续文章中讨论 Istio 数据平面的关键指标（敬请期待）。

## 应关注的指标：Istio 黄金指标

快速确定“**在 Istiod 中应该观察什么？**”这一问题范围的一种方法是运行以下命令：

```bash
$ kubectl exec -it $(kubectl get po -l app=istiod -oname) -- curl localhost:15014/metrics | grep -P '^(?!#).*?' | awk -F'{' '{print $1}' | sort | uniq | wc -l

87
```

这个命令显示了超过 87 个独特指标——还不包括一些因我的集群中值为 null 而未统计的饱和度和其他特定指标。建议重点关注与**延迟、流量、错误和饱和度**相关的指标。这组指标被称为黄金指标（Golden Metrics）。

## Istio 延迟指标

**Istiod** 的延迟指的是将消息传递给 sidecar 并被其处理所需的时间。这些消息包括 Istio 自定义资源定义（CRD）配置、新 Pod 的 IP 地址、Kubernetes 服务的删除通知，以及为新创建的 sidecar 提供的启动配置批量数据等。

一个必须关注的指标是 `pilot_proxy_convergence_time_bucket`，它表明 **Istiod** 配置在 sidecar 中生效所需的时间。此指标帮助我们客户在控制平面性能问题影响应用之前进行调整。

另一个推荐的指标是 `pilot_xds_push_time_bucket`，特别是针对 EDS（端点发现服务）维度，因为此配置流负责传递 Pod IP 的变更。例如，如果一个 Pod 被删除，而其他正在运行的 sidecar 更新需要 5 秒，这将影响到对未监听的 IP: 端口发送的请求。在某些情况下，通过了解此指标，可以解决瞬时超时和尾部延迟增加的问题。

## Istio 流量指标

流量指标反映了 **Istiod** 处理的活动量。它可以用来观察服务网格用户更改配置的频率，例如添加新路由，以及集群中变更的强度（例如 Pod 和 Kubernetes 服务变更）。它提供了一个集中点，来衡量某些集群变更在服务和 Istio 配置层面的影响，并结合其他相关数据进行分析，为未来规划提供依据。

一个关键指标是 `pilot_xds_pushes`，它默认包含一个 `type` 维度，映射到 CDS、LDS、RDS 和 EDS。前三者与 Istio 配置（如虚拟服务、网关或目标规则）相关，而最后一个密切跟踪 Pod IP 或端点的变更。此指标非常重要，因为它可以帮助你了解 **Istiod** 处理的变更内容及其强度。

## Istio 错误指标

这一类指标至关重要。**Istiod** 中的任何错误都需要立即处理。虽然由于松耦合架构，即使 sidecar 与 Istiod 的连接丢失，只要没有 Pod 或 CRD 的变更，sidecar 仍然可以正常工作。

两个需要注意的指标是：

1. `sidecar_injection_failure_total`：此指标跟踪 **Istiod** 的一个功能——一个在 Pod 创建时改变其规范的变异 Webhook，用于插入 Istio 的组件（如 sidecar 和 init 容器）。
2. `pilot_xds_write_timeout`：此指标表明 **Istiod** 到 sidecar 的推送未能在双方规定的时间内处理完成。

## Istio 饱和度指标

最后但同样重要的是，若未进行适当的监控，**Istiod** 可能因资源不足而引发问题。CPU 和内存分配以及水平 Pod 自动伸缩（HPA）应根据历史模式（如新应用版本发布、节点升级引发的大规模驱逐以及过去几年的流量高峰）进行监控和调整。

曾经有一位客户在发布新应用版本时流量中断，这在以前从未发生过。在生产环境中，这是一个令人困惑且意外的情况。通过检查 `container_cpu_usage_seconds_total`，我们发现控制平面 CPU 使用率过高可能导致了问题。进一步分析后，发现 HPA 的期望副本数达到了允许的最大值。通过快速调整，集群恢复到了正常状态。

**Istiod** 的指标如 `process_virtual_memory_bytes` 需要与 kube-state-metrics 结合使用，才能直观地反映当前 **Istiod** 的内存饱和情况。

## 总结

一旦你拥有适当的仪表盘来观察上述指标，并让团队理解其重要性，你将获得更高的诊断准确性和速度、更好的弹性，以及更满意的终端用户体验。
