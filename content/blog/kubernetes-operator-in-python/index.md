---
title: "实现 Kubernetes Operator 的新方式：Python"
authors: ["Flant staff"]
translators: ["罗广明"]
summary: "本文向读者们展示了如何使用流行编程语言 Python 创建一个可靠实用的 operator，并且不依赖于任何框架与 SDK。"
tags: ["kubernetes"]
categories: ["kubernetes"]
keywords: ["kubernetes","operator","python"]
date: 2019-08-21T11:23:19+08:00
draft: false
---

本文为翻译文章，[点击查看原文](https://medium.com/flant-com/kubernetes-operator-in-python-451f2d2e33f3)。

## 编者按

云原生领域，Go 几乎成了垄断编程语言。本文作者团队另辟蹊径，向读者们展示了如何使用最流行的编程语言之一 Python 创建一个可靠的 Kubernetes operator。

## 前言

目前，人们创建 Kubernetes operator 时，Go 编程语言几乎成了唯一选择。他们的偏好来自如下客观原因：

1. 有一个强大的框架支持基于 Go 开发 operator - [Operator SDK](https://github.com/operator-framework/operator-sdk)。
2. 许多基于 Go 的应用程序，如 Docker 和 Kubernetes，已经成为游戏的主导者。用 Go 编写 operator 可以让你用同一种语言与生态系统对话。
3. 基于 Go 的应用程序的高性能以及开箱即用的并发机制。

但是，如果缺乏时间或者仅仅是没有动力去学习 Go 语言呢？在本文中，我们将向您展示如何使用几乎所有 DevOps 工程师都熟悉的最流行的编程语言之一 Python 创建一个可靠的 operator。

## 欢迎 Copyrator — the copy operator

为了使事情变得简单实用，让我们创建一个简单的 operator：当出现一个新的 namespace，或 ConfigMap 与 Secret 之一更改其状态时，复制 ConfigMap。从实用的角度来看，我们的新 operator 可以用于批量更新应用程序的配置（通过更新 ConfigMap）或重置 Secret，例如用于 Docker 注册中心的键（当一个 Secret 添加到 namespace 时）。

那么，一个好的 Kubernetes operator 应该具备哪些特征呢？让我们列举出来：

1. 与 operator 的交互通过[Custom Resource Definitions](https://kubernetes.io/docs/tasks/access-kubernetes-api/custom-resources/custom-resource-definitions/)（以下简称 CRD）进行。
2. Operator 是可配置的。我们可以使用命令行参数和环境变量来设置它。
3. Docker image 和 Helm chart 在创建时考虑到了简单性，因此用户可以毫不费力地将其安装到 Kubernetes 集群中（基本上只需一个命令）。

## CRD

为了让 operator 知道要查找哪些资源和在哪里查找，我们需要设置一些规则。每个规则都将表示为一个特定的 CRD 对象。那么，这个 CRD 对象应该有哪些字段呢？

1. 我们感兴趣的**资源的类型** (ConfigMap or Secret）。
2. 储存资源的**namespace 列表**。
3. 帮助我们搜索特定 namespace 中的资源的**Selector** 。

让我们一起来定义一个 CRD：

```yaml
apiVersion: apiextensions.k8s.io/v1beta1
kind: CustomResourceDefinition
metadata:
  name: copyrator.flant.com
spec:
  group: flant.com
  versions:
  - name: v1
    served: true
    storage: true
  scope: Namespaced
  names:
    plural: copyrators
    singular: copyrator
    kind: CopyratorRule
    shortNames:
    - copyr
  validation:
    openAPIV3Schema:
      type: object
      properties:
        ruleType:
          type: string
        namespaces:
          type: array
          items:
            type: string
        selector:
          type: string
```

... 然后立即添加一个**简单规则**来选择 ConfigMaps，要求在默认 namespace 中使用与`copyrator: "true"`匹配的标签：

```yaml
apiVersion: flant.com/v1
kind: CopyratorRule
metadata:
  name: main-rule
  labels:
    module: copyrator
ruleType: configmap
selector:
  copyrator: "true"
namespace: default
```

做得好！接下来我们必须得到规则的相关信息。现在可以说，我们的目标是不去手动生成集群 API 的请求。为此，我们将使用一个名为[kubernetes-client](https://github.com/kubernets-client/python)的 Python 库：

```python
import kubernetes
from contextlib import suppress


CRD_GROUP = 'flant.com'
CRD_VERSION = 'v1'
CRD_PLURAL = 'copyrators'


def load_crd(namespace, name):
    client = kubernetes.client.ApiClient()
    custom_api = kubernetes.client.CustomObjectsApi(client)

    with suppress(kubernetes.client.api_client.ApiException):
        crd = custom_api.get_namespaced_custom_object(
            CRD_GROUP,
            CRD_VERSION,
            namespace,
            CRD_PLURAL,
            name,
        )
    return {x: crd[x] for x in ('ruleType', 'selector', 'namespace')}
```

执行以上代码，我们将得到以下结果：

```json
{
  'ruleType': 'configmap', 
  'selector': {'copyrator': 'true'}, 
  'namespace': ['default']
}
```

太棒了！现在我们有了一个特定于 operator 的规则。重要的是，我们已经能够通过所谓的 Kubernetes 方式做到这一点。

## 环境变量&命令行参数

现在是进行基本 operator 设置的时候了。配置应用程序有两种主要方法：

- 通过命令行参数，
- 通过环境变量。

您可以通过命令行参数获取设置，其具有更大的灵活性，并支持/验证数据类型。我们将使用标准 Python 库中的`*argparser*`模块，使用的详细信息和示例可以在[Python 文档](https://docs.python.org/3/library/argparse.html)中找到。

下面是一个配置命令行参数检索的例子，适用于我们的情况：

```python
parser = ArgumentParser(
        description='Copyrator - copy operator.',
        prog='copyrator'
    )
    parser.add_argument(
        '--namespace',
        type=str,
        default=getenv('NAMESPACE', 'default'),
        help='Operator Namespace'
    )
    parser.add_argument(
        '--rule-name',
        type=str,
        default=getenv('RULE_NAME', 'main-rule'),
        help='CRD Name'
    )
    args = parser.parse_args()
```

另一方面，您可以通过 Kubernetes 中的环境变量轻松地将有关 pod 的服务信息传递到容器中。例如，您可以通过以下结构获得有关 pod 运行的**namespace**的信息：

```yaml
env:
- name: NAMESPACE
  valueFrom:
     fieldRef:
         fieldPath: metadata.namespace
```

## operator 的操作逻辑

让我们使用特殊的映射来划分使用 ConfigMap 和 Secret 的方法。它们将让我们清楚我们需要什么方法来跟踪和创建一个对象：

```python
LIST_TYPES_MAP = {
    'configmap': 'list_namespaced_config_map',
    'secret': 'list_namespaced_secret',
}

CREATE_TYPES_MAP = {
    'configmap': 'create_namespaced_config_map',
    'secret': 'create_namespaced_secret',
}
```

然后必须从 API 服务器接收事件。我们将以以下方式实现该功能：

```python
def handle(specs):
    kubernetes.config.load_incluster_config()
    v1 = kubernetes.client.CoreV1Api()# Get the method for tracking objects
    method = getattr(v1, LIST_TYPES_MAP[specs['ruleType']])
    func = partial(method, specs['namespace'])

    w = kubernetes.watch.Watch()
    for event in w.stream(func, _request_timeout=60):
        handle_event(v1, specs, event)
```

事件被接收后，我们进入处理事件的底层逻辑：

```python
# Types of events to which we will respond
ALLOWED_EVENT_TYPES = {'ADDED', 'UPDATED'}def handle_event(v1, specs, event):
    if event['type'] not in ALLOWED_EVENT_TYPES:
        return

    object_ = event['object']
    labels = object_['metadata'].get('labels', {})    # Look for the matches using selector
    for key, value in specs['selector'].items():
        if labels.get(key) != value:
            return
    # Get active namespaces
    namespaces = map(
        lambda x: x.metadata.name,
        filter(
            lambda x: x.status.phase == 'Active',
            v1.list_namespace().items
        )
    )
    for namespace in namespaces:
        # Clear the metadata, set the namespace
        object_['metadata'] = {
            'labels': object_['metadata']['labels'],
            'namespace': namespace,
            'name': object_['metadata']['name'],
        }
        # Call the method for creating/updating an object
        methodcaller(
            CREATE_TYPES_MAP[specs['ruleType']],
            namespace,
            object_
        )(v1)
```

基本逻辑是完整的！现在我们需要将其打包到单个 Python 包中。让我们创建`setup.py` ，并将项目的元数据添加到其中：

```python
from sys import version_infofrom sys import version_info

from setuptools import find_packages, setup

if version_info[:2] < (3, 5):
    raise RuntimeError(
        'Unsupported python version %s.' % '.'.join(version_info)
    )


_NAME = 'copyrator'
setup(
    name=_NAME,
    version='0.0.1',
    packages=find_packages(),
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Programming Language :: Python',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.5',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
    ],
    author='Flant',
    author_email='maksim.nabokikh@flant.com',
    include_package_data=True,
    install_requires=[
        'kubernetes==9.0.0',
    ],
    entry_points={
        'console_scripts': [
            '{0} = {0}.cli:main'.format(_NAME),
        ]
    }
)
```

**注意**: 用于 Kubernetes 的 Python 客户端库有自己的版本控制系统。客户端和 Kubernetes 版本的兼容性概述在这个[*matrix*](https://github.com/kubernetes-client/python#compatibility-matrix)中。

目前，我们的项目有如下结构：

```scheme
copyrator
├── copyrator
│ ├── cli.py # Command line operating logic
│ ├── constant.py # Constants that we described above
│ ├── load_crd.py # CRD loading logic
│ └── operator.pyк # Basic logic of the operator
└── setup.py # Package description
```

## Docker 与 Helm

生成的 Dockerfile 将非常简单：我们将使用基本的*python-alpine*镜像来安装我们的包（该过程还有待后续优化）:

```dockerfile
FROM python:3.7.3-alpine3.9
ADD . /app
RUN pip3 install /app
ENTRYPOINT ["copyrator"]
```

Copyrator 的部署同样很简单：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Chart.Name }}
spec:
  selector:
    matchLabels:
      name: {{ .Chart.Name }}
  template:
    metadata:
      labels:
        name: {{ .Chart.Name }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: privaterepo.yourcompany.com/copyrator:latest
        imagePullPolicy: Always
        args: ["--rule-type", "main-rule"]
        env:
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
      serviceAccountName: {{ .Chart.Name }}-acc
```

最后，我们必须为 operator 创建一个具有必要权限的相关角色：

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ .Chart.Name }}-acc

---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRole
metadata:
  name: {{ .Chart.Name }}
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "watch", "list"]
  - apiGroups: [""]
    resources: ["secrets", "configmaps"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: {{ .Chart.Name }}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: {{ .Chart.Name }}
subjects:
- kind: ServiceAccount
  name: {{ .Chart.Name }}
```

## 结论

在本文中，我们向您展示了如何为 Kubernetes 创建自己的基于 python 的 operator。当然，它仍然有改进的空间：您可以通过使其处理多个规则、监视其 CRDs 中的更改、从并发功能中获益等手段来丰富它……

所有代码都可以在我们的[**公共仓库**](https://github.com/flant/examples/tree/master/2019/08-k8s-pythonoperator)中找到，以便于您去熟悉它。如果您对基于 python 的其他 operator 示例感兴趣，我们建议您可以查看部署 mongodb 的两个 operator([链接 1](https://github.com/Ultimaker/k8s-mongo-operator)和[链接 2](https://github.com/kbst/mongodb))。

P.S.如果你不喜欢处理 Kubernetes 事件，或者你只是更习惯于使用 Bash，你也可以享受我们易于使用的被称为[shell-operator](https://github.com/flant/shell-operator) (我们有在 4 月[宣布](https://medium.com/flant-com/kubernetes-shell-operator-76c596b42f23)) 的解决方案。

P.P.S.还有一种使用 Python 编写 K8s 的替代方法—一个名为[kopf](https://github.com/zalando-incubator/kopf/)(Kubernetes Operator Pythonic Framework) 的特定框架。如果您想将 Python 代码量最小化，这个框架是非常有用的。查看 kopf[文档](https://kopf.readthedocs.io/)。
