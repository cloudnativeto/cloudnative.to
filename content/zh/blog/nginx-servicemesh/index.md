# NGINX携新方案进军服务网格领域

本月初，NGINX [推出](https://www.nginx.com/blog/introducing-NGINX-service-mesh/)了 一款免费的开源服务网格 [NGINX Service Mesh（NSM）](https://www.nginx.com/products/nginx-service-mesh)。它使用了开源 [NGINX](https://nginx.org/en/) 代理的商业版本 [NGINX Plus](https://www.nginx.com/products/nginx/) 驱动其数据平面。 尽管许多服务网格都是基于完全开源的组件构建的，但 NGINX 营销副总裁 [Rob Whiteley](https://www.nginx.com/people/rob-whiteley/) 认为，与其在市场上投放另一种开源解决方案，不如精力集中将 NSM聚焦于当前市场缺失的部分。他认为客户正在为 Istio 的规模和复杂性而苦苦挣扎。

“ Istio 诞生于 Google，其设计精巧复杂，以支持运行数以亿计的容器和数千种服务。 从结果上看， Istio 带来了一定数量的额外开销，反过来也佐证了设计的复杂性。 这也是一种非常偏执的开发设计方式，其所用到的开源组件关联紧密无法自由组合简化。 从技术上讲，可以将其中的一些用不到的部分精简出去，但其设计时没有做到模块化。“ Whiteley 表示， “ NGINX Service Mesh 更轻量，易于安装，是为那些真正为刚开始超出仅入口控制器流量模式的人们而设计。 我们想去除很多这些组件。 我们在其他服务网格解决方案中有一些组件，但是如果您要设计一个要处理一个数量级或更大数量级的解决方案，我们并不一定需要复杂的密钥管理，跟踪和可观察性。 就复杂性而言。”

NSM不会直接集成这些各种组件，而是在它们旁边部署Sidecar代理进行集成。 在启动时，这些受支持的组件包括Grafana，Kubernetes Ingress控制器，SPIRE，NATS，Open Tracing和Prometheus。 通过将NGINX Plus用作东西向交通的数据平面和南北向交通的Ingress控制器，用户可以获得NGINX Plus的所有标准功能，同时还具有轻松的入门，配置和管理路径。

![img](https://cdn.thenewstack.io/media/2020/10/b614d2b7-nginx-service-mesh-intro_architecture.png)



“ NGINX已经是市场上的默认入口控制器，因此，NGINX Service Mesh的真正目的是提供下一步的逻辑步骤，您已经在使用NGINX进行集群的入口和出口，现在您只需要处理 怀特利说：“有些服务流量是东西向的，而不是南北的。”

NGINX Plus为NSM带来的功能包括mTLS身份验证，负载平衡，高可用性，速率限制，断路，蓝绿色和金丝雀部署以及访问控制。 NGINX Plus作为NSM的二进制文件免费提供，但由于某些环境限制，无法单独使用。 Whiteley指出，NGINX Plus可处理东西向和南北向的流量，因此，NGINX的API网关是将所有内容整合到一个平台中所需的最后一个组件。

“我们的愿景是将所有功能整合到一个平台中。 从技术上讲，我们的API网关与服务网格是分开的，即使它们都是NGINX Plus。 相同的基本数据平面只是配置的不同状态，” Whiteley说。 “我们认为，将来有一定优势可以确保将Ingress，Sidecar代理和API网关（实际上只是代理的一种超专业版本）整合在一起， 相同的操作平台，因此您没有那么多的活动部件。 如果您要进行政策更新，则应该能够在一个地方做到这一点，而在其他两个地方都能做到。”

Whiteley说，以NGINX为核心确实对那些仍希望将其某些旧式部署与Kubernetes环境集成的公司来说是一个优势。 他说，使用基于Envoy的Istio服务网格进行此操作更为复杂，并且“仍在Istio路线图上”。 这样，NSM被定位为一种初学者的服务网格，Whiteley表示，他们的长期目标是使其无缝过渡，从NSM过渡到Aspen Mesh，这是由其构建的基于Istio的更高级的服务网格。 现在是母公司F5 Networks。

Whiteley说，NSM的另一个目标是引入一个更好的管理平台。 当前，支持服务网格接口（SMI），并且有望添加NGINX控制器管理平面，从而为当前主要是命令行界面的体验带来更多的可视化效果和GUI。

除了NSM之外，Whiteley表示，他们对NGINX Unit充满希望，“提出一些与众不同且新颖的内容以促进行业对话。”

怀特利说：“我们认为，将来可以选择无边车的服务网格，而不必在每项服务中注入边车。” “相反，您加载并执行代码，并且执行代码的默认运行时环境具有处理东西方所需的所有内置代理功能。 它将事情从两个容器降为一个容器类型的模型。”