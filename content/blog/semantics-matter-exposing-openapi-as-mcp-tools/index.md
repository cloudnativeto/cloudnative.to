---
title: "语义至关重要：如何将 OpenAPI 规范转化为 MCP 工具"
summary: "本文探讨了如何在 OpenAPI 规范中嵌入语义描述，并将其转换为 AI Agent 可消费的 MCP 工具。文章强调 OpenAPI 应作为 API 描述的单一事实来源，介绍了工具命名、能力描述、JSON-LD 使用、安全性注意事项及如何完成转换的建议。"
authors: ["Christian Posta"]
translators: ["云原生社区"]
categories: ["AI"]
tags: ["OpenAPI", "MCP", "AI工具", "JSON-LD", "语义建模"]
draft: false
date: 2025-04-24T18:09:59+08:00
links:
  - icon: language
    icon_pack: fa
    name: 阅读英文版原文
    url: https://blog.christianposta.com/semantics-matter-exposing-openapi-as-mcp-tools/
---

最近我在 [The API Experience Podcast](https://podcasts.apple.com/us/podcast/the-api-experience-podcast/id1698168565) 上和 [Matt McLarty](https://www.linkedin.com/in/mattmclartybc/) 以及 [Mike Amundsen](https://www.linkedin.com/in/mamund/) 聊了聊我最近写的一篇博客，主题是 [如何用“能力”来描述 API](https://blog.christianposta.com/from-apis-to-capabilities-what-ai-agents-mean-for-application-architecture/)。其中一个被提到的观点是，是否可以在 OpenAPI 规范中直接嵌入语义信息。我当时的一个评论是：“理想情况下，你应该可以从 OpenAPI 规范直接生成一个 MCP（Model-Computable Proxy）服务端，从而向 Agent 或 AI 模型暴露你的能力。”这个观点与 [Kevin Swiber](https://www.linkedin.com/in/kevinswiber/) 的一个深刻观察不谋而合，即 [MCP 将成为终极的 API 使用者](https://www.layered.dev/mcp-the-ultimate-api-consumer-not-the-api-killer)，而不是所谓的 API 杀手。我想借此机会展开讲讲，因为这个思路非常值得深入探讨。

我首先想到的是，确实，如今大家普遍用 OpenAPI 规范文档来描述自己的 API。但正如 Mike Amundsen 指出的那样，这种描述在“语义信息”以及“以能力为中心的 API 表达”方面仍存在明显不足。当人类开发者直接使用 API 时，他们可以自行填补“语义上下文”的空白，选择合适的 API 并构建逻辑。但 AI agent 或工具并不具备这种人类主观判断力，LLM 需要尽可能多的上下文信息，才能做出正确的工具选择决策。

然而，我们并不希望由此产生“语义描述分裂”的问题：一套面向 MCP 的 API 语义描述，另一套则用于给开发者直接阅读和使用。我们更希望有一个统一的“单一真相来源（single source of truth）”，那就是 [OpenAPI 规范](https://swagger.io/specification/)。但要做到这一点，就需要我们在 OpenAPI 描述中投入更多精力，将 API 的“语义意义”以及“能力描述”表达得更加清晰、丰富。

## 从 API 到能力

在过去十几年中，许多企业投入大量精力，将内部和外部的业务能力通过 API 对外暴露。这一趋势不会消失。虽然 MCP（Model-Computable Protocol）非常令人兴奋，但归根结底，它只是一个**供 AI 模型调用工具的协议适配层**。但如果我们希望正确地向模型暴露工具，就必须[以“能力”而非单纯的 API 合约结构来描述](https://blog.christianposta.com/from-apis-to-capabilities-what-ai-agents-mean-for-application-architecture/)：

- 工具名称应具有唯一性，且具备动词导向的动作意义（例如使用 “listAllTodoTasks” 而非简单的 “list”）；
- 提供详细的**用途说明**；
- 展示在什么场景下可以调用，并提供请求/响应示例；
- 明确使用工具的**前置条件**。

## 使用 OpenAPI 规范

OpenAPI 规范（OpenAPI Specification）本身包含了许多字段与结构，支持我们为 API 添加丰富的语义含义：

- 利用 `info` 部分添加全局信息；
- 多个部分支持链接至 `externalDocs`，提供外部文档支持；
- 大多数部分都支持 `title`、`summary` 和 `description` 字段；
- 借助 [JSON-LD](https://json-ld.org/) 可将字段链接到行业通用或企业专属的数据语义模型，提供更深层的语义描述；
- 如果上述方式都不满足需求，还可以使用自定义的扩展属性 `x-*` 扩展规范。

下面是一个具体示例：

在 `info` 字段中添加丰富语义的 Todo API 描述：

```yaml
openapi: 3.0.3
info:
  title: Enhanced Todo API
  description: >
    本 API 提供了管理个人或团队待办事项（todos）的能力，包括创建、更新、组织和检索任务，任务附带丰富的元数据，如截止日期、优先级和标签。
    该 API 专为系统和 AI Agent 设计，支持动态任务协调、进度追踪和工作流规划。
    特别适用于目标跟踪、工作助手或生产力工具等需要任务编排和上下文决策的场景。
  version: 1.0.0
  termsOfService: https://example.com/terms/
  contact:
    name: API Support Team
    url: https://example.com/support
    email: support@example.com
  license:
    name: Apache 2.0
    url: https://www.apache.org/licenses/LICENSE-2.0.html
```

我们还应该链接该 API 的使用文档：

```yaml
externalDocs:
  description: 查看该 API 所有使用场景的详细文档
  url: https://example.com/docs
```

在具体 API 路径中，加入更详细的语义描述：

```yaml
  /todos:
    get:
      summary: 获取现有待办事项，用于上下文任务感知与规划
      description: >
        客户端或 AI Agent 可调用该接口，检索现有的待办事项列表，支持按完成状态过滤、分页控制。
        该能力可帮助理解当前任务状态、识别待办任务、规划下一步行动。
        特别适用于依赖实时上下文的工作流，如生产力跟踪、个人助手、自动化规划系统。
      operationId: listAllTodoTasks
      tags:
        - todos
      parameters:
        - name: limit
          in: query
          description: 返回的最大条目数
          schema:
            type: integer
            format: int32
            minimum: 1
            maximum: 100
            default: 20
        - name: completed
          in: query
          description: 按任务完成状态进行筛选
          schema:
            type: boolean
      responses:
        '200':
          description: JSON 格式的待办事项数组
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Todo'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
```

使用 [JSON-LD（JSON 语义链接数据）](https://json-ld.org/)，我们可以为请求或响应中的数据模型赋予确切的语义含义。通过链接到行业标准（如 [schema.org](https://schema.org)、[w3.org](https://www.w3.org/)）或企业自定义语义本体，可以让 API 的数据结构具备强语义。以下是一个添加 JSON-LD 语义结构的示例：

```yaml
openapi: 3.0.3
info:
  # 为简洁省略部分内容
  x-linkedData:
    "@context":
      schema: "https://schema.org/"
      hydra: "http://www.w3.org/ns/hydra/core#"
      vocab: "https://api.example.com/vocab#"
    "@type": "schema:WebAPI"
    "@id": "https://api.example.com/v1"
    "schema:name": "Enhanced Todo API"
    "schema:description": "一个提供待办管理、元数据和语义注释的综合 API"
    "schema:provider":
      "@type": "schema:Organization"
      "schema:name": "Example Organization"
      "schema:url": "https://example.com"
    "schema:dateModified": "2025-04-15"
```

如果上述方法都无法满足你的需求，你还可以选择[扩展 OpenAPI 规范](https://swagger.io/docs/specification/v3_0/openapi-extensions/)，添加你自己的自定义属性。例如，当你对路径的 `description` 或 `summary` 字段存在向后兼容性问题时，可以添加自定义字段以增强描述能力：

```yaml
  /todos:
    get:
      summary: 获取现有待办事项，用于上下文任务感知与规划
      description: 简要描述在此
      tags:
        - todos
      x-company-mcp:
        name: very-descriptive-name-here
        description: 更详细的描述信息
```

## 转换为 MCP 工具

接下来我们要思考：如何将 OpenAPI 规范转换为 MCP 工具？我们可以用 `operationId` 作为工具的名称，但描述信息该如何处理？MCP 工具需要以“能力”为中心进行描述，并提供足够的上下文，让 AI 模型能够判断该使用哪个工具、在什么时机使用。

在将 OpenAPI 映射为 MCP 工具时，可以直接使用 `operation` 的描述信息和参数说明，也可以在映射过程中对这些内容进行增强。你甚至可以借助 JSON-LD 的 URI 来补全数据结构的语义信息。以下是一个典型的 MCP 工具响应示例：

```json
{
  "jsonrpc": "2.0",
  "id": 123,
  "result": {
    "tools": [
      {
        "name": "listAllTodoTasks",
        "description": "允许客户端或 AI Agent 检索现有的待办事项列表，支持按完成状态过滤并支持分页参数限制。
        该能力有助于理解当前任务状态、识别未完成事项以及规划后续行动。适用于生产力追踪、个人助手或依赖实时上下文的自动化规划系统。",
        "inputSchema": {
          "type": "object",
          "properties": {
            "limit": {
              "type": "integer",
              "description": "返回的最大项数（1-100）",
              "minimum": 1,
              "maximum": 100,
              "default": 20
            },
            "completed": {
              "type": "boolean",
              "description": "按完成状态筛选"
            }
          }
        },
        "annotations": {
          "title": "增强版 Todo API",
          "readOnlyHint": true,
          "openWorldHint": false
        }
      }
    ]
  }
}
```

将 OpenAPI 规范作为 API 的“**单一事实来源**”（Single Source of Truth）——包括其衍生物如 MCP shim——至关重要。如果忽视 OpenAPI 的质量和一致性，会在后续流程中造成严重问题，尤其是在与 AI Agent、LLM 或基于 MCP 的工具集成时。描述不清或结构不一致的规范可能导致服务间不匹配、MCP 工具生成困难、版本或后端兼容性问题，甚至会破坏 AI Agent 的工作流。

而对于 AI 模型而言，如果工具描述模糊或不完整，可能会导致错误的理解：选错工具、使用无效参数，或者误解意图（如应当查询却去创建数据）。这些问题不仅会降低 Agent 的行为质量，还可能导致“幻觉式”响应、偏离目标的操作，甚至彻底失败。

我们可以总结如下对照表：

| MCP 工具字段       | OpenAPI 对应字段                         | 说明                                                     |
|--------------------|-------------------------------------------|----------------------------------------------------------|
| 工具名称           | `operationId`                             | 唯一、便于机器识别；如无，可退回至 HTTP 方法+路径         |
| 工具描述           | `summary` / `description`                 | 简洁用 `summary`，详细说明用 `description`               |
| 输入结构（参数）   | `parameters`，`description`               | 包括类型、约束的结构化输入                               |
| 输出结构（响应）   | `responses`                               | 包括成功与错误响应的结构化输出                           |
| 调用细节           | `servers`, `path`, `method`               | 包括 URL、HTTP 方法、服务器信息                           |
| 安全性             | `security`, `components.securitySchemes`  | 用于描述需要鉴权的接口                                    |

### 关于安全的补充说明

**LLM 提示注入（prompt injection）** 是当前 AI 安全的一个重大风险（参见 [OWASP Top 10 for LLM 应用](https://owasp.org/www-project-top-10-for-large-language-model-applications/)）。当工具的 `description` 或参数说明被恶意注入指令时，就可能发生所谓的 **工具投毒攻击（tool poisoning）**（详见 [Invariant Labs 的安全通告](https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks)）。因此，务必要对 OpenAPI 规范进行审核和“清洗”。理想情况下，这应当在 API 治理流程中完成；但作为兜底方案，也可以在 OpenAPI 转换为 MCP 工具的过程中加入清洗流程。我将会在后续博客中深入探讨这个问题。

## 这种映射应当发生在哪里？

正如前文所述，虽然未来可能出现原生支持 MCP 的实现方案，但企业最终仍是要基于已有的 API 投资来暴露 MCP 工具。那么这种 **OpenAPI 到 MCP 的映射** 应该在哪里发生呢？

- 有可能会出现“AI 原生工具”来完成这类转换，它们会考虑到上面提到的语义因素；
- 有可能你会使用支持将 REST API 暴露为 MCP 端点的 API Gateway；
- 也可能你需要自行构建一些映射逻辑工具。