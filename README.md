# 云原生社区官网

> **⚠️ 网站迁移公告**
>
> 本网站已迁移至 [cloudnative.jimmysong.io](https://cloudnative.jimmysong.io)，原域名 cloudnativecn.com 即将下线。本仓库内容已归档，不再更新。

本仓库为云原生社区官网源码。

## 投稿

向本站投稿请参考[投稿指南](https://cloudnative.to/community/contribute/)。

## 协议

本站内容采用[署名-非商业性使用-相同方式共享 4.0（CC BY-NC-SA 4.0）](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh)许可。

## 开发

云原生社区官网为纯静态网站，使用 [Hugo](https://gohugo.io/) 构建，使用 GitHub Pages 托管，通过 GitHub Action 自动发布，支持多语言。

### Hugo 安装

网站使用到了 sass， 安装 [Hugo](https://gohugo.io/getting-started/installing/) 时请选择安装 `extended` 版 hugo，版本为 **v0.153.2**，否则无法编译 sass。

### 本地开发

项目代码克隆到本地后，进入工作目录运行 `hugo server`，hugo 会自动编译，起服务，监控变化自动加载，即可开发。
