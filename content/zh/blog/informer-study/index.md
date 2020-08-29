---
title: "Kubernetes Informer 机制源码解析"
date: 2020-08-28 16:55:00
description: "Kubernetes Informer 源码理解"
author: "[刘淑娟(JaneLiuL)](https://github.com/JaneLiuL)"
image: "images/blog/informer-study-banner.png"
categories: ["Kubernetes"]
tags: ["Kubernetes", "源码理解", "Informer"]
type: "post"
avatar: "/images/profile/janeliul.jpg"
profile: "刘淑娟,爱立信广州工程师，云原生爱好者"
---

## Overview

这篇文章主要是学习Informer机制并且理解Informer各个组件的设计。

## 背景

为什么Kubernetes需要Informer机制？我们知道Kubernetes各个组件都是通过REST API跟API Server交互通信的，而如果每次每一个组件都直接跟API Server交互去读取/写入到后端的etcd的话，会对API Server以及etcd造成非常大的负担。 而Informer机制是为了保证各个组件之间通信的实时性、可靠，并且减缓对API Server和etcd的负担。

## Informer 流程

这个流程，建议先看看《fromcontroollerstud https://github.com/JaneLiuL/study-client-go/blob/master/fromcontrollerstudyinformer.md 

这里我们以CoreV1. Pod资源为例子：
1. 第一次启动Informer的时候，Reflector 会使用`List`从API Server主动获取CoreV1. Pod的所有资源对象信息，通过`resync`将资源存放在`Store`中 
2. 持续使用`Reflector`建立长连接，去`Watch` API Server发来的资源变更事件
3. 当2 监控到CoreV1.Pod的资源对象有增加删除修改之后，就把资源对象存放在`DeltaFIFO`中，
4. `DeltaFIFO`是一个先进先出队列，只要这个队列有数据，就被Pop到Controller中, 将这个资源对象存储至`Indexer`中，并且将该资源对象分发至`ShareInformer`
5. Controller会触发`Process`回调函数

### 打脸

所以，我自己之前写代码的时候，一直以为是`ShareInformer`去主动watch API Server, 而现在正正打脸了，是`Reflector`做的List&Watch。


### ListAndWatch 思考

为什么Kubernetes里面是使用ListAndWathc呢？我们所知道的其他分布式系统常常使用RPC来触发行为。

我们来分析下如果不这样做，而是采用API Server轮询推送消息给各个组件，或者各个组件轮询去访问API Server的话，那么**实时性**就得不到保证，并且对API Server造成很大的负载，很有可能需要开启大量的端口造成端口浪费。

从实时性出发的话：

我们希望是有任何资源的新增/改动/删除，都需要马上获取并且放入消息队列。可以对应我们Informer中的`Reflector`组件，去主动获取消息，并且放入`DeltaFIFO`队列被消费。

从减轻负载出发的话：

需要上缓存，这里可以对应我们的`Store`组件。

从设计扩展性出发的话：

作为一个“资源管理系统”的Kubernetes，我们的对象数量可能会无线扩大，那么我们需要设计一个高效扩展的组件，去应对对象的种类无线扩大，并且同一种对象可能会被用户实例化非常多次的行为。 这里可以对应我们的`Share Informer`。

从消息的可靠性出发的话：

刚刚说了这么多，都是进行长连接去Watch的，万一网络出错怎么办？这个时候我们的List机制就很明显发挥作用，一旦感知跟API Server中断，或者第一次启动，都是使用List机制的， List作为一个短连接去获取资源信息，Watch 作为长连接去持续接收资源的变更并且处理。（用List&Watch可以保证不会漏掉任何事件）



#### Watch的实现

`Watch`是通过HTTP 长连接接收API Server发送的资源变更事件，使用的`Chunkerd transfer coding`， 代码位置`./staging/src/k8s.io/apiserver/pkg/endpoints/handlers/watch.go`，源码如下

```go
    e := streaming.NewEncoder(framer, s.Encoder)

	// ensure the connection times out
	timeoutCh, cleanup := s.TimeoutFactory.TimeoutCh()
	defer cleanup()

	// begin the stream
	w.Header().Set("Content-Type", s.MediaType)
	w.Header().Set("Transfer-Encoding", "chunked")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()
```

我们使用通过`curl`来看看, 在`response`的`Header`中设置`Transfer-Encoding`的值是`chunkerd`

```bash
# curl -i http://127.0.0.1:8001/api/v1/watch/namespaces?watch=yes
HTTP/1.1 200 OK
Cache-Control: no-cache, private
Content-Type: application/json
Date: Sun, 09 Aug 2020 02:44:07 GMT
Transfer-Encoding: chunked

{"type":"ADDED","object":{"kind":"Namespace","apiVersion":"v1","metadata":{"name":"...
```



## 监听事件 Reflector

我的理解，Reflector是实现对指定的类型对象的监控，既包括Kubernetes内置资源，也可以是CRD自定义资源。



### 数据结构

我们来看看Reflector的数据结构， 代码块`staging/src/k8s.io/client-go/tools/cache/reflector.go`

listerWatcher其实就是从API Server里面去做List跟Watch的操作去获取对象的变更。

```go
type Reflector struct {
	name string
    // 监控的对象类型，比如Pod
	expectedType reflect.Type
    // 存储
	store Store	
    // ListerWatcher是针对某一类对象，比如Pod
	listerWatcher ListerWatcher
	period       time.Duration
	resyncPeriod time.Duration
	ShouldResync func() bool
	...
}
```

### Run

Run是循环一直把数据存储到`DeltaFIFO`中。

```go
func (r *Reflector) Run(stopCh <-chan struct{}) {
	klog.V(3).Infof("Starting reflector %v (%s) from %s", r.expectedType, r.resyncPeriod, r.name)
	wait.Until(func() {
		if err := r.ListAndWatch(stopCh); err != nil {
			utilruntime.HandleError(err)
		}
	}, r.period, stopCh)
}
```

也就是说，Reflector是一直在执行ListAndWatch, 除非收到消息stopCh要被关闭，Run才会退出。



### ListAndWatch

书上把这一段讲得很详细了，我贴这段代码，是为了给下面的Kubernetes并发的章节用的，这里用到了`GetResourceVersion` `setLastSyncResourceVersion`等

```go
func (r *Reflector) ListAndWatch(stopCh <-chan struct{}) error {
	klog.V(3).Infof("Listing and watching %v from %s", r.expectedType, r.name)
	var resourceVersion string

	// Explicitly set "0" as resource version - it's fine for the List()
	// to be served from cache and potentially be delayed relative to
	// etcd contents. Reflector framework will catch up via Watch() eventually.
	options := metav1.ListOptions{ResourceVersion: "0"}

	if err := func() error {
		initTrace := trace.New("Reflector " + r.name + " ListAndWatch")
		defer initTrace.LogIfLong(10 * time.Second)
		var list runtime.Object
		var err error
		listCh := make(chan struct{}, 1)
		panicCh := make(chan interface{}, 1)
		go func() {
			defer func() {
				if r := recover(); r != nil {
					panicCh <- r
				}
			}()
            // 先List
			list, err = r.listerWatcher.List(options)
			close(listCh)
		}()
		select {
		case <-stopCh:
			return nil
		case r := <-panicCh:
			panic(r)
		case <-listCh:
		}
		if err != nil {
			return fmt.Errorf("%s: Failed to list %v: %v", r.name, r.expectedType, err)
		}
		initTrace.Step("Objects listed")
		listMetaInterface, err := meta.ListAccessor(list)
		if err != nil {
			return fmt.Errorf("%s: Unable to understand list result %#v: %v", r.name, list, err)
		}
		resourceVersion = listMetaInterface.GetResourceVersion()
		initTrace.Step("Resource version extracted")
		items, err := meta.ExtractList(list)
		if err != nil {
			return fmt.Errorf("%s: Unable to understand list result %#v (%v)", r.name, list, err)
		}
		initTrace.Step("Objects extracted")
		if err := r.syncWith(items, resourceVersion); err != nil {
			return fmt.Errorf("%s: Unable to sync list result: %v", r.name, err)
		}
		initTrace.Step("SyncWith done")
		r.setLastSyncResourceVersion(resourceVersion)
		initTrace.Step("Resource version updated")
		return nil
	}(); err != nil {
		return err
	}

	resyncerrc := make(chan error, 1)
	cancelCh := make(chan struct{})
	defer close(cancelCh)
	go func() {
		resyncCh, cleanup := r.resyncChan()
		defer func() {
			cleanup() // Call the last one written into cleanup
		}()
		for {
			select {
			case <-resyncCh:
			case <-stopCh:
				return
			case <-cancelCh:
				return
			}
			if r.ShouldResync == nil || r.ShouldResync() {
				klog.V(4).Infof("%s: forcing resync", r.name)
				if err := r.store.Resync(); err != nil {
					resyncerrc <- err
					return
				}
			}
			cleanup()
			resyncCh, cleanup = r.resyncChan()
		}
	}()

	for {
		// give the stopCh a chance to stop the loop, even in case of continue statements further down on errors
		select {
		case <-stopCh:
			return nil
		default:
		}

		timeoutSeconds := int64(minWatchTimeout.Seconds() * (rand.Float64() + 1.0))
		options = metav1.ListOptions{
			ResourceVersion: resourceVersion,
			// We want to avoid situations of hanging watchers. Stop any wachers that do not
			// receive any events within the timeout window.
			TimeoutSeconds: &timeoutSeconds,
		}

		w, err := r.listerWatcher.Watch(options)
		if err != nil {
			switch err {
			case io.EOF:
				// watch closed normally
			case io.ErrUnexpectedEOF:
				klog.V(1).Infof("%s: Watch for %v closed with unexpected EOF: %v", r.name, r.expectedType, err)
			default:
				utilruntime.HandleError(fmt.Errorf("%s: Failed to watch %v: %v", r.name, r.expectedType, err))
			}
			// If this is "connection refused" error, it means that most likely apiserver is not responsive.
			// It doesn't make sense to re-list all objects because most likely we will be able to restart
			// watch where we ended.
			// If that's the case wait and resend watch request.
			if urlError, ok := err.(*url.Error); ok {
				if opError, ok := urlError.Err.(*net.OpError); ok {
					if errno, ok := opError.Err.(syscall.Errno); ok && errno == syscall.ECONNREFUSED {
						time.Sleep(time.Second)
						continue
					}
				}
			}
			return nil
		}

		if err := r.watchHandler(w, &resourceVersion, resyncerrc, stopCh); err != nil {
			if err != errorStopRequested {
				klog.Warningf("%s: watch of %v ended with: %v", r.name, r.expectedType, err)
			}
			return nil
		}
	}
}

```



#### Kubernetes并发

从ListAndWatch的代码，有一段关于`syncWith`的方法，比较重要，原来Kubernetes的并发是通过`ResourceVersion`来实现的，每次对这个对象的改动，都会把改对象的`ResourceVersion`加一。





## 二级缓存DeltaFIFO 和 Store

### DeltaFIFO

我们通过数据结构来理解DeltaFIFO，我们先来理解一下Delta。

代码块`staging/src/k8s.io/client-go/tools/cache/delta_fifo.go`

通过下面的代码块，我们可以非常清晰看得出，`Delta`其实是一个资源对象存储，保存例如Pod的Added操作等。用白话来说其实就是记录Kubernetes每一个对象的变化。

```go
type Delta struct {
	Type   DeltaType
	Object interface{}
}

type DeltaType string

const (
	Added   DeltaType = "Added"
	Updated DeltaType = "Updated"
	Deleted DeltaType = "Deleted"	
	Sync DeltaType = "Sync"
)
```

FIFO就比较容易理解了，就是一个先进先出的队列。也可以看看代码块`staging/src/k8s.io/client-go/tools/cache/fifo.go`去看他的实现，如下

```go
type Queue interface {
	Store
    // 可以看出来Queue是在Store的基础上扩展了Pop，可以让对象弹出。这里如果对比一下Indexer的数据结构发现很有意思，Indexer是在Store的基础上加了索引，去快速检索对象
	Pop(PopProcessFunc) (interface{}, error)
	AddIfNotPresent(interface{}) error
	HasSynced() bool
	Close()
}
```

结合起来，DeltaFIFO其实就是一个先进先出的Kubernetes对象变化的队列，这个队列中存储不同操作类型的同一个资源对象。

DeltaFIFO中的GET方法或者GetByKey都比较简单，接下来对queueActionLocked()函数重点说明。



#### queueActionLocked

```go
func (f *DeltaFIFO) queueActionLocked(actionType DeltaType, obj interface{}) error {
    // 拿到对象的Key
	id, err := f.KeyOf(obj)
	if err != nil {
		return KeyError{obj, err}
	}
    
    // 把同一个对象的不同的actionType，都添加到newDeltas列表中
	newDeltas := append(f.items[id], Delta{actionType, obj})
    // 合并去重
	newDeltas = dedupDeltas(newDeltas)
     // 我一开始理解不了，觉得不可能存在<=0的情况，最新的Kubernetes的代码里面注释说了，正常情况下不会出现<=0， 加这个判断属于冗余判断
	if len(newDeltas) > 0 {
		if _, exists := f.items[id]; !exists {
			f.queue = append(f.queue, id)
		}
		f.items[id] = newDeltas        
		f.cond.Broadcast()
	} else {		
		delete(f.items, id)
	}
	return nil
}
```

看看**去重**的代码

```go
func dedupDeltas(deltas Deltas) Deltas {
	n := len(deltas)
    // 少于2个也就是得一个，不需要合并了，直接返回
	if n < 2 {
		return deltas
	}
	a := &deltas[n-1]
	b := &deltas[n-2]
    // 这里，最后调了isDeletionDup，这个是判断一个资源对象的两次操作是否都是删除，如果是，就去重，不需要删除两次
	if out := isDup(a, b); out != nil {
		d := append(Deltas{}, deltas[:n-2]...)
		return append(d, *out)
	}
	return deltas
}

func isDup(a, b *Delta) *Delta {
	if out := isDeletionDup(a, b); out != nil {
		return out
	}
	// TODO: Detect other duplicate situations? Are there any?
	return nil
}
```



之前群里有人问为什么dedupDeltas只是去这个列表的倒数一个跟倒数第二个去进行合并去重的操作，这里说明一下，dedupDeltas是被queueActionLocked函数调用的，而queueActionLocked为什么我们拿出来讲，是因为在Delete/Update/Add里面去调用了queueActionLocked，合并是对某一个obj的一系列操作，而去重是只针对delete。

我们可以拿一个例子来看看，假设是[obj1]: [add: delta1, update: delta2, delete: delta3,  delete: delta3] 在经过queueActionLocked之后会变成[obj1]: [add: delta1, update: delta2, delete: delta3] 



#### 消费者方法

```go
func (f *DeltaFIFO) Pop(process PopProcessFunc) (interface{}, error) {
	f.lock.Lock()
	defer f.lock.Unlock()
	for {
		for len(f.queue) == 0 {
			// 任何时候判断队列是否被关闭之前，都需要先判断队列的长度，看上方的len
			if f.IsClosed() {
				return nil, FIFOClosedError
			}

			f.cond.Wait()
		}
		id := f.queue[0]
		f.queue = f.queue[1:]
		if f.initialPopulationCount > 0 {
			f.initialPopulationCount--
		}
		item, ok := f.items[id]
		if !ok {
			// Item may have been deleted subsequently.
			continue
		}
        // 取出第一个f.queue[0]对象，从队列删除，将该对象交给process处理对象
		delete(f.items, id)
		err := process(item)
        
		if e, ok := err.(ErrRequeue); ok {
            // 处理失败，就重新入队
			f.addIfNotPresent(id, item)
			err = e.Err
		}
		// Don't need to copyDeltas here, because we're transferring
		// ownership to the caller.
		return item, err
	}
}
```







#### LocalStore

缓存机制，但LocalStore是被`Lister`的`List/Get`方法访问



## Share Informer 共享机制

从流程上我们说了，因为是`DeltaFIFO`把消息分发至`Share Informer`中，因此我们可以用`Inforomer`添加自定义的回调函数，也就是我们经常看到的`OnAdd`  `OnUpdaate`和`OnDelete`



Kubernetes内部的每一个资源都实现了Informer机制，如下是一个Namespace的Informer的例子

代码块`staging/src/k8s.io/client-go/informers/core/v1/namespace.go`

```go
type NamespaceInformer interface {
	Informer() cache.SharedIndexInformer
	Lister() v1.NamespaceLister
}

```



## Indexer

以下是Indexer的数据结构，清晰的看见Indexer继承了Store接口， 还增加了索引的功能。

```go
type Indexer interface {
	Store
	Index(indexName string, obj interface{}) ([]interface{}, error)
...
}

```

看看我们流程第四个步骤： `DeltaFIFO`是一个先进先出队列，只要这个队列有数据，就被Pop到Controller中, 将这个资源对象存储至`Indexer`中。 这个步骤说明了Indexer存储的数据来源。



我们看看Indexer关键的几个索引函数

```go
// 索引函数，传入的是对象，返回的是检索结果的列表，例如我们可以通过IndexFunc去查某个Annotation/label的configmap
type IndexFunc func(obj interface{}) ([]string, error)
// 索引函数，key是索引器名词，value是索引器的实现函数
type Indexers map[string]IndexFunc
 // 索引函数name   对应多个索引键   多个对象键   真正对象 
type Indices map[string]Index            
// 索引缓存，map类型                     
type Index map[string]sets.String 
```

总结一下：

Indexers: 索引函数name --> 索引实现函数-->索引key值
Indics: 索引函数name --> 对应多个索引key值 --> 每个索引key值对应不同的资源

举个例子来说明的话：对象Pod有一个标签app=version1，这里标签就是索引键，Indexer会把相同标签的所有Pod放在一个集合里面，然后我们实现对标签分类就是我们Indexer的核心内容。



## Reference

《Kubernetes 源码剖析》第五章

