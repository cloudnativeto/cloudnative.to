---
author: "Bobby Steinbach"
date: "2019-09-16T22:00:00+08:00"
draft: false
image: "/images/blog/006tNbRwly1fxmupzfpxaj31420u07wl.jpg"
translator: "[马若飞](https://github.com/malphi)"
reviewer:  ["宋净超"]
reviewerlink:  ["https://jimmysong.io"]
title: "使用Django，Prometheus，和Kubernetes定制应用指标"
description: "本文演示如果为一个Django应用添加Prometheus自定义指标。"
categories: ["可观察性"]
tags: ["Prometheus"]
type: "post"
avatar: "/images/profile/default.jpg"
---

本文为翻译文章，[点击查看原文](https://labs.meanpug.com/custom-application-metrics-with-django-prometheus-and-kubernetes/)。

## 编者按

本文强调了应用程序定制指标的重要性，用代码实例演示了如何设计指标并整合Prometheus到Django项目中，为使用Django构建应用的开发者提供了参考。

## 为什么自定义指标很重要？

尽管有大量关于这一主题的讨论，但应用程序的自定义指标的重要性怎么强调都不为过。和为Django应用收集的核心服务指标（应用和web服务器统计数据、关键数据库和缓存操作指标）不同，自定义指标是业务特有的数据点，其边界和阈值只有你自己知道，这其实是很有趣的事情。

什么样的指标才是有用的？考虑下面几点：

- 运行一个电子商务网站并追踪平均订单数量。突然间订单的数量不那么平均了。有了可靠的应用指标和监控，你就可以在[损失殆尽](https://dealbook.nytimes.com/2012/08/02/knight-capital-says-trading-mishap-cost-it-440-million/)之前捕获到Bug。
- 你正在写一个爬虫，它每小时从一个新闻网站抓取最新的文章。突然最近的文章并不新了。可靠的指标和监控可以更早地揭示问题所在。
- 我认为你已经理解了重点。

## 设置Django应用程序

除了明显的依赖（`pip install Django`）之外，我们还需要为宠物项目（译者注：demo）添加一些额外的包。继续并安装`pip install django-prometheus-client`。这将为我们提供一个Python的Prometheus客户端，以及一些有用的Django hook，包括中间件和一个优雅的DB包装器。接下来，我们将运行Django管理命令来启动项目，更新我们的设置来使用Prometheus客户端，并将Prometheus的URL添加到URL配置中。

**启动一个新的项目和应用程序**

为了这篇文章，并且切合[代理的品牌](https://www.meanpug.com/)，我们建立了一个遛狗服务。请注意，它实际上不会做什么事，但足以作为一个教学示例。执行如下命令：

```bash
django-admin.py startproject demo
python manage.py startapp walker

```

```python

#settings.py

INSTALLED_APPS = [
    ...
    'walker',
    ...
]
```

现在，我们来添加一些基本的模型和视图。简单起见，我只实现将要验证的部分。如果想要完整地示例，可以从这个[demo应用](https://github.com/MeanPug/django-prometheus-demo) 获取源码。

```python

# walker/models.py
from django.db import models
from django_prometheus.models import ExportModelOperationsMixin


class Walker(ExportModelOperationsMixin('walker'), models.Model):
    name = models.CharField(max_length=127)
    email = models.CharField(max_length=127)

    def __str__(self):
        return f'{self.name} // {self.email} ({self.id})'


class Dog(ExportModelOperationsMixin('dog'), models.Model):
    SIZE_XS = 'xs'
    SIZE_SM = 'sm'
    SIZE_MD = 'md'
    SIZE_LG = 'lg'
    SIZE_XL = 'xl'
    DOG_SIZES = (
        (SIZE_XS, 'xsmall'),
        (SIZE_SM, 'small'),
        (SIZE_MD, 'medium'),
        (SIZE_LG, 'large'),
        (SIZE_XL, 'xlarge'),
    )

    size = models.CharField(max_length=31, choices=DOG_SIZES, default=SIZE_MD)
    name = models.CharField(max_length=127)
    age = models.IntegerField()

    def __str__(self):
        return f'{self.name} // {self.age}y ({self.size})'


class Walk(ExportModelOperationsMixin('walk'), models.Model):
    dog = models.ForeignKey(Dog, related_name='walks', on_delete=models.CASCADE)
    walker = models.ForeignKey(Walker, related_name='walks', on_delete=models.CASCADE)

    distance = models.IntegerField(default=0, help_text='walk distance (in meters)')

    start_time = models.DateTimeField(null=True, blank=True, default=None)
    end_time = models.DateTimeField(null=True, blank=True, default=None)

    @property
    def is_complete(self):
        return self.end_time is not None

    @classmethod
    def in_progress(cls):
        """ get the list of `Walk`s currently in progress """
        return cls.objects.filter(start_time__isnull=False, end_time__isnull=True)

    def __str__(self):
        return f'{self.walker.name} // {self.dog.name} @ {self.start_time} ({self.id})'

```

```python
# walker/views.py
from django.shortcuts import render, redirect
from django.views import View
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponseNotFound, JsonResponse, HttpResponseBadRequest, Http404
from django.urls import reverse
from django.utils.timezone import now
from walker import models, forms


class WalkDetailsView(View):
    def get_walk(self, walk_id=None):
        try:
            return models.Walk.objects.get(id=walk_id)
        except ObjectDoesNotExist:
            raise Http404(f'no walk with ID {walk_id} in progress')


class CheckWalkStatusView(WalkDetailsView):
    def get(self, request, walk_id=None, **kwargs):
        walk = self.get_walk(walk_id=walk_id)
        return JsonResponse({'complete': walk.is_complete})


class CompleteWalkView(WalkDetailsView):
    def get(self, request, walk_id=None, **kwargs):
        walk = self.get_walk(walk_id=walk_id)
        return render(request, 'index.html', context={'form': forms.CompleteWalkForm(instance=walk)})

    def post(self, request, walk_id=None, **kwargs):
        try:
            walk = models.Walk.objects.get(id=walk_id)
        except ObjectDoesNotExist:
            return HttpResponseNotFound(content=f'no walk with ID {walk_id} found')

        if walk.is_complete:
            return HttpResponseBadRequest(content=f'walk {walk.id} is already complete')

        form = forms.CompleteWalkForm(data=request.POST, instance=walk)

        if form.is_valid():
            updated_walk = form.save(commit=False)
            updated_walk.end_time = now()
            updated_walk.save()

            return redirect(f'{reverse("walk_start")}?walk={walk.id}')

        return HttpResponseBadRequest(content=f'form validation failed with errors {form.errors}')


class StartWalkView(View):
    def get(self, request):
        return render(request, 'index.html', context={'form': forms.StartWalkForm()})

    def post(self, request):
        form = forms.StartWalkForm(data=request.POST)

        if form.is_valid():
            walk = form.save(commit=False)
            walk.start_time = now()
            walk.save()

            return redirect(f'{reverse("walk_start")}?walk={walk.id}')

        return HttpResponseBadRequest(content=f'form validation failed with errors {form.errors}')
```

**更新应用设置并添加Prometheus urls**

现在我们有了一个Django项目以及相应的设置，可以为 [django-prometheus](https://github.com/korfuri/django-prometheus)添加需要的配置项了。在 `settings.py`中添加下面的配置：

```python
INSTALLED_APPS = [
    ...
    'django_prometheus',
    ...
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    ....
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

# we're assuming a Postgres DB here because, well, that's just the right choice :)
DATABASES = {
    'default': {
        'ENGINE': 'django_prometheus.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT', '5432'),
    },
}
```

添加url配置到 `urls.py`：

```python
urlpatterns = [
    ...
    path('', include('django_prometheus.urls')),
]
```

现在我们有了一个配置好的基本应用，并为整合做好了准备。

------

## 添加Prometheus指标

由于`django-prometheus`提供了开箱即用功能，我们可以立即追踪一些基本的模型操作，比如插入和删除。可以在`/metrics`endpoint看到这些：

![django-prometheus default metrics](https://labs.meanpug.com/content/images/2019/09/Screen-Shot-2019-09-07-at-12.18.47-AM.png)*django-prometheus提供的默认指标*

让我们把它变得更有趣点。

添加一个`walker/metrics.py`文件，定义一些要追踪的基本指标。

```python
# walker/metrics.py
from prometheus_client import Counter, Histogram


walks_started = Counter('walks_started', 'number of walks started')
walks_completed = Counter('walks_completed', 'number of walks completed')
invalid_walks = Counter('invalid_walks', 'number of walks attempted to be started, but invalid')

walk_distance = Histogram('walk_distance', 'distribution of distance walked', buckets=[0, 50, 200, 400, 800, 1600, 3200])
```

很简单，不是吗？[Prometheus文档](https://prometheus.io/docs/concepts/metric_types/)很好地解释了每种指标类型的用途，简言之，我们使用计数器来表示严格随时间增长的指标，使用直方图来追踪包含值分布的指标。下面开始验证应用的代码。

```python
# walker/views.py
...
from walker import metrics
...

class CompleteWalkView(WalkDetailsView):
    ...
    def post(self, request, walk_id=None, **kwargs):
        ...
        if form.is_valid():
            updated_walk = form.save(commit=False)
            updated_walk.end_time = now()
            updated_walk.save()

            metrics.walks_completed.inc()
            metrics.walk_distance.observe(updated_walk.distance)

            return redirect(f'{reverse("walk_start")}?walk={walk.id}')

        return HttpResponseBadRequest(content=f'form validation failed with errors {form.errors}')

...

class StartWalkView(View):
    ...
    def post(self, request):
        if form.is_valid():
            walk = form.save(commit=False)
            walk.start_time = now()
            walk.save()

            metrics.walks_started.inc()

            return redirect(f'{reverse("walk_start")}?walk={walk.id}')

        metrics.invalid_walks.inc()

        return HttpResponseBadRequest(content=f'form validation failed with errors {form.errors}')
```

发送几个样例请求，可以看到新指标已经产生了。

![custom metrics coming in](https://labs.meanpug.com/content/images/2019/09/custom-application-metrics.png)*显示散步距离和创建散步的指标*

![prometheus custom metrics](https://labs.meanpug.com/content/images/2019/09/custom-metrics-prometheus.png)*定义的指标此时已经可以在prometheus里查找到了*

至此，我们已经在代码中添加了自定义指标，整合了应用以追踪指标，并验证了这些指标已在`/metrics` 上更新并可用。让我们继续将仪表化应用部署到Kubernetes集群。

## 使用Helm部署应用

我只会列出和追踪、导出指标相关的配置内容，完整的Helm chart部署和服务配置可以在 [demo应用](https://github.com/MeanPug/django-prometheus-demo)中找到。 作为起点，这有一些和导出指标相关的deployment和configmap的配置：

```yaml
# helm/demo/templates/nginx-conf-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "demo.fullname" . }}-nginx-conf
  ...
data:
  demo.conf: |
    upstream app_server {
      server 127.0.0.1:8000 fail_timeout=0;
    }

    server {
      listen 80;
      client_max_body_size 4G;

      # set the correct host(s) for your site
      server_name{{ range .Values.ingress.hosts }} {{ . }}{{- end }};

      keepalive_timeout 5;

      root /code/static;

      location / {
        # checks for static file, if not found proxy to app
        try_files $uri @proxy_to_app;
      }

      location ^~ /metrics {
        auth_basic           "Metrics";
        auth_basic_user_file /etc/nginx/secrets/.htpasswd;

        proxy_pass http://app_server;
      }

      location @proxy_to_app {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        # we don't want nginx trying to do something clever with
        # redirects, we set the Host: header above already.
        proxy_redirect off;
        proxy_pass http://app_server;
      }
    }
```

------

```yaml
# helm/demo/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
...
    spec:
      metadata:
        labels:
          app.kubernetes.io/name: {{ include "demo.name" . }}
          app.kubernetes.io/instance: {{ .Release.Name }}
          app: {{ include "demo.name" . }}
      volumes:
        ...
        - name: nginx-conf
          configMap:
            name: {{ include "demo.fullname" . }}-nginx-conf
        - name: prometheus-auth
          secret:
            secretName: prometheus-basic-auth
        ...
      containers:
        - name: {{ .Chart.Name }}-nginx
          image: "{{ .Values.nginx.image.repository }}:{{ .Values.nginx.image.tag }}"
          imagePullPolicy: IfNotPresent
          volumeMounts:
            ...
            - name: nginx-conf
              mountPath: /etc/nginx/conf.d/
            - name: prometheus-auth
              mountPath: /etc/nginx/secrets/.htpasswd
          ports:
            - name: http
              containerPort: 80
              protocol: TCP
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          command: ["gunicorn", "--worker-class", "gthread", "--threads", "3", "--bind", "0.0.0.0:8000", "demo.wsgi:application"]
          env:
{{ include "demo.env" . | nindent 12 }}
          ports:
            - name: gunicorn
              containerPort: 8000
              protocol: TCP
           ...
```

没什么神奇的，只是一些YAML而已。有两个重点需要强调一下：

1. 我们通过一个nginx反向代理将`/metrics`放在了验证后面，为location块设置了auth_basic指令集。你可能希望在反向代理之后部署[gunicorn](https://docs.gunicorn.org/en/latest/deploy.html) ，但这样做可以获得保护指标的额外好处。
2. 我们使用多线程的gunicorn而不是多个worker。虽然可以为Prometheus客户端启用[多进程模式](https://github.com/prometheus/client_python#multiprocess-mode-gunicorn)，但在Kubernetes环境中，安装会更为复杂。为什么这很重要呢？在一个pod中运行多个worker的风险在于，每个worker将在采集时报告自己的一组指标值。但是，由于服务在Prometheus Kubernetes SD scrape配置中被设置为pod级别 ，这些（潜在的）跳转值将被错误地分类为[计数器重置](https://prometheus.io/docs/concepts/metric_types/#counter)，从而导致测量结果不一致。你并不一定需要遵循上述所有步骤，但重点是：如果你了解的不多，应该从一个单线程+单worker的gunicorn环境开始，或者从一个单worker+多线程环境开始。

## 使用Helm部署Prometheus

基于[Helm](https://helm.sh/)的帮助文档，部署Prometheus非常简单，不需要额外工作：

```bash
helm upgrade --install prometheus stable/prometheus
```

几分钟后，你应该就可以通过 `port-forward` 进入Prometheus的pod（默认的容器端口是9090）。

## 为应用配置Prometheus scrape目标

[Prometheus Helm chart](https://github.com/helm/charts/tree/master/stable/prometheus) 有大量的自定义可选项，不过我们只需要设置`extraScrapeConfigs`。创建一个`values.yaml`文件。你可以略过这部分直接使用 [demo应用](https://github.com/MeanPug/django-prometheus-demo) 作为参考。文件内容如下：

```yaml
extraScrapeConfigs: |
  - job_name: demo
    scrape_interval: 5s
    metrics_path: /metrics
    basic_auth:
      username: prometheus
      password: prometheus
    tls_config:
      insecure_skip_verify: true
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
            - default
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_label_app]
        regex: demo
        action: keep
      - source_labels: [__meta_kubernetes_endpoint_port_name]
        regex: http
        action: keep
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_service_name]
        target_label: service
      - source_labels: [__meta_kubernetes_service_name]
        target_label: job
      - target_label: endpoint
        replacement: http
```

创建完成后，就可以通过下面的操作为prometheus deployment更新配置。

```bash
helm upgrade --install prometheus -f values.yaml
```

为验证所有的步骤都配置正确了，打开浏览器输入 `http://localhost:9090/targets` （假设你已经通过 `port-forward`进入了运行prometheus的Pod）。如果你看到demo应用在target的列表中，说明运行正常了。

## 自己动手试试

我要强调一点：捕获自定义的应用程序指标并设置相应的报告和监控是软件工程中最重要的任务之一。幸运的是，将Prometheus指标集成到Django应用程序中实际上非常简单，正如本文展示的那样。如果你想要开始监测自己的应用，请参考完整的[示例应用程序](https://github.com/MeanPug/django-prometheus-demo)，或者直接fork代码库。祝你玩得开心。
