---
title: "Kubernetes1.18 架构设计源码阅读"
date: 2021-05-14T15:04:05+08:00
draft: false
image: "/images/blog/kubernetes-apiserver.png"
author: "[杨鼎睿](https://yuque.com/abser)"
description: "本系列带领读者遍读了 Kuberentes 源码，通过源码设计图的方式帮助读者理解源码。"
tags: ["Kubernetes","源码架构图", "APIServer"]
categories: ["kubernetes"]
keywords: ["Kubernetes","APIServer"]
type: "post"
avatar: "/images/profile/abserari.png"
profile: "华北电力大学大四学生。"
---

好消息，好消息！源码架构图系列完整啦！

大家好，我是杨鼎睿，Kubernetes 源码设计图已经整理完整啦，全部放在了云原生社区下，欢迎大家前来阅读！

为了方便广大读者的阅读，我们将所有的源码图整理到了 GitBook 中，大家不必为阅读的顺序而困扰啦。

[阅读点我](https://i.cloudnative.to/kubernetes/kubernetes/index) 

源码设计图共近 300 余张（近 200 张是手绘的架构设计图），覆盖主要组件包括 API Server，Controller，Scheduler，Proxy，Client 等，同时还有 Docker， Golang 等相关部分。源码图理念以架构设计（数据结构的设计）为主，决不为了讲述流程而画流程图，阅读时需要配合源码同时阅读，同时会有一小部分的问题留白，可以引导读者带着问题进入源码中寻求答案，希望能籍此帮助大家在学习 K8S 的同时提高自己的设计能力。 

从去年 6 月开始到今年，很多图例都经过多次打磨，大小，含义保证一致，如虚线箭头代表动作等，对各种流程如循环迭代的画图表达也经过多次改版，除此之外，尤在图中不同实体的相互位置有下功夫，如同一水平线代表同一层次等，欢迎在画图表达上多多交流，共同推进如此理念的源码架构图。（除 k8s 外，不少知名项目的源码架构图也已完成，欢迎交流）

这一系列完成过程中，超哥（Jimmy Song）给予了我很多支持，还有响哥（李响）的鼓励，也有不少前辈给予肯定，感谢大家的关注和阅读。
