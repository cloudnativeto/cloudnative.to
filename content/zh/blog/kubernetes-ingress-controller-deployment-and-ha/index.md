---
title: "Kubernetes Ingress Controller的使用介绍及高可用落地"
date: 2019-04-17T11:23:34+08:00
draft: false
image: "/images/blog/006tNc79ly1g25nhjs0bhj30rs0ku4qp.jpg"
author: "[张馆长](https://zhangguanzhang.github.io)"
originallink: "https://zhangguanzhang.github.io/2018/10/06/IngressController/"
description: "本文是对 Kubernetes 的 Ingress controller 的介绍、部署及高可用说明。"
tags: ["kubernetes","ingress"]
categories: ["kubernetes"]
keywords: ["Kubernetes"]
type: "post"
avatar: "/images/profile/default.jpg"
---

> 本文转载自[zhangguanzhang的博客](https://zhangguanzhang.github.io/2018/10/06/IngressController/)。

从之前对ingress controller到现在了解架构和一些经验总结下，顺带给人科普少走弯路
需要看懂本文要具备一下知识点：

- Service实现原理和会应用
- 知道反向代理原理，了解nginx和apache的vhost概念
- 了解service的几种类型（Nodeport、clusterip、LB）
- 四层和七层区别（不明白就这样去理解，七层最常见就是应用层的http，也就是url，四层是传输层，为tcp/udp端口）
- 域名解析，/etc/hosts等基础知识

## Ingress Controller介绍

`Ingress Controller`是一个统称，并不是只有一个，有如下这些：

- [Ingress NGINX](https://github.com/kubernetes/ingress-nginx): Kubernetes 官方维护的方案，也是本次安装使用的 Controller。
- [F5 BIG-IP Controller](https://clouddocs.f5.com/products/connectors/k8s-bigip-ctlr/v1.5/): F5 所开发的 Controller，它能够让管理员通过 CLI 或 API 让 Kubernetes 与 OpenShift 管理 F5 BIG-IP 设备。
- [Ingress Kong](https://konghq.com/blog/kubernetes-ingress-controller-for-kong/): 著名的开源 API Gateway 方案所维护的 Kubernetes Ingress Controller。
- [Traefik](https://github.com/containous/traefik): 是一套开源的 HTTP 反向代理与负载均衡器，而它也支援了 Ingress。
- [Voyager](https://github.com/appscode/voyager): 一套以 HAProxy 为底的 Ingress Controller。

> Ingress Controller 的实现不只上面这些方案，还有很多可以在网络上找到这里不一一列出来了。

我们部署在集群里的服务的svc想暴露出来的时候，从长久眼光看和易于管理维护都是用的`Ingress Controller`来处理，clusterip非集群主机无法访问，Nodeport不方便长久管理和效率，LB服务多了不方便因为需要花费额外的钱，externalIPS不好用（后面有空写文章会说它）。

我们跑的大多服务都是应用层http（s），Ingress Controller使用service或者pod的网络将它暴露在集群外，然后它反向代理集群内的七层服务，通过vhost子域名那样路由到后端的服务，`Ingress Controller`工作架构如下，借用traefik官方的图。

![traefik](006tNbRwly1fyl4kdlseyj30mg0dc405.jpg)

你可以将`api.domain.com`进来的流量路由到集群里api的pod，你可以将`backoffice.domain.com`流量路由到backoffice的一组pod上，虽说我们可以自己搭建一个nginx来代替掉`Ingress Controller`，但是要增加代理的service长期来看维护很不方便，在使用上`Ingress Controller`后可以用一种抽象的对象告诉controller添加对应的代理，也就是`kind: Ingress`。它里面描述了从Ingress Controller访问进来的ServerName和web的url要代理到集群里哪个service（以及service的port）等等具体信息。

而官方的`Ingress Nginx`可以视为一个魔改的nginx，拥有集群赋予的RBAC权限后，能够有监听集群Ingress相关的变化能力，用户创建了`kind: Ingress`，
例如上面trafik图里的Ingress大致就是下面这样：

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: my-ingress
  annotations: 
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  rules:
  - host: api.mydomain.com
    http:
      paths:
      - backend:
          serviceName: api
          servicePort: 80
  - host: domain.com
    http:
      paths:
      - path: /web/*
        backend:
          serviceName: web
          servicePort: 8080
  - host: backoffice.domain.com
    http:
      paths:
      - backend:
          serviceName: backoffice
          servicePort: 8080
```

只要创建了上面的Ingress后，ingress controller里会监听到从而生成对应的配置段后动态reload配置文件。

## Ingress Controller部署

部署非常简单，一条命令创建即可，yml来源于 <https://github.com/kubernetes/ingress-nginx/tree/master/deploy>。  

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/master/deploy/mandatory.yaml
```

 该yaml缺少向群外暴露的方式，我们先使用externalIPs方式创建svc来让它能从集群外面访问（此处先学工作原理，后面再讲高可用）。

`$INGRESS_VIP`选取一个和宿主机同一个段没使用过的IP即可（实际上Ingress Nginx bind的端口不止80和443，这里不讨论，有兴趣的同学可以看容器里的默认配置文件）。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
  labels:
    app: ingress-nginx
spec:
  type: LoadBalancer
  externalIPs:
  - $INGRESS_VIP
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: ingress-nginx
```

上面的yaml里后面详细解释我们需要关注的配置项，先来创建ingress对象试试。

### 测试http 7层负载

部署了官方的ingress nginx后，我部署了一个nginx的pod，为它创建了一个名为nginx的service：

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: nginx
spec:
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx
        name: nginx
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  selector:
    app: nginx
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
```

然后创建对应的一个ingress对象来暴露集群里这个nginx的http服务：

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: nginx-ingress
spec:
  rules:
  - host: nginx.testdomain.com
    http:
      paths:
      - backend:
          serviceName: nginx
          servicePort: 80
```

找到ingress nginx的pod名字后通过命令查看里面nginx配置文件能找到有对应的配置段生成：

```yaml
$ kubectl -n ingress-nginx exec nginx-ingress-controller-6cdcfd8ff9-t5sxl -- cat /etc/nginx/nginx.conf
...
	## start server nginx.testdomain.com
	server {
		server_name nginx.testdomain.com ;
		
		listen 80;
		
		set $proxy_upstream_name "-";
		
		location / {
			
			set $namespace      "default";
			set $ingress_name   "nginx-ingress";
			set $service_name   "nginx";
			set $service_port   "80";
			set $location_path  "/";
            ........
	## end server nginx.testdomain.com      
...
```

找一台非集群的Windows机器（也可以mac，主要是有图形界面且非集群内机器），设置hosts文件把域名`nginx.testdomain.com`设置到对service的那个externalIPs的ip上，打开浏览器访问`nginx.testdomain.com`即可发现集群内的nginx已经暴露在集群外。

**注意**：Ingress Controller虽然调用的是service，看起来按照nginx来理解转发是client–nginx–svc–pod; 实际上转发是client–nginx–pod，因为已经魔改了不能按照nginx的来理解，是直接负载到svc的endpoint上面的。

另外低版本的ingress nginx的args参数`--default-backend-service=$(POD_NAMESPACE)/default-http-backend`，该参数指定ingress nginx的同namespace下名为`default-http-backend`的service作为默认访问的时候页面，通常那个时候是创建一个404页面的的pod和对应service，如果ingress nginx启动的时候没找到这个service会无法启动，新版本不是必须了，好像也自带404页面了。

另外ingress也能多路径，如下：

```yaml
spec:
  rules:
  - host: xxxx.xxxx.xxx
    http:
      paths:
      - backend:
          serviceName: service-index
          servicePort: 80
        path: /
      - backend:
          serviceName: service-test-api
          servicePort: 80
        path: /api/
```

### 如何来4层负载

我们可以看到ingress nginx的args里有这两行：

```yaml
- --tcp-services-configmap=$(POD_NAMESPACE)/tcp-services
- --udp-services-configmap=$(POD_NAMESPACE)/udp-services
```

从选项和值可以猜测出，要想代理四层（tcp/udp），得写同namespace里一个名为`tcp-service`和`udp-service`的两个configmap的数据
四层的话这边我们创建一个mysql的pod，来代理3306端口到集群外面，则需要写tcp-services这个configmap：

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: tcp-services
  namespace: ingress-nginx
data:
  3306: "default/mysql:3306"
```

四层写这两个ConfigMap的data即可，按照这样去写即可`out_port: namespaces/svc_name:port`，要给每个ingress加一些nginx里的配置可以查看官方的annotation字段以及值（traefik同理）。

### Ingress Controller高可用

这里来讨论下`Ingress Controller`的高可用。

Ingress Controller到集群内的路径这部分都有负载均衡了，我们比较关注部署了Ingress Controller后，外部到它这段路怎么高可用?

上面的例子里service我使用的externalIPs，但是代理四层的时候会新加端口，需要每次人为去介入增加暴露端口?

流量从入口到`Ingress Controller`的pod有下面几种方式：

- type为`LoadBalancer`的时候手写`externalIPs`很鸡肋，后面会再写文章去讲它
- type为`LoadBalancer`的时候只有云厂商支持分配公网ip来负载均衡，LoadBalancer 公开的每项服务都将获得自己的 IP 地址，但是需要收费，且自己建立集群无法使用
- 不创建service，pod直接用hostport，效率等同于`hostNetwork`，如果不代理四层端口还好，代理了需要修改pod的template来滚动更新来让nginx bind的四层端口能映射到宿主机上
- `Nodeport`，端口不是web端口（但是可以修改Nodeport的范围改成web端口），如果进来流量负载到Nodeport上可能某个流量路线到某个node上的时候因为`Ingress Controller`的pod不在这个node上，会走这个node的kube-proxy转发到Ingress Controller的pod上，多走一趟路
- 不创建service，效率最高，也能四层负载的时候不修改pod的template，唯一要注意的是`hostNetwork`下pod会继承宿主机的网络协议，也就是使用了主机的dns，会导致svc的请求直接走宿主机的上到公网的dns服务器而非集群里的dns server，需要设置pod的`dnsPolicy: ClusterFirstWithHostNet`即可解决

## 写在最后

部署方式没多大区别开心就好。

- DaemonSet + nodeSeletor
- deploy设置replicas数量 + nodeSeletor + pod互斥
- 所以可以一个vip飘在拥有存活的controller的宿主机上，云上的话就用slb来负载代替vip
- 最后说说域名请求指向它，如果部署在内网或者办公室啥的，内网有dns server的话把ing的域名全部解析到ingress controller的宿主机ip上，否则要有人访问每个人设置/etc/hosts才能把域名解析来贼麻烦，如果没有dns server可以跑一个external-dns，它的上游dns是公网的dns服务器，办公网内机器的dns server指向它即可，云上的话把域名请求解析到对应ip即可
- traefik和ingress nginx类似，不过它用go实现的
- 在一些老版本的ingress nginx的log里会一直刷找不到ingress-nginx的svc，不处理的话会狂刷log导致机器load过高,创建一个同名的svc即可解决,例如创建一个不带选择器clusterip为null的即可。非要创建port的svc的话参照下面:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
  labels:
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
spec:
  type: ClusterIP
  ports:
  - name: http
    port: 80
    targetPort: 80
    protocol: TCP
  - name: https
    port: 443
    targetPort: 443
    protocol: TCP
  - name: metrics
    port: 10254
    targetPort: 10254
    protocol: TCP
  selector:
    app.kubernetes.io/name: ingress-nginx
    app.kubernetes.io/part-of: ingress-nginx
```

## 参考:

- [ingress-nginx deploy - github.com](https://github.com/kubernetes/ingress-nginx/blob/master/docs/deploy/index.md)
- [ingress-nginx deploy - kubernetes.github.io](https://kubernetes.github.io/ingress-nginx/deploy/baremetal/)
