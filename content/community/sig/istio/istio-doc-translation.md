---
weight: 2
title: Istio 官方文档翻译活动
summary: 本文将为指导你如何参与到 Istio 官方文档翻译活动中来。
date: '2022-07-16T00:00:00+08:00'
type: book
---

在此之前，Istio 官方文档已经进行了两轮中文翻译活动，第一轮是在 2018 年，基于 Istio 0.8，第二轮是在 2020 年，基于 Istio 1.5，截止目前 Istio 已发布了 1.9 版本，Istio 中文文档已经有长达一年的时间疏于维护，现在云原生社区 Istio SIG 决定重启中文文档的维护。

## 常用链接

- Istio 中文文档地址：<https://istio.io/zh>
- 登记及任务认领表：[Google Spreadsheet](https://docs.google.com/spreadsheets/d/1ihJTww4q1FArD50TerRLyi210LD64gHTIEQM43dBwb0/edit?usp=sharing) 
- Istio 官网 GitHub 仓库：<https://github.com/istio/istio.io>

## 负责人

下面是云原生社区 Istio Doc WG 的负责人：

- [宋净超（@rootsongjc）](https://github.com/rootsongjc)
- [刘齐均（@kebe7jun）](https://github.com/kebe7jun)
- [殷龙飞（@loverto）](https://github.com/loverto)
- [邱世达（@SataQiu）](https://github.com/SataQiu)
- [刘训灼（@Xunzhuo）](https://github.com/Xunzhuo)

在参与过程中有任何问题可以与他们联系。

## 如何参与

本次活动由云原生社区 Istio Doc WG 主办，参与活动需要你准备以下内容。

### 准备 GitHub

你需要一个 GitHub 账号，翻译文档需要通过 GitHub 提交 PR，需要你熟悉 Git 命令和 GitHub 的基本操作；

### 登记和任务认领

报名参与和认领任务都在 [Google Spreadsheet](https://docs.google.com/spreadsheets/d/1ihJTww4q1FArD50TerRLyi210LD64gHTIEQM43dBwb0/edit?usp=sharing) 中（**请务必在表格中登记信息**）。

## 翻译流程

在你完成登记和认领任务之后就可以开始翻译了，下面是翻译流程。

### 构建本地环境

在克隆了 [Istio 文档的仓库](https://github.com/istio/istio.io)后，有两种方式可以将 Istio 的网站在本地运行起来。

#### 通过本地运行 hugo 启动

[Hugo](https://gohugo.io) 提供了一个本地的 web 服务器，可以启动网站。如果您本地没有安装 hugo，可以去[这里](https://gohugo.io/getting-started/quick-start/)查看如何安装。

然后，在 Istio.io 仓库的[根目录](https://github.com/istio/istio.io)下，运行 `hugo server` 在本地启动 web 服务器，通过 `http://localhost:1313/latest/zh` 进行中文网站的预览。如看到类似下面的输出，则表示 web 服务器已经启动成功：

```
                   | EN  | ZH
+------------------+-----+-----+
  Pages            | 545 | 545
  Paginator pages  |   0 |   0
  Non-page files   | 164 | 164
  Static files     |  54 |  54
  Processed images |   0 |   0
  Aliases          |   1 |   0
  Sitemaps         |   2 |   1
  Cleaned          |   0 |   0

Total in 47355 ms
Watching for changes in /work/{archetypes,assets,content,data,generated,i18n,layouts,static}
Watching for config changes in /work/config.toml
Environment: "development"
Serving pages from memory
Web Server is available at http://localhost:1313/ (bind address 0.0.0.0)
Press Ctrl+C to stop
```

#### 通过 Docker 启动

另外一种是直接使用 Docker 镜像启动。

在正确安装 Docker 后，运行下面的命令下载镜像：

```bash
docker pull gcr.io/istio-testing/build-tools:master-2021-04-12T17-40-14
```

如果您的网络环境无法访问此资源，可以执行下面的命令下载镜像的镜像：

```bash
docker pull jimmysong/istio-testing-build-tools:master-2021-04-12T17-40-14
docker tag jimmysong/istio-testing-build-tools:master-2021-04-12T17-40-14 gcr.io/build-tools:master-2021-04-12T17-40-14
```

然后在 [istio.io 仓库的根目录](https://github.com/istio/istio.io)下，执行下面的命令启动 web 服务：

```
make serve 
```

启动成功后通过 `http://localhost:1313/latest/zh` 进行网站的预览。

如果你想通过局域网访问该页面，可以将 `Makefile.core.mk` 文件中的 `ISTIO_SERVE_DOMAIN ?= localhost` 修改为 `ISTIO_SERVE_DOMAIN ?= 局域网 IP`，然后再启动 web 服务：

```
make serve 
```

这可以让局域网中的其它计算机访问该页面（以及物理机访问虚拟机），注意：不要将该文件的改动提交至 PR。

启动成功后通过 `http://局域网 IP:1313/latest/zh` 进行网站的预览。

### 提交 PR

如果检查通过，就可以向 [Istio 官方网站提交 PR](https://github.com/istio/istio.github.io/pulls)，PR 被合并后就可以通过 [Istio 网站预览页面](https://preliminary.istio.io/zh/)看到被合并后的页面。为方便管理和辨识，请遵守下面的模板定义您的 PR：

```
标题：
zh-translation:<file_full_path>
内容：
ref: https://github.com/servicemesher/istio-official-translation/issues/<issueID>
[ ] Configuration Infrastructure
[x] Docs
[ ] Installation
[ ] Networking
[ ] Performance and Scalability
[ ] Policies and Telemetry
[ ] Security
[ ] Test and Release
[ ] User Experience
[ ] Developer Infrastructure
```

其中，标题中的 <file_full_path> 是翻译的源文件路径；内容中的 ref 是当前翻译任务的 issue 链接。

### 校对

校对工作由没有翻译过当前文档的其他翻译人员执行，即翻译人员互为校对人员。为保证质量，我们设置了两轮 Review：

所有翻译人员互为校对人员，分配一个翻译任务同时要确定校对任务；

- 初审：负责对翻译的内容和原文较为精细的进行对比，保证语句通顺，无明显翻译错误；
- 终审：负责对翻译的文档做概要性的检查，聚焦在行文的通顺性、一致性、符合中文语言习惯，词汇、术语准确。终审通过后由管理员 approve 当前 PR，就可以进行合并了。

#### Review 的基本流程

**认领 Review**

- 新提交的 PR 每天会在协作群发布，供大家认领；
- 进入要认领的 PR，回复 /review，并在 [Google Spreadsheet](https://docs.google.com/spreadsheets/d/1ihJTww4q1FArD50TerRLyi210LD64gHTIEQM43dBwb0/edit?usp=sharing) 对应的任务中登记 reviewer；

**Review 重点**

- 打开 PR 提交的中文翻译，并找到对应 issue 中指定的源文件，逐段进行走查；
- 词汇检查：检查译文中出现的术语、常用词汇是否遵照了术语表的要求进行翻译；
- 格式检查：对照原文，检查译文中的标题和层次是否对应；代码块是否指定了语言；标点符号是否正确且无英文标点；超链接、图片链接是否可达；是否有错别字；
- 语句检查：分段落通读一遍，检查是否有不通顺、语病、或者不符合中文习惯的译文（啰嗦、重复、过多的助词等）
- 提交 comment：根据发现的问题，在 PR 提交文件的对应行添加 comment，格式为`原译文=>修改后译文`；不确定的地方可加建议或询问，或发到协作群求助。

### 更新任务表

通过终审后的任务会被负责人 approve，并合并到 Istio 的官方仓库中。需要您在 [Google Spreadsheet](https://docs.google.com/spreadsheets/d/1ihJTww4q1FArD50TerRLyi210LD64gHTIEQM43dBwb0/edit?usp=sharing) 的任务列表中更新所认领的任务的状态。整个翻译任务就算正式完成了。您可以继续领取新的任务进行翻译，或参与校对工作。

## FAQ

#### 初次使用 hugo 启动找不到静态资源问题

初次使用 `hugo server` 在本地启动 web 服务，web 页面会出现如下问题，找不到静态资源。

```
Failed to load resource: the server responded with a status of 404 (Not Found)
Refused to apply style from 'http://localhost:1313/css/all.css' because its MIME type ('text/plain') is not a supported stylesheet MIME type, and strict MIME checking is enabled.
```

> 解决方法：

1. 在项目根目录下执行 `sh scripts/build_site.sh` 命令，即可生成所需静态文件。但是这种方式需要安装比较多 `node` 的命令行工具，例如：`sass`、`tsc`、`babel`、`svgstore`，安装起来比较繁琐。
2. 这里建议首次可以采用 `docker` 方式启动，参考 docker 启动教程，在 Istio [网站仓库的根目录](https://github.com/istio/istio.io)运行 `make serve` 启动，如果您的网络环境无法访问此资源，请使用 `make serve IMG=jimmysong/istio-testing-build-tools:master-2021-03-01T22-30-49` 命令，启动时 docker 镜像会在项目目录中生成 `generated`、`tmp` 和 `resources` 静态资源目录。
3. 在初次生成静态资源目录后，就可以正常使用 `hugo server` 来启动项目了。

#### 定义的锚点报拼写错误

给标题添加的锚点完全和官方英文的一致，报类似如下错误：

![错误截图](https://tva1.sinaimg.cn/large/e6c9d24ely1go5rvst4d0j21he0p8tec.jpg)

主要的原因是在对于这些专有名词在`.spelling` 文件中只定义了大写而没有定义小写导致。此时，请参考上文锚点规范书写锚点。

#### CI deploy/netlify 报错

本地 make serve 没问题，但官方的 deploy/netlify 报如下错误：

```
10:07:37 AM: added 35 packages from 9 contributors and audited 43 packages in 1.553s
10:07:37 AM: found 0 vulnerabilities
10:07:41 AM: TypeError: Cannot set property inList of [object Object] which has only a getter
10:07:41 AM:     at PluginPass.exit (/opt/build/repo/node_modules/babel-plugin-minify-simplify/lib/index.js:549:40)
10:07:41 AM:     at newFn (/opt/buildhome/.nvm/versions/node/v12.8.0/lib/node_modules/@babel/core/node_modules/@babel/traverse/lib/visitors.js:179:21)
10:07:41 AM:     at NodePath._call (/opt/buildhome/.nvm/versions/node/v12.8.0/lib/node_modules/@babel/core/node_modules/@babel/traverse/lib/path/context.js:55:20)
10:07:41 AM:     at NodePath.call (/opt/buildhome/.nvm/versions/node/v12.8.0/lib/node_modules/@babel/core/node_modules/@babel/traverse/lib/path/context.js:42:17)
10:07:41 AM:     at NodePath.visit (/opt/buildhome/.nvm/versions/node/v12.8.0/lib/node_modules/@babel/core/node_modules/@babel/traverse/lib/path/context.js:99:8)
10:07:41 AM:     at TraversalContext.visitQueue (/opt/buildhome/.nvm/versions/node/v12.8.0/lib/node_modules/@babel/core/node_modules/@babel/traverse/lib/context.js:112:16)
10:07:41 AM:     at TraversalContext.visitSingle (/opt/buildhome/.nvm/versions/node/v12.8.0/lib/node_modules/@babel/core/node_modules/@babel/traverse/lib/context.js:84:19)
10:07:41 AM:     at TraversalContext.visit (/opt/buildhome/.nvm/versions/node/v12.8.0/lib/node_modules/@babel/core/node_modules/@babel/traverse/lib/context.js:140:19)
10:07:41 AM:     at Function.traverse.node (/opt/buildhome/.nvm/versions/node/v12.8.0/lib/node_modules/@babel/core/node_modules/@babel/traverse/lib/index.js:84:17)
10:07:41 AM:     at NodePath.visit (/opt/buildhome/.nvm/versions/node/v12.8.0/lib/node_modules/@babel/core/node_modules/@babel/traverse/lib/path/context.js:97:18)
10:07:41 AM: Makefile.core.mk:49: recipe for target 'netlify' failed
10:07:41 AM: make: *** [netlify] Error 1
```

这是官方的一个 [bug](https://github.com/istio/istio.io/pull/5379)，已经解决。

#### CLA 检测不通过

如果你在设置 cla 之前提交了 PR，CI 里的 cla check 会失败。可以先在 PR 中回复 `@googlebot I signed it.`。如果还失败尝试回复 `@googlebot I fixed it.`。如果还不行，所以最好的办法是关闭当前 PR，重新用一个新的 branch 拷贝相应文件，再提交全新的 PR 即可。

#### ERROR: Unexpected end tag : p

如果遇到此错误，说明还没有完全修复 markdown 的 lint 问题。需要先修复完即可通过 CI 检查。

