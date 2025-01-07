---
title: "从构建 WASM 后端看新编程语言 MoonBit "
summary: "这篇文章将探讨 MoonBit 的当前状态，以及它是否已准备好编写 Golem 组件，通过实现一个比简单的 “Hello World” 示例更复杂的应用程序来进行验证。"
authors: ["MoonBit"]
translators: ["云原生社区"]
categories: ["其他"]
tags: ["MoonBit","WebAssembly","Golem"]
draft: false
date: 2025-01-07T19:33:16+08:00
---

## 介绍

[MoonBit](https://www.moonbitlang.com/) 是一门新的编程语言，几周前刚刚开源 —— 请参见[这篇博客文章](https://www.moonbitlang.com/blog/compiler-opensource)。MoonBit 是一门令人兴奋的现代编程语言，原生支持 WebAssembly，包括组件模型，这使得它非常适合为 Golem Cloud 编写应用程序。

在这篇文章中，我将探讨 MoonBit 的当前状态，以及它是否已准备好编写 Golem 组件，通过实现一个比简单的 "Hello World" 示例更复杂的应用程序来进行验证。

要实现的应用程序是一个简单的协作列表编辑器 —— 在 [Golem 1.0 发布事件](https://youtu.be/11Cig1iH6S0)上，我使用三种不同的编程语言（TypeScript、Rust 和 Go）为其实现了三个主要模块。在这篇文章中，我将使用 MoonBit 实现这三个模块，包括由于时间限制而从现场演示中省略的邮件发送功能。

该应用程序可以处理任意数量的同时打开的列表。每个列表由一组字符串项组成。多个用户可以同时添加、插入和删除这些项；当前的列表状态可以随时查询，以及活跃连接（可以进行编辑操作的用户）。只有已连接的编辑者才能进行修改，并且提供一个轮询功能，返回自上次轮询以来的新更改。列表可以归档，这样它们将不再可编辑，其内容将保存在单独的列表归档中。然后，列表本身可以被删除，其最后的状态会永远保存在归档中。另一个附加功能是，如果列表未归档且在某段时间内没有更改，则所有连接的编辑者将通过发送电子邮件的方式收到通知。

## Golem 架构

在 Golem 中，运行此应用程序的良好架构是拥有三个不同的 Golem 组件：

- 列表
- 归档
- 邮件通知

这些都是编译后的 WebAssembly 组件，每个组件导出一组独特的函数。Golem 提供 API 用于从外部世界调用这些函数（例如将它们映射到 HTTP API），并且还允许工作者（这些组件的实例）相互调用。一个组件可以有任意数量的实例，每个工作者通过唯一的名称进行标识。

我们可以利用这一特性来实现一个非常简单直接的列表编辑器 —— 每个文档（可编辑列表）将映射到其自己的工作者，通过列表的标识符来标识。这样，我们的列表组件只需处理一个单一的列表；将其扩展到处理多个（甚至数百万个）列表，Golem 会自动完成。

对于归档列表，我们希望将每个归档的列表存储在一个地方 —— 所以我们将只拥有一个归档组件的实例，所有归档的列表信息都将发送到该实例。这一单例工作者可以根据需要将归档的列表存储在数据库中 —— 但因为 Golem 的持久执行保证，直接将它们存储在内存中就足够了（一个重要的例外是如果我们希望存储大量的归档列表，无法在单个工作者的内存中存储）。Golem 保证无论何时发生故障或重新扩展事件，工作者的状态都会恢复，因此归档组件可以保持非常简单。

最后，由于 Golem 工作者是单线程的，并且目前不支持与调用重叠的异步调用，我们需要第三个组件来实现延迟发送电子邮件的功能。每个列表工作者将对应一个邮件发送工作者，该工作者将暂停一段时间（我们希望在发送邮件之前等待的时间）。同样，由于 Golem 的持久执行功能，我们可以在此组件中“休眠”任意长的时间，且无需担心在此长时间期间执行环境可能发生的变化。

## 初步 MoonBit 实现

在深入了解如何使用 MoonBit 开发 Golem 组件之前，让我们尝试用这门新语言实现上述描述的组件，而不涉及任何 Golem 或 WebAssembly 的特定内容。

首先，我们使用 `moon new` 创建一个新的 lib 项目。这将创建一个包含单个包的新项目。为了匹配我们的架构，我们将开始创建多个包，每个包对应一个要开发的组件（列表、归档、邮件）。

我们为每个包创建一个文件夹，在每个文件夹中添加一个 `moon.pkg.json` 文件：

```json
{
    "import": []
}
```

### 列表模型

让我们从建模我们的列表开始。被编辑的“文档”本身只是一个字符串数组：

```rust
struct Document {
  mut items: Array[String]
}
```

我们可以为 `Document` 实现方法，支持我们希望的文档编辑操作。在此级别，我们不关心协作编辑或连接的用户，只需将文档建模为纯数据结构：

```rust
///| 创建一个空的文档
pub fn Document::new() -> Document {
  { items: [] }
}

///| 向文档添加一个新项
pub fn add(self : Document, item : String) -> Unit {
  if self.items.search(item).is_empty() {
    self.items.push(item)
  }
}

///| 从文档中删除一个项
pub fn delete(self : Document, item : String) -> Unit {
  self.items = self.items.filter(fn(i) { item != i })
}

///| 向文档中插入一个项，如果 `after` 不在文档中，则新项插入到末尾。
pub fn insert(self : Document, after~ : String, value~ : String) -> Unit {
  let index = self.items.search(after)
  match index {
    Some(index) => self.items.insert(index + 1, value)
    None => self.add(value)
  }
}

///| 获取文档的项视图
pub fn get(self : Document) -> ArrayView[String] {
  self.items[:]
}

///| 遍历文档中的项
pub fn iter(self : Document) -> Iter[String] {
  self.items.iter()
}
```

我们还可以使用 MoonBit 内建的测试功能为此编写单元测试。以下测试包含一个断言，验证初始文档为空：

```rust
test "new document is empty" {
  let empty = Document::new()
  assert_eq!(empty.items, [])
}
```

使用 `inspect` 函数，测试可以使用快照值来进行比较。`moon CLI` 工具和 IDE 集成提供了在需要时自动更新这些测试函数中的快照值（`content=` 部分）的方法：

```rust
test "basic document operations" {
  let doc = Document::new()
    ..add("x")
    ..add("y")
    ..add("z")
    ..insert(after="y", value="w")
    ..insert(after="a", value="b")
    ..delete("z")
    ..delete("f")
  inspect!(
    doc.get(),
    content=
      #|["x", "y", "w", "b"]
    ,
  )
}
```

### 列表编辑器状态

接下来的步骤是实现基于 `Document` 类型的编辑器状态管理。提醒一下，我们决定每个列表组件的实例（Golem 工作者）只负责编辑一个单一的列表。因此，我们不需要关心存储和索引列表，或将连接路由到对应的节点，Golem 会自动管理这一切。

我们需要做的，是编写有状态的代码来处理连接和断开用户（“编辑者”），在文档编辑 API 上添加一些验证，以确保只有连接的编辑者能够进行修改，并收集变更事件以供轮询 API 使用。

我们可以从定义一个新的数据类型来持有我们的文档编辑状态开始：

```rust
///| 文档状态
struct State {
  document : Document
  connected : Map[ConnectionId, EditorState]
  mut last_connection_id : ConnectionId
  mut archived : Bool
  mut email_deadline : @datetime.DateTime
  mut email_recipients : Array[EmailAddress]
}
```

除了实际的文档，我们将存储以下内容：

- 连接的编辑者的映射，以及与每个编辑者相关的状态
- 用于生成新连接 ID 的上一个连接 ID
- 文档是否已归档
- 何时发送电子邮件通知，发送给哪些收件人

到目前为止，我们只定义了 `Document` 类型，因此让我们继续定义 `State` 字段中使用的其他类型。

`ConnectionId` 将是一个包装整数的新类型：

```rust
///| 连接的编辑者的标识符
type ConnectionId Int derive(Eq, Hash)

///| 生成下一个唯一的连接 ID
fn next(self : ConnectionId) -> ConnectionId {
  ConnectionId(self._ + 1)
}
```

我们希望将此类型作为 `Map` 的键，因此我们需要为它实现 `Eq` 和 `Hash` 类型类。MoonBit 可以自动为新类型派生这些类型类。除此之外，我们还定义了一个名为 `next` 的方法，用于生成一个递增的连接 ID。

`EditorState` 结构存储每个连接的编辑者的信息。为了简化起见，我们只存储编辑者的电子邮件地址和自上次轮询以来的更改事件缓冲区。

电子邮件地址是一个新的 `String` 类型：

```rust
///| 连接编辑者的电子邮件地址
type EmailAddress String
```

`Change` 枚举描述了对文档所做的可能更改：

```rust
///| 编辑文档时的可观察更改
enum Change {
  Added(String)
  Deleted(String)
  Inserted(after~ : String, value~ : String)
} derive(Show)
```

通过派生 `Show`（或手动实现），可以使用 `inspect` 测试函数比较更改数组的字符串快照与 `poll` 函数的结果。

接下来，我们使用这两个新类型定义 `EditorState`：

```rust
///| 每个连接的编辑者的状态
struct EditorState {
  email : EmailAddress
  mut events : Array[Change]
}
```

`email` 字段在连接的编辑者中始终不变，但 `events` 数组会随着每次调用 `poll` 被重置，以便下次轮询时仅返回新的更改。为了实现这一点，我们必须将其标记为可变（`mut`）。

我们需要为 `State` 引入的最后一个新类型是表示时间点的东西。MoonBit 的核心标准库目前没有这个功能，但已经有一个名为 `mooncakes` 的包数据库，里面发布了 MoonBit 的包。在这里我们可以找到一个叫 `datetime` 的包。通过使用 moon CLI 可以将其添加到项目中：

```bash
moon add suiyunonghen/datetime
```

然后通过修改 `moon.pkg.json` 将其导入：

```json
{
    "import": [
        "suiyunonghen/datetime"
    ]
}
```

通过这样，我们就可以使用 `@datetime.DateTime` 引用该包中的 `DateTime` 类型。

在开始实现 `State` 的方法之前，我们还需要考虑错误处理——`State` 上的某些操作可能会失败，例如如果使用了错误的连接 ID，或者如果文档已归档时仍进行编辑操作。MoonBit 内建了错误处理支持，首先通过以下方式定义我们自己的错误类型：

```rust
///| 编辑器状态操作的错误类型
type! EditorError {
  ///| 当使用无效的连接 ID 时返回的错误
  InvalidConnection(ConnectionId)
  ///| 尝试修改已归档的文档时的错误
  AlreadyArchived
}
```

有了这些，我们就准备好实现协作列表编辑器了！我在这篇文章中不会列出 `State` 的所有方法，但完整的源代码可以在 [GitHub](https://github.com/vigoo/golem-moonbit-example) 上找到。

`connect` 方法将新的连接 ID 与连接的用户关联，并返回当前文档状态。这对于使用 `poll` 的结果非常重要——返回的更改列表必须精确应用到客户端上的该文档状态。

```rust
///| 连接一个新的编辑者
pub fn connect(
  self : State,
  email : EmailAddress
) -> (ConnectionId, ArrayView[String]) {
  let connection_id = self.last_connection_id.next()
  self.last_connection_id = connection_id
  self.connected.set(connection_id, EditorState::new(email))
  (connection_id, self.document.get())
}
```

编辑操作更为有趣。它们构建在我们已经为 `Document` 定义的编辑操作的基础上，但除了这些，它们还执行以下任务：

- 验证连接 ID
- 验证文档是否尚未归档
- 向每个连接编辑者的状态添加一个 `Change` 事件
- 更新 `email_deadline` 和 `email_recipients` 字段，因为每次编辑操作都会重置发送电子邮件的超时时间

我们逐步处理这些步骤。为了进行验证，我们定义了两个辅助方法，以便在所有编辑方法中重复使用：

```rust
///| 如果文档已归档则失败
fn ensure_not_archived(self : State) -> Unit!EditorError {
  guard not(self.archived) else { raise AlreadyArchived }
}

///| 如果给定的 `connection_id` 不在连接映射中，则失败
fn ensure_is_connected(
  self : State,
  connection_id : ConnectionId
) -> Unit!EditorError {
  guard self.connected.contains(connection_id) else {
    raise InvalidConnection(connection_id)
  }
}
```

`Unit!EditorError` 返回类型表示这些方法可能会失败，并返回 `EditorError`。

我们还可以为向每个连接编辑者的状态添加一个更改事件定义一个辅助方法：

```rust
///| 向每个连接编辑者的状态添加更改事件
fn add_event(self : State, change : Change) -> Unit {
  for editor_state in self.connected.values() {
    editor_state.events.push(change)
  }
}
```

最后，为了重置电子邮件发送截止时间和收件人列表，我们定义一个辅助方法：

```rust
///| 在更新后更新 `email_deadline` 和 `email_recipients` 字段
fn update_email_properties(self : State) -> Unit {
  let now = @datetime.DateTime::from_unix_mseconds(0) // TODO
  let send_at = now.inc_hour(12)
  let email_list = self.connected_editors()
  self.email_deadline = send_at
  self.email_recipients = email_list
}
```

请注意，我们导入的 `datetime` 库没有获取当前日期和时间的功能，我们需要这个功能来使此函数正常工作。我们将在针对 WebAssembly（和 Golem）时解决这个问题，因为获取当前系统时间依赖于目标平台。

通过这些辅助函数，实现编辑器函数，例如 `add`，是直截了当的：

```rust
///| 作为连接的编辑者向文档添加新元素
pub fn add(
  self : State,
  connection_id : ConnectionId,
  value : String
) -> Unit!EditorError {
  self.ensure_not_archived!()
  self.ensure_is_connected!(connection_id)
  self.document.add(value)
  self.add_event(Change::Added(value))
  self.update_email_properties()
}
```

实现 `poll` 也很简单，因为我们已经为每个连接维护了更改列表，我们只需要在每次调用后重置它：

```rust
///| 返回自上次调用 `poll` 以来发生的更改列表
pub fn poll(
  self : State,
  connection_id : ConnectionId
) -> Array[Change]!EditorError {
  match self.connected.get(connection_id) {
    Some(editor_state) => {
      let events = editor_state.events
      editor_state.events = []
      events
    }
    None => raise InvalidConnection(connection_id)
  }
}
```

### 列表归档

如在介绍中提到的，我们将有一个单例 Golem 工作器来存储已归档的列表。目前，我们仍未涉及任何 Golem 或 WebAssembly 特定的内容，如 RPC 调用，因此我们先以最简单的方式实现列表归档存储。正如我之前所写，我们可以简单地将已归档的列表存储在内存中，而 Golem 会负责持久化。

我们不希望重用相同的 `Document` 类型，因为它表示的是一个可编辑的文档。相反，我们在归档包中定义了一些新类型：

```rust
///| 文档的唯一名称
type DocumentName String derive(Eq, Hash)

///| `DocumentName` 的 `Show` 实现
impl Show for DocumentName with output(self, logger) { self._.output(logger) }

///| 一个单一的已归档不可变文档，封装了文档的名称及其项
struct ArchivedDocument {
  name : DocumentName
  items : Array[String]
} derive(Show)

///| 归档是一个已归档文档的列表
struct Archive {
  documents : Map[DocumentName, ArchivedDocument]
}
```

我们只需要一个 `insert` 方法和一个迭代所有已归档文档的方法：

```rust
///| 归档一个命名文档
pub fn insert(
  self : Archive,
  name : DocumentName,
  items : Array[String]
) -> Unit {
  self.documents.set(name, { name, items })
}

///| 迭代所有已归档文档
pub fn iter(self : Archive) -> Iter[ArchivedDocument] {
  self.documents.values()
}
```

完成这部分后，我们首先使用简单的方法调用在列表包中实现列表归档。稍后，我们将用 Golem 的 Worker-to-Worker 通信替换它。

由于会有一个单例归档工作器，我们可以通过在归档包中创建一个顶层的 `Archive` 实例来模拟这一点：

```rust
pub let archive: Archive = Archive::new()
```

并在 `State::archive` 方法中调用它：

```rust
pub fn archive(self : State) -> Unit {
  self.archived = true
  let name = @archive.DocumentName("TODO")
  @archive.archive.insert(name, self.document.iter().to_array())
}
```

请注意，到目前为止，我们在 `State` 中没有存储文档的名称——我们并没有把它存储在任何地方。这是故意的，正如我们之前讨论的那样，工人的名称将作为文档的唯一标识符。一旦我们进入 Golem 特定的实现阶段，获取工人的名称将以 Golem 特有的方式完成。

### 发送一封电子邮件

我们已经在 `State` 类型中准备好了部分电子邮件发送逻辑：它有一个截止日期和一份收件人名单。我们的想法是，当创建一个新的列表时，我们会启动一个电子邮件发送工人，并让它与我们的编辑会话并行运行，形成一个循环。在这个循环中，首先查询列表编辑状态中的截止日期和收件人名单，然后它会一直休眠直到指定的截止日期。当它醒来时（12 小时后），它再次查询列表，如果已经过了截止日期，说明在此期间没有进一步的编辑操作。然后，它会向收件人列表发送通知邮件。

目前，[mooncakes](https://mooncakes.io/) 上还没有用于发送电子邮件或发起 HTTP 请求的库，因此这部分功能我们需要自己实现。此外，创建工人并使其并行运行是 Golem 特有的功能，因此在目前阶段我们不会为电子邮件包实现任何东西。一旦其余的应用程序已作为 Golem 组件编译完成，我们会再回到这部分实现。

### 编译为 Golem 组件

现在是时候尝试将我们的代码编译为 Golem 组件了——这些是 WebAssembly 组件（使用[组件模型](https://component-model.bytecodealliance.org/)），并通过 Wasm 接口类型（WIT）语言描述的 API 导出。

### 绑定

在当前的 WASM 组件模型中，组件是按照规范优先的方式定义的——首先编写描述类型和导出接口的 WIT 文件，然后使用绑定生成器从中生成特定语言的连接代码。幸运的是，[`wit-bindgen` 工具](https://github.com/bytecodealliance/wit-bindgen)已经支持 MoonBit，因此我们可以首先安装最新版本：

```bash
cargo install wit-bindgen-cli
```

请注意，Golem 的文档推荐使用一个较旧的特定版本的 `wit-bindgen`，但该版本还不支持 MoonBit。新版本应该可以很好地工作，但 Golem 的示例代码并没有在这个版本上进行过测试。

我们将重用为 Golem 1.0 演示所创建的 WIT 定义。

对于列表组件，它如下所示：

```rust
package demo:lst;

interface api {
  record connection {
    id: u64
  }

  record insert-params {
    after: string,
    value: string
  }

  variant change {
    added(string),
    deleted(string),
    inserted(insert-params)
  }

  add: func(c: connection, value: string) -> result<_, string>;
  delete: func(c: connection, value: string) -> result<_, string>;
  insert: func(c: connection, after: string, value: string) -> result<_, string>;
  get: func() -> list<string>;

  poll: func(c: connection) -> result<list<change>, string>;

  connect: func(email: string) -> tuple<connection, list<string>>;
  disconnect: func(c: connection) -> result<_, string>;
  connected-editors: func() -> list<string>;

  archive: func();
  is-archived: func() -> bool;
}

interface email-query {
  deadline: func() -> option<u64>;
  recipients: func() -> list<string>;
}

world lst  {
  // .. imports to be explained later ..

  export api;
  export email-query;
}
```

这个接口定义导出了两个 API——一个是我们的列表编辑器的公共 API，非常类似于我们已经为 `State` 类型实现的方法。另一个是一个内部 API，用于电子邮件组件查询截止日期和收件人，如前所述。

为了简化，我们在公共 API 中使用字符串作为错误类型。

对于归档组件，我们定义了一个更简单的接口：

```rust
package demo:archive;

interface api {
  record archived-list {
    name: string,
    items: list<string>
  }

  store: func(name: string, items: list<string>);
  get-all: func() -> list<archived-list>;
}

world archive {
  // .. 导入稍后会解释 ..
  
  export api;
}
```

最后，对于电子邮件组件：

```rust
package demo:email;

interface api {
  use golem:rpc/types@0.1.0.{uri};

  send-email: func(list-uri: uri);
}

world email {
  // .. 导入稍后会解释 ..
  
  export api;
}
```

这里我们使用了 Golem 特有的类型：`uri`。这是必要的，因为电子邮件工人需要调用它所从中生成的特定列表工人。具体细节稍后会解释。

这些 WIT 定义需要放在每个包的 `wit` 目录中，依赖项放在 `wit/deps` 的子目录中。可以参考[仓库](https://github.com/vigoo/golem-moonbit-example)中的示例。

我们从定义一个单一的 MoonBit 模块开始（通过根目录中的 `moon.mod.json` 标识），并仅将 `list`、`email` 和 `archive` 创建为内部包。此时，我们需要做一些更改，因为我们需要为每个我们想要编译成独立 Golem 组件的代码块创建一个单独的模块。通过在每个子目录中运行 `wit-bindgen`（如下所示），它实际上会为我们生成模块定义。

我们稍微重组一下目录结构，将 `src/archive` 移到 `archive` 等，并将之前编写的源代码移到 `archive/src`。这样生成的绑定和我们手写的实现将并排放置。我们还可以删除顶级模块定义的 JSON 文件。

现在，在所有三个目录中，我们可以生成绑定：

```bash
wit-bindgen moonbit wit
```

请注意，一旦我们开始修改生成的 `stub.wit` 文件，再次运行此命令将会覆盖我们的更改。为避免这种情况，可以使用以下方式运行：

```bash
wit-bindgen moonbit wit --ignore-stub
```

完成此步骤后，运行以下命令：

```bash
moon build --target wasm
```

将为我们编译一个位于 `./target/wasm/release/build/gen/gen.wasm` 的 WASM 模块。这还不是一个 WASM 组件——因此不能直接在 Golem 中使用。为了实现这一点，我们需要使用另一个命令行工具 [`wasm-tools`](https://github.com/bytecodealliance/wasm-tools)，将该模块转换为一个自描述其高级导出接口的组件。

### WIT 依赖项

我们将需要依赖一些 WIT 包，其中一些来自 WASI（WebAssembly 系统接口），用于访问环境变量和当前的日期/时间，另一些来自 Golem，供实现工人之间的通信。

获取 Golem 提供的所有依赖项的适当版本的最简单方法是使用 Golem 的 "all" 打包接口和 [`wit-deps`](https://github.com/bytecodealliance/wit-deps) 工具。

首先，我们安装 `wit-deps`：

```bash
cargo install wit-deps-cli
```

然后，在我们创建的每个 `wit` 目录中创建一个 `deps.toml` 文件，内容如下：

```toml
all = "https://github.com/golemcloud/golem-wit/archive/main.tar.gz"
```

最后，我们运行以下命令来填充 `wit/deps` 目录：

```bash
wit-deps update
```

### 实现导出功能

在设置这个编译链之前，让我们看看如何将生成的绑定与我们现有的代码连接起来。我们从归档组件开始，因为它是最简单的。

绑定生成器在 `archive/gen/interface/demo/archive/api/stub.mbt` 位置生成了一个 `stub.mbt` 文件，其中包含两个需要实现的导出函数。我们在使用代码生成器时通常会遇到一个问题：我们在 WIT 中定义了 `archived-list`，并且绑定生成器根据它生成了以下 MoonBit 定义：

```rust
// Generated by `wit-bindgen` 0.36.0. DO NOT EDIT!

pub struct ArchivedList {
      name : String; items : Array[String]
} derive()
```

但我们已经定义了一个非常相似的结构体，叫做 `ArchivedDocument`！唯一的区别是使用了 `DocumentName` 新类型，并且我们的版本派生了一个 `Show` 实例。我们可以决定放弃使用这个新类型，并在我们的业务逻辑中使用生成的类型，或者我们可以保持生成的类型与我们的实际代码分离。（这其实并不特定于 MoonBit 或 WASM 工具链，在任何基于代码生成器的方法中都会遇到这个问题。）

在本文中，我将保持生成的代码与我们已经编写的业务逻辑分离，并展示如何实现必要的转换来实现 `stub.mbt` 文件。

第一个需要实现的导出函数是 `store`。我们可以通过调用 `insert` 在我们的单例顶级 `Archive` 中实现它，就像我们之前直接将归档包连接到列表包时做的那样：

```rust
pub fn store(name : String, items : Array[String]) -> Unit {
      @src.archive.insert(@src.DocumentName(name), items)
}
```

请注意，我们需要在 `stub` 包的 JSON 中导入我们的主归档源：

```json
{
    "import": [
        { "path" : "demo/archive/ffi", "alias" : "ffi" },
        { "path" : "demo/archive/src", "alias" : "src" }
    ]
}
```

第二个需要实现的函数需要在两种归档文档表示之间进行转换：

```rust
pub fn get_all() -> Array[ArchivedList] {
  @src.archive
  .iter()
  .map(fn(archived) { { name: archived.name._, items: archived.items } })
  .to_array()
}
```

请注意，为了使其工作，我们还必须将之前定义的 `ArchivedDocument` 结构体设置为 `pub`，否则我们无法从 `stub` 包访问它的 `name` 和 `items` 字段。

（注：在撰写本文时，<https://github.com/bytecodealliance/wit-bindgen/pull/1100> 尚未合并，而这个补丁对于绑定生成器生成能够与 Golem 的 wasm-rpc 正常工作的代码是必需的；在它合并之前，可以编译这个分支并直接使用。）

我们可以以同样的方式在列表模块中实现两个生成的存根（在 `list/gen/interface/demo/lst/api/stub.mbt` 和 `list/gen/interface/demo/lst/emailQuery/stub.mbt` 中），使用我们现有的 `State` 实现。

一个有趣的细节是如何将 `EditorError` 的失败映射到 WIT 定义中使用的字符串错误。首先我们为 `EditorError` 定义一个 `to_string` 方法：

```rust
pub fn to_string(self : EditorError) -> String {
  match self {
    InvalidConnection(id) => "Invalid connection ID: \{id._}",
    AlreadyArchived => "Document is already archived"
  }
}
```

然后在存根中使用 `?` 和 `map_err`：

```rust
pub fn add(c : Connection, value : String) -> Result[Unit, String] {
  @src.state
  .add?(to_connection_id(c), value)
  .map_err(fn(err) { err.to_string() })
}
```

### 使用宿主函数

当我们之前实现 `update_email_properties` 函数时，我们无法正确查询当前时间来计算适当的截止日期。现在我们正在面向 Golem，我们可以使用 WebAssembly 系统接口（WASI）来访问诸如系统时间之类的功能。一种方法是使用已发布的 [`wasi-bindings` 包](https://mooncakes.io/docs/#/yamajik/wasi-bindings/)，但既然我们已经从 WIT 生成绑定，我们可以直接使用我们自己生成的绑定来导入宿主函数。

首先，我们需要将 WASI 的墙时钟接口导入到我们的 WIT 世界中：

```rust
world lst  {
  export api;
  export email-query;

  import wasi:clocks/wall-clock@0.2.0;
}
```

然后我们重新生成绑定（确保使用 `--ignore-stub`，以避免覆盖我们的存根实现！），并将其导入到我们的主包（`src`）中：

```json
{
    "import": [
        "suiyunonghen/datetime",
        { "path" : "demo/lst/interface/wasi/clocks/wallClock", "alias" : "wallClock" }
    ]
}
```

有了这些，我们就可以调用 WASI 的 `now` 函数来查询当前的系统时间，并将其转换为我们之前使用的 `datetime` 模块的 `DateTime` 类型：

```rust
///| Queries the WASI wall clock and returns it as a @datetime.DateTime
///
/// Note that DateTime has only millisecond precision
fn now() -> @datetime.DateTime {
  let wasi_now = @wallClock.now()
  let base_ms =  wasi_now.seconds.reinterpret_as_int64() * 1000;
  let nano_ms = (wasi_now.nanoseconds.reinterpret_as_int() / 1000000).to_int64();
  @datetime.DateTime::from_unix_mseconds(base_ms + nano_ms)
}
```

## Golem 应用清单

在我们实现的下一步中，我们需要将现有的两个组件——列表和归档连接起来，使得列表能够进行远程过程调用（RPC）到归档。使用相同的技术，我们还可以实现第三个组件——电子邮件组件，它既需要被列表调用（启动时），也需要回调（获取截止日期和收件人时）。

Golem 提供了支持这种功能的工具，但在尝试使用之前，让我们将项目转换为由应用清单描述的 Golem 应用。这将使我们能够使用 `golem-cli` 生成必要的文件来进行工作者之间的通信，并且也更容易将编译后的组件部署到 Golem。

### 构建步骤

要将单个 MoonBit 模块构建为一个 Golem 组件，而不涉及任何工作者间通信，我们需要执行以下步骤：

1. （可选）使用 `wit-bindgen ... --ignore-stub` 重新生成 WIT 绑定。
2. 使用 `moon build --target wasm` 将 MoonBit 源代码编译为 WASM 模块。
3. 使用 `wasm-tools component embed` 将 WIT 规范嵌入到自定义的 WASM 部分中。
4. 使用 `wasm-tools component new` 将 WASM 模块转换为 WASM 组件。

当我们开始使用工作者间通信时，这将需要更多的步骤，因为我们将生成存根 WIT 接口，并编译和链接多个 WASM 组件。这个过程的早期版本已在去年的[《Golem 中的工作者间通信》](https://blog.vigoo.dev/posts/w2w-communication-golem/)博客文章中描述过。

随着 Golem 1.1 的发布，Golem 应用清单和相应的 CLI 工具可以为我们自动化所有这些步骤。

### 清单模板

我们首先在项目的根目录中创建一个根应用清单文件 `golem.yaml`。接下来，我们设置一个临时目录和一个共享目录，用于存放我们之前通过 `wit-deps` 获取的 WIT 依赖：

```yaml
# IDEA 的架构：
# $schema: https://schema.golem.cloud/app/golem/1.1.0/golem.schema.json
# vscode-yaml 的架构
# yaml-language-server: $schema=https://schema.golem.cloud/app/golem/1.1.0/golem.schema.json

tempDir: target/golem-temp
witDeps:
 - common-wit/deps
```

通过将我们之前的 `deps.toml` 移动到 `common-wit` 目录，并在根目录执行 `wit-deps update`，我们可以将所有需要的 WASI 和 Golem API 填充到这个依赖目录中。

接下来，我们定义一个用于通过 Golem CLI 构建 MoonBit 组件的模板。在模板中，我们将定义两个配置：一个用于发布构建，另一个用于调试构建。本文中仅展示发布构建的配置。

它首先指定了一些目录名称，并指定最终的 WASM 文件将放置在哪里：

```yaml
templates:
  moonbit:
    profiles:
      release:
        sourceWit: wit
        generatedWit: wit-generated
        componentWasm: ../target/release/{{ componentName }}.wasm
        linkedWasm: ../target/release/{{ componentName }}-linked.wasm
```

这些目录是相对于各个组件子目录（例如归档组件）的，因此我们在这里所说的是，一旦所有组件构建完成，它们都会放置在根目录的 `target/release` 目录下。

然后，我们指定构建步骤，步骤与之前部分中描述的相同：

```yaml
build:
  - command: wit-bindgen moonbit wit-generated --ignore-stub --derive-error --derive-show
    sources:
      - wit-generated
    targets:
      - ffi
      - interface
      - world
  - command: moon build --target wasm
  - command: wasm-tools component embed wit-generated target/wasm/release/build/gen/gen.wasm -o ../target/release/{{ componentName }}.module.wasm --encoding utf16
    mkdirs:
      - ../target/release
  - command: wasm-tools component new ../target/release/{{ componentName }}.module.wasm -o ../target/release/{{ componentName }}.wasm
```

最后，我们可以定义额外的目录，这些目录将在 `golem app clean` 命令中被清理，还可以定义自定义命令供 `golem app xxx` 执行：

```yaml
clean:
  - target
  - wit-generated
customCommands:
  update-deps:
  - command: wit-deps update
    dir: ..
  regenerate-stubs:
  - command: wit-bindgen moonbit wit-generated
```

完成这些配置后，我们可以通过在其目录中创建一个 `golem.yaml` 来将新的 MoonBit 模块添加到这个 Golem 项目中——比如 `archive/golem.yaml` 和 `list/golem.yaml`。

在这些子清单中，我们可以使用上述定义的模板，告诉 Golem 这是一个 MoonBit 模块。在一个应用中，我们可以混合使用不同语言编写的 Golem 组件。

例如，归档组件的清单将如下所示：

```yaml
# IDEA 的架构：
# $schema: https://schema.golem.cloud/app/golem/1.1.0/golem.schema.json
# vscode-yaml 的架构
# yaml-language-server: $schema=https://schema.golem.cloud/app/golem/1.1.0/golem.schema.json

components:
  archive:
    template: moonbit
```

### 构建组件  

通过这一配置，整个应用程序（包括两个已经编写的组件）可以通过简单地执行以下命令进行编译：

```bash
golem app build
```

在此之前，我们需要做一些组织工作，因为 `golem app build` 会对 WIT 定义进行一些转换。这意味着我们之前编写的存根文件位置已经不正确。修复这个问题最简单的方法是删除所有由 `wit-bindgen` 生成的目录（但首先要备份手写的存根文件！），然后将存根文件复制回新创建的目录中。我们在这里不会进一步讨论这个问题。本文的博客会逐步介绍如何使用 MoonBit 构建 Golem 应用，并且在后期介绍应用清单，但推荐的方法是从一开始就使用应用清单，这样就无需做这些修复了。

### 初次尝试

运行构建命令后，生成的两个 WASM 文件已经可以与 Golem 一起使用了！尽管它们尚未能够相互通信（因此归档功能还不可用），但我们已经可以使用 Golem 进行尝试了。

为此，我们可以通过下载最新版本的[单一可执行文件 Golem](https://github.com/golemcloud/golem/releases/tag/v1.1.0) 或使用我们的托管 Golem Cloud 本地启动 Golem 服务。使用 Golem 二进制文件，我们只需使用以下命令在本地启动服务：

```bash
golem start -vv
```

然后，从我们项目的根目录，可以使用相同的命令上传这两个编译后的组件：

```bash
$ golem component add --component-name archive
Added new component archive

Component URN:     urn:component:bde2da89-75a8-4adf-953f-33b360c978d0
Component name:    archive
Component version: 0
Component size:    9.35 KiB
Created at:        2025-01-03 15:09:05.166785 UTC
Exports:
  demo:archive-interface/api.{get-all}() -> list<record { name: string, items: list<string> }>
  demo:archive-interface/api.{store}(name: string, items: list<string>)
```

以及

```bash
$ golem component add --component-name list
Added new component list

Component URN:     urn:component:b6420554-62b5-4902-8994-89c692a937f7
Component name:    list
Component version: 0
Component size:    28.46 KiB
Created at:        2025-01-03 15:09:09.743733 UTC
Exports:
  demo:lst-interface/api.{add}(c: record { id: u64 }, value: string) -> result<_, string>
  demo:lst-interface/api.{archive}()
  demo:lst-interface/api.{connect}(email: string) -> tuple<record { id: u64 }, list<string>>
  demo:lst-interface/api.{connected-editors}() -> list<string>
  demo:lst-interface/api.{delete}(c: record { id: u64 }, value: string) -> result<_, string>
  demo:lst-interface/api.{disconnect}(c: record { id: u64 }) -> result<_, string>
  demo:lst-interface/api.{get}() -> list<string>
  demo:lst-interface/api.{insert}(c: record { id: u64 }, after: string, value: string) -> result<_, string>
  demo:lst-interface/api.{is-archived}() -> bool
  demo:lst-interface/api.{poll}(c: record { id: u64 }) -> result<list<variant { added(string), deleted(string), inserted(record { after: string, value: string }) }>, string>
  demo:lst-interface/email-query.{deadline}() -> option<u64>
  demo:lst-interface/email-query.{recipients}() -> list<string>
```

我们可以通过首先调用 `store` 函数，然后调用 `get-all` 函数，使用 CLI 的 `worker invoke-and-await` 命令来尝试归档组件：

```bash
$ golem worker invoke-and-await --worker urn:worker:bde2da89-75a8-4adf-953f-33b360c978d0/archive --function 'demo:archive-interface/api.{store}' --arg '"list1"' --arg '["x", "y", "z"]'
Empty result.

$ golem worker invoke-and-await --worker urn:worker:bde2da89-75a8-4adf-953f-33b360c978d0/archive --function 'demo:archive-interface/api.{get-all}'
Invocation results in WAVE format:
- '[{name: "list1", items: ["x", "y", "z"]}]'
```

我们可以通过首先调用 `store` 函数，然后调用 `get-all` 函数，使用 CLI 的 `worker invoke-and-await` 命令来尝试归档组件：

同样，我们也可以尝试列表组件，记住工作者的名称就是列表的名称：

当我们尝试运行列表时，出现了错误（如果我们使用调试配置文件 - 使用 `--build-profile debug`，我们还会看到一个漂亮的调用栈）：

```bash
Failed to create worker b6420554-62b5-4902-8994-89c692a937f7/list6: Failed to instantiate worker -1/b6420554-62b5-4902-8994-89c692a937f7/list6: error while executing at wasm backtrace:
    0: 0x19526 - wit-component:shim!indirect-wasi:clocks/wall-clock@0.2.0-now
    1: 0x414b - <unknown>!demo/lst/interface/wasi/clocks/wallClock.wasmImportNow
    2: 0x4165 - <unknown>!demo/lst/interface/wasi/clocks/wallClock.now
    3: 0x42c1 - <unknown>!demo/lst/src.now
    4: 0x433d - <unknown>!@demo/lst/src.State::update_email_properties
    5: 0x440e - <unknown>!@demo/lst/src.State::new
    6: 0x5d81 - <unknown>!*init*/38
```

问题出在我们正在创建一个全局变量 `State`，并且在它的构造函数中尝试调用一个 WASI 函数（获取当前的日期和时间）。这个时机太早了；所以我们需要修改 `State::new` 方法，避免在初始化时调用任何宿主函数：

```rust
///| 创建一个新的空文档编辑状态
pub fn State::new() -> State {
  let state = {
    document: Document::new(),
    connected: Map::new(),
    last_connection_id: ConnectionId(0),
    archived: false,
    email_deadline: @datetime.DateTime::from_unix_mseconds(0), // 注意：不能在这里使用 now()，因为它会在初始化时运行（由于全局 `state` 变量）
    email_recipients: [],
  }
  state
}
```

这样就解决了问题！现在我们可以创建并使用我们可以共同编辑的列表了：

```bash
$ golem worker start --component urn:component:b6420554-62b5-4902-8994-89c692a937f7 --worker-name list7
Added worker list7

Worker URN:    urn:worker:b6420554-62b5-4902-8994-89c692a937f7/list7
Component URN: urn:component:b6420554-62b5-4902-8994-89c692a937f7
Worker name:   list7

$ golem worker invoke-and-await --component urn:component:b6420554-62b5-4902-8994-89c692a937f7 --worker-name list7 --function 'demo:lst-interface/api.{connect}' --arg '"demo@vigoo.dev"'
Invocation results in WAVE format:
- '({id: 1}, [])'

$ golem worker invoke-and-await --component urn:component:b6420554-62b5-4902-8994-89c692a937f7 --worker-name list7 --function 'demo:lst-interface/api.{add}' --arg '{ id: 1}' --arg '"a"'
Invocation results in WAVE format:
- ok

$ golem worker invoke-and-await --component urn:component:b6420554-62b5-4902-8994-89c692a937f7 --worker-name list7 --function 'demo:lst-interface/api.{add}' --arg '{ id: 1}' --arg '"b"'
Invocation results in WAVE format:
- ok

$ golem worker invoke-and-await --component urn:component:b6420554-62b5-4902-8994-89c692a937f7 --worker-name list7 --function 'demo:lst-interface/api.{connect}' --arg '"demo2@vigoo.dev"'
Invocation results in WAVE format:
- '({id: 2}, ["a", "b"])'
```

### Worker 到 Worker 通信

#### 列表调用归档

我们首先要设置的 worker 到 worker 通信是列表组件调用归档组件——基本上，当我们在列表中调用 `archive()` 时，它需要在一个单例的归档 worker 中调用 `store` 函数，并将数据发送过去。

第一步是简单地在列表的应用清单中声明这个依赖关系：

```yaml
components:
  list:
    template: moonbit

dependencies:
  list:
  - type: wasm-rpc
    target: archive
```

在此之后运行 `golem app build` 会进行许多新的构建步骤——包括生成和编译一些 Rust 源代码，这些代码在 Golem 的下一个版本中将不再需要。

我们不会在本文中详细讨论为 worker 到 worker 通信生成的内容——重要的是，在做出这个修改并运行一次构建后，我们可以在列表组件的 MoonBit 包中导入我们归档组件生成的 stub：

```json
{
    "import": [
        "suiyunonghen/datetime",
        { "path" : "demo/lst/interface/wasi/clocks/wallClock", "alias" : "wallClock" },
        { "path" : "demo/lst/interface/demo/archive_stub/stubArchive", "alias": "stubArchive" },
        { "path" : "demo/lst/interface/golem/rpc/types", "alias": "rpcTypes" }
    ]
}
```

然后，我们可以将以下代码添加到我们的归档函数中，用来调用远程 worker：

```rust
  let archive_component_id = "bde2da89-75a8-4adf-953f-33b360c978d0"; // TODO
  let archive = @stubArchive.Api::api({ value: "urn:worker:\{archive_component_id}/archive"});
  let name = "TODO"; // TODO

  archive.blocking_store(name, self.document.iter().to_array());
```

在第 2 行，我们通过使用组件 ID 和 worker 名称来构建远程接口（在 Golem 的下一个版本中，使用组件名称将使这个过程更加简化）。在第 5 行，我们调用远程的 `store` 函数。

但是，缺少两件事：

1. 我们不应该硬编码归档组件的 ID，因为它是在组件首次上传到 Golem 时自动生成的；
2. 我们需要知道我们自己的 worker 名称，它将作为列表的名称。

这两者的解决方法是使用环境变量——Golem 会自动将 `GOLEM_WORKER_NAME` 环境变量设置为 worker 的名称，我们也可以通过自定义环境变量手动提供值给 worker。这使得我们可以从外部注入组件 ID（直到 Golem 1.2 版本添加了更复杂的配置功能）。

我们已经看到如何使用 WASI 查询当前的日期/时间；我们可以使用另一个 WASI 接口来获取环境变量。因此，我们再次将一个导入添加到我们的 WIT 文件：

```json
  import wasi:cli/environment@0.2.0;
```

然后运行 `golem app build` 以重新生成绑定，并在 `list/src` 的 MoonBit 包中导入它：

```json
{ "path" : "demo/lst/interface/wasi/cli/environment", "alias": "environment" }
```

接着，我们实现一个帮助函数来获取特定的环境变量：

```rust
///| 使用 WASI 获取环境变量
fn get_env(key : String) -> String? {
  @environment.get_environment()
  .iter()
  .find_first(fn(pair) {
    pair.0 == key
  })
  .map(fn(pair) {
    pair.1
  })
}
```

我们可以用这个函数来获取 worker 的名称和归档组件 ID：

```rust
let archive_component_id = get_env("ARCHIVE_COMPONENT_ID").or("unknown");
// ...
let name = get_env("GOLEM_WORKER_NAME").or("unknown");
```

当启动列表 worker 时，我们必须显式指定 `ARCHIVE_COMPONENT_ID`：

```bash
golem worker start --component urn:component:b6420554-62b5-4902-8994-89c692a937f7 --worker-name list10 --env "ARCHIVE_COMPONENT_ID=bde2da89-75a8-4adf-953f-33b360c978d0"
```

这样我们就可以尝试连接到列表，添加一些项目，然后调用归档，并最终在归档 worker 上调用 `get-all`——我们可以看到远程过程调用是有效的！

### 列表与电子邮件组件通信

在本示例中，我们要实现的第三个组件是负责在某个截止日期后发送电子邮件的组件。设置组件和 worker-to-worker 通信与前面演示的方式完全相同。应用清单支持循环依赖，所以我们可以指定列表依赖于电子邮件（通过 `wasm-rpc`），同时电子邮件也依赖于列表（同样通过 `wasm-rpc`）。我们需要在两个方向上进行通信。

为了等待截止日期，我们将使用 WASI 单调时钟接口的 `subscribe-instant` 函数。

下面是 `send-email` 函数的 MoonBit 实现（我们已在 `email.wit` 文件中定义该函数）：

```rust
///| 存储电子邮件发送者的配置信息
pub(all) struct Email {
  list_worker_urn : String
}

///| 执行发送电子邮件的循环
pub fn run(self : Email) -> Unit {
  while true {
    match self.get_deadline() {
      Some(epoch_ms) => {
        let now = @wallClock.now()
        let now_ms = now.seconds * 1000 +
          (now.nanoseconds.reinterpret_as_int() / 1000000).to_uint64()
        let duration_ms = epoch_ms.reinterpret_as_int64() - 
          now_ms.reinterpret_as_int64()
        if duration_ms > 0 {
          sleep(duration_ms.reinterpret_as_uint64())
        } else {
          send_emails(self.get_recipients())
        }
        continue
      }
      None => break
    }
  }
}
```

我们再次使用 `wallClock` 接口来查询当前时间，并根据从相关列表 worker 获取的截止日期计算等待的时长。`get_deadline` 和 `get_recipients` 方法则是利用 Golem 的 worker-to-worker 通信进行的。

```rust
///| 获取与列表 worker 关联的当前截止日期
fn get_deadline(self : Email) -> UInt64? {
  let api = @stubLst.EmailQuery::email_query({ value: self.list_worker_urn })
  api.blocking_deadline()
}

///| 获取与列表 worker 关联的当前收件人列表
fn get_recipients(self : Email) -> Array[String] {
  let api = @stubLst.EmailQuery::email_query({ value: self.list_worker_urn })
  api.blocking_recipients()
}
```

接下来是休眠与发送电子邮件的部分：

### 1. **休眠功能**

我们可以通过调用 `subscribe-duration` 函数来获取一个可轮询对象，并在该对象上进行轮询，从而实现休眠。由于我们只传递了一个单一的轮询对象给列表，它将在目标截止日期到达时返回：

```rust
///| 休眠指定的毫秒数
fn sleep(ms : UInt64) -> Unit {
  let ns = ms * 1000000
  let pollable = @monotonicClock.subscribe_duration(ns)
  let _ = @poll.poll([pollable])
}
```

### 2. **列表中的非阻塞调用**

在列表的一方，我们不希望阻塞，直到电子邮件发送循环运行完成，因为这会阻止列表接收新的请求。为此，生成的 RPC 存根支持这一点，我们只需使用非阻塞版本的 API 类型：

```rust
if not(self.email_worker_started) {
  let email_component_id = get_env("EMAIL_COMPONENT_ID").or("unknown");
  let name = get_env("GOLEM_WORKER_NAME").or("unknown")
  let self_component_id = get_env("GOLEM_COMPONENT_ID").or("unknown")
  let api = @stubEmail.Api::api({ value: "urn:worker:\{email_component_id}:\{name}"} )
  api.send_email({ value: "urn:worker:\{self_component_id}:\{name}"} )
  self.email_worker_started = true;
}
```

## 发送电子邮件

发送实际电子邮件稍微复杂一些，因为 MoonBit 生态系统中目前没有 HTTP 客户端库。但 Golem 实现了 WASI HTTP 接口，因此我们可以通过 WIT 导入 WASI HTTP，生成绑定，然后使用这些绑定从 MoonBit 代码中向第三方提供商发送电子邮件。

在本示例中，我们将使用 [SendGrid](https://sendgrid.com/en-us) 作为电子邮件服务提供商，这意味着我们需要向 `https://api.sendgrid.com/v3/mail/send` 发送一个 HTTP POST 请求，并附上已配置的授权头和描述电子邮件发送请求的 JSON 正文。

首先，我们定义一些常量和函数，用于组装请求的各个部分：

```rust
const AUTHORITY : String = "api.sendgrid.com"
const PATH : String = "/v3/mail/send"

type! HttpClientError String
```

邮件正文采用 JSON 格式，可以使用 MoonBit 内建的 JSON 字面量功能构建。然而，在 WASI HTTP 接口中，我们必须将其写出为字节数组。MoonBit 字符串是 UTF-16 编码的，而 SendGrid 需要 UTF-8 编码的负载。因此我们编写了一个简单的函数，当字符串中包含非 ASCII 字符时，抛出错误：

```rust
///| 如果字符串中包含非 ASCII 字符，则将其转换为 ASCII 字节数组，否则失败
fn string_to_ascii(
  what : String,
  value : String
) -> FixedArray[Byte]!HttpClientError {
  let result = FixedArray::makei(value.length(), fn(_) { b' ' })
  for i, ch in value {
    if ch.to_int() < 256 {
      result[i] = ch.to_int().to_byte()
    } else {
      raise HttpClientError("The \{what} contains non-ASCII characters")
    }
  }
  result
}
```

有了这个，我们可以构建请求负载，并从环境变量中读取 SendGrid API 密钥：

```rust
///| 构建 SendGrid 发送邮件的 JSON 正文，并将其转换为 ASCII 字节数组
fn payload(recipients : Array[String]) -> FixedArray[Byte]!HttpClientError {
  let email_addresses = recipients
    .iter()
    .map(fn(email) { { "email": email, "name": email } })
    .to_array()
    .to_json()
  let from : Json = { "email": "demo@vigoo.dev", "name": "Daniel Vigovszky" }
  let json : Json = {
    "personalizations": [{ "to": email_addresses, "cc": [], "bcc": [] }],
    "from": from,
    "subject": "Collaborative list editor warning",
    "content": [
      {
        "type": "text/html",
        "value": "<p>The list opened for editing has not been changed in the last 12 hours</p>",
      },
    ],
  }
  let json_str = json.to_string()
  string_to_ascii!("constructed JSON body", json_str)
}

///| 获取 SENDGRID_API_KEY 环境变量的值，并转换为 ASCII 字节数组
fn authorization_header() -> FixedArray[Byte]!HttpClientError {
  let key_str = @environment.get_environment()
    .iter()
    .find_first(fn(pair) { pair.0 == "SENDGRID_API_KEY" })
    .map(fn(pair) { pair.1 })
    .unwrap()
  string_to_ascii!(
    "provided authorization header via SENDGRID_API_KEY", key_str,
  )
}
```

这样就可以构建完整的电子邮件请求，并向 SendGrid 发送邮件了！

下一步是创建用于发送 HTTP 请求的数据结构。在 WASI HTTP 中，出站请求被建模为 WIT 资源，这意味着我们必须通过构造函数构建它们，并调用各种方法来设置请求的属性。所有这些方法都有一个 `Result` 类型的返回值，因此我们的代码将会比较冗长：

```rust
let headers = @httpTypes.Fields::fields()
headers
  .append("Authorization", authorization_header!())
  .map_err(fn(error) {
    HttpClientError("设置 Authorization 头部失败: \{error}")
  })
  .unwrap_or_error!()

let request = @httpTypes.OutgoingRequest::outgoing_request(headers)
request
  .set_authority(Some(AUTHORITY))
  .map_err(fn(_) { HttpClientError("设置请求 authority 失败") })
  .unwrap_or_error!()
request
  .set_method(@httpTypes.Method::Post)
  .map_err(fn(_) { HttpClientError("设置请求方法失败") })
  .unwrap_or_error!()
request
  .set_path_with_query(Some(PATH))
  .map_err(fn(_) { HttpClientError("设置请求路径失败") })
  .unwrap_or_error!()
request
  .set_scheme(Some(@httpTypes.Scheme::Https))
  .map_err(fn(_) { HttpClientError("设置请求协议失败") })
  .unwrap_or_error!()

let outgoing_body = request
  .body()
  .map_err(fn(_) { HttpClientError("获取请求体失败") })
  .unwrap_or_error!()

let stream = outgoing_body
  .write()
  .map_err(fn(_) {
    HttpClientError("打开请求体流失败")
  })
  .unwrap_or_error!()

let _ = stream
  .blocking_write_and_flush(payload!(recipients))
  .map_err(fn(error) {
    HttpClientError("写入请求体失败: \{error}")
  })
  .unwrap_or_error!()

let _ = outgoing_body
  .finish(None)
  .map_err(fn(_) { HttpClientError("关闭请求体失败") })
  .unwrap_or_error!()
```

此时，我们已经初始化了 `request` 变量，包含了发送 HTTP 请求所需的所有内容，接下来我们可以调用 `handle` 函数来发起 HTTP 请求：

```rust
let future_incoming_response = @outgoingHandler.handle(request, None)
  .map_err(fn(error) { HttpClientError("发送请求失败: \{error}") })
  .unwrap_or_error!()
```

发送请求是一个异步操作，所得到的结果只是一个处理未来值的句柄，我们需要以某种方式等待这个结果。在这个示例中，由于我们不需要并行执行其他任务，所以我们编写了一个循环，等待结果并检查错误：

```rust
while true {
  match future_incoming_response.get() {
    Some(Ok(Ok(response))) => {
      let status = response.status()
      if status >= 200 && status < 300 {
        break
      } else {
        raise HttpClientError("HTTP 请求返回状态码 \{status}")
      }
    }
    Some(Ok(Err(code))) =>
      raise HttpClientError("HTTP 请求失败，错误代码: \{code}")
    Some(Err(_)) => raise HttpClientError("HTTP 请求失败")
    None => {
      let pollable = future_incoming_response.subscribe()
      let _ = @poll.poll([pollable])
    }
  }
}
```

在这个例子中我们忽略了响应体，但在其他应用中，可以使用响应来打开一个输入流并从中读取数据块。

至此，我们已经实现了使用 Golem 提供的 WASI HTTP 最简单的方式调用 SendGrid API 发送电子邮件。

## 调试

当以调试模式编译时（使用 `golem app build --build-profile debug`），Golem 会在 MoonBit 组件出现问题时显示详细的堆栈追踪。另一种观察 worker 的有用方法是，在其中写入日志，可以通过 `golem worker connect` 或 Golem 控制台实时查看（或稍后查询）。

在 MoonBit 中编写日志的最佳方式是使用 WASI 日志接口。我们可以像往常一样在 WIT 文件中导入它：

```json
import wasi:logging/logging;
```

然后将其添加到我们的 MoonBit 包：

```json
"demo/archive/interface/wasi/logging/logging"
```

接下来可以在应用逻辑中写出不同级别的日志消息：

```rust
let recipients = self.get_recipients();
@logging.log(@logging.Level::INFO, "", "发送电子邮件到以下收件人: \{recipients}")
match send_emails?(recipients) {
  Ok(_) => @logging.log(@logging.Level::INFO, "", "发送电子邮件成功")
  Err(error) => @logging.log(@logging.Level::ERROR, "", "发送电子邮件失败: \{error}")
}
```

## 结论

MoonBit 是一种非常强大且富有表现力的新语言，看起来非常适合用于为 Golem 开发应用程序。生成的 WASM 二进制文件非常小——这个应用程序只有几十 KB（仅仅增加了生成的 Rust 存根代码，但这些很快就会消失）。虽然语言中有一些地方感觉有些不便——但可能只是个人口味问题——主要是描述 MoonBit 包的 JSON 文件、匿名函数语法和内置格式化器的组织方式。我相信这些，特别是工具链，未来会有很大改进。

对于 WASM 和组件模型的支持仍处于初期阶段——但已经可以工作。它需要很多手动步骤，但幸运的是，Golem 的应用清单功能可以为我们自动化大部分工作。尽管如此，`wit-bindgen moonbit` 生成的目录结构刚开始时确实让人感到有些压倒性。

我希望 MoonBit 生态系统能在不久的将来得到一些有用的库，例如方便的 WASI 和 WASI HTTP 封装（以及 Golem 特定的封装）、字符串编码工具等。由于目前库还不多，因此很容易找到一些有用的工作内容。
