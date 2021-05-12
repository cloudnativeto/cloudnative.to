---
title: "Istio 1.10 版本更新预览"
description: "Istio 1.10 版本本月即将发布，让我们看看有哪些变化。"
author: "[Istio Team](https://istio.io/latest/news/releases/1.10.x/announcing-1.10/upgrade-notes/)"
image: "images/blog/istio-110.jpg"
categories: ["Istio"]
tags: ["Istio"]
date: 2021-05-12T13:05:42+08:00
type: "post"
---

当你从 Istio 1.9 升级到 Istio 1.10 时，你需要考虑这个页面上的变化。这些说明详细介绍了有目的地打破与 Istio 1.9 的向后兼容性的变化。这些说明还提到了在引入新行为的同时保留向后兼容性的变化。只有当新的行为对 Istio 1.9 的用户来说是意想不到的，才会包括这些变化。

## 入站转发配置

Istio 1.10 版的入站转发行为已被修改。在 Istio 1.10 中，这一变化是默认启用的，可以通过在 Istiod 中配置 `PILOT_ENABLE_INBOUND_PASSTHROUGH=false` 环境变量来禁用它。

以前，请求会被转发到 localhost。这导致了与运行没有 Istio 的应用程序相比的两个重要区别：

- 绑定到 `localhost` 的应用程序将被暴露给外部 pod。
- 绑定到 `<POD_IP>` 的应用程序将不会暴露给外部 pod。

后者是采用 Istio 时常见的摩擦源，特别是对于有状态的服务来说，这很常见。

新的行为是按原样转发请求。这与没有安装 Istio 的用户所看到的行为一致。然而，这会导致那些依赖 localhost 被 Istio 暴露在外部的应用程序可能会停止工作。

为了帮助检测这些情况，我们已经添加了一个检查，以找到将被影响的 pod。你可以运行 `istioctl experimental precheck` 命令来获得任何在服务中暴露的端口上绑定到 localhost 的 pod 的报告。这个命令在 Istio 1.10 + 中可用。如果不采取行动，这些端口在升级后将不再被访问。

```
istioctl experimental precheck
Error [IST0143] (Pod echo-local-849647c5bd-g9wxf.default) Port 443 is exposed in a Service but listens on localhost. It will not be exposed to other pods.
Error [IST0143] (Pod echo-local-849647c5bd-g9wxf.default) Port 7070 is exposed in a Service but listens on localhost. It will not be exposed to other pods.
Error: Issues found when checking the cluster. Istio may not be safe to install or upgrade.
See https://istio.io/latest/docs/reference/config/analysis for more information about causes and resolutions. 
```

无论 Istio 版本如何，行为都可以由 Sidecar 明确控制。例如，将 9080 端口配置为显式发送至 localhost。

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: ratings
spec:
  workloadSelector:
    labels:
      app: ratings
  ingress:
  - port:
      number: 9080
      protocol: HTTP
      name: http
    defaultEndpoint: 127.0.0.1:9080
```

## Sidecar 注入变更

为了利用 Kubernetes 的新特性，决定一个 pod 是否需要 sidecar 注入的逻辑已经更新。以前，webhook 是在一个粗粒度的水平上触发的，选择命名空间中任何具有匹配的 `istio-injection=enabled` 标签的 pod。

这有两个限制：

- 用 `sidecar.istio.io/inject` 注解选择出单个 pod，仍然会触发 webhook，只是被 Istio 过滤掉了。这可能会产生意想不到的影响，即在没有预期的情况下增加对 Istio 的依赖性。
- 如果不对整个命名空间进行注入，就没有办法通过 `sidecar.istio.io/inject` 来选择加入单个 pod。

这些限制都已经解决了。因此，额外的 pod 可能会被注入，如果它们存在于一个没有设置 `istio-injection` 标签的命名空间中，但在 pod 上的 sidecar.istio.io/inject 注解被设置为 true，则在以前的版本中没有。这种情况并不常见，所以对大多数用户来说，现有的 pod 不会有任何行为上的变化。

如果不需要这种行为，可以用 `--set values.sidecarInjectorWebhook.useLegacySelectors=true` 来暂时禁用它。这个选项将在未来的版本中被删除。

更多信息请参见更新后的[自动 sidecar 注入](https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/)文档。