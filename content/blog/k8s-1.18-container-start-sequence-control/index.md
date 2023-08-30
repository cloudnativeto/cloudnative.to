---
title: "Kubernetes 上如何控制容器的启动顺序？"
summary: "Kubernetes 上如何保证容器按照期望的顺序启动？参考 Istio 的实现，模拟容器按指定顺序启动。"
authors: ["张晓辉"]
categories: ["Kubernetes"]
tags: ["Kubernetes", "Istio"]
date: 2021-05-04T21:13:54+08:00
---

去年写过一篇博客：[控制 Pod 内容器的启动顺序](https://mp.weixin.qq.com/s/5UXhXpwPDBh2xuGKq9Nqig)，分析了 [TektonCD](https://github.com/tektoncd)  的容器启动控制的原理。

## 背景

为什么要做容器启动顺序控制？我们都知道 Pod 中除了 `init-container` 之外，是允许添加多个容器的。类似 TektonCD 中 `task` 和 `step` 的概念就分别与 `pod` 和 `container` 对应，而 `step` 是按照顺序执行的。此外还有服务网格的场景，sidecar 容器需要在服务容器启动之前完成配置的加载，也需要对容器的启动顺序加以控制。否则，服务容器先启动，而 sidecar 还无法提供网络上的支持。

### 现实

![sidecar-lifecycle-1](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/04/30/sidecarlifecycle1.gif)

### 期望

![sidecar-lifecycle-2](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/04/30/sidecarlifecycle2.gif)

到了这里肯定有同学会问，`spec.containers[]` 是一个数组，数组是有顺序的。Kubernetes 也确实是按照顺序来创建和启动容器，但是 **容器启动成功，并不表示容器可以对外提供服务**。

在 Kubernetes 1.18 非正式版中曾在 Lifecycle 层面提供了对  `sidecar 类型容器的` 支持，但是最终该功能并[没有落地](https://github.com/kubernetes/enhancements/issues/753#issuecomment-713471597)。

那到底该怎么做？

## TL;DR

笔者准备了一个简单的 [go 项目](https://github.com/addozhang/k8s-container-sequence-sample)，用于模拟 sidecar 的启动及配置加载。

克隆代码后可以通过 `make build` 构建出镜像，假如你是用的 minikube 进行的实验，可以通过命令 `make load-2-minikube` 将镜像加载到 minikube 节点中。

使用 Deployment 的方式进行部署，直接用 Pod 也可以。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  creationTimestamp: null
  labels:
    app: sample
  name: sample
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sample
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: sample
    spec:
      containers:
      - image: addozhang/k8s-container-sequence-sidecar:latest
        name: sidecar
        imagePullPolicy: IfNotPresent
        lifecycle:
          postStart:
            exec:
              command:
                - /entrypoint
                - wait
      - image: busybox:latest
        name: app
        imagePullPolicy: IfNotPresent
        command: ["/bin/sh","-c"]
        args: ["date; echo 'app container started'; tail -f /dev/null"]
```

下面的截图中，演示了在 `sample` 命名空间中，pod 内两个容器的执行顺序。

![2021-04-30 06.28.19](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/04/30/20210430-062819.gif)


## Kubernetes 源码

在 kubelet 的源码 `pkg/kubelet/kuberuntime/kuberuntime_manager.go` 中，`#SyncPod` 方法用于创建 Pod，步骤比较繁琐，直接看第 7 步：创建普通容器。

```go
// SyncPod syncs the running pod into the desired pod by executing following steps:
//
//  1. Compute sandbox and container changes.
//  2. Kill pod sandbox if necessary.
//  3. Kill any containers that should not be running.
//  4. Create sandbox if necessary.
//  5. Create ephemeral containers.
//  6. Create init containers.
//  7. Create normal containers.
func (m *kubeGenericRuntimeManager) SyncPod(pod *v1.Pod, podStatus *kubecontainer.PodStatus, pullSecrets []v1.Secret, backOff *flowcontrol.Backoff) (result kubecontainer.PodSyncResult) {
    
    ...
    
	// Step 7: start containers in podContainerChanges.ContainersToStart.
	for _, idx := range podContainerChanges.ContainersToStart {
		start("container", containerStartSpec(&pod.Spec.Containers[idx]))
	}

	return
}
```

在 `#start` 方法中调用了 `#startContainer` 方法，该方法会启动容器，并返回容器启动的结果。注意，这里的结果还 **包含了容器的 Lifecycle hooks 调用**。 

也就是说，假如容器的 `PostStart` hook 没有正确的返回，kubelet 便不会去创建下一个容器。

```go
// startContainer starts a container and returns a message indicates why it is failed on error.
// It starts the container through the following steps:
// * pull the image
// * create the container
// * start the container
// * run the post start lifecycle hooks (if applicable)
func (m *kubeGenericRuntimeManager) startContainer(podSandboxID string, podSandboxConfig *runtimeapi.PodSandboxConfig, spec *startSpec, pod *v1.Pod, podStatus *kubecontainer.PodStatus, pullSecrets []v1.Secret, podIP string, podIPs []string) (string, error) {
     
     ...
     
	// Step 4: execute the post start hook.
	if container.Lifecycle != nil && container.Lifecycle.PostStart != nil {
		kubeContainerID := kubecontainer.ContainerID{
			Type: m.runtimeName,
			ID:   containerID,
		}
		msg, handlerErr := m.runner.Run(kubeContainerID, pod, container, container.Lifecycle.PostStart)
		if handlerErr != nil {
			m.recordContainerEvent(pod, container, kubeContainerID.ID, v1.EventTypeWarning, events.FailedPostStartHook, msg)
			if err := m.killContainer(pod, kubeContainerID, container.Name, "FailedPostStartHook", reasonFailedPostStartHook, nil); err != nil {
				klog.ErrorS(fmt.Errorf("%s: %v", ErrPostStartHook, handlerErr), "Failed to kill container", "pod", klog.KObj(pod),
					"podUID", pod.UID, "containerName", container.Name, "containerID", kubeContainerID.String())
			}
			return msg, fmt.Errorf("%s: %v", ErrPostStartHook, handlerErr)
		}
	}

	return "", nil
}
```

## 实现方案

![](https://atbug.oss-cn-hangzhou.aliyuncs.com/2021/04/30/16197365667225.jpg)

[cmd/entrypoint/wait.go#L26](https://github.com/addozhang/k8s-container-sequence-sample/blob/main/cmd/entrypoint/wait.go#L26) （这里参考了 Istio 的 pilot-agent 实现）

在 `PostStart` 中持续的去检查 `/ready` 断点，可以 hold 住当前容器的创建流程。保证 `/ready` 返回 `200` 后，kubelet 才会去创建下一个容器。

这样就达到了前面截图中演示的效果。

```go
for time.Now().Before(timeoutAt) {
	err = checkIfReady(client, url)
	if err == nil {
		log.Println("sidecar is ready")
		return nil
	}
	log.Println("sidecar is not ready")
	time.Sleep(time.Duration(periodMillis) * time.Millisecond)
}
return fmt.Errorf("sidecar is not ready in %d second(s)", timeoutSeconds)
```

## 参考

* [Sidecar container lifecycle changes in Kubernetes 1.18](https://banzaicloud.com/blog/k8s-sidecars/)
* [Delaying application start until sidecar is ready](https://medium.com/@marko.luksa/delaying-application-start-until-sidecar-is-ready-2ec2d21a7b74)
