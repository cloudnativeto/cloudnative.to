---
title: "使用Envoy将gRPC转码为HTTP/JSON"
date: 2018-11-22T15:16:06+08:00
draft: false
authors: ["Christophe Hesters"]
translators: ["马若飞"]
summary: "本文用实例讲解了如何利用Envoy将gRPC转码为HTTP/JSON。"
tags: ["grpc","envoy"]
categories: ["service mesh"]
keywords: ["service mesh","服务网格"]
---

本文为翻译文章，[点击查看原文](https://blog.jdriven.com/2018/11/transcoding-grpc-to-http-json-using-envoy/)。

试用 gRPC 构建服务时要在.proto 文件中定义消息（message）和服务（service）。gRPC 支持多种语言自动生成客户端、服务端和 DTO 实现。在读完这篇文章后，你将了解到使用 Envoy 作为转码代理，使 gRPC API也可以通过HTTP/JSON的方式访问。你可以通过github代码库中的Java代码来测试它。有关gRPC的介绍请参阅[blog.jdriven.com/2018/10/grpc-as-an-alternative-to-rest/](https://blog.jdriven.com/2018/10/grpc-as-an-alternative-to-rest/)。

## **为什么要对 gRPC 服务进行转码？**

一旦有了一个可用的 gRPC 服务，可以通过向服务添加一些额外的注解（annotation）将其作为 HTTP/JSON API 发布。你需要一个代理来转换 HTTP/JSON 调用并将其传递给 gRPC 服务。我们称这个过程为转码。然后你的服务就可以通过 gRPC 和 HTTP/JSON 访问。大多数时候我更倾向使用 gRPC，因为使用遵循“契约”生成的类型安全的代码更方便、更安全，但有时转码也很有用：

1. web应用程序可以通过HTTP/JSON调用与gRPC服务通信。[github.com/grpc/grpc-web](https://github.com/grpc/grpc-web)是一个可以在浏览器中使用的 JavaScript 的 gRPC 实现。这个项目很有前途，但还不成熟。
2. 因为 gRPC 在网络通信上使用二进制格式，所以很难看到实际发送和接收的内容。将其作为 HTTP/JSON API 发布，可以使用 cURL 或 postman 等工具更容易地检查服务。
3. 如果你使用的语言 gRPC 不支持，你可以通过 HTTP/JSON 访问它。
4. 它为在项目中更平稳地采用 gRPC 铺平了道路，允许其他团队逐步过渡。

## **创建一个 gRPC 服务：ReservationService**

让我们创建一个简单的 gRPC 服务作为示例。在 gRPC 中，定义包含远程过程调用（rpc）的类型和服务。你可以随意设计自己的服务，但是谷歌建议使用面向资源的设计（源代码：[cloud.google.com/apis/design/resources](https://cloud.google.com/apis/design/resources)），因为用户无需知道每个方法是做什么的就可以容易地理解 API。如果你创建了许多不固定格式的 rpc，用户必须理解每种方法的作用，从而使你的 API 更难学习。面向资源的设计还可以更好地转换为 HTTP/JSON API。

在本例中，我们将创建一个会议预订服务。该服务称为 ReservationService，由创建、获取、获取列表和删除预订 4 个操作组成。服务定义如下：

```protobuf
//reservation_service.proto

syntax = "proto3";

package reservations.v1;
option java_multiple_files = true;
option java_outer_classname = "ReservationServiceProto";
option java_package = "nl.toefel.reservations.v1";

import "google/protobuf/empty.proto";

service ReservationService {

    rpc CreateReservation(CreateReservationRequest) returns (Reservation) {  }
    rpc GetReservation(GetReservationRequest) returns (Reservation) {  }
    rpc ListReservations(ListReservationsRequest) returns (stream Reservation) {  }
    rpc DeleteReservation(DeleteReservationRequest) returns (google.protobuf.Empty) {  }

}

message Reservation {
    string id = 1;
    string title = 2;
    string venue = 3;
    string room = 4;
    string timestamp = 5;
    repeated Person attendees = 6;
}

message Person {
    string ssn = 1;
    string firstName = 2;
    string lastName = 3;
}

message CreateReservationRequest {
    Reservation reservation = 2;
}

message CreateReservationResponse {
    Reservation reservation = 1;
}

message GetReservationRequest {
    string id = 1;
}

message ListReservationsRequest {
    string venue = 1;
    string timestamp = 2;
    string room = 3;

    Attendees attendees = 4;

    message Attendees {
        repeated string lastName = 1;
    }
}

message DeleteReservationRequest {
    string id = 1;
}
```

通常的做法是将操作的入参封装在请求对象中。这会在以后的操作中添加额外的字段或选项时更加容易。ListReservations 操作返回一个 Reservations 列表。在 Java 中，这意味着你将得到 Reservations 对象的一个迭代（Iterator）。客户端甚至可以在服务器发送完响应之前就开始处理它们，非常棒。

如果你想知道这个 gRPC 服务在 Java 中是如何被使用的，请查看 [ServerMain.java](https://github.com/toefel18/transcoding-grpc-to-http-json/blob/master/src/main/java/nl/toefel/server/ServerMain.java) 和 [ClientMain.java](https://github.com/toefel18/transcoding-grpc-to-http-json/blob/master/src/main/java/nl/toefel/client/ClientMain.java)实现。

## **使用 HTTP 选项标注服务进行转码**

在每个 rpc 操作的花括号中可以添加选项。Google 定义了一个 java option，允许你指定如何将操作转换到 HTTP 请求（endpoint）。在*reservation_service.proto*中引入‘**google/api/annotations.proto’**即可使用该选项。默认情况下这个 import 是不可用的，但是你可以通过向*build.gradle*添加以下编译依赖来实现它：

```shell
compile "com.google.api.grpc:proto-google-common-protos:1.13.0-pre2"
```

这个依赖将由 protobuf 解压并生成几个.proto 文件放入构建目录中。现在可以把**google/api/annotations.proto**引入你的.proto 文件中并开始说明如何转换 API。

## **转码 GetReservation 操作为 GET 方法**

让我们从 GetReservation 操作开始，我已经添加了 GetReservationRequest 到代码示例中：

```protobuf
  message GetReservationRequest {
       string id = 1;
   }

   rpc GetReservation(GetReservationRequest) returns (Reservation) {
       option (google.api.http) = {
           get: "/v1/reservations/{id}"
       };
   }
```

在选项定义中有一个名为“get”的字段，设置为“/v1/reservation /{id}”。字段名对应于 HTTP 客户端应该使用的 HTTP 请求方法。get 的值对应于请求 URL。在 URL 中有一个名为 id 的路径变量，这个变量会自动映射到输入操作中同名的字段。在本例中，它将是 GetReservationRequest.id。

发送 **GET /v1/reservations/1234** 到代理将转码到下面的伪代码：

```java
var request = GetReservationRequest.builder().setId(“1234”).build()
var reservation = reservationServiceClient.GetReservation(request)
return toJson(reservation)
```

HTTP 响应体（response body）将返回预订的所有非空字段的 JSON 形式。

**记住：转码不是由 gRPC 服务完成的。单独运行这个示例不会将其发布为 HTTP JSON API。前端的代理负责转码。我们稍后将对此进行配置。**

## 转码 CreateReservation 操作为 POST 方法

现在来考虑 CreateReservation 操作。

```protobuf
message CreateReservationRequest {
   Reservation reservation = 2;
}

rpc CreateReservation(CreateReservationRequest) returns (Reservation) {
   option(google.api.http) = {
      post: "/v1/reservations"
      body: "reservation"
   };
}
```

这个操作被转为 POST 请求*/v1/reservation*。选项中的 body 字段告诉转码器将请求体转成 CreateReservationRequest 中的字段。这意味着我们可以使用以下 curl 调用：

```shell
curl -X POST \
    http://localhost:51051/v1/reservations \
    -H 'Content-Type: application/json' \
    -d '{
    "title": "Lunchmeeting",
    "venue": "JDriven Coltbaan 3",
    "room": "atrium",
    "timestamp": "2018-10-10T11:12:13",
    "attendees": [
       {
           "ssn": "1234567890",
           "firstName": "Jimmy",
           "lastName": "Jones"
       },
       {
           "ssn": "9999999999",
           "firstName": "Dennis",
           "lastName": "Richie"
       }
    ]
}'
```

响应包含同样的对象，只不过多了一个生成的 id 字段。

## **转码带查询参数过滤的 ListReservations**

查询集合资源的一种常见方法是提供查询参数作为过滤器。ListReservations 的 gRPC 服务就有此功能。它接收到一个包含可选字段的 ListReservationRequest，用于过滤预订集合。

```protobuf
message ListReservationsRequest {
    string venue = 1;
    string timestamp = 2;
    string room = 3;

    Attendees attendees = 4;

    message Attendees {
        repeated string lastName = 1;
    }
}

rpc ListReservations(ListReservationsRequest) returns (stream Reservation) {
   option (google.api.http) = {
       get: "/v1/reservations"
   };
}
```

在这里，转码器将自动创建 ListReservationsRequest，并将查询参数映射到 ListReservationRequest 的内部字段。没有指定的字段都取默认值，对于字符串来说是""。例如：

```shell
curl http://localhost:51051/v1/reservations?room=atrium
```

字段 room 设置为 atrium 并映射到 ListReservationRequest 里，其余字段设置为默认值。还可以提供以下子消息字段：

```shell
curl "http://localhost:51051/v1/reservations?attendees.lastName=Richie"
```

attendees.lastName 是一个 repeated 的字段，可以被设置多次：

```shell
curl  "http://localhost:51051/v1/reservations?attendees.lastName=Richie&attendees.lastName=Kruger"
```

gRPC 服务将会知道 ListReservationRequest.attendees.lastName 是一个有两个元素的列表：Richie 和 Kruger. Supernice。

## **运行转码器**

是时候让这些运行起来了。Google cloud 支持转码，即使运行在 Kubernetes (incl GKE) 或计算引擎中。更多信息请参看[cloud.google.com/endpoints/docs/grpc/tutorials](https://cloud.google.com/endpoints/docs/grpc/tutorials)。

如果你不在 Google cloud 中运行，或者是在本地运行，那么可以使用 Envoy。它是一个由 Lyft 创建的非常灵活的代理。它也是[istio.io](https://istio.io/)中的主要组件。在这个例子中我们将使用它。

为了转码我们需要：

1. 一个 gRPC 服务的项目，在.proto 文件中包含转码选项。
2. 从.proto 文件中生成的.pd 文件包含 gRPC 服务描述。
3. 使用该定义，配置 Envoy 作为 gRPC 服务的 HTTP 请求代理。
4. 使用 docker 运行 Envoy。

### **步骤 1**

我已经创建了如上描述的项目并发布在 github 上。你可以从这里 clone： [github.com/toefel18/transcoding-grpc-to-http-json](https://github.com/toefel18/transcoding-grpc-to-http-json)。然后构建它：

```shell
# Script will download gradle if it’s not installed, no need to install it :)
./gradlew.sh clean build    # windows: ./gradlew.bat clean build
```

**提示：我创建了脚本自动执行步骤 2 到 4，脚本在项目[github.com/toefel18/transcoding-grpc-to-http-json](github.com/toefel18/transcoding-grpc-to-http-json)的根目录下。这将节省你的开发时间。步骤 2 到 4 详细的解释了它是如何工作的。**

```shell
./start-envoy.sh
```

### **步骤 2**

然后我们需要创建.pb 文件。我们需要先下载预编译的 protoc 可执行文件：[github.com/protocolbuffers/protobuf/releases/latest](https://github.com/protocolbuffers/protobuf/releases/latest)（为你的平台选择正确的版本，例如针对 Mac 的*protoc-3.6.1-osx-x86_64.zip*），然后解压到你的路径，很简单。

在[transcoding-grpc-to-http-json](https://github.com/toefel18/transcoding-grpc-to-http-json)目录下运行下面的命令生成 Envoy 可以理解的文件 *reservation_service_definition.pb* （别忘了先构建项目并导入 *reservation_service.proto*需要的.proto 文件）。

```shell
protoc -I. -Ibuild/extracted-include-protos/main --include_imports \
               --include_source_info \
               --descriptor_set_out=reservation_service_definition.pb \
               src/main/proto/reservation_service.proto
```

这个命令可能看起来很复杂，但实际上非常简单。-I 代表 include，protoc 寻找.proto 文件的目录。*–descriptor_set_out*表示包含定义的输出文件，最后一个参数是我们要处理的原始文件。

### **步骤 3**

我们快要完成了，在运行 Envoy 之前，最后一件事是创建配置文件。Envoy 的配置文件以 yaml 描述。你可以使用 Envoy 做很多事情，但是现在让我们专注于转码我们的服务。我从[Envoy 的网站](https://www.envoyproxy.io/docs/envoy/latest/configuration/http_filters/grpc_json_transcoder_filter#config-http-filters-grpc-json- transcocoder)中获取了一个基本的配置示例，并使用#标记了感兴趣的部分。

```yaml
admin:
  access_log_path: /tmp/admin_access.log
  address:
    socket_address: { address: 0.0.0.0, port_value: 9901 }         #1

static_resources:
  listeners:
  - name: main-listener
    address:
      socket_address: { address: 0.0.0.0, port_value: 51051 }      #2
    filter_chains:
    - filters:
      - name: envoy.http_connection_manager
        config:
          stat_prefix: grpc_json
          codec_type: AUTO
          route_config:
            name: local_route
            virtual_hosts:
            - name: local_service
              domains: ["*"]
              routes:
              - match: { prefix: "/", grpc: {} }
                #3 see next line!
                route: { cluster: grpc-backend-services, timeout: { seconds: 60 } }
          http_filters:
          - name: envoy.grpc_json_transcoder
            config:
              proto_descriptor: "/data/reservation_service_definition.pb" #4
              services: ["reservations.v1.ReservationService"]            #5
              print_options:
                add_whitespace: true
                always_print_primitive_fields: true
                always_print_enums_as_ints: false
                preserve_proto_field_names: false                        #6
          - name: envoy.router

  clusters:
  - name: grpc-backend-services                  #7
    connect_timeout: 1.25s
    type: logical_dns
    lb_policy: round_robin
    dns_lookup_family: V4_ONLY
    http2_protocol_options: {}
    hosts:
    - socket_address:
        address: 127.0.0.1                       #8
        port_value: 53000
```

我已经在配置文件中添加了一些标记来强调我们感兴趣的部分：

- \#1 admin 接口的地址。你也可以在这里获取 prometheus 的测量数据去查询服务是怎样执行的。
- \#2 HTTP API 的可用地址。
- \#3 将请求路由到后端服务的名称。步骤 #7 定义这个名字。
- \#4 我们之前生成的.pb 描述符文件的路径。
- \#5 转码的服务。
- \#6 Protobuf 字段名通常包含下划线。设置该选项为 false 会将字段名转换为驼峰式。
- \#7 集群定义了上游服务（在步骤#3 中 Envoy 代理的服务）。
- \#8 可连接后端服务的地址和端口。我使用了 127.0.0.1/localhost。

### **步骤 4**

我们现在准备运行 Envoy。最简单的方式是通过 Docker 镜像。这需要先安装 Docker。如果你还没有，请先[安装 docker](https://docs.docker.com/install/) 。

有两个 Envoy 需要的资源，配置文件和.pb 描述文件。我们可以先把文件导入容器以便 Envoy 启动时找到他们。运行下面 github 代码库根目录的命令：

```shell
sudo docker run -it --rm --name envoy --network="host" \
  -v "$(pwd)/reservation_service_definition.pb:/data/reservation_service_definition.pb:ro" \
  -v "$(pwd)/envoy-config.yml:/etc/envoy/envoy.yaml:ro" \
  envoyproxy/envoy
```

如果 Envoy 成功启动将会看到下面的日志：

```
[2018-11-10 14:55:02.058][000009][info][main] [source/server/server.cc:454] starting main dispatch loop
```

注意，我在 docker run 命令中将-network 设置为“host”。这意味着在本地可以访问正在运行的容器，而不需要额外的网络配置。根据页面 [docs.docker.com/docker-for-mac/networking/](https://docs.docker.com/docker-for-mac/networking/#i-want-to-connect-from-a-container-to-a-service-on-the-host)的建议，应该更改步骤#8 中 Envoy 配置的 IP 地址为 host.docker.internal 或 gateway.docker.internal。

## **通过 HTTP 访问服务**

如果一切顺利，你现在可以使用 curl 命令来访问服务。Linux 下你可以直接连接 localhost，但是在 windows 或者 Mac 下你可能需要通过虚拟机或 docker 容器的 IP 地址连接。有很多方法可以配置 docker，这里使用 localhost。

#### 通过 HTTP 创建预订

```shell
curl -X POST http://localhost:51051/v1/reservations \
          -H 'Content-Type: application/json' \
          -d '{
            "title": "Lunchmeeting2",
            "venue": "JDriven Coltbaan 3",
            "room": "atrium",
            "timestamp": "2018-10-10T11:12:13",
            "attendees": [
                {
                    "ssn": "1234567890",
                    "firstName": "Jimmy",
                    "lastName": "Jones"
                },
                {
                    "ssn": "9999999999",
                    "firstName": "Dennis",
                    "lastName": "Richie"
                }
            ]
        }'
```

输出：

```json
 {
        "id": "2cec91a7-d2d6-4600-8cc3-4ebf5417ac4b",
        "title": "Lunchmeeting2",
        "venue": "JDriven Coltbaan 3",
...
```

#### 通过 HTTP 获取预订

使用上面创建的 ID：

```shell
curl http://localhost:51051/v1/reservations/ENTER-ID-HERE!
```

输出应该和创建结果一致。

#### 通过 HTTP 获取预订列表

对于这个例子可能需要以不同的字段多次执行 CreateReservation 来验证过滤器的行为。

```shell
curl "http://localhost:51051/v1/reservations"
```

```shell
curl "http://localhost:51051/v1/reservations?room=atrium"
```

```shell
curl "http://localhost:51051/v1/reservations?room=atrium&attendees.lastName=Jones"
```

响应结果是 Reservations 的数组。

#### 删除预订

```shell
curl -X DELETE http://localhost:51051/v1/reservations/ENTER-ID-HERE!
```

## 返回头

gRPC 会返回一些 HTTP 头。有些可以在调试的时候帮到你：

- grpc-status：这个值是 io.grpc.Status.Code 的序数，它能帮助查看 gRPC 的返回状态。
- grpc-message：一旦出现问题返回的错误信息。

更多信息请查看[github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md)

## **缺陷**

#### 1. 如果路径不存在响应很奇怪

Envoy 工作的很好，但在我看来有时候会返回不正确的状态码。比如当我获取一个合法的预订：

```shell
curl http://localhost:51051/v1/reservations/ENTER-ID-HERE!
```

返回状态码 200，没错，但如果我这样做：

```shell
curl http://localhost:51051/v1/reservations/ENTER-ID-HERE!/blabla
```

Envoy 会返回：

```
415 Unsupported Media Type
Content-Type is missing from the request
```

我期望返回 404 而不是上面解释的错误信息。这有一个相关的问题：[github.com/envoyproxy/envoy/issues/5010](https://github.com/envoyproxy/envoy/issues/5010)

**解决**: Envoy 将所有请求路由到 gRPC 服务，如果服务中不存在该路径，gRPC 服务本身就会响应该错误。解决方案是在 Envoy 的配置中添加' gRPC:{} '，使其仅转发在 gRPC 服务中实现了的请求：

```yaml
 name: local_route
            virtual_hosts:
            - name: local_service
              domains: ["*"]
              routes:
              - match: { prefix: "/" , grpc: {}}  # <--- this fixes it
                route: { cluster: grpc-backend-services, timeout: { seconds: 60 } }
```

#### 2. 有时候在查询集合时，即使服务器有错误响应，依然会返回空资源‘[]’

我提交了这一问题给 Envoy 开发者： [github.com/envoyproxy/envoy/issues/5011](https://github.com/envoyproxy/envoy/issues/5011)

**部分解决方案：** 其中一部分是已知的转码限制，因为状态和头是先发送的。在一个响应中转换器首先发送一个 200 状态码，然后对流进行转码。

## 即将到来的特性

将来还可以在响应体中返回响应消息的子字段，以便你不想返回完整的响应体。这可以通过 HTTP 选项中的“response_body”字段完成。如果你想在 HTTP API 中裁剪包装的对象这是非常合适的。

## 结语

我希望这篇文章对将 gRPC API转码HTTP/JSON提供了一个很好的概述。
