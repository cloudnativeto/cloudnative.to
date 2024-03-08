---
title: "使用 Kyverno 更轻松地保护服务网格"
summary: "利用 Kyverno 为服务网格提供更好的 Pod 安全性。"
authors: ["Kyverno.io"]
translators: ["云原生社区"]
categories: ["Istio"]
tags: ["Kyverno","Service Mesh","Istio"]
date: 2024-03-08T13:00:00+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://kyverno.io/blog/2024/02/04/securing-services-meshes-easier-with-kyverno/
---

如今在 Kubernetes 中，服务网格已经变得司空见惯，有些平台甚至默认将其构建到集群中。服务网格无疑在多种方面提供了诸多好处，这些好处众所周知，但也众所周知，它们显著增加了集群的复杂性。除了增加了复杂性之外，服务网格在强制执行 Pod 安全性方面也带来了（臭名昭著的）问题，因为它们需要提升的权限可能对其他准入控制器造成难以处理的困扰，例如 Kubernetes 自身的 Pod 安全准入控制器。在本文中，我们将更详细地解释这个问题以及在使用服务网格时 Kyverno 如何成为真正的救星，同时为你预览一下即将到来的 Kyverno 1.12 版本中的一些东西，这将使安全服务网格变得轻而易举！

## 介绍

服务网格[为 Kubernetes 应用程序提供了许多好处](https://konghq.com/learning-center/service-mesh/what-is-a-service-mesh)，包括更好的负载均衡、双向 TLS、可观察性等。很可能你现在就在你的某个集群中使用了服务网格。最流行的开源服务网格包括 [Istio](https://istio.io/) 和 [Linkerd](https://linkerd.io/)。所有服务网格的工作方式基本相同，我们不会在这篇博文中深入探讨。一个显著的点是，为了将流量定向到其“旁路”代理并从其“旁路”代理，需要对底层 Linux 节点的 iptables 规则进行一些调整。这些调整或配置修改是服务网格重写网络堆栈路由规则的结果。为了做到这一点，像 Istio 和 Linkerd 这样的网格使用一个 [initContainer](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/) 在任何其他容器启动之前执行此操作。为了使该 initContainer 起作用，它需要一些权限，这往往在注重安全的集群中是困难的。至少，这些 initContainer 必须添加两个[Linux 权限](https://man7.org/linux/man-pages/man7/capabilities.7.html)，以允许它们对网络堆栈进行修改：`NET_ADMIN` 和 `NET_RAW`。这些 initContainer 甚至可能以 root 用户身份运行，这在容器世界是绝对不允许的。

例如，Linkerd 2.14 将在应该成为其网格的任何 Pod 中注入类似以下的 initContainer（为简洁起见，省略了一些字段）。

```yaml
initContainers:
  - image: cr.l5d.io/linkerd/proxy-init:v2.2.3
    name: linkerd-init
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        add:
          - NET_ADMIN
          - NET_RAW
      privileged: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 65534
      seccompProfile:
        type: RuntimeDefault
```

事实上，这些服务网格 initContainer 需要的额外权限被 Kubernetes 官方的 [Pod 安全标准](https://kubernetes.io/docs/concepts/security/pod-security-standards/) 所禁止。这个事实本身并不是主要问题，而是根据使用的策略引擎，为这些特殊的 initContainer 提供许可是非常困难甚至根本不可能的。我们每周都在 [Kyverno 社区](https://kyverno.io/community/)听到用户的痛苦，似乎那些最严重受到影响的用户是那些使用 [Pod 安全准入](https://kubernetes.io/docs/concepts/security/pod-security-admission/) 的人，这是实现 Pod 安全标准的进程中的准入控制器。这已经成为一个显著的问题，以至于 Istio 和 Linkerd [都尝试过](https://istio.io/latest/docs/setup/additional-setup/cni/) 解决它（或者更准确地说，解决它的方法） ，通过提供另一种选择：一个自定义的 CNI 插件。

## CNI 插件

这些 CNI 插件适用于许多情况，但总的来说，它们大都是以牺牲一个问题来解决另一个问题。毕竟，iptables 规则仍然 **必须** 被重写，而网格中的某些东西仍然 **必须** 负责执行这个任务。在这两种情况下，CNI 插件实现了一个 DaemonSet，该 DaemonSet 运行一个特权容器，以在每个节点上执行这些修改，从而避免了在每个 Pod 中都需要一个 initContainer 的需求。这确实有它的优点，但也有缺点。

- DaemonSet 更具特权，因为它需要 hostPath 卷，并将配置文件和二进制文件复制到每个节点。
- 它需要了解 CNI 插件，这是专门的知识。
- 增加了更多的操作和自动化复杂性。
- 与其他 CNI 插件可能发生冲突，因为它们彼此不知道，并且确定如何链接多个插件不是标准化的。
- 在水平集群缩放或节点重启期间可能会出现潜在的竞争条件，因为 DaemonSet Pod 可能在工作负载 Pod 之前启动。

## 问题的关键

但是为什么解决 initContainer 问题会是一个真正的问题呢？答案在于排除。排除，或者你如何免除某些资源不适用于策略，这是区分良好的准入控制器和优秀准入控制器的关键之一。目标是在尽可能不影响你确实需要的事物的同时，提供尽可能强大的 Pod 安全姿态。你希望能够将“好”与“坏”分开，而你的服务网格绝对属于“好”的范畴。但就像筛子筛沙子一样，你必须小心过滤掉“坏”的部分，使你只剩下“好”的部分。在上述 initContainer 示例中，你绝对不希望非服务网格 Pod 添加 `NET_ADMIN` 权限，因为那样会给予它们对网络堆栈的不受限制的访问，从而可能导致窥探和伪装等问题。减少漏斗大小的选项如下，从大到小排序。

- 在整个集群中禁用 Pod 安全
  - 这显然是一个不可行的方案，所以不需要进一步讨论。
- 在受影响的 Namespace 中禁用 Pod 安全
  - 因为我们谈论的是每个必须参与网格的 Pod 中都有一个 initContainer，这基本上意味着你必须在集群的大多数 Namespace 中禁用 Pod 安全，这实际上就像第一种选项一样——行不通。
- 在包含此检查的配置文件中禁用此配置文件（如果适用）
  - Pod 安全标准组织成称为配置文件的集合，每个配置文件包含多个控制。控制是关于*应该*检查哪些字段以及允许或不允许哪些值的命令。你可以找到包含此控制的配置文件，并禁用整个配置文件，但这显然会禁用同一配置文件中的其他控制。这也不是很好。并非所有策略准入控制器都提供此功能。
- 在 Pod 上禁用此控制
  - 请求 `NET_ADMIN` 和 `NET_RAW` 的这些 initContainer 违反了[Pod 安全标准的基线配置文件中的“Capabilities”控制](https://kubernetes.io/docs/concepts/security/pod-security-standards/#baseline)，这是 Pod 安全的基本配置文件（受限制配置文件建立在基线配置文件之上）。你可以简单地不在使用这种 initContainer 的任何 Pod 中检查此控制，但这也不好，因为那样一个恶意容器也可以添加 `NET_ADMIN`。你可能正在执行所有其他控制，但是简单地关闭一个控制还是太多。
- 在一个镜像上禁用此控制
  - 如果你已经达到了这个级别，那么你做得很好。你可以简单地不在与某种模式匹配的镜像上检查这些特权能力。但我们还可以做得更好。（顺便说一句，基于 initContainer 的名称这样做并不完全安全，因为一些恶意用户可能创建一个名为 `istio-init` 的 initContainer，该 initContainer 使用了一个名为 `ubuntu:latest` 的镜像。）
- 在一个镜像上以及在 Pod 中的一个位置上禁用此控制
  - 现在我们来谈谈。我们可以将一个豁免隔离到仅限于特定的镜像和 Pod 中的特定位置。例如，我们可以在 `initContainers[]` 数组中发现 `istio/proxyv2` 镜像时，豁免 `NET_ADMIN` 和 `NET_RAW` 权限检查。如果同一镜像在主要的 `containers[]` 列表中使用，它将导致整个 Pod 被拒绝。

许多人遇到此问题的原因之一是 Pod 安全准入（PSA）。使用 PSA，你可以实现的最精细的粒度是从顶部的第三个项目：禁用包含此检查的配置文件。由于受限制的配置文件包含基线配置文件，因此在 Namespace 上禁用基线配置文件本质上等同于不执行 Pod 安全检查。这个限制是创建 CNI 插件解决方案的主要原因。如果服务网格可以将对这些提升权限的需求分离到只有一个控制器（一个 DaemonSet）中，并且该控制器仅在一个 Namespace 中运行，那么我们基本上可以将该 Namespace 隔离为一个豁免区域。

## Kyverno 中的策略

在 Kyverno 中，您有几种选项来实施 Pod 安全标准。第一种和“原始”的方法是针对 Pod 安全标准中的每个控制编写一个 `validate` 规则。Kyverno 已经提供了完整的这些策略，打包为一个 [Helm 图表](https://github.com/kyverno/kyverno/tree/main/charts/kyverno-policies)，这些策略也可以作为 [单独的策略](https://kyverno.io/policies/?policytypes=Pod%20Security%20Standards%20(Baseline)%2BPod%20Security%20Standards%20(Restricted)) 使用。例如，基线配置文件中的 “Capabilities” 控制可以在[此处](https://kyverno.io/policies/pod-security/baseline/disallow-capabilities/disallow-capabilities/)找到。在这种策略样式中，您可以尽可能地细化。稍微的缺点是，当涉及到预构建的 Pod 安全标准时，它们需要在这些服务网格 initContainers 上进行一些修改。虽然其中一些修改相当温和，但其他可能需要更极端的修改。

例如，以下是为了允许这些服务网格 initContainers 而进行的相同 “Capabilities” 检查可能的样子。

> 由于 Kyverno 在策略编写方面非常灵活，几乎总会有多种编写相同声明的方式，所以如果您已经这样做了而结果有所不同，请不用担心。

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-capabilities
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: adding-capabilities-service-mesh
      match:
        any:
        - resources:
            kinds:
              - Pod
      preconditions:
        all:
        - key: "{{ request.operation || 'BACKGROUND' }}"
          operator: NotEquals
          value: DELETE
      validate:
        message: >-
          Any capabilities added beyond the allowed list (AUDIT_WRITE, CHOWN, DAC_OVERRIDE, FOWNER,
          FSETID, KILL, MKNOD, NET_BIND_SERVICE, SETFCAP, SETGID, SETPCAP, SETUID, SYS_CHROOT)
          are disallowed. Service mesh initContainers may only add NET_ADMIN and NET_RAW to this list.     
        foreach:
          - list: request.object.spec.initContainers[]
            preconditions:
              all:
              - key: "{{ element.image }}"
                operator: AnyIn
                value:
                - "*/istio/proxyv2*"
                - "*/linkerd/proxy-init*"
              - key: "{{ element.securityContext.capabilities.add[] || `[]` }}"
                operator: AnyNotIn
                value: ["NET_ADMIN","NET_RAW","AUDIT_WRITE","CHOWN","DAC_OVERRIDE","FOWNER","FSETID","KILL","MKNOD","NET_BIND_SERVICE","SETFCAP","SETGID","SETPCAP","SETUID","SYS_CHROOT"]
            deny:
              conditions:
                all:
                - key: "{{ element.securityContext.capabilities.add[] || `[]` }}"
                  operator: AnyNotIn
                  value: ["AUDIT_WRITE","CHOWN","DAC_OVERRIDE","FOWNER","FSETID","KILL","MKNOD","NET_BIND_SERVICE","SETFCAP","SETGID","SETPCAP","SETUID","SYS_CHROOT",""]
          - list: request.object.spec.[ephemeralContainers, containers][]
            deny:
              conditions:
                all:
                - key: "{{ element.securityContext.capabilities.add[] || `[]` }}"
                  operator: AnyNotIn
                  value: ["AUDIT_WRITE","CHOWN","DAC_OVERRIDE","FOWNER","FSETID","KILL","MKNOD","NET_BIND_SERVICE","SETFCAP","SETGID","SETPCAP","SETUID","SYS_CHROOT",""]
```

请随时在 [Kyverno Playground](https://playground.kyverno.io/#/) 中试用一下，看看效果。里面包含了 Istio 和 Linkerd 的示例 Pod，所以尝试取消注释并复制元素来测试一下。

由于 Istio 的 initContainer 需要比 Linkerd 的更多权限，因此还需要对一些其他策略进行一些轻微的修改，这些修改可以在[受限配置文件](https://kubernetes.io/docs/concepts/security/pod-security-standards/#restricted) 中找到。例如，以下是一个 [Kyverno Playground 链接](https://playground.kyverno.io/#/)，展示了如何修改 [require-run-as-nonroot 策略](https://kyverno.io/policies/pod-security/restricted/require-run-as-nonroot/require-run-as-nonroot/) 来豁免 `istio-init`。

像上面展示的个别 Kyverno 策略允许最大的灵活性，但在 Kyverno 中实现 Pod 安全标准还有一种更简单的方式。实施这些标准的第二种方式是使用我们称之为 “子规则” 的方式来实现 `validate` 样式策略。[在这种样式](https://kyverno.io/docs/writing-policies/validate/#pod-security) 中，`podSecurity` 元素用于特指这些 Pod 安全标准。在幕后，Kyverno 使用与 Kubernetes 的 Pod 安全 Admission 完全相同的库，但使用不同的 “包装器” 使其应用更加灵活。

例如，使用这种类型的子规则将允许您轻松实施 Pod 安全标准的整个基线配置文件，并在其中排除这些服务网格图像，如下所示。

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: pod-security-standards
spec:
  background: true
  validationFailureAction: Enforce
  rules:
  - name: baseline-service-mesh
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      podSecurity:
        level: baseline  ## 强制执行基线配置文件
        version: latest  ## 强制执行此配置文件的最新版本
        exclude:         ##

 排除特定控制，可选特定图像
        - controlName: Capabilities
          images:
          - "*/istio/proxyv2*"
          - "*/linkerd/proxy-init*"
```

这里的 `exclude[]` 块命名了我们到目前为止一直在讨论的 “Capabilities” 控制，`images[]` 字段命名了应该被排除的两个特定的服务网格图像。通过这种能力，您可以获得类似 PSA 的行为，但是具有简单不可能实现的细粒度。

这两个选项为您提供了丰富的选择，但它们都涉及直接修改策略。还有另一种选择，允许将异常与策略本身分离，这就是 [策略异常](https://kyverno.io/docs/writing-policies/exceptions/)。例如，您可以编写一个策略异常资源，豁免给定 Pod 在特定策略中的特定规则。这对于开发人员自助服务特别有用，因为它允许其他用户请求异常，而无需查看 Kyverno 策略。但是，在 1.11 中，这在某些情况下还不够细粒度，因此在 Kyverno 1.12 中进行了一些很好的升级。接下来将更多介绍。

## 1.12 中的增强功能

在即将推出的 Kyverno 1.12 中，我们正在进行一些令人兴奋的增强，这些增强将使针对诸如服务网格容器等用例的排除变得更加容易。

1.12 中的第一个增强功能是通过列出特定字段及其值来进一步分类 podSecurity 子规则的排除。这使您既可以使用简单的策略语言，又可以达到最低级别的细粒度。例如，这是您将能够强制执行 Pod 安全标准的整个基线配置文件，但仅从特定的 initContainers 列表中排除 Istio 和 Linkerd 图像的方法。

```yaml
### 即将推出的 Kyverno 1.12 ###
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: pod-security-standards
spec:
  background: true
  validationFailureAction: Enforce
  rules:
    - name: baseline-service-mesh
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        podSecurity:
          level: baseline
          version: latest
          exclude:
            - controlName: Capabilities
              images:
                - "*/istio/proxyv2*"
                - "*/linkerd/proxy-init*"
              restrictedField: spec.initContainers[*].securityContext.capabilities.add
              values:
                - NET_ADMIN
                - NET_RAW
```

第二个增强功能是对策略异常的增强，使其具有 podSecurity 意识性，即您将能够在 PolicyException 资源中豁免策略异常的特定控制名称。例如，以下是您将能够在 Kyverno 1.12 中为先前的 `validate.podSecurity` 子规则创建的 PolicyException，使您可以将这些排除与只在 `staging` 命名空间中创建的 Pod 分离开来。

```yaml
### 即将推出的 Kyverno 1.12 ###
apiVersion: kyverno.io/v2beta1
kind: PolicyException
metadata:
  name: pod-security-exception
  namespace: kyverno
spec:
  exceptions:
  - policyName: pod-security-standards
    ruleNames:
    - baseline-service-mesh
  match:
    any:
    - resources:
        namespaces:
        - staging
  podSecurity:
    - controlName: Capabilities
      images:
        - "*/istio/proxyv2*"
        - "*/linkerd/proxy-init*"
```

这将在未来进一步增强，适用于特定容器。查看并关注 [此处的问题](https://github.com/kyverno/kyverno/issues/8570) 获取详情。

## 结语

本文介绍了一些有关服务网格的内容，以及为什么使用 initContainers 以及它们带来的安全问题。我们介绍了 Kyverno 如何以最精细的方式解决这些问题，同时提供了下一个版本的一瞥，以及如何使此过程更加简单。如果您有任何其他问题或反馈，请与 Kyverno 项目 [联系](https://kyverno.io/community/#get-in-touch)！
