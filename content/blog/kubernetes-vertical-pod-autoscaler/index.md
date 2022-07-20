---
title: "Kubernetes 垂直自动伸缩走向何方?"
date: 2019-11-10T15:15:43+08:00
draft: false
authors: ["Kgrygiel","Mwielgus"]
translators: ["余广坝"]
summary: "介绍 Kubernetes 社区对 Pod 垂直自动伸缩组件的开发规划。"
tags: ["kubernetes"]
categories: ["kubernetes"]
keywords: ["kubernetes","VPA"]
---

本文为翻译文章，[点击查看原文](https://github.com/kubernetes/community/blob/master/contributors/design-proposals/autoscaling/vertical-pod-autoscaler.md)。

## 编者按

目前 Kubernetes 的 Pod 水平自动伸缩（HPA，Horizontal Pod Autoscaler）已在业界广泛应用。但对一些特殊的 Pod（如一些有状态的 Pod），HPA 并不能很好地解决资源不足的问题。 这就引出 Pod 垂直自动伸缩（VPA，Vertical Pod Autoscaler），本文主要介绍 Kubernetes 社区对 Pod 垂直自动伸缩组件的开发规划。


## VPA定义

**垂直自动伸缩（VPA，Vertical Pod Autoscaler）** 是一个基于历史数据、集群可使用资源数量和实时的事件（如 OMM， 即 out of memory）来自动设置Pod所需资源并且能够在运行时自动调整资源基础服务。

## 介绍

### 背景

- [计算资源](https://kubernetes.io/docs/concepts/configuration/manage-compute-resources-container/)
- [资源服务质量](https://github.com/kubernetes/community/blob/master/contributors/design-proposals/node/resource-qos.md)
- [准入控制器](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)
- [外部准入webhooks](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#external-admission-webhooks)

### 目标

VPA有两个目标：

- 通过自动配置资源请求来减少运维成本。
- 在提高集群资源利用率的同时最小化容器出现内存溢出或 CPU 饥饿的风险。

### 相关特性

#### 水平自动伸缩（Horizontal Pod Autoscaler，HPA）

[HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) 是基于实时的CPU利用率或者其他的一些特定信号动态调整 Replication controller 中 Pod 数量的基础服务。

通常用户在无状态的工作负载时选用 HPA，在有状态的工作负载时选用 VPA。也有一些场景下会混合使用。

#### 集群自动伸缩（Cluster Autoscaler）

[集群自动伸缩](https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler)基于集群整体的资源利用率动态调整 Kubernetes 集群的大小。

集群自动伸缩、HPA 和 VPA 提供了一个完整的自动伸缩解决方案。

#### 初始资源（Initial resources）

[初始资源](https://github.com/kgrygiel/community/blob/master/contributors/design-proposals/initial-resources.md)基于历史资源利用率提供初始资源请求，它仅仅在Pod创建时触发，VPA打算继承使用这个特性。

#### 原地升级（In-place updates）

[原地升级](https://github.com/kubernetes/kubernetes/issues/5774)是一个计划中的功能,在节点上有足够资源的情况下，原地升级无需杀死容器就能够调整已存在容器的资源的请求和限制。

VPA将从这种能力中受益匪浅，但它不被视为最小可行产品 ( Minimum Viable Product, MVP) 的阻挡者。

#### 资源估计（Resource estimation）

资源估计是另外一个计划中的功能，它可以通过暂时回收运行中容器的暂未使用的资源来提高资源利用率。

资源估计与 VPA 的不同在于它基于的时间表比较短（仅基于本地的短期的历史数据），回收以后再提供的质量低，不提供初始资源预测。VPA 和资源估计是互补的。

## 需求

### 功能

- VPA 能够在 Pod 提交时设置容器的资源（CPU和内存的请求和限制）。
- VPA能够调整已存在的 Pod 的容器资源，特别是能够对 CPU 饥饿和内存溢出等事件作出响应。
- 当 VPA 重启 Pod 时，它必须考虑中断服务的成本。
- 用户能够配置 VPA 的在资源上的固定限制,特别是最小和最大资源请求。
- VPA 要与 Pod 控制器兼容，最起码要与 `Deployment` 兼容。 特别地：
  - 资源更新的时候不能干扰 `spec` 更新或和 `spec` 更新冲突。
  - 在已有的部署中，能够滚动更新 VPA 的策略。
- 在创建 Pod 时能够尽快开始遵循 VPA 策略,特别是对于一些只有VPA策略应用以后才能被调度的 Pod 。

### 可用性

重量级的组件（数据库或推荐器）出故障不会阻塞重新创建已存在的 Pod 。Pod 创建路径非常关键的组件必须设计成高可用。

### 可扩展性

在原地升级组件开发好后, VPA 能够使用它。

## 设计

### 综述

- 提出新的API资源: `VerticalPodAutoscaler` 。它包括一个标签识别器 `label selector`（匹配Pod）、资源策略 `resources policy`（控制VPA如何计算资源）、更新策略 `update policy`（控制资源变化应用到Pod）和推荐资源信息。
- VPA `Recommender` 是一个新的组件，它考虑集群中来自 `Metrics Server` 的所有 Pod 的资源利用率信号和内存溢出事件。
- VPA `Recommender` 会监控所有 Pod，为每个 Pod 持续计算新的推荐资源，并将它们存储到 VPA Object 中。
- VPA `Recommender` 会暴露一个同步 API 获取 Pod 详细信息并返回推荐信息。
- 所有的 Pod 创建请求都会通过 `VPA Admission Controller`。 如果 Pod 与任何一个 VPA 对象匹配，那么 `Admission controller` 会依据 VPA `Recommender` 推荐的值重写容器的资源。 如果 `Recommender` 连接不上，它将会返回 VPA Object 中缓存的推荐信息。
- VPA `Updater` 是负责实时更新 Pod 的组件。如果一个 Pod 使用 VPA 的自动模式，那么 `Updater` 会依据推荐资源来决定如何更新。在 MVP 模式中，这需要通过删除 Pod 然后依据新的资源重建 Pod 来实现，这种方法需要 Pod 属于一个 `Replica Set`（或者其他能够重新创建它的组件）。在未来，`Updater` 会利用原地升级，因为重新创建或者重新分配Pod对服务是很有破坏性的，必须尽量减少这种操作。
- VPA 仅仅控制容器的资源请求,它把资源限制设置为无限,资源请求的计算基于对当前和过去运行状况的分析。
- `History Storage` 是从 `API Server` 中获取资源利用率信号和内存溢出并将它们永久保存的组件。`Recommender` 在一开始用这些历史数据来初始化状态。`History Storage` 基础的实现是使用 Prometheus。

### 体系架构

![VPA Architecture Diagram](images/vpa-architecture.png "VPA architecture overview")

### API

我们提出了一个新的类型的API对象 `VertialPodAutoscaler`，它包含了扩容的目标，也就是用于匹配 Pod 的 `label seletctor` 和两个策略模块：更新策略 `update policy` 和资源策略 `resources policy`。此外他还持有 VPA 计算的最新的推荐信息。

#### VPA API 对象综述

```go
// VerticalPodAutoscaler is the configuration for a vertical pod
// autoscaler, which automatically manages pod resources based on historical and
// real time resource utilization.
type VerticalPodAutoscaler struct {
	metav1.TypeMeta
	// Standard object metadata.
	// More info: https://git.k8s.io/community/contributors/devel/api-conventions.md#metadata
	// +optional
	metav1.ObjectMeta

	// Specification of the behavior of the autoscaler.
	// More info: https://git.k8s.io/community/contributors/devel/api-conventions.md#spec-and-status.
	// +optional
	Spec VerticalPodAutoscalerSpec

	// Current information about the autoscaler.
	// +optional
	Status VerticalPodAutoscalerStatus
}

// VerticalPodAutoscalerSpec is the specification of the behavior of the autoscaler.
type VerticalPodAutoscalerSpec {
	// A label query that determines the set of pods controlled by the Autoscaler.
	// More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/#label-selectors
	Selector *metav1.LabelSelector

	// Describes the rules on how changes are applied to the pods.
	// +optional
	UpdatePolicy PodUpdatePolicy

	// Controls how the autoscaler computes recommended resources.
	// +optional
	ResourcePolicy PodResourcePolicy
}

// VerticalPodAutoscalerStatus describes the runtime state of the autoscaler.
type VerticalPodAutoscalerStatus {
	// The time when the status was last refreshed.
	LastUpdateTime metav1.Time
	// The most recently computed amount of resources recommended by the
	// autoscaler for the controlled pods.
	// +optional
	Recommendation RecommendedPodResources	
	// A free-form human readable message describing the status of the autoscaler.
	StatusMessage string
}
```

#### 标签选择 （Label Selector）

`Label Selector` 依据给定的VPA策略决定哪些Pod需要伸缩。`Recommender` 会汇聚匹配给定 VPA 的所有信号，因此用户设置标签来将行为类似的 pod 分组到一个 VPA 下是非常重要的。

现在还没有决定如何处理冲突，例如一个 pod 同时被多个 VPA 策略匹配。

#### 更新策略（Update Policy）

更新策略控制了VPA如何应用更改。 在 MVP 中,它只包含一个单个字段: `mode`

```json
"updatePolicy" {
  "mode": "",
}
```

`mode` 可以设置为三种：

- `Intitial`: VPA 只在创建 Pod 时分配资源，在 Pod 的其他生命周期不改变Pod的资源。
- `Auto`(默认)：VPA 在 Pod 创建时分配资源，并且能够在 Pod 的其他生命周期更新它们，包括淘汰和重新调度 Pod。
- `Off`：VPA 从不改变Pod资源。`Recommender` 而依旧会在VPA对象中生成推荐信息，他们可以被用在演习中。

以下任意一个操作都可以关掉 VPA ：

- 把更新策略改为 `Off`。
- 删除 VPA 组件。
- 改变 Pod 的标签让它不在于 VPA `Label Selector` 匹配。

注意：关闭 VPA 会让 Pod 不再进行进一步的改变，但它不会恢复到正在Pod的最初资源状态，直到用户手动对它进行更新。

```go
// VerticalPodAutoscalerStatus describes the runtime state of the autoscaler.
type VerticalPodAutoscalerStatus {
	// The time when the status was last refreshed.
	LastUpdateTime metav1.Time
	// The most recently computed amount of resources recommended by the
	// autoscaler for the controlled pods.
	// +optional
	Recommendation RecommendedPodResources	
	// A free-form human readable message describing the status of the autoscaler.
	StatusMessage string
}

// UpdateMode controls when autoscaler applies changes to the pod resources.
type UpdateMode string
const (
	// UpdateModeOff means that autoscaler never changes Pod resources.
	// The recommender still sets the recommended resources in the
	// VerticalPodAutoscaler object. This can be used for a "dry run".
	UpdateModeOff UpdateMode = "Off"
	// UpdateModeInitial means that autoscaler only assigns resources on pod
	// creation and does not change them during the lifetime of the pod.
	UpdateModeInitial UpdateMode = "Initial"
	// UpdateModeAuto means that autoscaler assigns resources on pod creation
	// and additionally can update them during the lifetime of the pod,
	// including evicting / rescheduling the pod.
	UpdateModeAuto UpdateMode = "Auto"
)

// PodUpdatePolicy describes the rules on how changes are applied to the pods.
type PodUpdatePolicy struct {
	// Controls when autoscaler applies changes to the pod resources.
	// +optional
	UpdateMode UpdateMode
}
```


#### 资源策略（Resource Policy ）

资源策略控制 VPA 如何计算推荐资源。在 MVP 中，它包含每个容器请求中可选的上限和下限。资源策略在后面可以被扩展为额外的开关可以让用户根据他们特定的场景调整推荐算法。

```go
const (
	// DefaultContainerResourcePolicy can be passed as
	// ContainerResourcePolicy.Name to specify the default policy.
	DefaultContainerResourcePolicy = "*"
)
// ContainerResourcePolicy controls how autoscaler computes the recommended
// resources for a specific container.
type ContainerResourcePolicy struct {
	// Name of the container or DefaultContainerResourcePolicy, in which
	// case the policy is used by the containers that don't have their own
	// policy specified.
	Name string
	// Whether autoscaler is enabled for the container. Defaults to "On".
	// +optional
	Mode ContainerScalingMode
	// Specifies the minimal amount of resources that will be recommended
	// for the container.
	// +optional
	MinAllowed api.ResourceRequirements
	// Specifies the maximum amount of resources that will be recommended
	// for the container.
	// +optional
	MaxAllowed api.ResourceRequirements
}

// PodResourcePolicy controls how autoscaler computes the recommended resources
// for containers belonging to the pod.
type PodResourcePolicy struct {
	// Per-container resource policies.
	ContainerPolicies []ContainerResourcePolicy
}

// ContainerScalingMode controls whether autoscaler is enabled for a speciifc
// container.
type ContainerScalingMode string
const (
	// ContainerScalingModeOn means autoscaling is enabled for a container.
	ContainerScalingModeOn ContainerScalingMode = "On"
	// ContainerScalingModeOff means autoscaling is disabled for a container.
	ContainerScalingModeOff ContainerScalingMode = "Off"
)
```

#### 推荐（Recommendation）

VPA 资源有一个仅输出的字段用来保存一个由 `Recommender` 生成的最近的一次推荐。这个字段可以在 `Recommender` 暂时无法访问时被用来获取最近的一次推荐。这个推荐包含推荐目标资源数量以及范围(最大,最小),可以被 `Updater` 用来决定在何时更新 Pod。在资源紧缺的情况下, `Updater` 可能决定将 Pod 资源压缩到推荐的最小值。范围的宽度同样也影响了推荐的置信区间。

```go
// RecommendedPodResources is the recommendation of resources computed by
// autoscaler.
type RecommendedPodResources struct {
	// Resources recommended by the autoscaler for each container.
	ContainerRecommendations []RecommendedContainerResources
}

// RecommendedContainerResources is the recommendation of resources computed by
// autoscaler for a specific container. Respects the container resource policy
// if present in the spec.
type RecommendedContainerResources struct {
	// Name of the container.
	Name string
	// Recommended amount of resources.
	Target api.ResourceRequirements
	// Minimum recommended amount of resources.
	// Running the application with less resources is likely to have
	// significant impact on performance/availability.
	// +optional
	MinRecommended api.ResourceRequirements
	// Maximum recommended amount of resources.
	// Any resources allocated beyond this value are likely wasted.
	// +optional
	MaxRecommended api.ResourceRequirements
}
```

### 准入控制器（Admission Controller）

VPA Admission Controller 拦截 Pod 创建请求。如果 Pod 与 VPA 配置匹配且模式未设置为 `off`，则控制器通过将建议的资源应用于 Pod `spec` 来重写资源请求。否则它会使 Pod `spec` 保持不变。

控制器通过从 `Recommender` 中的 `/recommendedPodResources` 来获取推荐的资源。如果呼叫超时或失败，控制器将回退到 VPA object 中缓存的建议。如果这也不可用，则控制器允许资源请求传递最初指定的资源。

注意：将来可以通过将 Pod 标记为 `requiring VPA` 来（可选）强制使用 VPA 。这将禁止在创建相应的 VPA 配置之前调度 Pod 。如果找不到匹配的 VPA 配置，则准入控制器将拒绝此类 Pod 。对于想要创建 VPA 配置并提交 Pod 的用户来说，此功能将非常方便。

VPA 准入控制器将作为外部入场钩子（[External Admission Hook](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#external-admission-webhooks)）实施。但请注意，这取决于变异webhook 准入控制器（[Mutating Webhook Admission Controllers](https://github.com/kubernetes/community/blob/master/contributors/design-proposals/api-machinery/admission_control_extension.md#future-work)）。

### 推荐器（Recommender）

`Recommender` 是 VPA 的主要组成部分。它负责计算推荐的资源。在启动时，`Recommender` 获取所有 Pod 的历史资源利用率（无论它们是否使用 VPA ）以及历史存储中的 Pod OOM 事件的历史记录。它聚合这些数据并将其保存在内存中。

在正常操作期间，`Recommender` 通过 `Metrics API` 从 `Metrics Server` 获取资源利用率和新事件的实时更新。此外，它还可以监视群集中的所有 Pod 和所有 `VPA object` 。对于由某个VPA选择器匹配的每个 Pod，`Recommender` 计算推荐的资源并在 `VPA object` 上设置推荐。

意识到每个 VPA object 有一个推荐是非常重要的。用户应使用一个 VPA 来控制具有类似资源使用模式的 Pod ，通常是一组副本或单个工作负载的分片。

`Recommender` 充当了一个 `extension-apiserver`，暴露了一个同步方法，该方法获取 Pod `spec` 和 Pod 元数据并返回推荐的资源。

#### Recommender API

```POST /recommendationQuery```

请求体：

```go
// RecommendationQuery obtains resource recommendation for a pod.
type RecommendationQuery struct {
	metav1.TypeMeta
	// +optional
	metav1.ObjectMeta

	// Spec is filled in by the caller to request a recommendation.
	Spec RecommendationQuerySpec

	// Status is filled in by the server with the recommended pod resources.
	// +optional
	Status RecommendationQueryStatus
}

// RecommendationQuerySpec is a request of recommendation for a pod.
type RecommendationQuerySpec struct {
	// Pod for which to compute the recommendation. Does not need to exist.
	Pod core.Pod
}

// RecommendationQueryStatus is a response to the recommendation request.
type RecommendationQueryStatus {
	// Recommendation holds recommended resources for the pod.
	// +optional
	Recommendation autoscaler.RecommendedPodResources
	// Error indicates that the recommendation was not available. Either
	// Recommendation or Error must be present.
	// +optional
	Error string
}
```

注意，现有 Pod 以及尚未创建的 Pod 都可以调用此 API。

### 更新器（Updater）

`VPA Updater` 是一个负责将推荐资源应用于现有 Pod 的组件。它监视集群中的所有 VPA object 和 Pod ，通过调用 `Recommender API` 定期获取由 VPA 控制的 Pod 的建议。当推荐的资源与实际配置的资源明显不同时，`Updater` 可能会决定更新 Pod。在 MVP 中（直到 Pod 资源的原地升级可用），这意味着需要驱逐现有的 Pod 然后使用推荐的资源重新创建它们。

`Updater` 依赖于其他机制（例如副本集）来重新创建已删除的 Pod 。但是，它不验证是否实际为 Pod 配置了此类机制。这样的检查可以在 CLI 中实现，并在 VPA 匹配 Pod 时警告用户，但 Pod 不会自动重启。

虽然终止Pod是破坏性的并且通常是不期望的，但有时也是合理的：

- 避免 CPU 饥饿.
- 随机降低跨多个 Pod 的相关 OOM 的风险.
- 在长时间内节省资源.

`Updater` 仅在 `updatePolicy.mod` 设置为 `Auto` 时才会配置 Pod 。

根据群集的当前状态（例如，配额，节点上可用的空间或其他调度约束），**`Updater` 还需要了解如何在将推荐应用于Pod之前调整推荐**。否则它可能会永久性地取消一个 Pod 。这种机制尚未设计。

### 推荐计算模型（Recommendation model）

VPA控制容器的资源请求（内存和 CPU）。在 MVP 中，它总是将资源限制设置为无穷大。目前尚不清楚是否存在 VPA 设定资源限制的用例。

资源请求是基于对容器的当前和先前运行以及具有类似属性的其他容器（名称，图像，命令，args）的分析来计算的。推荐的模型（MVP）假设内存和CPU消耗是独立的随机变量，其分布等于在过去 N 天中观察到的分布（**推荐 N 值取为 N =8 以捕获每周峰值**）。未来更先进的模型可能会尝试检测趋势，周期性和其他与时间相关的模式。

对于CPU， 目标是保证容器使用的CPU超过容器请求的 CPU 资源的高百分比（如95%）时间低于某个特定的阈值（如保证只有1%的时间内容器的CPU使用高于请求的 CPU 资源的95%）在此模型中，“CPU 使用”定义为在短时间间隔内测量的平均值。测量间隔越短，对尖峰，延迟敏感的工作负载的建议质量越好。最低合理间隔为 1/min，建议为 1/sec。

对于内存，目标是保证在特定时间窗口内容器使用的内存超过容器请求的内存资源的概率低于某个阈值（例如，在 24 小时内低于 1％）。窗口必须很长（ ≥24h ），以确保 OOM 引起的驱逐不会明显影响服务应用程序的可用性和批量计算的进度（更高级的模型可以允许用户指定 SLO 来控制它）。

#### 内存溢出处理（Handling OOMs）

当容器由于超出可用内存而被逐出时，其实际内存要求是未知的（消耗的量显然给出了下限）。这是通过将 OOM 事件转换为人工内存使用样本来建模的，方法是将“安全边际”乘数 ("safety margin" multiplier ) 应用于最后一次观察到的使用情况。

### 历史存储（History Storage ）

VPA 为历史事件和资源利用的提供者定义数据访问 API 。一开始，至少在资源利用部分，我们将使用 Prometheus 作为此 API 的参考实现，历史事件可以由另一个解决方案支持，例如，Infrastore。用户将能够插入自己的实现。

`History Storage` 被不断填充实时更新的资源利用率和事件，类似于 `Recommender`。它至少保留8天的数据。此数据仅用于在启动时初始化 `Recommender` 。

### 开放问题

- 如果多个 VPA 对象与一个 Pod 匹配，如何解决冲突。
- 如何在将推荐应用于特定容器之前根据集群的当前状态调整推荐（例如，配额，节点上可用的空间或其他调度约束）。

## 未来的工作

### Pod启动时融入 VPA  

在当前提案中，如果在 Pod 接纳时间 (Admission Time) 内 Pod 没有匹配的 VPA 配置，则将使用最初配置的资源调度 Pod。这可能并不是用户希望的行为。特别地，用户可能想要创建 VPA 配置同时提交到 Pod，这会导致竞争条件：结果取决于首先处理哪个资源（VPA 或 Pod）。

为了解决这个问题，我们建议允许使用特殊注释（`requires VPA`）标记 Pod，如果相应的 VPA 不可用，则阻止接纳控制器 (Admission Controlle) 接纳Pod。

另一种方法是引入用于相同目的的VPA初始化器。

### 结合垂直和水平缩放

原则上，只要两个机制在不同的资源上运行，就可以对单个工作负载（Pod 组）使用垂直和水平缩放。正确的方法是让 HPA 基于瓶颈资源扩展组。VPA 可以控制其他资源。例子：

- CPU绑定的工作负载可以根据 CPU 利用率水平伸缩，同时使用垂直伸缩来调整内存。
- IO绑定工作负载可以基于 IO 吞吐量水平伸缩，同时使用垂直伸缩来调整内存和 CPU。

然而，这是一种更高级的自动缩放形式，并且 MVP 版本的 Vertical Pod Autoscaler 不能很好地支持它。实现的难度在于改变实例数不仅会影响瓶颈资源的利用率（这是水平扩展的原则），而且可能也会影响由 VPA 控制的非瓶颈资源。在汇总历史资源利用率和生成建议时，必须扩展 VPA 模型从而能够将组的大小考虑在内，以便将其与HPA相结合。

### 批量工作负载

批处理工作负载具有与延迟敏感工作负载有不同的 CPU 要求。他们关心吞吐量而不是请求延迟，这意味着 VPA 应该将 CPU 需求基于平均 CPU 消耗而不是高百分位的 CPU 分布。

TODO：描述批处理工作负载的推荐模型以及VPA如何区分批处理和服务。一种可能的方法是查看 `PodSpec.restartPolicy`。另一种方法是让用户在 `PodResourcePolicy` 中指定工作负载的延迟要求。

---

转载自：https://github.com/kubernetes/community/blob/master/contributors/design-proposals/autoscaling/vertical-pod-autoscaler.md
