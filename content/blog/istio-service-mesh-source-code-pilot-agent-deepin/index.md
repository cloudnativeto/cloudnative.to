---
title: "Service Mesh 深度学习系列 part1—istio 源码分析之 pilot-agent 模块分析"
date: 2018-07-11T14:24:24+08:00
draft: false
authors: ["丁轶群"]
summary: "本文是谐云科技 CTO 丁轶群博士对 Istio 0.8 版本代码中的 pilot-agent 的深度源码解析。"
tags: ["istio"]
categories: ["service mesh"]
keywords: ["service mesh","istio","envoy"]
---

本文分析的 istio 代码版本为 0.8.0，commit 为 0cd8d67，commit 时间为 2018 年 6 月 18 日。

本文为`Service Mesh深度学习系列`之一：

- [Service Mesh 深度学习系列 part1—istio 源码分析之 pilot-agent 模块分析](/blog/istio-service-mesh-source-code-pilot-agent-deepin)
- [Service Mesh 深度学习系列 part2—istio 源码分析之 pilot-discovery 模块分析](/blog/istio-service-mesh-source-code-pilot-discovery-module-deepin)
- [Service Mesh 深度学习系列 part3—istio 源码分析之 pilot-discovery 模块分析（续）](/blog/istio-service-mesh-source-code-pilot-discovery-module-deepin-part2)

## pilot 总体架构 
![](006tKfTcly1ft5wnmvat9j31kw0tu116.jpg)
上面是[官方关于 pilot 的架构图](https://github.com/istio/old_pilot_repo/blob/master/doc/design.md)，因为是 old_pilot_repo 目录下，可能与最新架构有出入，仅供参考。所谓的 pilot 包含两个组件：pilot-agent 和 pilot-discovery。图里的 agent 对应 pilot-agent 二进制，proxy 对应 envoy 二进制，它们两个在同一个容器中，discovery service 对应 pilot-discovery 二进制，在另外一个跟应用分开部署的单独的 deployment 中。   

1. **discovery service**：从 Kubernetes apiserver list/watch service/endpoint/pod/node等资源信息，监听istio控制平面配置信息（Kubernetes CRD），翻译为 envoy 可以直接理解的配置格式。
2. **proxy**：也就是 envoy，直接连接 discovery service，间接地从 Kubernetes apiserver 等服务注册中心获取集群中微服务的注册情况
3. **agent**：本文分析对象 pilot-agent，生成 envoy 配置文件，管理 envoy 生命周期
4. **service A/B**：使用了 istio 的应用，如 Service A/B的进出网络流量会被proxy接管

> 对于模块的命名方法，本文采用模块对应源码 main.go 所在包名称命名法。其他 istio 分析文章有其他命名方法。比如 pilot-agent 也被称为 istio pilot，因为它在 Kubernetes 上的部署形式为一个叫 istio-pilot 的 deployment。


## pilot-agent 的部署存在形式
pilot-agent在pilot/cmd包下面，是个单独的二进制。 

pilot-agent 跟 envoy 打包在同一个 docker 镜像里，镜像由 Dockerfile.proxy 定义。Makefile（include 了 tools/istio-docker.mk）把这个 dockerfile build 成了`${HUB}/proxy:${TAG}`镜像，也就是 Kubernetes 里跟应用放在同一个 pod 下的 sidecar。非 Kubernetes 情况下需要把 pilot-agent、envoy 跟应用部署在一起，这个就有点“污染”应用的意思了。  

> 支持 v2 api 的 sidecar 镜像为 proxyv2，镜像中包含的 pilot-agent 和 envoy 二进制文件和 proxy 镜像中的完全相同，只是使用不同的 envoy bootstrap 配置（envoy_bootstrap_tmpl.json vs. envoy_bootstrap_v2.json）。但是当前仅完成部分开发工作，makefile 中 build proxyv2 镜像的 target 默认也不会自动执行。

> 以上的 HUB 和 TAG 是编译 istio 源码过程中 makefile 中的一些变量，HUB 对应镜像保存的仓库，TAG 默认为 istio 版本号，如 0.8.0。

## pilot-agent 功能简述
在 proxy 镜像中，pilot-agent 负责的工作包括：

1. 生成 envoy 的配置
2. 启动 envoy
2. 监控并管理 envoy 的运行状况，比如 envoy 出错时 pilot-agent 负责重启 envoy，或者 envoy 配置变更后 reload envoy

而 envoy 负责接受所有发往该 pod 的网络流量，分发所有从 pod 中发出的网络流量。  

> 根据代码中的 sidecar-injector-configmap.yaml（用来配置如何自动化地 inject istio sidecar），inject 过程中，除了 proxy 镜像作为 sidecar 之外，每个 pod 还会带上 initcontainer（Kubernetes 中的概念），具体镜像为 proxy_init。proxy_init 通过注入 iptables 规则改写流入流出 pod 的网络流量规则，使得流入流出 pod 的网络流量重定向到 proxy 的监听端口，而应用对此无感。

## pilot-agent 主要功能分析之一：生成 envoy 配置
envoy 的配置主要在 pilot-agent 的 init 方法与 proxy 命令处理流程的前半部分生成。其中 init 方法为 pilot-agent 二进制的命令行配置大量的 flag 与 flag 默认值，而 proxy 命令处理流程的前半部分负责将这些 flag 组装成为 envoy 的配置 ProxyConfig 对象。下面分析几个相对重要的配置。

### role
pilot-agent 的 role 类型为 model 包下的 Proxy，决定了 pilot-agent 的“角色”，role 包括以下属性：

1. Type
	pilot-agent 有三种运行模式。根据 role.Type 变量定义，类型为 model.Proxy，定义在 context.go 文件中，允许的 3 个取值范围为：
	1.	"sidecar"
	默认值，可以在启动 pilot-agent，调用 proxy 命令时覆盖。Sidecar type is used for sidecar proxies in the application containers
	2. "ingress" 
	Ingress type is used for cluster ingress proxies
	3. "router" 
	Router type is used for standalone proxies acting as L7/L4 routers
2. IPAddress, ID, Domain 
	它们都可以通过 pilot-agent 的 proxy 命令的对应 flag 来提供用户自定义值。如果用户不提供，则会在 proxy 命令执行时，根据 istio 连接的服务注册中心（service registry）类型的不同，会采用不同的配置方式。agent 当前使用的服务注册中心类型保存在 pilot-agent 的 registry 变量里，在 init 函数中初始化为默认值 Kubernetes。当前只处理以下三种情况：
	1. Kubernetes
	2. Consul
	3. Other

| registry 值 | role.IPAddress | rule.ID |role.Domain  |
|:--|:--|:--|:--|
|Kubernetes  | 环境变量 INSTANCE_IP | 环境变量 POD_NAME.环境变量 POD_NAMESPACE | 环境变量 POD_NAMESPACE.svc.cluster.local |
|Consul  | private IP，默认 127.0.0.1 | IPAddress.service.consul |  service.consul|
|Other  |private IP，默认 127.0.0.1  | IPAddress | “” |

其中的 private ip 通过`WaitForPrivateNetwork`函数获得。

Istio 需要从服务注册中心（service registry）获取微服务注册的情况。当前版本中 istio 可以对接的服务注册中心类型包括：  

**Mock**

MockRegistry is a service registry that contains 2 hard-coded test services

**Config**

ConfigRegistry is a service registry that listens for service entries in a backing ConfigStore

**Kubernetes**

KubernetesRegistry is a service registry backed by k8s API server

**Consul**

ConsulRegistry is a service registry backed by Consul

**Eureka**

EurekaRegistry is a service registry backed by Eureka

**CloudFoundry**

CloudFoundryRegistry is a service registry backed by Cloud Foundry.

> [官方文档](https://istio.io/zh/docs/concepts/what-is-istio/)说当前支持 Kubernetes、Nomad with Consul，未来准备支持 Cloud Foundry、Apache Mesos。另外根据[官方的 feature 成熟度文档](https://istio.io/zh/about/feature-stages/)，当前只有 Kubernetes 的集成达到 stable 程度，Consul、Eureka 和 Cloud Foundry 都还是 alpha 水平。

### envoy 配置文件及命令行参数
agent.waitForExit 会调用 envoy.Run 方法启动 envoy 进程，为此需要获取 envoy 二进制所在文件系统路径和 flag 两部分信息：

1. envoy 二进制所在文件系统路径：evony.Run 通过 proxy.config.BinaryPath 变量得知 envoy 二进制所在的文件系统位置，proxy 就是 envoy 对象，config 就是 pilot-agent 的 main 方法在一开始初始化的 proxyConfig 对象。里面的 BinaryPath 在 pilot-agent 的 init 方法中被初始化，初始值来自`pilot/pkg/model/context.go`的`DefaultProxyConfig`函数，值是`/usr/local/bin/envoy`
2. envoy 的启动 flag 形式为下面的 startupArgs，包含一个`-c`指定的配置文件，还有一些 flag。除了下面代码片段中展示的这些 flag，还可以根据启动 agent 时的 flag，再加上`--concurrency`, `--service-zone`等 flag。

```go
startupArgs := []string{"-c", fname,
		"--restart-epoch", fmt.Sprint(epoch),
		"--drain-time-s", fmt.Sprint(int(convertDuration(proxy.config.DrainDuration) / time.Second)),
		"--parent-shutdown-time-s", fmt.Sprint(int(convertDuration(proxy.config.ParentShutdownDuration) / time.Second)),
		"--service-cluster", proxy.config.ServiceCluster,
		"--service-node", proxy.node,
		"--max-obj-name-len", fmt.Sprint(MaxClusterNameLength), 
	}
```
关于以上启动 envoy 的 flag 及其值的解释：

1. `--restart-epoch`：epoch 决定了 envoy hot restart 的顺序，在后面会有详细描述，第一个 envoy 进程对应的 epoch 为 0，后面新建的 envoy 进程对应 epoch 顺序递增 1
2. `--drain-time-s`：在 pilot-agent init 函数中指定默认值为 2 秒，可通过 pilot-agent proxy 命令的 drainDuration flag 指定
3. `--parent-shutdown-time-s`：在 pilot-agent init 函数中指定默认值为 3 秒，可通过 pilot-agent proxy 命令的 parentShutdownDuration flag 指定
4. `--service-cluster`：在 pilot-agent init 函数中指定默认值为”istio-proxy"，可通过 pilot-agent proxy 命令的 serviceCluster flag 指定
5. `--service-node`：将 agent.role 的 Type,IPAddress,ID 和 Domain 用”~"连接起来

而上面的`-c`指定的 envoy 配置文件有几种生成的方式：  

1. 运行 pilot-agent 时，用户不指定 customConfigFile 参数（agent init 时默认为空），但是制定了 templateFile 参数（agent init 时默认为空），这时 agent 的 main 方法会根据 templateFile 帮用户生成一个 customConfigFile，后面就视作用户制定了 customConfigFile。这个流程在 agent 的 main 方法里
2. 如果用户制定了 customConfigFile，那么就用 customConfigFile
3. 如果用户 customConfigFile 和 templateFile 都没指定，则调用 pilot/pkg 包下的 bootstrap_config.go 中的 WriteBootstrap 自动生成一个配置文件，默认将生成的配置文件放在`/etc/istio/proxy/envoy-rev%d.json`，这里的`%d`会用 epoch 序列号代替。WriteBootstrap 在 envoy.Run 方法中被调用

举个例子的话，根据参考文献中某人实验，第一个 envoy 进程启动参数为：

```bash
-c /etc/istio/proxy/envoy-rev0.json --restart-epoch 0
--drain-time-s 45 --parent-shutdown-time-s 60
--service-cluster sleep 
--service-node sidecar~172.00.00.000~sleep-55b5877479-rwcct.default~default.svc.cluster.local 
--max-obj-name-len 189 -l info --v2-config-only
```

如果使用第三种方式自动生成默认的 envoy 配置文件，如上面例子中的 envoy-rev0.json，那么 pilot-agent 的 proxy 命令处理流程中前半部分整理的大量 envoy 参数中的一部分会被写入这个配置文件中，比如`DiscoveryAddress`，`DiscoveryRefreshDelay`，`ZipkinAddress`，`StatsdUdpAddress`。

### 证书文件
agent 会监控 chainfile，keyfile 和 rootcert 三个证书文件的变化，如果是 Ingress 工作模式，则还会加入 ingresscert、ingress key 这两个证书文件。


## pilot-agent 主要功能分析之二：envoy 监控与管理

为 envoy 生成好配置文件之后，pilot-agent 还要负责 envoy 进程的监控与管理工作，包括：

1. 创建 envoy 对象，结构体包含 proxyConfig（前面步骤中为 envoy 生成的配置信息），role.serviceNode(似乎是 agent 唯一标识符），loglevel 和 pilotsan（service account name）
2. 创建 agent 对象，包含前面创建的 envoy 结构体，一个 epochs 的 map，3 个 channel：configCh, statusCh 和 abortCh
3. 创建 watcher 并启动协程执行 watcher.Run 
	watcher.Run 首先启动协程执行 agent.Run（**agent 的主循环**），然后调用 watcher.Reload(kickstart the proxy with partial state (in case there are no notifications coming))，**Reload 会调用 agent.ScheduleConfigUpdate，并最终导致第一个 envoy 进程启动，见后面分析**。然后监控各种证书，如果证书文件发生变化，则调用 ScheduleConfigUpdate 来 reload envoy，然后 watcher.retrieveAZ(TODO)
4. 创建 context，调用 cmd.WaitSignal 以等待进程接收到 SIGINT, SIGTERM 信号，接受到信号之后通过 context 通知 agent，agent 接到通知后调用 terminate 来 kill 所有 envoy 进程，并退出 agent 进程

> 上面的pilot/pkg/proxy包下的agent中采用Proxy接口管理pilot/pkg/proxy/envoy包下的envoy对象，从理论上来说也可以把envoy换成其他proxy实现管理。不过此事还牵扯discovery service 等其他组件。

上面第三步启动协程执行的 agent.Run 是 agent 的主循环，会一直通过监听以下几个 channel 来监控 envoy 进程：  

1. agent 的 configCh:如果配置文件，主要是那些证书文件发生变化，则调用 agent.reconcile 来 reload envoy  
2. statusCh:这里的 status 其实就是 exitStatus，处理 envoy 进程退出状态，处理流程如下：
	0. 把刚刚退出的 epoch 从 agent 维护的两个 map 里删了，后面会讲到这两个 map。把 agent.currentConfig 置为 agent.latestEpoch 对应的 config，因为 agent 在 reconcile 的过程中只有在 desired config 和 current config 不同的时候才会创建新的 epoch，所以这里把 currentConfig 设置为上一个 config 之后，必然会造成下一次 reconcile 的时候 current 与 desired 不等，从而创建新的 envoy   
	1. 如果 exitStatus.err 是 errAbort，表示是 agent 让 envoy 退出的（这个 error 是调用 agent.abortAll 时发出的），这时只要 log 记录 epoch 序列号为 xxx 的 envoy 进程退出了 
	2. 如果 exitStatus.err 并非 errAbort，则 log 记录 epoch 异常退出，并给所有当前正在运行的其他 epoch 进程对应的 abortCh 发出 errAbort，所以后续其他 envoy 进程也都会被 kill 掉，并全都往 agent.statusCh 写入 exitStatus，当前的流程会全部再为每个 epoch 进程走一遍
	3. 如果是其他 exitStatus（什么时候会进入这个否则情况？比如 exitStatus.err 是 wait epoch 进程得到的正常退出信息，即 nil），则 log 记录 envoy 正常退出
	4. 调用 envoy.Cleanup，删除刚刚退出的 envoy 进程对应的配置文件，文件路径由 ConfigPath 和 epoch 序列号串起来得到
	5. 如果 envoy 进程为非正常退出，也就是除了“否则”描述的 case 之外的 2 中情况，则试图恢复刚刚退出的 envoy 进程（可见前面向所有其他进程发出 errAbort 消息的意思，并非永远停止 envoy，pilot-agent 接下来马上就会重启被 abort 的 envoy）。恢复方式并不是当场启动新的 envoy，而是 schedule 一次 reconcile。如果启动不成功，可以在得到 exitStatus 之后再次 schedule（每次间隔时间为 $2^n*200$ 毫秒），最多重试 10 次（budget），如果 10 次都失败，则退出整个 golang 的进程（os.Exit）,由容器环境决定如何恢复 pilot-agent。所谓的 schedule，就是往 agent.retry.restart 写入一个预定的未来的某个时刻，并扣掉一次 budget（budget 在每次 reconcile 之前都会被重置为 10），然后就结束当前循环。在下一个开始的时候，会检测 agent.retry.restart，如果非空，则计算距离 reconcile 的时间 delay
3. time.After（delay）:监听是否到时间执行 schedule 的 reconcile 了，到了则执行 agent.reconcile  
4. ctx.Done:执行 agent.terminate 
	terminate 方法比较简单，向所有的 envoy 进程的 abortCh 发出 errAbort 消息，造成他们全体被 kill（Cmd.Kill），然后 agent 自己 return，退出当前的循环，这样就不会有人再去重启 envoy

## pilot-agent 主要功能分析之三：envoy 启动流程

1. 前面 pilot-agent proxy 命令处理流程中，watcher.Run 会调用 agent.ScheduleConfigUpdate，这个方法只是简单地往 configCh 里写一个新的配置，所谓的配置是所有 certificate 算出的 sha256 哈希值
2. configCh 的这个事件会被 agent.Run 监控到，然后调用 agent.reconcile。
3. reconcile 方法会**启动协程执行 agent.waitForExit 从而启动 envoy** 
  看 reconcile 方法名就知道是用来保证 desired config 和 current config 保持一致的。reconcile 首先会检查 desired config 和 current config 是否一致，如果是的话，就不用启动新的 envoy 进程。否则就启动新的 envoy。在启动过程中，agent 维护两个 map 来管理一堆 envoy 进程，在调用 waitForExit 之前会将 desiredConfig 赋值给 currentConfig，表示 reconcile 工作完成：
  1. 第一个 map 是 agent.epochs，它将整数 epoch 序列号映射到 agent.desiredConfig。这个序列号从 0 开始计数，也就是第一个 envoy 进程对应 epoch 0，后面递增 1。但是如果有 envoy 进程异常退出，它对应的序列号并非是最大的情况下，这个空出来的序列号不会在计算下一个新的 epoch 序列号时（agent.latestEpoch 方法负责计算当前最大的 epoch 序列号）被优先使用。所以从理论上来说序列号是会被用光的
  2. 第二个 map 是 agent.abortCh，它将 epoch 序列号映射到与 envoy 进程一一对应的 abortCh。abortCh 使得 pilot-agent 可以在必要时通知对应的 envoy 进程推出。这个 channel 初始化 buffer 大小为常量 10，至于为什么需要 10 个 buffer，代码中的注释说 buffer aborts to prevent blocking on failing proxy，也就是万一想要 abort 某个 envoy 进程，但是 envoy 卡住了 abort 不了，有 buffer 的话，就不会使得管理进程也卡住。
4. waitForExit 会调用 agent.proxy.Run，也就是**envoy 的 Run 方法**，**这里会启动 envoy**。envoy 的 Run 方法流程如下：  
  1. 调用 exec.Cmd.Start 方法 (启动了一个新进程)，并将 envoy 的标准输出和标准错误置为 os.Stdout 和 Stderr。  

  2. 持续监听前面说到由 agent 创建并管理的，并与 envoy 进程一一对应的 abortCh，如果收到 abort 事件通知，则会调用 Cmd.Process.Kill 方法杀掉 envoy，如果杀进程的过程中发生错误，也会把错误信息 log 一下，然后把从 abortCh 读到的事件返回给 waitForExit。waitForExit 会把该错误再封装一下，加入 epoch 序列号，然后作为 envoy 的 exitStatus，并写入到 agent.statusCh 里

  3. 启动一个新的协程来 wait 刚刚启动的 envoy 进程，并把得到的结果写到 done channel 里，envoy 结构体的 Run 方法也会监听 done channel，并把得到的结果返回给 waitForExit 

这里我们总结启动 envoy 过程中的协程关系：agent 是全局唯一一个 agent 协程，它在启动每个 envoy 的时候，会再启动一个 waitForExit 协程，waitForExit 会调用 Command.Start 启动另外一个进程运行 envoy，然后 waitForExit 负责监听 abortCh 和 envoy 进程执行结果。

> Cmd.Wait 只能用于等待由 Cmd.Start 启动的进程，如果进程结束并范围值为 0，则返回 nil，如果返回其他值则返回 ExitError，也可能在其他情况下返回 IO 错误等，Wait 会释放 Cmd 所占用的所有资源  

每次配置发生变化，都会调用 agent.reconcile，也就会启动新的 envoy，这样 envoy 越来越多，老的 envoy 进程怎么办？agent 代码的注释里已经解释了这问题，原来 agent 不用关闭老的 envoy，同一台机器上的多个 envoy 进程会通过 unix domain socket 互相通讯，即使不同 envoy 进程运行在不同容器里，也一样能够通讯。而借助这种通讯机制，可以自动实现新 envoy 进程替换之前的老进程，也就是所谓的 envoy hot restart。

> 代码注释原文：Hot restarts are performed by launching a new proxy process with a strictly incremented restart epoch. It is up to the proxy to ensure that older epochs gracefully shutdown and carry over all the necessary state to the latest epoch.  The agent does not terminate older epochs. 

而为了触发这种 hot restart 的机制，让新 envoy 进程替换之前所有的 envoy 进程，新启动的 envoy 进程的 epoch 序列号必须比之前所有 envoy 进程的最大 epoch 序列号大 1。

> 代码注释原文：The restart protocol matches Envoy semantics for restart epochs: to successfully launch a new Envoy process that will replace the running Envoy processes, the restart epoch of the new process must be exactly 1 greater than the highest restart epoch of the currently running Envoy processes.  


## 参考文献
1. [下一代 Service Mesh -- istio 架构分析](https://juejin.im/post/5afad93ef265da0b7e0c6cfb)  
2. [istio 源码分析——pilot-agent 如何管理 envoy 生命周期](https://segmentfault.com/a/1190000015171622)  

## 本文作者

丁轶群博士，谐云科技 CTO

2004 年作为高级技术顾问加入美国道富银行 (浙江) 技术中心，负责分布式大型金融系统的设计与研发。2011 年开始领导浙江大学开源云计算平台的研发工作，是浙江大学 SEL 实验室负责人，2013 年获得浙江省第一批青年科学家称号，CNCF 会员，多次受邀在 Cloud Foundry, Docker 大会上发表演讲，《Docker：容器与容器云》主要作者之一。
