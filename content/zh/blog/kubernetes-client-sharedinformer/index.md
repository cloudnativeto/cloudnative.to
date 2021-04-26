---
title: "Kubernetes Client Shared Informer 架构设计源码阅读"
date: 2021-04-27T02:04:05+08:00
draft: false
image: "/images/blog/kubernetes-client.png"
author: "[杨鼎睿](https://yuque.com/abser)"
description: "本文研究了 Kubernetes 中 Client Shared Informer 部分的源码，配备源码进行进一步理解，可以加深理解,增强相关设计能力。"
tags: ["Kubernetes","源码架构图", "Client"]
categories: ["kubernetes"]
keywords: ["Kubernetes","Client"]
type: "post"
avatar: "/images/profile/abserari.png"
profile: "华北电力大学大四学生。"
---
本文研究了 Kubernetes 中 Client Shared Informer 部分的源码，配备源码进行进一步理解，可以加深理解,增强相关设计能力。

## Workflow
从接口间关系可以看出，SharedInformer 是核心组件，它通过 Controller 执行操作，并将结果存入 Store 中。SharedIndexInformer 为 SharedInformer 添加了 Index 功能。

![shared-informer-workflow.svg](1.png)

## Procedure
![shared-informer-procedures.svg](2.png)

### Run
![image.png](3.png)

### Add Handler
![shared-informer-processor-listener.svg](4.png)

### ListAndWatch
![shared-informer-list-and-watch.svg](5.png)

![image.png](6.png)

### Indexer
![shared-informer-indexer.svg](7.png)

[1] cache 根据 Object 生成 Key 的方式如下

![image.png](8.png)

[2] items 根据 Key 获取老对象，并设置新对象

![image.png](9.png)

[3] updateIndices 代码如下

![image.png](10.png)

[4] sharedIndexInformer 在创建 processorListener 时，如果处于工作状态，会调用 indexer 的 List 方法将全部缓存的 object 取出，并发送给新添加的 processorListener。

![image.png](11.png)

最终获取全部事件对象位置

![image.png](12.png)


本文研究了 Kubernetes 中 Client Shared Informer 部分的源码，是 Client 篇的第一部分，下面是全系列的链接。


## 目录
暂时只有 Client 和 Scheduler 部分

[1] Others
- [Docker Networking](/blog/kubernetes-client-sharedinformer/)
- [Common Tools Go Routine Tools](/blog/kubernetes-client-sharedinformer/)
- [Common Tools Async](/blog/kubernetes-client-sharedinformer/)
- [Common Tools Time Budget](/blog/kubernetes-client-sharedinformer/)
- [Common Tools Widgets](/blog/kubernetes-client-sharedinformer/)

[2] Basics
- [Core & Tools Scheme](/blog/kubernetes-client-sharedinformer/)
- [Core & Tools The Basics](/blog/kubernetes-client-sharedinformer/)
- [Core & Tools Cacheable Object](/blog/kubernetes-client-sharedinformer/)
- [Core & Tools Codec](/blog/kubernetes-client-sharedinformer/)
- [Core & Tools Client Events](/blog/kubernetes-client-sharedinformer/)
- [Core & Tools Network](/blog/kubernetes-client-sharedinformer/)

[3] API Server
- [API Server Routes](/blog/kubernetes-client-sharedinformer/)
- [API Server API Group](/blog/kubernetes-client-sharedinformer/)
- [API Server Storage](/blog/kubernetes-client-sharedinformer/)
- [API Server Cacher](/blog/kubernetes-client-sharedinformer/)
- [API Server Etcd](/blog/kubernetes-client-sharedinformer/)
- [API Server Generic API Server](/blog/kubernetes-client-sharedinformer/)
- [API Server CustomResourceDefinitions](/blog/kubernetes-client-sharedinformer/)
- [API Server Master Server](/blog/kubernetes-client-sharedinformer/)
- [API Server Aggregator Server](/blog/kubernetes-client-sharedinformer/)
- [API Server API Server Deprecated](/blog/kubernetes-client-sharedinformer/)

[4] Client 
- [Client Shared Informer](/blog/kubernetes-client-sharedinformer/)
- [Client Controller](/blog/kubernetes-client-sharedinformer/)

[5] Proxy 
- [Proxy Framework](/blog/kubernetes-client-sharedinformer/)
- [Proxy IPTable Proxier](/blog/kubernetes-client-sharedinformer/)
- [Proxy IPVS](/blog/kubernetes-client-sharedinformer/)

[6] Controllers
- [Controllers Queue](/blog/kubernetes-client-sharedinformer/)
- [Controllers](/blog/kubernetes-client-sharedinformer/)
- [Endporint Controller](/blog/kubernetes-client-sharedinformer/)
- [Namespace Controller](/blog/kubernetes-client-sharedinformer/)
- [Node Controller](/blog/kubernetes-client-sharedinformer/)

[7] Scheduler
- [Scheduler Cache](/blog/kubernetes-scheduler-cache/)
- [Scheduler Priority Queue](/blog/kubernetes-scheduler-priority-queue/)
- [Scheduler Plugins](/blog/kubernetes-scheduler-plugins/)
- [Scheduler Schedule](/blog/kubernetes-scheduler-schedule/)