---
title: "Istio Mixer Cache工作原理与源码分析part4－签名"
date: 2018-06-11T14:03:34+08:00
draft: false
authors: ["敖小剑"]
summary: "接前文，继续分析Mixer Check Cache的源码，这次的重点是签名算法，也就是Referenced::Signature()方法。"
tags: ["istio","source code"]
categories: ["service mesh"]
keywords: ["service mesh","istio","源码解析"]
---

> 本文转载自[敖小剑的博客](https://skyao.io/post/201806-istio-mixer-cache-signature/)

接前文，继续分析Mixer Check Cache的源码，这次的重点是签名算法，也就是Referenced::Signature()方法。

前情回顾：

1. Referenced保存的是mixer adapter使用的引用属性的一个组合，也就是前面例子中的 `“a,b,c”或者“a,b,c不存在”`
2. Referenced中有两个数据结构： `std::vector<AttributeRef> absence_keys_` 和 `std::vector<AttributeRef> exact_keys_`，exact_keys_保存的是一定要出现的属性， absence_keys_中保存的是没有出现的属性

## 基本流程

我们来看详细源代码，具体在文件`src/istio/mixerclient/referenced.cc`中，代码的基本流程非常清晰：

```c++
bool Referenced::Signature(const Attributes &attributes,
                           const std::string &extra_key,
                           std::string *signature) const {
  // 第一步，先检查输入是否匹配保存的引用属性
  // 必须同时满足absent key和exact key的要求
  if (!CheckAbsentKeys(attributes) || !CheckExactKeys(attributes)) {
    return false;
  }

  // 发现匹配之后，才开始计算签名
  CalculateSignature(attributes, extra_key, signature);
  return true;
}
```

> 切记：请更新到 `istio/proxy` 仓库的最新代码，在master分支上才能看到这个版本。
>
> 这里的代码在此之前是存在性能问题的，我为此提交了一个改进方案，由于0.8版本发布前锁了master分支，因此这个fix的代码是在0.8版本发布之后才进的master分支。
>
> 详情请见：<https://github.com/istio/proxy/issues/1531>

## 引用属性匹配

先检查absent key，这里要求请求中的属性，不能出现 absence*keys* 保存的属性，否则就是不匹配：

```c++
bool Referenced::CheckAbsentKeys(const Attributes &attributes) const {
  const auto &attributes_map = attributes.attributes();
  for (std::size_t i = 0; i < absence_keys_.size(); ++i) {
    // 检查每个absence_key
    const auto &key = absence_keys_[i];
    const auto it = attributes_map.find(key.name);
    if (it == attributes_map.end()) {
      // 如果在输入的属性中没有找到，就继续下一个
      continue;
    }

    // 如果找到了，则直接返回不匹配
    return false;
    // 实际代码中还有特别的 StringMap 类型的属性需要额外处理，简单起见我们忽略它
  }
  // 只有absence_key都没有在输入的属性中出现，才表示匹配
  return true;
}
```

再检查exact keys，这里要求exact keys中保存的每一个属性，必须在请求中出现，否则就是不匹配：

```c++
bool Referenced::CheckExactKeys(const Attributes &attributes) const {
  const auto &attributes_map = attributes.attributes();
  for (std::size_t i = 0; i < exact_keys_.size(); ++i) {
    // 检查每个exact_key
    const auto &key = exact_keys_[i];
    const auto it = attributes_map.find(key.name);
    // 如果没有在请求中出现就返回不匹配
    if (it == attributes_map.end()) {
      return false;
    }
	// 实际代码中还有特别的 StringMap 类型的属性需要额外处理，简单起见我们忽略它
    }
  }
  // 只有exact_key都在输入的属性中出现，才表示匹配
  return true;
}
```

简单说，引用属性匹配的要求就是：exact key都必须出现，absence key都不能出现。

| 输入                  | exact=“a,b,c”,absent=“” | exact=“a,b”,absent=“c” |
| --------------------- | ----------------------- | ---------------------- |
| “a=1,b=2,c=3,e=4,f=5” | Yes                     | No                     |
| “a=1,b=2,e=4,f=5”     | No                      | Yes                    |

## 计算签名

在exact key和absent key检查通过之后，就意味着请求中的属性满足当前Referenced的匹配要求。

下一步就可以进行签名计算了，CalculateSignature()方法的参数中attributes是输入的所有属性，extra_key这个参数目前没有使用，忽略即可：

```c++
void Referenced::CalculateSignature(const Attributes &attributes,
                                    const std::string &extra_key,
                                    std::string *signature) const {
  const auto &attributes_map = attributes.attributes();

  utils::MD5 hasher;
  // 游历exact_keys_ 中的每个属性
  for (std::size_t i = 0; i < exact_keys_.size(); ++i) {
    const auto &key = exact_keys_[i];
    // 在输入的属性中通过属性名找到包含值的属性
    const auto it = attributes_map.find(key.name);

    hasher.Update(it->first);
    hasher.Update(kDelimiter, kDelimiterLength);

    // 根据属性值的不同类型，调用hasher.Update()方法进行计算
    const Attributes_AttributeValue &value = it->second;
    switch (value.value_case()) {
      case Attributes_AttributeValue::kStringValue:
        hasher.Update(value.string_value());
        break;
      ......// 忽略其他类型的处理代码
      case Attributes_AttributeValue::VALUE_NOT_SET:
        break;
    }
    hasher.Update(kDelimiter, kDelimiterLength);
  }
  hasher.Update(extra_key);

  // 完成签名计算的最后一步，得到签名
  *signature = hasher.Digest();
}
```

即CalculateSignature()方法会将exact*keys* 指定的请求属性进行签名，注意只对 exact*keys* 的属性进行签名，absent key反正没有出现自然无需也无法对它们进行计算。

形象起见，以我们前面介绍基础概念和工作原理时的例子做讲解，假设 referenced_map 保存的引用属性组合为 `{“k1”: “a,b,c”, “k2”: “a,b,c不存在” }` ，

| 请求                  | 和请求匹配的引用属性     | 进行签名计算的实际属性值 |
| --------------------- | ------------------------ | ------------------------ |
| “a=1,b=2,c=3,e=4,f=5” | exact=“a,b,c”, absent=“” | a=1,b=2,c=3              |
| “a=1,b=2,e=4,f=5”     | exact=“a,b”, absent=“c”  | a=1,b=2                  |

## 总结

签名算法的关键在于需要先匹配exact key和absent key，然后再计算。和主流程代码一样，只要理解了引用属性和absent key的概念，就容易理解了。
