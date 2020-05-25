---
title: "Tekton 的工作原理"
description: "结合源码和场景分析 Tekton 的工作原理。"
author: "[张晓辉](https://atbug.com)"
image: "https://gw.alipayobjects.com/mdn/rms_95b965/afts/img/A*eUqkTKk66gkAAAAAAAAAAABkARQnAQ"
categories: ["DevOps"]
tags: ["Tekton", "CICD"]
date: 2020-05-23T22:47:14+08:00
type: "post"
---

作者：张晓辉：资深码农，12 年软件开发经验。曾在汇丰软件、唯品会、数人云等公司任职。目前就职小鹏汽车，在基础架构团队从事技术中台的研发。

> 这篇文章是基于 Tekton Pipeline 的最新版本`v0.12.1`版本。

快速入门请参考：[云原生 CICD: Tekton Pipeline 实战](https://atbug.com/tekton-trigger-practice/) ，*实战是基于版本 v0.10.x*。

## Pipeline CRD 与核心资源的关系

```shell
$ k api-resources --api-group=tekton.dev
NAME                SHORTNAMES   APIGROUP     NAMESPACED   KIND
clustertasks                     tekton.dev   false        ClusterTask
conditions                       tekton.dev   true         Condition
pipelineresources                tekton.dev   true         PipelineResource
pipelineruns        pr,prs       tekton.dev   true         PipelineRun
pipelines                        tekton.dev   true         Pipeline
taskruns            tr,trs       tekton.dev   true         TaskRun
tasks                            tekton.dev   true         Task
```

Tekton Pipelines提供了上面的CRD，其中部分CRD与k8s core中资源相对应

- Task => Pod
- Task.Step => Container

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2020/05/23/15902164552270.jpg)

## 工作原理

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2020/05/23/15902280074872.jpg)
(图片来自)


Tekton Pipeline 是基于 Knative 的实现，pod `tekton-pipelines-controller` 中有两个 [Knative Controller](https://knative.dev/docs/eventing/samples/writing-receive-adapter-source/03-controller/)的实现：PipelineRun 和 TaskRun。

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2020/05/23/15902270934199.jpg)


### Task的执行顺序

PipelineRun Controller 的 `#reconcile()`方法，监控到有`PipelineRun`被创建。然后从`PipelineSpec`的 tasks 列表，构建出一个图（`graph`），用于描述`Pipeline`中 Task 间的依赖关系。依赖关系是通过`runAfter`和`from`，进而控制[Task的执行顺序](#Task的执行顺序)。与此同时，准备`PipelineRun`中定义的`PipelineResources`。

```go
// Node represents a Task in a pipeline.
type Node struct {
	// Task represent the PipelineTask in Pipeline
	Task Task
	// Prev represent all the Previous task Nodes for the current Task
	Prev []*Node
	// Next represent all the Next task Nodes for the current Task
	Next []*Node
}

// Graph represents the Pipeline Graph
type Graph struct {
	//Nodes represent map of PipelineTask name to Node in Pipeline Graph
	Nodes map[string]*Node
}

func Build(tasks Tasks) (*Graph, error) {
    ...
}
```

`PipelineRun`中定义的参数（parameters）也会注入到`PipelineSpec`中：

```go
pipelineSpec = resources.ApplyParameters(pipelineSpec, pr)
```

接下来就是调用`dag#GetSchedulable()`方法，获取未完成（通过Task状态判断）的 Task 列表；

```go
func GetSchedulable(g *Graph, doneTasks ...string) (map[string]struct{}, error) {
    ...
}
```

为 Task A 创建`TaskRun`，假如`Task`配置了`Condition`。会先为 condition创建一个`TaskRun`，只有在 condition 的`TaskRun`运行成功，才会运行 A 的`TaskRun`；否则就跳过。

### Step的执行顺序

这一部分篇幅较长，之前的文章 [控制 Pod 内容器的启动顺序](https://atbug.com/control-process-order-of-pod-containers/) 中提到过。

这里补充一下[Kubernetes Downward API](https://kubernetes.io/docs/tasks/inject-data-application/downward-api-volume-expose-pod-information/#the-downward-api)的使用，Kubernetes Downward API的引入，控制着 `Task` 的第一个 `Step` 在何时执行。

`TaskRun` Controller 在 reconciling 的过程中，在相应的 `Pod` 状态变为`Running`时，会将`tekton.dev/ready=READY`写入到 Pod 的 annotation 中，来通知第一个`Step`的执行。

Pod的部分内容：
```yaml
spec:
  containers:
    - args:
      - -wait_file
      - /tekton/downward/ready
      - -wait_file_content
      - -post_file
      - /tekton/tools/0
      - -termination_path
      - /tekton/termination
      - -entrypoint
      - /ko-app/git-init
      - --
      - -url
      - ssh://git@gitlab.nip.io:8022/addozhang/logan-pulse.git
      - -revision
      - develop
      - -path
      - /workspace/git-source
      command:
      - /tekton/tools/entrypoint
      volumeMounts:
      - mountPath: /tekton/downward
        name: tekton-internal-downward
      
  volumes:
    - downwardAPI:
        defaultMode: 420
        items:
        - fieldRef:
            apiVersion: v1
            fieldPath: metadata.annotations['tekton.dev/ready']
          path: ready
      name: tekton-internal-downward
```

对原生的排序step container进一步处理：启动命令使用`entrypoint`提供，并设置执行参数：

`entrypoint.go`
```go
func orderContainers(entrypointImage string, steps []corev1.Container, results []v1alpha1.TaskResult) (corev1.Container, []corev1.Container, error) {
	initContainer := corev1.Container{
		Name:         "place-tools",
		Image:        entrypointImage,
		Command:      []string{"cp", "/ko-app/entrypoint", entrypointBinary},
		VolumeMounts: []corev1.VolumeMount{toolsMount},
	}

	if len(steps) == 0 {
		return corev1.Container{}, nil, errors.New("No steps specified")
	}

	for i, s := range steps {
		var argsForEntrypoint []string
		switch i {
		case 0:
			argsForEntrypoint = []string{
				// First step waits for the Downward volume file.
				"-wait_file", filepath.Join(downwardMountPoint, downwardMountReadyFile),
				"-wait_file_content", // Wait for file contents, not just an empty file.
				// Start next step.
				"-post_file", filepath.Join(mountPoint, fmt.Sprintf("%d", i)),
				"-termination_path", terminationPath,
			}
		default:
			// All other steps wait for previous file, write next file.
			argsForEntrypoint = []string{
				"-wait_file", filepath.Join(mountPoint, fmt.Sprintf("%d", i-1)),
				"-post_file", filepath.Join(mountPoint, fmt.Sprintf("%d", i)),
				"-termination_path", terminationPath,
			}
		}
    ...
}
```

### 自动运行的容器

这些自动运行的容器作为 pod 的`initContainer`会在 step 容器运行之前运行

#### `credential-initializer`

用于将 `ServiceAccount` 的相关secrets持久化到容器的文件系统中。比如 ssh 相关秘钥、config文件以及know_hosts文件；docker registry 相关的凭证则会被写入到 docker 的配置文件中。

#### `working-dir-initializer`

收集`Task`内的各个`Step`的`workingDir`配置，初始化目录结构

#### `place-scripts`

假如`Step`使用的是`script`配置（与command+args相对），这个容器会将脚本代码（`script`字段的内容）持久化到`/tekton/scripts`目录中。

注：所有的脚本会自动加上`#!/bin/sh\nset -xe\n`，所以`script`字段里就不必写了。

####  `place-tools`

将`entrypoint`的二进制文件，复制到`/tekton/tools/entrypoint`.

### Task/Step间的数据传递

针对不同的数据，有多种不同的选择。比如`Workspace`、`Result`、`PipelineResource`。对于由于`Task`的执行是通过`Pod`来完成的，而`Pod`会调度到不同的节点上。因此`Task`间的数据传递，需要用到持久化的卷。

而`Step`作为`Pod`中的容器来运行，

#### Workspace

工作区，可以理解为一个挂在到容器上的卷，用于文件的传递。

##### `persistentVolumeClaim`

引用已存在`persistentVolumeClaim`卷（volume）。这种工作空间，可多次使用，需要先进行创建。比如 Java 项目的 `maven`，编译需要本地依赖库，这样可以节省每次编译都要下载依赖包的成本。

```yaml
workspaces:
- name: m2
  persistentVolumeClaim:
    claimName: m2-pv-claim
```


```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: m2-pv
  labels:
    type: local
spec:
  storageClassName: manual
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteMany
  hostPath:
    path: "/data/.m2"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: m2-pv-claim
spec:
  storageClassName: manual
  # volumeName: m2-pv
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
```

##### `volumeClaimTemplate`

为每个`PipelineRun`或者`TaskRun`创建`PersistentVolumeClaim`卷（volume）的模板。比如一次构建需要从 git 仓库克隆代码，而针对不同的流水线代码仓库是不同的。这里就会用到`volumeClaimTemplate`，为每次构建创建一个`PersistentVolumeClaim`卷。（从0.12.0开始）

生命周期同`PipelineRun`或者`TaskRun`，运行之后释放。

```yaml
workspaces:
- name: git-source
  volumeClaimTemplate:
    spec:
      accessModes:
      - ReadWriteMany
      resources:
        requests:
          storage: 1Gi
```

相较于`persistantVolumeClain`类型的workspace，`volumeClaimTemplate`不需要在每次在`PipelineRun`完成后清理工作区；并发情况下可能会出现问题。

##### `emptyDir`

引用`emptyDir`卷，跟随`Task`生命周期的临时目录。适合在`Task`的`Step`间共享数据，无法在多个`Task`间共享。

```yaml
workspaces:
- name: temp
  emptyDir: {}
```

##### `configMap`

引用一个`configMap`卷，将`configMap`卷作为工作区，有如下限制：
- 挂载的卷是`只读`的
- 需要提前创建`configMap`
- `configMap`的[大小限制为1MB（K8s的限制）](https://github.com/kubernetes/kubernetes/blob/f16bfb069a22241a5501f6fe530f5d4e2a82cf0e/pkg/apis/core/validation/validation.go#L5042)

使用场景，比如使用`maven`编译Java项目，配置文件`settings.xml`可以使用`configMap`作为工作区

```yaml
workspaces:
- name: maven-settings
  configmap:
    name: maven-settings
```

##### `secret`

用于引用`secret`卷，同`configMap`工作区一样，也有限制：
- 挂载的卷是`只读`的
- 需要提前创建`secret`
- `secret`的[大小限制为1MB（K8s的限制）](https://github.com/kubernetes/kubernetes/blob/f16bfb069a22241a5501f6fe530f5d4e2a82cf0e/pkg/apis/core/validation/validation.go#L5042)

#### Result

`results`字段可以用来配置多个文件用来存储`Tasks`的执行结果，这些文件保存在`/tekton/results`目录中。

在`Pipeline`中，可以通过`tasks.[task-nanme].results.[result-name]`注入到其他`Task`的参数中。

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: print-date
  annotations:
    description: |
      A simple task that prints the date
spec:
  results:
    - name: current-date-unix-timestamp
      description: The current date in unix timestamp format
    - name: current-date-human-readable
      description: The current date in human readable format
  steps:
    - name: print-date-unix-timestamp
      image: bash:latest
      script: |
        #!/usr/bin/env bash
        date +%s | tee $(results.current-date-unix-timestamp.path)
    - name: print-date-humman-readable
      image: bash:latest
      script: |
        #!/usr/bin/env bash
        date | tee $(results.current-date-human-readable.path)
---
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  name: pass-date
spec:
  pipelineSpec:
    tasks:
      - name: print-date
        taskRef:
          name: print-date
      - name: read-date
        runAfter: #配置执行顺序
          - print-date
        taskSpec:
          params:
            - name: current-date-unix-timestamp
              type: string
            - name: current-date-human-readable
              type: string
          steps:
            - name: read
              image: busybox
              script: |
                echo $(params.current-date-unix-timestamp)
                echo $(params.current-date-human-readable)
        params:
          - name: current-date-unix-timestamp
            value: $(tasks.print-date.results.current-date-unix-timestamp) # 注入参数
          - name: current-date-human-readable
            value: $(tasks.print-date.results.current-date-human-readable) # 注入参数      
```

执行结果：

```
┌──────Logs(tekton-pipelines/pass-date-read-date-rhlf2-pod-9b2sk)[all] ──────────                                                                       │
│ place-scripts stream closed                                                                                                                                                                                                                                                             ││ step-read 1590242170                                                                                                                                                                                                                                                                    │
│ step-read Sat May 23 13:56:10 UTC 2020                                                                                                                                                                                                                                                  ││ step-read + echo 1590242170                                                                                                                                                                                                                                                             │
│ step-read + echo Sat May 23 13:56:10 UTC 2020                                                                                                                                                                                                                                           │
│ place-tools stream closed                                                                                                                                                                                                                                                               │
│ step-read stream closed                                                                                                                                                                                                                                                                 │
│
```

#### PipelineResource

`PipelineResource`在最后提，因为目前只是`alpha`版本，何时会进入`beta`或者弃用目前还是未知数。有兴趣的可以看下这里：[Why Aren’t PipelineResources in Beta?](https://tekton.dev/docs/pipelines/resources/#why-aren-t-pipelineresources-in-beta)

简单来说，`PipelineResource`可以通过其他的方式实现，而其本身也存在弊端：比如实现不透明，debug有难度；功能不够强；降低了Task的重用性等。

比如`git`类型的`PipelineResource`，可以通过`workspace`和`git-clone` Task来实现；存储类型的，也可以通过`workspace`来实现。

这也就是为什么[上面介绍workspace的篇幅](#Workspace)比较大。个人也偏向于使用`workspace`，灵活度高；使用workspace的Task重用性强。

## 参考

- 云原生 CICD: Tekton Pipeline 实战：[https://atbug.com/tekton-trigger-practice](https://atbug.com/tekton-trigger-practice)
- 控制 Pod 内容器的启动顺序：[https://atbug.com/control-process-order-of-pod-containers](https://atbug.com/control-process-order-of-pod-containers)
- Knative Controller：[https://knative.dev/docs/eventing/samples/writing-receive-adapter-source/03-controller](https://knative.dev/docs/eventing/samples/writing-receive-adapter-source/03-controller)
- Why Aren’t PipelineResources in Beta?：[https://tekton.dev/docs/pipelines/resources/#why-aren-t-pipelineresources-in-beta](https://tekton.dev/docs/pipelines/resources/#why-aren-t-pipelineresources-in-beta)

