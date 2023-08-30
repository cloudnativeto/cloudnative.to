---
title: "Istio Mixer Cache 工作原理与源码分析 part3—主流程"
date: 2018-06-11T13:43:10+08:00
draft: false
authors: ["敖小剑"]
summary: "经过前面基本概念和实现原理的介绍，大家对 mixer check cache 应该有了基本的了解，下面我们开始展开源代码来细细研读。"
tags: ["istio","source code"]
categories: ["service mesh"]
keywords: ["service mesh","istio","源码解析"]
---

> 本文转载自[敖小剑的博客](https://skyao.io/post/201806-istio-mixer-cache-main/)

经过前面基本概念和实现原理的介绍，大家对 mixer check cache 应该有了基本的了解，下面我们开始展开源代码来细细研读。

## Check Cache 的主要流程

### Check Cache 的调用入口

对 mixer cache 的调用在代码 `proxy/src/istio/mixerclient/client_impl.cc`中的方法 Check() 中，此处跳过 quota cache 的内容：

```c++
CancelFunc MixerClientImpl::Check(
    const Attributes &attributes,
    const std::vector<::istio::quota_config::Requirement> &quotas,
    TransportCheckFunc transport, CheckDoneFunc on_done) {
	++total_check_calls_;
    
    std::unique_ptr<CheckCache::CheckResult> check_result(
        new CheckCache::CheckResult);
    // 在这里调用了 CheckCache.Check() 方法，进行检查
    check_cache_->Check(attributes, check_result.get()); 
    CheckResponseInfo check_response_info;

    check_response_info.is_check_cache_hit = check_result->IsCacheHit();
    check_response_info.response_status = check_result->status();

    // 如果 check cache 命中，并且结果不 OK，则直接结束处理
    if (check_result->IsCacheHit() && !check_result->status().ok()) {
        on_done(check_response_info);
        return nullptr;
    }
    ......
    CheckCache::CheckResult *raw_check_result = check_result.release();
    ......
    // 如果 check cache 没有命中，则需要发起请求到 mixer 得到 response
    // 然后将 response 加入 check cache 中
    return transport(
      request, response,
      [this, request_copy, response, raw_check_result, raw_quota_result,
       on_done](const Status &status) {
        raw_check_result->SetResponse(status, *request_copy, *response);
        ......
	});
}
```

我们先来看看缓存的保存方式，再返回来看 Check() 方法的具体实现，这样方便理解。

这里的 transport 是一个 TransportCheckFunc，具体定义在`include/istio/mixerclient/environment.h` 头文件中：

```c
// Defines a function prototype to make an asynchronous Check call
using TransportCheckFunc = std::function<CancelFunc(
    const ::istio::mixer::v1::CheckRequest& request,
    ::istio::mixer::v1::CheckResponse* response, DoneFunc on_done)>;
```

其中 DoneFunc 的定义如下：

```c++
// Defines a function prototype used when an asynchronous transport call
// is completed.
// Uses UNAVAILABLE status code to indicate network failure.
using DoneFunc = std::function<void(const ::google::protobuf::util::Status&)>;
```

总结说，Check() 方法会通过 TransportCheckFunc 对 mixer 发起请求，在得到 response 之后，再调用 DoneFunc。

在这个匿名的 DoneFunc 中，最关键的代码是：

```c++
raw_check_result->SetResponse(status, *request_copy, *response);
```

这里的 raw_check_result 类型是 CheckCache::CheckResult。

## 保存 Check 结果

CheckResult.SetResponse() 方法的源代码在 istio/proxy 项目， `src/istio/mixerclient/check_cache.h` 文件中

```c++
void SetResponse(const ::google::protobuf::util::Status& status,
                 const ::istio::mixer::v1::Attributes& attributes,
                 const ::istio::mixer::v1::CheckResponse& response) {
    if (on_response_) {
        // 调用 on_response_这个 Func
        status_ = on_response_(status, attributes, response);
    }
}

// The function to set check response.
using OnResponseFunc = std::function<::google::protobuf::util::Status(
    const ::google::protobuf::util::Status&,
    const ::istio::mixer::v1::Attributes& attributes,
    const ::istio::mixer::v1::CheckResponse&)>;
OnResponseFunc on_response_; // on_response_在此定义
```

on_response_这个 OnResponseFunc 的设定在 `src/istio/mixerclient/check_cache.cc` 文件中的 CheckCache::Check() 方法中设置：

```c++
result->on_response_ = [this](const Status &status,
                              const Attributes &attributes,
                              const CheckResponse &response) -> Status {
    if (!status.ok()) {
        // status 表示对 mixer 的远程调用的结果
        // 如果调用都没有成功，则没有 check 结果可言，自然不必缓存
        if (options_.network_fail_open) {
            // 注意这里有个选项，如果打开，则在 mixer 调用没有成功时视为 check 成功
            return Status::OK;
        } else {
            return status;
        }
    } else {
        // 如果对 mixer 调用成功，拿到了 response，则进行缓存
        return CacheResponse(attributes, response, system_clock::now());
    }
};
```

下面是保存缓存的关键代码了，CacheResponse() 方法，清晰起见，忽略分支处理和错误处理代码，日志打印等：

```c++
Status CheckCache::CacheResponse(const Attributes &attributes,
                                 const CheckResponse &response, Tick time_now) {
  ......
  // 类 Referenced 用来保存引用属性，也就是哪些属性被 mixer adapter 使用了
  // 记得前面讲述实现原理时的例子吗？这里的 Referenced 就是"a,b,c"
  Referenced referenced;
  // Fill() 方法解析 response 的 precondition 的 referenced_attributes 并填充到 referenced
  if (!referenced.Fill(attributes,
                       response.precondition().referenced_attributes())) {
	......
  }
  
  std::string signature;
  // 调用 Signature() 方法进行签名
  if (!referenced.Signature(attributes, "", &signature)) {
	......
  }
  
  // 进行第一层缓存的保存
  // referenced_map 用于保存各种引用属性的组合
  // 在实现原理中的例子，就是"a,b,c"和带 absence key 的"a,b","a,c"等
  std::string hash = referenced.Hash();
  // 计算当前引用属性的 hash 值，比如"a,b,c"的 hash 值
  // 然后保存进 referenced_map
  if (referenced_map_.find(hash) == referenced_map_.end()) {
    referenced_map_[hash] = referenced;
  }
  
  // 进行第二层缓存的保存
  // 用计算而来的签名来在第二层缓存中查找
  CheckLRUCache::ScopedLookup lookup(cache_.get(), signature);
  if (lookup.Found()) {
    // 如果已经存在则更新 CacheElem
    lookup.value()->SetResponse(response, time_now);
    return lookup.value()->status();
  }
  
  // 如果不存在则插入新的 CacheElem
  CacheElem *cache_elem = new CacheElem(*this, response, time_now);
  cache_->Insert(signature, cache_elem, 1);
  return cache_elem->status();
}
```

### 缓存的结构和保存方式

我们现在可以结合代码来详细的展开缓存的结构和保存方式了：

```c++
// 第一层缓存，用于保存引用属性
// 这个 map 中，value 是 Referenced 对象，key 是 Referenced 的 hash 值
std::unordered_map<std::string, Referenced> referenced_map_;

// 第二层缓存，用于保存 check 的结果
// 这是一个 LRU Cache，key 是请求的签名，value 是 check 的结果，封装为 CacheElem
using CheckLRUCache = utils::SimpleLRUCache<std::string, CacheElem>;
std::unique_ptr<CheckLRUCache> cache_;
```

Referenced 中保存使用的属性，包括 absence 的属性：

```c++
// The keys should be absence.
std::vector<AttributeRef> absence_keys_;

// The keys should match exactly.
std::vector<AttributeRef> exact_keys_;
```

以前面的例子为例，”a,b,c 不存在”这种引用属性组合，在保存时就是 a/b 保存在 exact_keys 中，而 c 保存在 absence_keys 中。

CacheElem 中保存的是检查结果：

```c++
::google::protobuf::util::Status status_;
std::chrono::time_point<std::chrono::system_clock> expire_time_;
int use_count_;
```

其中 status 字段是结果，而 expire_time 和 use_count 是这个缓存项的过期时间和使用次数，这个细节后面再展开。

两层缓存 key 值的计算，会比较有意思，我们会在下一节中详细展开，这一节我们先关注在缓存的主要流程。我们继续看缓存的 check() 方法是如何实现的，即怎么匹配请求和缓存。

## 匹配请求和缓存

每一个请求，都要和 mixer check cache 匹配一下，看是否可以命中缓存从而避免对 mixer 的远程调用。有了前面的铺垫，再来看缓存是如何匹配就简单了：

```c++
check_cache_->Check(attributes, check_result.get()); 
```

源代码在 `src/istio/mixerclient/check_cache.cc` 中，去除错误处理和细节处理代码之外，主要代码为：

```c++
Status CheckCache::Check(const Attributes &attributes, Tick time_now) {
    // 游历第一层缓存，
    // referenced_map 中保存的是所有保存的引用属性组合中
    // 在我们前面的例子中，这里保存有 {“k1”: “a,b,c”, “k2”: “a,b,c 不存在” } 等
    for (const auto &it : referenced_map_) {
        const Referenced &reference = it.second;
        std::string signature;
        // 在所有保存的引用属性组合中，逐个匹配看请求是否具备保存的引用属性结合
        // 如果引用属性和请求中的属性匹配，则计算签名
        if (!reference.Signature(attributes, "", &signature)) {
          continue;
        }

        // 进行第二层缓存的查找
        // 第二层缓存的 key 是签名，因此简单通过 key 查找就 OK
        CheckLRUCache::ScopedLookup lookup(cache_.get(), signature);
        if (lookup.Found()) {
          CacheElem *elem = lookup.value();
          return elem->status();
        }
      }

  // 如果游历完第一层缓存，也没能找到匹配的引用属性，则只能返回 NOT_FOUND
  return Status(Code::NOT_FOUND, "");
}
```

注意在 Signature() 方法中实际做了两个事情：

1. 在 referenced_map 查找看是否有匹配的引用属性组合
2. 如果有，则计算签名，以便通过签名来进行第二层缓存的查找

这个 Signature() 方法的实现是整个 mixer check cache 的重中之重，核心所在。

篇幅原因，我们将在下一节中详细展开 Signature() 方法实现的源代码解析。

## 总结

Mixer Check Cache 的主流程代码，在了解了基本概念和工作原理之后，理解起来并不困难。代码本身并没有特别费解的地方，麻烦之处在于对 Referenced Attribute / 引用属性这个概念的理解。
