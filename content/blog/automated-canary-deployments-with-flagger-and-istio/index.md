---
title: "基于 Flagger 和 Istio 实现自动化金丝雀部署"
date: 2019-04-09T20:38:30+08:00
draft: false
authors: ["Stefan Prodan"]
translators: ["宋歌"]
summary: "本文介绍如何使用 Flagger 和 Istio 实现自动化金丝雀部署。"
tags: ["istio","flagger"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格"]
---

本文为翻译文章，[点击查看原文](https://medium.com/google-cloud/automated-canary-deployments-with-flagger-and-istio-ac747827f9d1)。

持续部署（Continuous delivery）符合企业软件实践，它是完善持续集成（continuous integration）原则的自然演化。
但持续部署案例却非常罕见，其中原因可能是需要复杂的管理以及担心部署失败而影响系统的可用性。

[Flagger](https://github.com/weaveworks/flagger)是一个开源的 Kubernetes operator，旨在解决上述复杂性。它使用 Istio 切换流量并通过 Prometheus 指标分析业务应用在更新发布期间的状态表现。

以下是在 Google Kubernetes Engine（GKE）环境安装和使用 Flagger 的步骤指导。

## 搭建 Kubernetes cluster

首先创建 GKE 集群和 Istio 组件（如果你没有 GCP 帐号，点击[注册帐号](https://cloud.google.com/free/)）。
登录 Google Cloud，创建项目并为其启用结算。安装[gcloud](https://cloud.google.com/sdk/)命令行工具，然后使用```gcloud init```配置项目。
设置默认项目，计算资源区域和地区（用实际项目 ID 替换```PROJECT_ID```）：

```bash
gcloud config set project PROJECT_ID
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a
```

开启 GKE 服务、创建集群并启用 HPA 和 Istio 组件

```bash
gcloud services enable container.googleapis.com

K8S_VERSION=$(gcloud beta container get-server-config --format=json | jq -r '.validMasterVersions[0]')
gcloud beta container clusters create istio \
--cluster-version=${K8S_VERSION} \
--zone=us-central1-a \
--num-nodes=2 \
--machine-type=n1-standard-2 \
--disk-size=30 \
--enable-autorepair \
--no-enable-cloud-logging \
--no-enable-cloud-monitoring \
--addons=HorizontalPodAutoscaling,Istio \
--istio-config=auth=MTLS_PERMISSIVE
```

上述命令会创建包含 2 台虚机的主机池（```n1-standard-2```，vCPU：2，RAM：7.5GB，DISK：30GB）。理想情况下，你可能希望将 Istio 组件与业务应用隔离部署，但并不容易实现将 Istio 独立部署于专属主机池。Istio manifest 被设置为只读并且 GKE 会还原对 node affinity 或 pod anti-affinity 的任何修改。  

为```kubectl```设置证书：

```bash
gcloud container clusters get-credentials istio
```

为集群管理员创建 role binding：

```bash
kubectl create clusterrolebinding "cluster-admin-$(whoami)" \
--clusterrole=cluster-admin \
--user="$(gcloud config get-value core/account)"
```

安装[Helm](https://docs.helm.sh/using_helm/#installing-helm)命令行工具：

```bash
brew install kubernetes-helm
```

Homebrew 2.0 现在也支持[Linux](https://brew.sh/2019/02/02/homebrew-2.0.0/)。

为 Tiller 创建 service account 和 cluster role binding：

```bash
kubectl -n kube-system create sa tiller && \
kubectl create clusterrolebinding tiller-cluster-rule \
--clusterrole=cluster-admin \
--serviceaccount=kube-system:tiller
```

在 kube-system namespace 下部署 Tiller：

```bash
helm init --service-account tiller
```

你应该考虑在 Helm 与 Tiller 之间使用 SSL，更多关于 Helm 启用安全安装的信息，请查看[docs.helm.sh](https://helm.sh/docs/using_helm/#securing-your-helm-installation)。

验证安装：

```bash
kubectl -n istio-system get svc
```

数秒后，GCP 会为```istio-ingressgateway```分配一个 external IP。

## 搭建 Istio ingress gateway

用 Istio ingress IP 创建为一个名为```istio-gateway```的静态 IP 地址：

```bash
export GATEWAY_IP=$(kubectl -n istio-system get svc/istio-ingressgateway -ojson | jq -r .status.loadBalancer.ingress[0].ip)
gcloud compute addresses create istio-gateway --addresses ${GATEWAY_IP} --region us-central1
```

接下来，你需要一个互联网域名并访问你的 DNS 注册商。添加两条 A 记录（用你的域名替换```example.com```）：

```bash
istio.example.com   A ${GATEWAY_IP}
*.istio.example.com A ${GATEWAY_IP}
```

验证泛域名解析：

```bash
watch host test.istio.example.com
```

创建一个通用 Istio gateway，并向外网暴露 HTTP 服务：

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: public-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*"
```

将上述资源保存为 public-gateway.yaml，然后应用它：

```bash
kubectl apply -f ./public-gateway.yaml
```

生产系统向互联网暴露服务应该使用 SSL。关于使用 cert-manager、CloudDNS 和 Let's Encrypt 加固 Istio ingress gateway 的步骤，请查看 Flagger GKE[文档](https://docs.flagger.app/install/flagger-install-on-google-cloud)。

## 安装 Flagger

GKE Istio 组件并不包含用来获取 Istio 遥测服务的 Prometheus 实例。由于 Flagger 使用 Istio HTTP 指标来运行金丝雀分析（canary analysis），你必须部署以下 Prometheus 配置，该配置类似官方 Istio Helm chart。

```bash
REPO=https://raw.githubusercontent.com/weaveworks/flagger/master
kubectl apply -f ${REPO}/artifacts/gke/istio-prometheus.yaml
```

添加 Flagger Helm 仓库：

```bash
helm repo add flagger https://flagger.app
```

在```istio-system```namespace 下部署 Flagger，并开启 Slack 通知：

```bash
helm upgrade -i flagger flagger/flagger \
--namespace=istio-system \
--set metricsServer=http://prometheus.istio-system:9090 \
--set slack.url=https://hooks.slack.com/services/YOUR-WEBHOOK-ID \
--set slack.channel=general \
--set slack.user=flagger
```

可以在任何 namespace 下安装 Flagger，只要它可以访问 Istio Prometheus service 的 9090 端口。
Flagger 附带 Grafana dashboard，用于金丝雀分析。在 istio-system namespace 下部署 Grafana：

```bash
helm upgrade -i flagger-grafana flagger/grafana \
--namespace=istio-system \
--set url=http://prometheus.istio-system:9090 \
--set user=admin \
--set password=change-me
```

创建一个 virtual service，使用公共 gateway 暴露 Grafana（用你的域名替换```example.com```）：

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: grafana
  namespace: istio-system
spec:
  hosts:
    - "grafana.istio.example.com"
  gateways:
    - public-gateway.istio-system.svc.cluster.local
  http:
    - route:
        - destination:
            host: flagger-grafana
```

将上述资源保存为 grafana-virtual-service.yaml，然后应用它：

```bash
kubectl apply -f ./grafana-virtual-service.yaml
```

在浏览器中访问```http://grafana.istio.example.com```，会重定向到 Grafana 登录页面。

## 使用 Flagger 部署 web 应用

Flagger 包含一个 Kubernetes deployment 和一个可选的 horizontal pod autoscaler（HPA），然后创建一些资源对象（Kubernetes deployments，ClusterIP services 和 Istio virtual services）。这些资源对象会在网络上暴露应用并实现金丝雀分析和升级。
![](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/automated-canary-deployments-with-flagger-and-istio/0071hauBly1g1u72wr801j30rs0cdq4w.jpg)
创建一个 test namespace，并开启 Istio sidecar 注入：

```bash
REPO=https://raw.githubusercontent.com/weaveworks/flagger/master
kubectl apply -f ${REPO}/artifacts/namespaces/test.yaml
```

创建一个 deployment 和 HPA：

```bash
kubectl apply -f ${REPO}/artifacts/canaries/deployment.yaml
kubectl apply -f ${REPO}/artifacts/canaries/hpa.yaml
```

在金丝雀分析期间，部署产生测试流量的服务：

```bash
helm upgrade -i flagger-loadtester flagger/loadtester \
--namepace=test
```

创建一个金丝雀 custom resource（用你的域名替换```example.com```）：

```yaml
apiVersion: flagger.app/v1alpha3
kind: Canary
metadata:
  name: podinfo
  namespace: test
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  progressDeadlineSeconds: 60
  autoscalerRef:
    apiVersion: autoscaling/v2beta1
    kind: HorizontalPodAutoscaler
    name: podinfo
  service:
    port: 9898
    gateways:
    - public-gateway.istio-system.svc.cluster.local
    hosts:
    - app.istio.example.com
  canaryAnalysis:
    interval: 30s
    threshold: 10
    maxWeight: 50
    stepWeight: 5
    metrics:
    - name: istio_requests_total
      threshold: 99
      interval: 30s
    - name: istio_request_duration_seconds_bucket
      threshold: 500
      interval: 30s
    webhooks:
      - name: load-test
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://podinfo.test:9898/"
```

将上述资源保存为 podinfo-canary.yaml，然后应用它：

```bash
kubectl apply -f ./podinfo-canary.yaml
```

如果成功，上述分析将运行五分钟，并且每半分钟验证一次 HTTP 指标。使用这个公式来判断金丝雀部署所需的最小时间：```interval * (maxWeight / stepWeight)```。金丝雀 CRD 定义[文档](https://docs.flagger.app/how-it-works#canary-custom-resource)。

数秒后，Flagger 会创建金丝雀资源对象：

```bash
# applied
deployment.apps/podinfo
horizontalpodautoscaler.autoscaling/podinfo
canary.flagger.app/podinfo
# generated
deployment.apps/podinfo-primary
horizontalpodautoscaler.autoscaling/podinfo-primary
service/podinfo
service/podinfo-canary
service/podinfo-primary
virtualservice.networking.istio.io/podinfo
```

打开浏览器访问```app.istio.example.com```，你会看到[demo app](https://github.com/stefanprodan/k8s-podinfo)的版本号。

## 自动金丝雀分析和升级

Flagger 实现了一个控制循环，逐渐将流量转移到金丝雀，同时测量 HTTP 请求成功率等关键性能指标，请求平均持续时间以及 pod 健康状态。根据对 KPI 的分析，升级或中止金丝雀部署，并将分析结果发送到 Slack。
![](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/automated-canary-deployments-with-flagger-and-istio/0071hauBgy1g1uawf9vhqj30rs0a976b.jpg)
以下对象的更改会触发金丝雀部署：

- Deployment PodSpec（容器 image，command，ports，env 等）
- ConfigMaps 作为卷挂载或映射到环境变量
- Secrets 作为卷挂载或映射到环境变量
  通过更新容器 image 触发金丝雀部署：

```bash
kubectl -n test set image deployment/podinfo \
podinfod=quay.io/stefanprodan/podinfo:1.4.1
```

Flagger 检测到 deployment 的版本已更新，于是开始分析它：

```bash
kubectl -n test describe canary/podinfo

Events:

New revision detected podinfo.test
Scaling up podinfo.test
Waiting for podinfo.test rollout to finish: 0 of 1 updated replicas are available
Advance podinfo.test canary weight 5
Advance podinfo.test canary weight 10
Advance podinfo.test canary weight 15
Advance podinfo.test canary weight 20
Advance podinfo.test canary weight 25
Advance podinfo.test canary weight 30
Advance podinfo.test canary weight 35
Advance podinfo.test canary weight 40
Advance podinfo.test canary weight 45
Advance podinfo.test canary weight 50
Copying podinfo.test template spec to podinfo-primary.test
Waiting for podinfo-primary.test rollout to finish: 1 of 2 updated replicas are available
Promotion completed! Scaling down podinfo.test
```

在分析过程中，可以使用 Grafana 监控金丝雀的进展：

![](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/automated-canary-deployments-with-flagger-and-istio/0071hauBly1g1ubacxpukj30rs0mhjvg.jpg)

请注意，如果在金丝雀分析期间对 deployment 应用新的更改，Flagger 将重新启动分析阶段。

列出群集中所有的金丝雀：

```bash
watch kubectl get canaries --all-namespaces
NAMESPACE   NAME      STATUS        WEIGHT   LASTTRANSITIONTIME
test        podinfo   Progressing   15       2019-01-16T14:05:07Z
prod        frontend  Succeeded     0        2019-01-15T16:15:07Z
prod        backend   Failed        0        2019-01-14T17:05:07Z
```

如果你启用了 Slack 通知，则会收到以下消息：

![](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/automated-canary-deployments-with-flagger-and-istio/0071hauBly1g1ubdv033ej30rs0ap400.jpg)

## 自动回滚

在金丝雀分析期间，可以生成 HTTP 500 错误和高响应延迟，以测试 Flagger 是否暂停升级。

创建一个 test pod 并执行：

```bash
kubectl -n test run tester \
--image=quay.io/stefanprodan/podinfo:1.2.1 \
-- ./podinfo --port=9898
kubectl -n test exec -it tester-xx-xx sh
```

生成 HTTP 500 错误返回：

```bash
watch curl http://podinfo-canary:9898/status/500
```

生成延迟：

```bash
watch curl http://podinfo-canary:9898/delay/1
```

当失败检查的数量达到金丝雀分析阈值时，流量被路由回主版本，金丝雀版本被缩放为 0，并且升级被标记为失败。

金丝雀报错和延迟峰值被记录为 Kubernetes 事件，并由 Flagger 以 JSON 日志记录：

```bash
kubectl -n istio-system logs deployment/flagger -f | jq .msg

Starting canary deployment for podinfo.test
Advance podinfo.test canary weight 5
Advance podinfo.test canary weight 10
Advance podinfo.test canary weight 15
Halt podinfo.test advancement success rate 69.17% < 99%
Halt podinfo.test advancement success rate 61.39% < 99%
Halt podinfo.test advancement success rate 55.06% < 99%
Halt podinfo.test advancement success rate 47.00% < 99%
Halt podinfo.test advancement success rate 37.00% < 99%
Halt podinfo.test advancement request duration 1.515s > 500ms
Halt podinfo.test advancement request duration 1.600s > 500ms
Halt podinfo.test advancement request duration 1.915s > 500ms
Halt podinfo.test advancement request duration 2.050s > 500ms
Halt podinfo.test advancement request duration 2.515s > 500ms
Rolling back podinfo.test failed checks threshold reached 10
Canary failed! Scaling down podinfo.test
```

如果你启用了 Slack 通知，当超出了进度超时，或者分析达到了最大失败次数，你将收到一条消息：

![](https://raw.githubusercontent.com/servicemesher/website/master/content/blog/automated-canary-deployments-with-flagger-and-istio/0071hauBly1g1uc4hvoo6j30rs05ymy8.jpg)

# 总结

在 Kubernetes 之上运行像 Istio 这样的服务网格可以为你提供自动度量标准，日志和跟踪，但是业务应用的部署仍然依赖于外部工具。Flagger 旨在扩展 Istio，使其具备[渐进式交付能力](<https://redmonk.com/jgovernor/2018/08/06/towards-progressive-delivery/>)。

Flagger 兼容所有 Kubernetes CI/CD方案，并且可以使用[webhook](<https://docs.flagger.app/how-it-works>)轻松扩展金丝雀分析，以运行系统集成/验收测试，负载测试或任何其他自定义验证。由于 Flagger 是声明性的并且对 Kubernetes 事件做出反应，因此它可以与[Weave Flux](<https://www.weave.works/oss/flux/>)或[JenkinsX](<https://jenkins-x.io/>)一起用于 GitOps 流水线。如果你使用的是 JenkinsX，则可以使用 jx 插件安装 Flagger。

Flagger 由[Weaveworks](<https://www.weave.works/>)赞助，并为[Weave Cloud](<https://www.weave.works/product/cloud/>)中的金丝雀部署提供支持。该项目正在 GKE，EKS 和 kubeadm 安装的物理机群上进行测试。

如果您对 Flagger 有任何改进建议，请在 GitHub[weaveworks/flagger](<https://github.com/weaveworks/flagger>)上提交 issue 或 PR。非常欢迎贡献！
