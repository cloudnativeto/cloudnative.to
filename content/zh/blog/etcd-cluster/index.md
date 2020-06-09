---
title: "彻底搞懂 etcd 系列文章（三）：etcd 集群运维部署"
description: "系列第三篇，本文带着大家实践 etcd 高可用集群的部署方式"
author: "[aoho](http://blueskykong.com)"
image: "images/blog/etcd-covers.png"
categories: ["Etcd"]
tags: ["etcd","Cloud native"]
date: 2020-06-09T12:00:00+08:00
type: "post"
---

> 作者介绍：aoho，一线码农，对云原生、微服务、Go 语言、容器化感兴趣，并做了深入研究。闲暇时间会分享一些技术思考和实践，与大家讨论交流，共同进步。



### 0 专辑概述
etcd 是云原生架构中重要的基础组件，由 CNCF 孵化托管。etcd 在微服务和 Kubernates 集群中不仅可以作为服务注册与发现，还可以作为 key-value 存储的中间件。

《彻底搞懂 etcd 系列文章》将会从 etcd 的基本功能实践、API 接口、实现原理、源码分析，以及实现中的踩坑经验等几方面具体展开介绍 etcd。预计会有 20 篇左右的文章，笔者将会每周持续更新，欢迎关注。

### 1 etcd 集群部署
在生产环境中，为了整个集群的高可用，etcd 正常都会集群部署，避免单点故障。本节将会介绍如何进行 etcd 集群部署。引导 etcd 集群的启动有以下三种机制：

- 静态
- etcd 动态发现
- DNS 发现

静态启动 etcd 集群要求每个成员都知道集群中的另一个成员。 在许多情况下，群集成员的 IP 可能会提前未知。在这些情况下，可以在发现服务的帮助下引导 etcd 群集。

下面我们将会分别介绍这几种方式。
### 2 静态方式启动 etcd 集群

#### 单机安装
如果想要在一台机器上实践 etcd 集群的搭建，可以通过 goreman 工具。

goreman 是一个 Go 语言编写的多进程管理工具，是对 Ruby 下广泛使用的 foreman 的重写（foreman 原作者也实现了一个 Go 版本：forego，不过没有 goreman 好用）。

我们需要确认 Go 安装环境，然后直接执行：

```
go get github.com/mattn/goreman
```
编译后的文件放在 `$GOPATH/bin` 中，`$GOPATH/bin`目录已经添加到了系统 `$PATH` 中，所以我们可以方便执行命令 `goreman` 命令。下面就是编写 Procfile 脚本，我们启动三个 etcd，具体对应如下：

HostName | ip | 客户端交互端口 | peer 通信端口
:-: | :-: | :-: | :-:
infra1 | 127.0.0.1 | 12379 | 12380 |
infra2 | 127.0.0.1| 22379 | 22380 |
infra3 | 127.0.0.1| 32379 | 32380 |

Procfile 脚本如下：

```
etcd1: etcd --name infra1 --listen-client-urls http://127.0.0.1:12379 --advertise-client-urls http://127.0.0.1:12379 --listen-peer-urls http://127.0.0.1:12380 --initial-advertise-peer-urls http://127.0.0.1:12380 --initial-cluster-token etcd-cluster-1 --initial-cluster 'infra1=http://127.0.0.1:12380,infra2=http://127.0.0.1:22380,infra3=http://127.0.0.1:32380' --initial-cluster-state new --enable-pprof --logger=zap --log-outputs=stderr
etcd2: etcd --name infra2 --listen-client-urls http://127.0.0.1:22379 --advertise-client-urls http://127.0.0.1:22379 --listen-peer-urls http://127.0.0.1:22380 --initial-advertise-peer-urls http://127.0.0.1:22380 --initial-cluster-token etcd-cluster-1 --initial-cluster 'infra1=http://127.0.0.1:12380,infra2=http://127.0.0.1:22380,infra3=http://127.0.0.1:32380' --initial-cluster-state new --enable-pprof --logger=zap --log-outputs=stderr
etcd3: etcd --name infra3 --listen-client-urls http://127.0.0.1:32379 --advertise-client-urls http://127.0.0.1:32379 --listen-peer-urls http://127.0.0.1:32380 --initial-advertise-peer-urls http://127.0.0.1:32380 --initial-cluster-token etcd-cluster-1 --initial-cluster 'infra1=http://127.0.0.1:12380,infra2=http://127.0.0.1:22380,infra3=http://127.0.0.1:32380' --initial-cluster-state new --enable-pprof --logger=zap --log-outputs=stderr
```
配置项说明：

- --name：etcd集群中的节点名，这里可以随意，可区分且不重复就行 
- --listen-peer-urls：监听的用于节点之间通信的url，可监听多个，集群内部将通过这些url进行数据交互(如选举，数据同步等)
- --initial-advertise-peer-urls：建议用于节点之间通信的url，节点间将以该值进行通信。
- --listen-client-urls：监听的用于客户端通信的url，同样可以监听多个。
- --advertise-client-urls：建议使用的客户端通信 url，该值用于 etcd 代理或 etcd 成员与 etcd 节点通信。
- --initial-cluster-token： etcd-cluster-1，节点的 token 值，设置该值后集群将生成唯一 id，并为每个节点也生成唯一 id，当使用相同配置文件再启动一个集群时，只要该 token 值不一样，etcd 集群就不会相互影响。
- --initial-cluster：也就是集群中所有的 initial-advertise-peer-urls 的合集。
- --initial-cluster-state：new，新建集群的标志

注意上面的脚本，etcd 命令执行时需要根据本地实际的安装地址进行配置。下面我们启动 etcd 集群。

```
goreman -f /opt/procfile start
```
使用如上的命令启动启动 etcd 集群，启动完成之后查看集群内的成员。

```
$ etcdctl --endpoints=http://localhost:22379  member list

8211f1d0f64f3269, started, infra1, http://127.0.0.1:12380, http://127.0.0.1:12379, false
91bc3c398fb3c146, started, infra2, http://127.0.0.1:22380, http://127.0.0.1:22379, false
fd422379fda50e48, started, infra3, http://127.0.0.1:32380, http://127.0.0.1:32379, false
```
我们在单机搭建的伪集群成功，需要注意的是在集群启动时，我们是通过静态的方式指定集群的成员，在实际环境中，集群成员的 ip 可能不会提前知道。这时候就需要采用动态发现的机制。
#### docker 启动集群
etcd 使用 gcr.io/etcd-development/etcd 作为容器的主要加速器， quay.io/coreos/etcd 作为辅助的加速器。可惜这两个加速器我们都没法访问，如果下载不了，可以使用笔者提供的地址：

```
docker pull bitnami/etcd:3.4.7
```
然后将拉取的镜像重新 tag：

```
docker image tag bitnami/etcd:3.4.7 quay.io/coreos/etcd:3.4.7
```
镜像设置好之后，我们启动 3 个节点的 etcd 集群，脚本命令如下：

```
REGISTRY=quay.io/coreos/etcd

# For each machine
ETCD_VERSION=3.4.7
TOKEN=my-etcd-token
CLUSTER_STATE=new
NAME_1=etcd-node-0
NAME_2=etcd-node-1
NAME_3=etcd-node-2
HOST_1= 192.168.202.128
HOST_2= 192.168.202.129
HOST_3= 192.168.202.130
CLUSTER=${NAME_1}=http://${HOST_1}:2380,${NAME_2}=http://${HOST_2}:2380,${NAME_3}=http://${HOST_3}:2380
DATA_DIR=/var/lib/etcd

# For node 1
THIS_NAME=${NAME_1}
THIS_IP=${HOST_1}
docker run \
  -p 2379:2379 \
  -p 2380:2380 \
  --volume=${DATA_DIR}:/etcd-data \
  --name etcd ${REGISTRY}:${ETCD_VERSION} \
  /usr/local/bin/etcd \
  --data-dir=/etcd-data --name ${THIS_NAME} \
  --initial-advertise-peer-urls http://${THIS_IP}:2380 --listen-peer-urls http://0.0.0.0:2380 \
  --advertise-client-urls http://${THIS_IP}:2379 --listen-client-urls http://0.0.0.0:2379 \
  --initial-cluster ${CLUSTER} \
  --initial-cluster-state ${CLUSTER_STATE} --initial-cluster-token ${TOKEN}

# For node 2
THIS_NAME=${NAME_2}
THIS_IP=${HOST_2}
docker run \
  -p 2379:2379 \
  -p 2380:2380 \
  --volume=${DATA_DIR}:/etcd-data \
  --name etcd ${REGISTRY}:${ETCD_VERSION} \
  /usr/local/bin/etcd \
  --data-dir=/etcd-data --name ${THIS_NAME} \
  --initial-advertise-peer-urls http://${THIS_IP}:2380 --listen-peer-urls http://0.0.0.0:2380 \
  --advertise-client-urls http://${THIS_IP}:2379 --listen-client-urls http://0.0.0.0:2379 \
  --initial-cluster ${CLUSTER} \
  --initial-cluster-state ${CLUSTER_STATE} --initial-cluster-token ${TOKEN}

# For node 3
THIS_NAME=${NAME_3}
THIS_IP=${HOST_3}
docker run \
  -p 2379:2379 \
  -p 2380:2380 \
  --volume=${DATA_DIR}:/etcd-data \
  --name etcd ${REGISTRY}:${ETCD_VERSION} \
  /usr/local/bin/etcd \
  --data-dir=/etcd-data --name ${THIS_NAME} \
  --initial-advertise-peer-urls http://${THIS_IP}:2380 --listen-peer-urls http://0.0.0.0:2380 \
  --advertise-client-urls http://${THIS_IP}:2379 --listen-client-urls http://0.0.0.0:2379 \
  --initial-cluster ${CLUSTER} \
  --initial-cluster-state ${CLUSTER_STATE} --initial-cluster-token ${TOKEN}
```
注意，上面的脚本是部署在三台机器上面，每台机器执行对应的脚本即可。在运行时可以指定 API 版本：

```
docker exec etcd /bin/sh -c "export ETCDCTL_API=3 && /usr/local/bin/etcdctl put foo bar"
```
docker 的安装方式比较简单，读者根据需要可以定制一些配置。
### 3 动态发现启动 etcd 集群

如前面所述，在实际环境中，集群成员的 ip 可能不会提前知道。在这种情况下，需要使用自动发现来引导 etcd 集群，而不是指定静态配置，这个过程被称为**发现**。我们启动三个 etcd，具体对应如下：

HostName | ip | 客户端交互端口 | peer 通信端口
:-: | :-: | :-: | :-:
etcd1 | 192.168.202.128 | 2379 | 2380 |
etcd2 | 192.168.202.129| 2379 | 2380 |
etcd3 | 192.168.202.130| 2379 | 2380 |

#### 协议的原理

Discovery service protocol 帮助新的 etcd 成员使用共享 URL 在集群引导阶段发现所有其他成员。

该协议使用新的发现令牌来引导一个唯一的 etcd 集群。一个发现令牌只能代表一个 etcd 集群。只要此令牌上的发现协议启动，即使它中途失败，也不能用于引导另一个 etcd 集群。

**提示**：Discovery service protocol 仅用于集群引导阶段，不能用于运行时重新配置或集群监视。

Discovery protocol 使用内部 etcd 集群来协调新集群的引导程序。首先，所有新成员都与发现服务交互，并帮助生成预期的成员列表。之后，每个新成员使用此列表引导其服务器，该列表执行与 `--initial-cluster` 标志相同的功能，即设置所有集群的成员信息。

#### 获取 discovery 的 token

生成将标识新集群的唯一令牌。 在以下步骤中，它将用作发现键空间中的唯一前缀。 一种简单的方法是使用uuidgen：

```
UUID=$(uuidgen)
```

#### 指定集群的大小

获取令牌时，必须指定群集大小。 发现服务使用该大小来了解何时发现了最初将组成集群的所有成员。

```
curl -X PUT http://10.0.10.10:2379/v2/keys/discovery/6c007a14875d53d9bf0ef5a6fc0257c817f0fb83/_config/size -d value=3
```
我们需要把该 url 地址 http://10.0.10.10:2379/v2/keys/discovery/6c007a14875d53d9bf0ef5a6fc0257c817f0fb83 作为 `--discovery` 参数来启动 etcd。

节点会自动使用 http://10.0.10.10:2379/v2/keys/discovery/6c007a14875d53d9bf0ef5a6fc0257c817f0fb83 目录进行 etcd 的注册和发现服务。

#### 公共发现服务
当我们本地没有可用的 etcd 集群，etcd 官网提供了一个可以公网访问的 etcd 存储地址。我们可以通过如下命令得到 etcd 服务的目录，并把它作为 `--discovery` 参数使用。

公共发现服务 `discovery.etcd.io` 以相同的方式工作，但是有一层修饰，可以提取丑陋的 URL，自动生成 UUID，并提供针对过多请求的保护。公共发现服务在其上仍然使用 etcd 群集作为数据存储。

```
$ curl http://discovery.etcd.io/new?size=3

http://discovery.etcd.io/3e86b59982e49066c5d813af1c2e2579cbf573de
```
#### 以动态发现方式启动集群

etcd 发现模式下，启动 etcd 的命令如下：

```
# etcd1 启动
$ /opt/etcd/bin/etcd  --name etcd1 --initial-advertise-peer-urls http://192.168.202.128:2380 \
  --listen-peer-urls http://192.168.202.128:2380 \
  --data-dir /opt/etcd/data \
  --listen-client-urls http://192.168.202.128:2379,http://127.0.0.1:2379 \
  --advertise-client-urls http://192.168.202.128:2379 \
  --discovery https://discovery.etcd.io/3e86b59982e49066c5d813af1c2e2579cbf573de

# etcd2 启动
 /opt/etcd/bin/etcd  --name etcd2 --initial-advertise-peer-urls http://192.168.202.129:2380 \
  --listen-peer-urls http://192.168.202.129:2380 \
  --data-dir /opt/etcd/data \
  --listen-client-urls http://192.168.202.129:2379,http://127.0.0.1:2379 \
  --advertise-client-urls http://192.168.202.129:2379 \
  --discovery https://discovery.etcd.io/3e86b59982e49066c5d813af1c2e2579cbf573de

# etcd3 启动
 /opt/etcd/bin/etcd  --name etcd3 --initial-advertise-peer-urls http://192.168.202.130:2380 \
    --listen-peer-urls http://192.168.202.130:2380 \
    --data-dir /opt/etcd/data \
    --listen-client-urls http://192.168.202.130:2379,http://127.0.0.1:2379 \
    --advertise-client-urls http://192.168.202.130:2379 \
    --discovery https://discovery.etcd.io/3e86b59982e49066c5d813af1c2e2579cbf573de
```

需要注意的是，在我们完成了集群的初始化后，这些信息就失去了作用。当需要增加节点时，需要使用 etcdctl 进行操作。为了安全，每次启动新 etcd 集群时，都使用新的 discovery token 进行注册。另外，如果初始化时启动的节点超过了指定的数量，多余的节点会自动转化为 Proxy 模式的 etcd。

#### 结果验证
集群启动好之后，进行验证，我们看一下集群的成员：

```
$ /opt/etcd/bin/etcdctl member list
# 结果如下
    40e2ac06ca1674a7, started, etcd3, http://192.168.202.130:2380, http://192.168.202.130:2379, false
    c532c5cedfe84d3c, started, etcd1, http://192.168.202.128:2380, http://192.168.202.128:2379, false
    db75d3022049742a, started, etcd2, http://192.168.202.129:2380, http://192.168.202.129:2379, false
```
结果符合预期，再看下节点的健康状态：

```
$ /opt/etcd/bin/etcdctl  --endpoints="http://192.168.202.128:2379,http://192.168.202.129:2379,http://192.168.202.130:2379"  endpoint  health
# 结果如下
    http://192.168.202.128:2379 is healthy: successfully committed proposal: took = 3.157068ms
    http://192.168.202.130:2379 is healthy: successfully committed proposal: took = 3.300984ms
    http://192.168.202.129:2379 is healthy: successfully committed proposal: took = 3.263923ms
```
![](images/blog/etcd-discovery.png)

可以看到，集群中的三个节点都是健康的正常状态。以动态发现方式启动集群成功。

### 4 DNS自发现模式
etcd 还支持使用 DNS SRV 记录进行启动。实际上是利用 DNS 的 SRV 记录不断轮训查询实现。DNS SRV 是 DNS 数据库中支持的一种资源记录的类型，它记录了计算机与所提供服务信息的对应关系。
#### 4.1 Dnsmasq 安装
这里使用 Dnsmasq 创建 DNS 服务。Dnsmasq 提供 DNS 缓存和 DHCP 服务、Tftp 服务功能。作为域名解析服务器，Dnsmasq 可以通过缓存 DNS 请求来提高对访问过的网址的连接速度。Dnsmasq 轻量且易配置，适用于个人用户或少于 50 台主机的网络。此外它还自带了一个 PXE 服务器。

当接受到一个 DNS 请求时，Dnsmasq 首先会查找 /etc/hosts 这个文件，然后查找 /etc/resolv.conf 中定义的外部 DNS。配置 Dnsmasq 为 DNS 缓存服务器，同时在 /etc/hosts 文件中加入本地内网解析，这样使得内网机器查询时就会优先查询 hosts 文件，这就等于将 /etc/hosts 共享给全内网机器使用，从而解决内网机器互相识别的问题。相比逐台机器编辑 hosts 文件或者添加 Bind DNS 记录，可以只编辑一个 hosts 文件。

基于笔者使用的 Centos 7 的主机，首先安装 Dnsmasq：

```
yum install dnsmasq
```
安装好之后，进行配置，所有的配置都在一个文件中完成 /etc/dnsmasq.conf。我们也可以在 /etc/dnsmasq.d 中自己写任意名字的配置文件。

##### 配置上游服务器地址

resolv-file 配置 Dnsmasq 额外的上游的 DNS 服务器，如果不开启就使用 Linux 主机默认的 /etc/resolv.conf 里的 nameserver。

```
$ vim /etc/dnsmasq.conf

# 增加如下的内容：
resolv-file=/etc/resolv.dnsmasq.conf
srv-host=_etcd-server._tcp.blueskykong.com,etcd1.blueskykong.com,2380,0,100
srv-host=_etcd-server._tcp.blueskykong.com,etcd2.blueskykong.com,2380,0,100
srv-host=_etcd-server._tcp.blueskykong.com,etcd3.blueskykong.com,2380,0,100
```
在 dnsmasq.conf 中相应的域名记录，配置了我们所涉及的三台服务器，分别对应 etcd1，etcd2，etcd3。

##### 在指定文件中增加转发 DNS 的地址

```
$ vim /etc/resolv.dnsmasq.conf

nameserver 8.8.8.8
nameserver 8.8.4.4
```
这两个免费的 DNS服务，大家应该不陌生。读者可以根据本地实际网络进行配置。
##### 本地启用 Dnsmasq 解析

```
$ vim /etc/resolv.conf

nameserver 127.0.0.1
```
将 Dnsmasq 解析配置到本地，这很好理解。

##### 添加解析记录

分别为各个域名配置相关的 A 记录指向 etcd 核心节点对应的机器 IP。添加解析记录有三种方式：使用系统默认 hosts、使用自定义 hosts 文件、使用自定义 conf。这里我们使用比较简单的第一种方式。

```
$ vim /etc/hosts

# 增加如下的内容解析
192.168.202.128 etcd1.blueskykong.com
192.168.202.129 etcd2.blueskykong.com
192.168.202.130 etcd3.blueskykong.com
```

**启动服务**

```
service dnsmasq start
```
启动好之后，我们进行验证：

- DNS 服务器上 SRV 记录查询，查询到的结果如下：

	```
	$ dig @192.168.202.128 +noall +answer SRV _etcd-server._tcp.blueskykong.com

	_etcd-server._tcp.blueskykong.com. 0 IN SRV     0 100 2380 etcd2.blueskykong.com.
	_etcd-server._tcp.blueskykong.com. 0 IN SRV     0 100 2380 etcd1.blueskykong.com.
	_etcd-server._tcp.blueskykong.com. 0 IN SRV     0 100 2380 etcd3.blueskykong.com.
	```

- 使查询域名解析结果

	```
	$ dig @192.168.202.128 +noall +answer etcd1.blueskykong.com etcd2.blueskykong.com etcd3.blueskykong.com

	etcd1.blueskykong.com.  0       IN      A       192.168.202.128
	etcd2.blueskykong.com.  0       IN      A       192.168.202.129
	etcd3.blueskykong.com.  0       IN      A       192.168.202.130
	```

至此，我们已成功安装好 Dnsmasq。下面我们基于 DNS 发现启动 etcd 集群。

#### 启动集群
做好了上述两步 DNS 的配置，就可以使用 DNS 启动 etcd 集群了。需要删除ETCD_INITIAL_CLUSTER 配置(用于静态服务发现)，并指定 DNS SRV 域名(ETCD_DISCOVERY_SRV)。配置 DNS 解析的 url 参数为 `-discovery-srv`，其中 etcd1 节点地启动命令如下：

```
$ /opt/etcd/bin/etcd   --name etcd1 \
--discovery-srv blueskykong.com \
--initial-advertise-peer-urls http://etcd1.blueskykong.com:2380 \
--initial-cluster-token etcd-cluster-1 \
--data-dir /opt/etcd/data \
--initial-cluster-state new \
--advertise-client-urls http://etcd1.blueskykong.com:2379 \
--listen-client-urls http://0.0.0.0:2379 \
--listen-peer-urls http://0.0.0.0:2380
```

etcd 群集成员可以使用域名或 IP 地址进行广播，启动的过程将解析 DNS 记录。--initial-advertise-peer-urls 中的解析地址必须与 SRV 目标中的解析地址匹配。etcd 成员读取解析的地址，以查找其是否属于 SRV 记录中定义的群集。

我们验证基于 DNS 发现启动集群的正确性，查看集群的成员列表：

```
$ /opt/etcd/bin/etcdctl member list

# 结果如下：
40e2ac06ca1674a7, started, etcd3, http://192.168.202.130:2380, http://etcd3.blueskykong.com:2379, false
c532c5cedfe84d3c, started, etcd1, http://192.168.202.128:2380, http://etcd1.blueskykong.com:2379, false
db75d3022049742a, started, etcd2, http://192.168.202.129:2380, http://etcd2.blueskykong.com:2379, false
```
可以看到，结果输出 etcd 集群有三个成员，符合预期。下面我们使用 IP 地址的方式，继续验证集群节点的状态。

```
$ /opt/etcd/bin/etcdctl  --endpoints="http://192.168.202.128:2379,http://192.168.202.129:2379,http://192.168.202.130:2379"  endpoint  health

# 结果如下：
http://192.168.202.129:2379 is healthy: successfully committed proposal: took = 2.933555ms
http://192.168.202.128:2379 is healthy: successfully committed proposal: took = 7.252799ms
http://192.168.202.130:2379 is healthy: successfully committed proposal: took = 7.415843ms
```
更多的 etcd 集群操作，读者可以自行尝试，笔者不在此一一展开。

### 5 小结
本文在上一篇文章单机安装 etcd 的基础上进行了补充，主要介绍了 etcd 集群的多种安装启动方式：静态单体，静态 docker，动态发现以及 DNS 发现的启动方式。这么多的安装姿势，都是为了我们实际的使用，下一篇我们将具体进入 etcdctl 的使用讲解。

#### 推荐阅读
1. [etcd 与 Zookeeper、Consul 等其它 k-v 组件的对比](http://blueskykong.com/2020/05/05/etcd-vs/)
2. [彻底搞懂 etcd 系列文章（一）：初识 etcd](http://blueskykong.com/2020/05/19/etcd-1/)
3. [彻底搞懂 etcd 系列文章（二）：etcd 的多种安装姿势](http://blueskykong.com/2020/05/27/etcd-2/)

#### 参考
[etcd docs](https://etcd.io/docs/v3.4.0/op-guide/clustering/#error-cases)
