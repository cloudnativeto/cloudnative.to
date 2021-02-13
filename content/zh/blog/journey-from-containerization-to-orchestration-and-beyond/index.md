---
originallink: "https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/"
author: "Ivan Velichko"
date: "2019-08-28T10:42:00+08:00"
draft: false
image: "/images/blog/006tKfTcly1g0t1i9oxo4j31400u0npe.jpg"
translator: "马若飞"
translatorlink: "https://github.com/malphi"
reviewer:  ["罗广明"]
reviewerlink:  ["https://github.com/GuangmingLuo"]
title: "容器化到容器编排之旅"
description: "本文是一篇介绍容器运行时和管理工具的文章，对主要的容器管理工具做了介绍"
categories: ["Kubernetes"]
tags: ["container"]
type: "post"
avatar: "/images/profile/default.jpg"
---

 查看原文：<https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/>。

## 编者按

本文是一篇介绍容器运行时和管理工具的文章。文中对主要的容器管理项目和技术做了较为详细的介绍和横向对比，并给出了项目的代码库供读者参考。

## 前言

容器带来了更高级的服务端架构和更复杂的部署技术。目前已经有一堆类似标准的规范（[1](https://github.com/opencontainers/runtime-spec), [2](https://github.com/opencontainers/image-spec), [3](https://kubernetes.io/blog/2016/12/container-runtime-interface-cri-in-kubernetes/), [4](https://github.com/containernetworking/cni), ……）描述了容器领域的方方面面。当然，它的底层是Linux的基本单元，如namespace和cgroups。容器化软件已经变得非常的庞大，如果没有它自己关注的分离层，几乎是不可能实现的。在这个持续努力的过程中，我尝试引导自己从最底层到最高层尽可能多的实践（代码、安装、配置、集成等等），当然还有尽可能多的获得乐趣。本篇内容会随着时间的推移而改变，并反映出我对这一主题的理解。

## 容器运行时

我想从最底层的非内核原语说起——**容器运行时**。在容器服务里，运行时这个词是有歧义的。每个项目、公司或社区对术语**容器运行时**都有自己的、通常是基于上下文的特定理解。大多数情况下，运行时的特征是由一组职责定义的，从最基本的职责（创建namespace、启动*init*进程）到复杂的容器管理，包括（但不限于）镜像操作。[这篇文章](https://www.ianlewis.org/en/container-runtimes-part-1-introduction-container-r)对运行时有一个很好的概述。

![img](https://iximiuz.com/journey-from-containerization-to-orchestration-and-beyond/runtime-levels.png)

本节专门讨论低阶容器运行时。在[OCI运行时规范](https://github.com/opencontainers/runtime-spec)中，组成[Open Container Initiative](https://www.opencontainers.org/)的一些重要参与者对底层运行时进行了标准化。长话短说，低阶容器运行时是一个软件，作为一个包含rootfs和配置的目录输入，来描述容器参数（如资源限制、挂载点、流程开始等），并作为运行时启动一个独立进程，即容器。

到2019年，使用最广泛的容器运行时是[runc](https://github.com/opencontainers/runc)。这个项目最初是Docker的一部分（因此它是用Go编写的），但最终被提取并转换为一个独立的CLI工具。很难高估这个组件的重要性——基本上runc是OCI运行时规范的一个参考实现。在我们的实践中将大量使用runc，下面是[一篇介绍性文章](https://iximiuz.com/en/posts/implementing-container-runtime-shim/)（编者注：页面暂无内容）。

![img](https://iximiuz.com/journey-from-containerization-to-orchestration-and-beyond/runc.png)

一个更值得注意的OCI运行时实现是[crun](https://github.com/containers/crun)。它用C语言编写，既可以作为可执行文件，也可以作为库使用。

## 容器管理

在命令行中可以使用runc启动任意数量的容器。但是如果我们需要让这个过程自动化呢？假设我们需要启动数十个容器来跟踪它们的状态，其中一些在失败时需要重启，在终止时需要释放资源，必须从注册中心提取镜像，需要配置容器间网络等等。这是一个稍微高级的任务，并且是“容器管理器”的职责。老实说，我不知道这个词是否常用，但我发现用它来描述很合适。我将以下项目归类为“容器管理器”：[containerd](https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/#containerd)， [cri-o](https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/#cri-o)， [dockerd](https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/#dockerd) 和 [podman](https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/#podman).

### containerd

与runc一样，我们可以再次看到Docker的遗产——[containerd](https://github.com/containerd/containerd)曾经是Docker项目的一部分，现在它是一个独立的软件，自称为容器运行时。但显然，它与运行时runc不是同一种类型的运行时。不仅它们的职责不同，其组织形式也不同。runc只是一个命令行工具，containerd是一个长活的守护进程。一个runc实例不能比底层容器进程活得更久。通常，它在`create`调用时启动，然后在`start`时从容器的rootfs中[`exec`](https://linux.die.net/man/3/exec)特定文件。另一方面，containerd可以运行的比成千上万个容器更长久。它更像是一个服务器，侦听传入的请求来启动、停止或报告容器的状态。在幕后，containerd使用runc。它不仅仅是一个容器生命周期管理器，还负责镜像管理（从注册表中拉取和提交镜像，本地存储镜像等等），跨容器联网管理和其他一些功能。

![img](https://iximiuz.com/journey-from-containerization-to-orchestration-and-beyond/containerd.png)

### cri-o

另一个容器管理器是[cri-o](https://github.com/cri-o/cri-o)。containerd是Docker重构后的结果，但cri-o却源于Kubernetes领域。在过去，Kubernetes使用Docker管理容器。然而，随着[rkt](https://github.com/rkt/rkt)的崛起，一些人增加了在Kubernetes中可互换容器运行时的支持，允许Docker和/或rkt完成容器管理。这种变化导致Kubernetes中有大量的条件判断，没有人喜欢代码中有太多的“if”。因此，[容器运行时接口（CRI）](https://kubernetes.io/blog/2016/12/container-runtime-interface-cri-in-kubernetes/)被引入到Kubernetes中，这使得任何兼容CRI的高阶运行时（例如容器管理器）都可以在Kubernetes中使用，而无需任何代码的更改。cri-o是RedHat实现的兼容CRI的运行时，与containerd一样，它也是一个守护进程，通过开放一个gRPC服务接口来创建、启动、停止（以及许多其他操作）容器。在底层，cri-o可以使用任何符合OCI标准的低阶运行时和容器工作，默认的运行时仍然是runc。cri-o的主要目标是作为Kubernetes的容器运行时，版本控制也与K8S一致，项目的范围界定的很好，其代码库也比期望的更小（截止2019年7月大约是20个CLOC，近似于containerd的5倍）。

![img](https://iximiuz.com/journey-from-containerization-to-orchestration-and-beyond/cri-o.png)

cri-o 架构 (图像来自 cri-o.io)

规范的好处是所有符合规范的技术都可以互换使用。一旦CRI被引入，一个containerd的插件就可以在它的功能之上实现CRI的gRPC服务。这个想法是可行的，所以后来containerd获得了原生的CRI支持。因此，Kubernetes可以同时使用cri-o和containerd作为运行时。

### dockerd

还有一个守护进程是[dockerd](https://github.com/moby/moby/tree/master/cmd/dockerd)，它是个多面手。一方面，它为[Docker命令行](https://github.com/docker/cli) 开放了一个API，为我们提供了所有这些常用的Docker命令（`Docker pull`、`Docker push`、`Docker run`、`Docker stats`等）。但是我们已经知道这部分功能被提取到了containerd中，所以在底层dockerd依赖于containerd就不足为奇了。但这基本上意味着dockerd只是一个前端适配器，它将containerd的API转换为广泛使用的docker引擎的API。

[dockerd](https://github.com/moby/moby)（编者注：原文链接是moby项目）也提供了`compose`和`swarm`功能，试图解决容器编配问题，包括容器的多机器集群。正如我们在Kubernetes上看到的，这个问题相当难解决。对于一个单dockerd守护进程来说，同时承担两大职责并不好。

![img](https://iximiuz.com/journey-from-containerization-to-orchestration-and-beyond/dockerd.png)

dockerd 是 containerd 前端的一部分（图片来源于Docker Blog）

### podman

守护进程中一个有趣的例外是[podman](https://github.com/containers/libpod)。这是另一个Red Hat项目，目的是提供一个名为`libpod`的库（而不是守护进程）来管理镜像、容器生命周期和pod（容器组）。`podman`是一个构建在这个库之上的命令行管理工具。作为一个低阶的容器运行时，这个项目也使用runc。从代码角度来看，podman和cri-o （都是Red Hat项目）有很多共同点。例如，它们都在内部使用[storage](https://github.com/containers/storage)和[image](https://github.com/containers/image)库。另一项正在进行的工作是在cri-o中直接使用libpod而不是runc。podman的另一个有趣的特性是用drop-in替换一些（最流行的？）日常工作流程中的`docker`命令。该项目声称兼容（在一定程度上）docker CLI API。

既然我们已经有了dockerd、containerd和cri-o，为什么还要开发这样的项目呢？守护进程作为容器管理器的问题是，它们大多数时候必须使用root权限运行。尽管由于守护进程的整体性，系统中没有root权限也可以完成其90%的功能，但是剩下的10%需要以root启动守护进程。使用podman，最终有可能使Linux用户的namespace拥有无根（rootless）容器。这可能是一个大问题，特别是在广泛的CI或多租户环境中，因为即使是没有权限的Docker容器实际上也只是系统上的[一个没有root访问权限的内核错误](https://brauner.github.io/2019/02/12/privileged.containes.html)。

关于这个有趣项目的更多信息可以在 [这里](http://crunchtools.com/podman-and-cri-o-in-rhel-8-and-openshift-4) 和 [这里](https://www.redhat.com/en/blog/why-red-hat-investing-cri-o-and-podman)找到。

![img](https://iximiuz.com/journey-from-containerization-to-orchestration-and-beyond/podman.png)

### conman

这是我正在做的[项目](https://github.com/iximiuz/conman)，目的是实现一个微型容器管理器。它主要用于教学目的，但是最终的目标是使它兼容CRI，并作为容器运行时运行在Kubernetes集群上。

### 运行时垫片（runtime shims）

如果你自己尝试一下就会很快发现，以编程方式从容器管理器使用runc是一项相当棘手的任务。以下是需要解决的困难清单。

#### 在容器管理器重启时保证容器存活

容器可以长时间运行，而容器管理器可能由于崩溃或更新（或无法预见的原因）而需要重新启动。这意味着我们需要使每个容器实例独立于启动它的容器管理器进程。幸运的是，runc提供了一种方式通过命令`runc run --detach`从正在运行的容器中分离。我们也可能需要能够[附加到一个正在运行的容器上](https://iximiuz.com/en/posts/linux-pty-what-powers-docker-attach-functionality/)。为此，runc可以运行一个由Linux伪终端控制的容器。通过Unix套接字传递PTY主文件描述符，可以将PTY的master端回传到启动进程（请参阅`runc create --console-socket`选项）。这意味着，只要底层容器实例存在，我们就可以保持启动进程的活动状态，以保存PTY文件描述符。如果我们决定在容器管理器进程中存储主PTY文件描述符，则重新启动该管理器将导致文件描述符的丢失，从而失去重新附着到正在运行的容器的能力。这意味着我们需要一个专用的（轻量级的）包装进程来负责转化和保持运行容器的附属状态。

#### 同步容器管理器和包装的runc实例

由于我们通过添加包装器进程对runc进行了转化，所以需要一个side-channel（也可能是Unix套接字）来将容器的启动传回容器管理器。

#### 持续追踪容器退出码（exit code）

分离容器会导致缺少容器状态更新。我们需要有一种方式将状态反馈给管理器。出于这个目的，文件系统听起来也是一个不错的选择。我们可以让包装器进程等待子runc进程终止，然后将它的退出码写到磁盘上预定义的位置。

为了解决所有这些问题（可能还有其他一些问题），通常使用所谓的runtime shims。shim是一个轻量级守护进程，控制一个正在运行的容器。shims的实现有[conmon](https://github.com/containers/conmon)和containerd的 [runtime shim](https://github.com/containerd/containerd/blob/master/runtime/v2/shim.go)。我花了一些时间实现了自己的shim作为[conman](https://github.com/iximiuz/conman)项目的一部分，可以在文章[“实现容器运行时shim”](https://iximiuz.com/en/posts/implementing-container-runtime-shim/)中找到（编者注：此文章还未撰写）。

### 容器网络接口 (CNI)

我们有多个责任重叠的容器运行时（或管理器），很明显需要提取网络相关的代码到一个专门的项目来复用它，或者每个运行时都应该有自己的方式来配置NIC设备，IP路由，防火墙和网络的其他方面。例如，cri-o和containerd都必须创建Linux网络名称空间，并设置Linux `bridge`和`veth`设备来为Kubernetes pods创建沙箱。为了解决这个问题，引入了[容器网络接口](https://github.com/containernetworking/cni)项目。

CNI项目提供了一个定义CNI插件的[容器网络接口规范](https://github.com/containernetworking/cni/blob/master/SPEC.md)。插件是一个可执行的sic，容器运行时（或管理器）会调用它来安装（或释放）网络资源。插件可以用来创建网络接口，管理IP地址分配，或者对系统进行一些自定义配置。CNI项目与语言无关，由于插件被定义为可执行的，它可以用于任何编程语言实现的运行时管理系统。CNI项目还为作为一个名为[plugins](https://github.com/containernetworking/plugins)的用于存放最流行的用例的独立的代码库提供了一组参考插件实现。例如[bridge](https://github.com/containernetworking/plugins/tree/master/plugins/main/bridge)、[loopback](https://github.com/containernetworking/plugins/tree/master/plugins/main/loopback)、[flannel](https://github.com/containernetworking/plugins/tree/master/plugins/meta/flannel)等。

一些第三方项目将其网络相关的功能实现为CNI插件。一些最著名的项目如[Project Calico](https://github.com/projectcalico/cni-plugin)和[Weave](https://github.com/weaveworks/weave)。

## 编排

容器的编排是一个非常大的主题。实际上，Kubernetes代码中最大的部分就是解决编排问题，而不是容器化问题。因此，编排应该有自己单独的文章（或几篇）而不在本文描述。希望他们能很快跟进。

![img](https://iximiuz.com/journey-from-containerization-to-orchestration-and-beyond/orchestration.png)

## 值得注意的项目

### [buildah](https://github.com/containers/buildah)

Buildah是一个和[OCI容器镜像](https://github.com/opencontainers/image-spec)一起使用的命令行工具。它是RedHat发起的一组项目（podman、skopeo、buildah）的一部分，目的是重新设计Docker处理容器的方法（主要是将单体和基于守护进程的方法转换为更细粒度的方法）。

### [cni](https://github.com/containernetworking/cni)

CNI项目定义了一个容器网络接口插件规范以及一些Go工具。有关更深入的解释，请参见这篇[文章](https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/#cni)相应的部分。

### [cni-plugins](https://github.com/containernetworking/plugins)

一个最流行的CNI插件（如网桥、主机设备、环回、dhcp、防火墙等）的主库。有关更深入的解释，请参见[文章](https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/#cni)的相应部分。

### [containerd](https://github.com/containerd/containerd)

高级容器运行时（或容器管理器）作为Docker的一部分启动，并提取到了独立的项目中。有关更深入的解释，请参见相应的[部分](https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/#containerd)。

### [conmon](https://github.com/containers/conmon)

一个用C语言编写的小型OCI运行时shim，主要由[crio](https://github.com/cri-o/cri-o)使用。它提供了父进程（crio）与启动容器之间的同步、容器启动、退出码追踪、PTY转发和其他一些功能。有关更深入的解释，请参见相应的[部分](https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/#containerd)。

### [cri-o](https://github.com/cri-o/cri-o)

专注于Kubernetes容器管理器，遵循Kubernetes容器运行时接口（CRI）规范。版本控制与k8s版本控制相同。有关更深入的解释，请参见相应的[部分](https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/#cri-o)。

### [crun](https://github.com/containers/crun)

另一个OCI运行时规范实现。它声称是”快速和低内存占用的OCI容器运行时，完全用C编写“。但最重要的是，它可以用作任何C/C++代码（或提供绑定其他语言）的库。它允许避免一些由它的守护进程特性引起的特定的“runc”缺陷。有关更多信息，请参见[Runtime Shims](https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/#runtime-shims)一节。

### [image](https://github.com/containers/image)

一个被低估的（主观评价）Go工具库，为*crio*、*podman*和*skopeo*等知名项目提供了支持。通过它的名字就很容易猜到——其目的是用各种方式来处理容器镜像和镜像注册表。

### [lxc](https://github.com/lxc/lxc)

一个由C编写的可替换的低级容器运行时。

### [lxd](https://github.com/lxc/lxd)

一个由Go编写的高级容器运行时（或容器管理器）。底层使用lxc作为低级运行时。

### [moby](https://github.com/moby/moby)

高级容器运行时（或容器管理器），以前称为`docker/docker`。提供一个著名的基于*containerd*功能的Docker引擎API。有关更深入的解释，请参见相应的[部分](https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/#dockerd)。

### [OCI distribution spec](https://github.com/opencontainers/distribution-spec)

一个容器镜像发布规范（开发中）。

### [OCI image spec](https://github.com/opencontainers/image-spec)

一个容器镜像规范。

### [OCI runtime spec](https://github.com/opencontainers/runtime-spec)

一个低阶容器运行时规范。

### [podman](https://github.com/containers/libpod)

一个无守护进程的Docker替代品。Docker重新设计的frontman项目。更多信息参见 [RedHat developers blog](https://developers.redhat.com/blog/2019/02/21/podman-and-buildah-for-docker-users/)。

### [rkt](https://github.com/rkt/rkt)

另一个容器管理系统。它提供了一个低阶运行时和一个高阶管理接口。它宣称是Pod原生的。向Kubernetes添加*rkt*支持的想法催生了CRI规范。该项目由CoreOS团队于5年前启动，在被RedHat收购后却停滞不前。截止到2019年8月，该项目的最后一次提交已经是大约两个月前了。**更新**：8月16日，CNCF[宣布](https://www.cncf.io/blog/2019/08/16/cncf-archives-the-rkt-project/)技术监督委员会（TOC）投票决定将rkt项目存档。

### [runc](https://github.com/opencontainers/runc)

一个低阶容器运行时和OCI运行时规范的参考实现。一开始作为Docker的一部分现在提取到了一个独立的项目中，普及度很高。有关更深入的解释，请参见相应的[部分](https://iximiuz.com/en/posts/journey-from-containerization-to-orchestration-and-beyond/#container-runtimes)。

### [skopeo](https://github.com/containers/skopeo)

Skopeo是一个命令行工具集，对容器镜像和镜像库执行各种操作。这是RedHat重新设计Docker（参见podman和buildah）工作的一部分，它将自己的职责抽取为专用的和独立的工具。

### [storage](https://github.com/containers/storage)

一个被低估的Go类库，为crio、podman和skopeo等知名项目提供了支持。其目的是为存储文件系统层、容器镜像和容器（磁盘上的）提供方法。它还管理bundle的加载。