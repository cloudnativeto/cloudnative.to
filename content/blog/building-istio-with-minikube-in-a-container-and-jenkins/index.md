---
title: "使用 Minikube-in-a-Container 和 Jenkins 构建 Istio"
date: 2018-06-04T11:33:16+08:00
draft: false
authors: ["Andrew Jenkins"]
translators: ["戴佳顺"]
summary: "本文讲述如何制作一个新的 Minikube-in-a-Container 容器和使用 Jenkins Pipeline 来构建和测试 Istio 的流程脚本。"
tags: ["istio","jenkins"]
categories: ["service mesh"]
keywords: ["minikube","容器","Jenkis","Istio","CI/CD","Jenkinsfile"]
---

本文为翻译文章，[点击查看原文](https://blog.aspenmesh.io/blog/2018/01/building-istio-with-minikube-in-a-container-and-jenkins/)。

AspenMesh 提供一种 Istio 的分布式架构支持，这意味着即使与上游 Istio 项目无关，我们也需要能够测试和修复 Bug。为此我们已开发构建了我们自己的打包和测试基础架构方案。如果你对 Istio 的 CI（持续集成）也感兴趣，请参考我们已经投入使用，可能有用但还没有提交给 Circle CI 或 GKE 的组件。

这篇文章描述的是我们如何制作一个新的`Minikube-in-a-Container`容器和使用`Jenkins Pipeline`来构建和测试 Istio 的流程脚本。如果你觉得有必要，你可以通过`docker run`上运行 minikube 容器，然后在容器中部署功能性的 kubernetes 集群，不需要使用时可随时删除。Jenkins bits 现在可帮助你构建 Istio，也可以作为初始环境，以便在容器内构建容器。

## Minikube-in-a-container

这部分描述了我们如何构建一个可以在构建过程中用来运行 Istio 冒烟测试的 Minikube-in-a-container 镜像。我们最初不是这么想的，我们最初使用本地 localkube 环境。我们不能让它在特定环境外工作，我们认为这是由于 localkube 和 minikube 之间有一点差异导致的。所以这是一个作为我们修复它使它能正常工作的记录。我们还添加了一些额外选项和工具，以便在生成的容器中使用 Istio。这没有什么太多花样，但如果你要做类似的事情，我们希望它给你启发。

![minikube](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/building-istio-with-minikube-in-a-container-and-jenkins/78a165e1gy1frx72gvbeqj20az0960t7.jpg)

[Minikube](https://github.com/kubernetes/minikube)可能对你来说是一个可以在随身携带的笔记本上通过虚机运行自己 kubernetes 集群的非常熟悉的项目。这种方法非常方便，但在某些情况下（比如不提供嵌套虚拟化的云提供商），你就不能或者不希望基于虚机来完成了。由于 docker 现在可以运行在 docker 内部，我们决定尝试在 docker 容器内制作我们自己的 kubernetes 集群。一个非持久性的 kubernetes 容器很容易启动，也可进行一些测试，并在完成后进行删除。同时这也非常适合持续集成。

在我们的模型方案中，Kubernetes 集群创建子 docker 容器（而不是 Jérôme Petazzoni 所[提到](http://jpetazzo.github.io/2015/09/03/do-not-use-docker-in-docker-for-ci/)的兄弟容器方案）。我们是故意这样做的，宁愿隔离子容器，而不是共享 Docker 构建的缓存。但是你应该在将你应用改造为 DinD（docker in docker）之前阅读 Jérôme 的文章，也许 DooD（在 docker out of docker）是对你而言更好的方案。这篇文章供你参考。我们避免架构“变得更坏”的同时，对看起来“坏”和“丑”部分也应进行避免。

当你启动 docker 容器时，会要求 docker 在 OS 内核中创建和设置一些命名空间（namespaces），然后在通过这些命名空间启动你的容器。命名空间像一个沙箱：当你在命名空间中（即通过命名空间隔离），通常只能看到命名空间内的东西。chroot 命令，不仅影响文件系统，还影响 PID，网络接口等。如果你通过 `--privileged` 参数启动了一个 docker 容器，那么所涉及的命名空间隔离将获得额外的权限，比如创建更多子命名空间隔离的能力。这是完成 docker-in-docker（即在 docker 中运行 docker）的核心技巧。有关更多细节，Jérôme 是这方面的专家，请在[这里](https://blog.docker.com/2013/09/docker-can-now-run-within-docker/)关注他的详细说明。

总之，这就是大致步骤：

1. 构建一个容器环境，完成 docker，minikube，kubectl 和依赖项的安装。

2. 添加一个假的 systemctl shim 来欺骗 Minikube 在没有真正安装 systemd 的环境中运行。

3. 使用 `--privileged` 参数启动容器

4. 让容器启动它自己内部的 dockerd，这就是 DinD 的一部分。

5. 让容器通过参数 `minikube --vm-driver = none` 启动 minikube，以便在容器中的 minikube 可以与与之一起运行的 dockerd 连接。

   所有你需要做的就是通过 `docker run --privileged` 运行容器，接着你就可以去使用 kubectl 了。这时如果你愿意，你可以在容器内运行 kubectl，并得到一个真正的用完可随时删除的环境。

你现在可以试试它：

```bash
docker run --privileged --rm -it quay.io/aspenmesh/minikube-dind
docker exec -it <container> /bin/bash
# kubectl get nodes
<....>
# kubectl create -f https://k8s.io/docs/tasks/debug-application-cluster/shell-demo.yaml
# kubectl exec -it shell-demo -- /bin/bash
```

当你退出时，启动时 `--rm` 参数使 docker 容器实例会被卸载并完全删除。

对于比较重量级的使用方案，你可能需要通过`docker cp`命令将 kubeconfig 文件存放到主机上，并通过 8443 端口暴露的 kube API 与容器内的 kubernetes 进行通信。

下面是可以使用的 Dockerfile（你可以复制它，其中的相关支持脚本在[这里](https://gist.github.com/andrewjjenkins/798f5c736a187d616d256095662c0a76)）：

```bash
# Portions Copyright 2016 The Kubernetes Authors All rights reserved.
# Portions Copyright 2018 AspenMesh
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Based on:
# https://github.com/kubernetes/minikube/tree/master/deploy/docker/localkube-dind


FROM debian:jessie

# Install minikube dependencies
RUN DEBIAN_FRONTEND=noninteractive apt-get update -y && \
  DEBIAN_FRONTEND=noninteractive apt-get -yy -q --no-install-recommends install \
  iptables \
  ebtables \
  ethtool \
  ca-certificates \
  conntrack \
  socat \
  git \
  nfs-common \
  glusterfs-client \
  cifs-utils \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg2 \
  software-properties-common \
  bridge-utils \
  ipcalc \
  aufs-tools \
  sudo \
  && DEBIAN_FRONTEND=noninteractive apt-get clean && \
  rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install docker
RUN \
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add - && \
  apt-key export "9DC8 5822 9FC7 DD38 854A E2D8 8D81 803C 0EBF CD88" | gpg - && \
  echo "deb [arch=amd64] https://download.docker.com/linux/debian jessie stable" >> \
    /etc/apt/sources.list.d/docker.list && \
  DEBIAN_FRONTEND=noninteractive apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get -yy -q --no-install-recommends install \
    docker-ce \
  && DEBIAN_FRONTEND=noninteractive apt-get clean && \
  rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
VOLUME /var/lib/docker
EXPOSE 2375

# Install minikube
RUN curl -Lo minikube https://storage.googleapis.com/minikube/releases/v0.24.1/minikube-linux-amd64 && chmod +x minikube
ENV MINIKUBE_WANTUPDATENOTIFICATION=false
ENV MINIKUBE_WANTREPORTERRORPROMPT=false
ENV CHANGE_MINIKUBE_NONE_USER=true
# minikube --vm-driver=none checks systemctl before starting.  Instead of
# setting up a real systemd environment, install this shim to tell minikube
# what it wants to know: localkube isn't started yet.
COPY fake-systemctl.sh /usr/local/bin/systemctl
EXPOSE 8443

# Install kubectl
RUN curl -LO https://storage.googleapis.com/kubernetes-release/release/v1.9.1/bin/linux/amd64/kubectl && \
  chmod a+x kubectl && \
  mv kubectl /usr/local/bin

# Copy local start.sh
COPY start.sh /start.sh
RUN chmod a+x /start.sh

# If nothing else specified, start up docker and kubernetes.
CMD /start.sh & sleep 4 && tail -F /var/log/docker.log /var/log/dind.log /var/log/minikube-start.log
```

## Istio 整合 Jenkins

现在我们已经构建了 Kubernetes-in-a-container 环境，我们可以将它用于我们的 Istio 版本。将构建系统 Docker 化非常有好处，因为开发人员可以快速创建用于 CI 构建的真实可用实例。以下是我们用于 Istio 构建的 CI 大致架构：

![](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/building-istio-with-minikube-in-a-container-and-jenkins/78a165e1gy1frx9by15u1j20b20bhdgg.jpg)

1. **Jenkins 工作节点**：这是一个让 Jenkins 运行构建作业的虚拟机。它可能在同一时间被多个不同的构建作业共享。我们在工作节点上安装的任何工具对每个构建作业而言都是本地范围内（因此它不会影响其他构建），同时工作节点生命周期是临时短暂的（我们为了节省成本自动弹性缩放 Jenkins 工作节点），这一点很重要。

2. **Minikube 容器**：我们所做的第一件事就是构建并进入到我们上文所谈到的 Minikube 容器。构建作业的其余部分在此容器（或其子容器）内进行。Jenkins 打包的工作区挂载到这里。Jenkins 的 docker 插件负责在成功或失败后卸载删除这个我们需要清理的，涉及正在运行的 Kubernetes 和 Istio 相关组件的容器。

3. **构建作业的容器**：这是一个包含安装 golang 相关及其他构建工具的容器。这是我们编译 Istio 并构建其容器的地方。我们在 minikube 容器中测试这些组件，如果测试通过，则认为构建成功并将容器推送到我们的容器仓库中。

Jenkinsfile 的大部分内容都是关于如何设置这些部分。接着，我们运行相同的步骤来构建 Istio，以便在你的笔记本上进行 `make depend`、`make build`、`make test` 。

在这里查看 Jenkinsfile：

```lua
node('docker') {
  properties([disableConcurrentBuilds()])

  wkdir = "src/istio.io/istio"

  stage('Checkout') {
    checkout scm
  }

  // withRegistry writes to /home/ubuntu/.dockercfg outside of the container
  // (even if you run it inside the docker plugin) which won't be visible
  // inside the builder container, so copy them somewhere that will be
  // visible.  We will symlink to .dockercfg only when needed to reduce
  // the chance of accidentally using the credentials outside of push
  docker.withRegistry('https://quay.io', 'name-of-your-credentials-in-jenkins') {
    stage('Load Push Credentials') {
      sh "cp ~/.dockercfg ${pwd()}/.dockercfg-quay-creds"
    }
  }

  k8sImage = docker.build(
    "k8s-${env.BUILD_TAG}",
    "-f $wkdir/.jenkins/Dockerfile.minikube " +
    "$wkdir/.jenkins/"
  )
  k8sImage.withRun('--privileged') { k8s ->
    stage('Get kubeconfig') {
      sh "docker exec ${k8s.id} /bin/bash -c \"while ! [ -e /kubeconfig ]; do echo waiting for kubeconfig; sleep 3; done\""
      sh "rm -f ${pwd()}/kubeconfig && docker cp ${k8s.id}:/kubeconfig ${pwd()}/kubeconfig"

      // Replace "127.0.0.1" with the path that peer containers can use to
      // get to minikube.
      // minikube will bake certs including the subject "kubernetes" so
      // the kube-api server needs to be reachable from the client's concept
      // of "https://kubernetes:8443" or kubectl will refuse to connect. 
      sh "sed -i'' -e 's;server: https://127.0.0.1:8443;server: https://kubernetes:8443;' kubeconfig"
    }

    builder = docker.build(
      "istio-builder-${env.BUILD_TAG}",
      "-f $wkdir/.jenkins/Dockerfile.jenkins-build " +
        "--build-arg UID=`id -u` --build-arg GID=`id -g` " +
        "$wkdir/.jenkins",
    )

    builder.inside(
      "-e GOPATH=${pwd()} " +
      "-e HOME=${pwd()} " +
      "-e PATH=${pwd()}/bin:\$PATH " +
      "-e KUBECONFIG=${pwd()}/kubeconfig " +
      "-e DOCKER_HOST=\"tcp://kubernetes:2375\" " +
      "--link ${k8s.id}:kubernetes"
    ) {
      stage('Check') {
        sh "ls -al"

        // If there are old credentials from a previous build, destroy them -
        // we will only load them when needed in the push stage
        sh "rm -f ~/.dockercfg"

        sh "cd $wkdir && go get -u github.com/golang/lint/golint"
        sh "cd $wkdir && make check"
      }

      stage('Build') {
        sh "cd $wkdir && make depend"
        sh "cd $wkdir && make build"
      }

      stage('Test') {
        sh "cp kubeconfig $wkdir/pilot/platform/kube/config"
        sh """PROXYVERSION=\$(grep envoy-debug $wkdir/pilot/docker/Dockerfile.proxy_debug  |cut -d: -f2) &&
          PROXY=debug-\$PROXYVERSION &&
          curl -Lo - https://storage.googleapis.com/istio-build/proxy/envoy-\$PROXY.tar.gz | tar xz &&
          mv usr/local/bin/envoy ${pwd()}/bin/envoy &&
          rm -r usr/"""
        sh "cd $wkdir && make test"
      }

      stage('Push') {
        sh "cd && ln -sf .dockercfg-quay-creds .dockercfg"
        sh "cd $wkdir && " +
          "make HUB=yourhub TAG=$BUILD_TAG push"
        gitTag = getTag(wkdir)
        if (gitTag) {
          sh "cd $wkdir && " +
            "make HUB=yourhub TAG=$gitTag push"
        }
        sh "cd && rm .dockercfg"
      }
    }
  }
}

String getTag(String wkdir) {
  return sh(
    script: "cd $wkdir && " +
      "git describe --exact-match --tags \$GIT_COMMIT || true",
    returnStdout: true
  ).trim()
}
```

如果你想获取本文中的文件和支持脚本，你可以点击[这里](https://gist.github.com/andrewjjenkins/798f5c736a187d616d256095662c0a76)。
