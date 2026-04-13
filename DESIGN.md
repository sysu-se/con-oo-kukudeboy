# con-oo-kukudeboy 设计说明

## 1. 目标

这次作业分成两个部分：

1. 在 HW1 的基础上改进 `Sudoku` / `Game` 领域对象。
2. 让现有 Svelte 界面真正消费这些领域对象，而不是继续直接操作旧的二维数组状态。

我的整体方案是：

- 领域层负责业务规则和状态演化。
- store adapter 负责把领域对象转换成 Svelte 可消费的响应式状态。
- 组件只做渲染和事件转发。

## 2. 对象边界

### `Sudoku`

职责：

- 持有当前 `grid`
- 持有原始题面 `givens`
- 校验输入和移动
- 阻止修改 givens
- 计算冲突格
- 判断是否 solved
- 提供 `clone()`、`toJSON()`、`toString()`

它是核心领域对象，负责“一个盘面是否合法、可不可以改、当前是否完成”这些纯数独业务规则。

### `Game`

职责：

- 持有当前 `Sudoku`
- 管理 `undoStack` / `redoStack`
- 提供 `guess()`、`undo()`、`redo()`
- 对外暴露安全读取接口 `getSudoku()`
- 提供完整序列化

它表示“一局游戏”，比 `Sudoku` 多了会话语义和历史语义。

### store adapter

我把它放在 `src/node_modules/@sudoku/stores/grid.js` 里，核心对象叫 `domainGame`。

职责：

- 内部私有持有 `Game`
- 维护一个 Svelte `writable` 状态
- 把领域对象转换成 UI 可直接消费的 plain state
- 暴露 UI 入口：`generate`、`decodeSencode`、`guess`、`applyHint`、`undo`、`redo`

这层不是领域对象，而是 View-Model / Adapter。

## 3. View 层消费的是什么

View 层并不直接消费 `Game` 实例本身，而是消费 adapter 暴露的 store。

主要数据有：

- `grid`：原始题面，用于判断用户数字和分享题目
- `userGrid`：当前盘面，用于渲染棋盘
- `invalidCells`：冲突格坐标
- `canUndo`：是否可撤销
- `canRedo`：是否可重做
- `gameWon`：是否完成

这样做的原因是：

- Svelte 更适合消费 plain state 和 store。
- 领域对象保留封装，不需要对 UI 暴露可变内部状态。
- 响应式更新边界更清晰。

## 4. 用户操作如何进入领域对象

### 开始游戏

调用链：

1. `Welcome.svelte` / `@sudoku/game`
2. `grid.generate(...)` 或 `grid.decodeSencode(...)`
3. adapter 创建新的 `Game(createSudoku(...))`
4. adapter 发布新的响应式状态

### 键盘输入

调用链：

1. `Keyboard.svelte`
2. `userGrid.set(cursor, value)`
3. adapter 调用 `Game.guess({ row, col, value })`
4. `Game` 更新 `Sudoku`
5. adapter `state.set(...)`
6. 棋盘重新渲染

### Hint

调用链：

1. `Actions.svelte`
2. `userGrid.applyHint(cursor)`
3. adapter 先根据当前盘面求解正确值
4. 再通过 `Game.guess(...)` 提交
5. adapter 重新发布状态

### Undo / Redo

调用链：

1. `Actions.svelte`
2. `undoMove()` / `redoMove()`
3. `domainGame.undo()` / `domainGame.redo()`
4. `Game.undo()` / `Game.redo()`
5. adapter 重新发布状态

这样撤销重做的真实业务逻辑留在 `Game`，而不是散落在组件里。

## 5. 响应式机制说明

### 你依赖的是 `store`、`$:`、重新赋值，还是其他机制？

我主要依赖的是 `store`。具体来说，adapter 内部维护一个 `writable(state)`，每次领域对象发生变化后，adapter 会重新组装一份新的 plain state，然后调用 `state.set(newState)`。组件通过 `$store` 自动订阅这些状态，因此界面更新真正依赖的是 store 发布新值。

`$:` 也有使用，但它只是组件内部的辅助机制，用来计算局部派生值，比如某个按钮当前是否可用、某个显示值是否应该高亮。它不是这次跨组件状态同步的核心机制。重新赋值也确实发生了，但它发生在 adapter 发布的新状态对象上，而不是直接给 `Game` 或 `Sudoku` 内部字段重新赋值。

所以，这次方案的响应式核心是 `store`，`$:` 只是局部辅助，领域对象本身并不直接承担 Svelte 的响应式职责。

### 你的方案中，哪些数据是响应式暴露给 UI 的？

响应式暴露给 UI 的不是整个 `Game` 实例，而是 adapter 产出的 plain state，以及项目里原有的一些界面型 store。

和领域对象直接相关、由 adapter 响应式暴露给 UI 的数据主要有：

- `puzzleGrid`：原始题面，用来判断 givens 和用户输入，也用于分享编码。
- `userGrid`：当前玩家看到和操作的盘面，是棋盘渲染的主要数据源。
- `invalidCells`：当前冲突格集合，用于冲突高亮。
- `canUndo`：当前是否可以撤销，用于控制 Undo 按钮。
- `canRedo`：当前是否可以重做，用于控制 Redo 按钮。
- `won`：当前盘面是否已经完成且合法，用于驱动胜利逻辑。

除此之外，UI 还会消费一些原有的界面型 store，例如 `cursor`、`gamePaused`、`notes`、`settings`、`difficulty`。这些状态不属于领域对象本身，而属于界面交互状态。

所以，这里的边界是，UI 响应式消费的是“渲染结果”和“交互所需状态”，而不是领域对象内部的真实可变引用。

### 哪些状态留在领域对象内部？

留在领域对象内部的，主要是那些属于业务模型本身、并且不应该由 UI 直接持有可变引用的状态。

在 `Sudoku` 内部，真实保留的是 `#grid` 和 `#givens`。`#grid` 代表当前真实盘面，`#givens` 代表初始题面，它决定哪些格子可编辑、哪些不可编辑。这两者都属于领域规则本身，不能直接暴露给 UI。

在 `Game` 内部，真实保留的是 `#sudoku`、`#undoStack` 和 `#redoStack`。`#sudoku` 是当前这一局真正持有的 `Sudoku`，`#undoStack` 和 `#redoStack` 则是会话历史的一部分。它们不只是显示信息，而是会影响业务语义和后续行为。

这些状态之所以必须留在领域对象内部，是因为它们需要维持不变量，比如 givens 不可修改、新输入后 redo 必须失效、非法输入不能污染历史；同时它们也必须通过 `guess()`、`undo()`、`redo()` 这些受控方法更新，不能让 UI 直接改内部引用。

### 如果不用你的方案，而是直接 mutate 内部对象，会出现什么问题？

如果不用 adapter，而是让 UI 直接拿到领域对象内部引用并 mutate，会出现四类问题。

第一，Svelte 不一定会正确刷新。因为 `Game` / `Sudoku` 是 class 实例，内部私有字段变化对 Svelte 3 来说不是天然可追踪的。也就是说，数据可能已经变了，但页面不一定同步更新。

第二，undo/redo 语义很容易被绕过。如果组件直接调用内部对象的方法，或者直接改内部数组，就可能跳过 `Game` 的历史管理逻辑，导致按钮状态、当前盘面、历史栈三者不一致。

第三，会破坏领域对象封装。比如固定题面不可编辑、本次输入是否合法、失败输入是否进入历史，这些本来应该由领域模型统一保证；一旦 UI 可以直接改内部对象，这些规则就可能被绕过。

第四，容易出现过期引用问题。尤其是在 `undo()` / `redo()` 之后，`Game` 内部持有的 `Sudoku` 可能已经替换了，但 UI 还在拿旧对象继续操作，这会让界面状态和真实业务状态脱节。

所以如果不使用 adapter，而是直接 mutate 内部对象，最终会得到一个“看起来有模型，但数据流并不稳定”的系统。


## 6. 领域对象变化后，Svelte 为什么会更新

领域对象变化后，Svelte 会更新，并不是因为 Svelte 直接观察到了 `Game` 或 `Sudoku` 内部私有字段的变化，而是因为中间有一个 store adapter。

真正触发界面更新的动作不是“领域对象内部值变了”，而是“adapter 把新的领域状态重新发布成了新的 store 值”。

具体过程是这样的：

1. 用户输入、撤销、重做或者使用 Hint。
2. 组件调用 adapter 暴露的方法。
3. adapter 调用领域对象的方法完成业务更新。
4. 领域对象更新后，adapter 重新读取当前盘面、冲突格、撤销重做状态、完成状态等信息。
5. adapter 把这些信息组装成新的 plain state。
6. adapter 调用 `state.set(newState)`。
7. Svelte 组件通过 `$store` 订阅这个状态，所以一旦 `set(...)` 发生，组件就会重新计算并重新渲染。

所以更准确地说：

- 领域对象负责“产生新的业务状态”
- adapter 负责“把这个状态发布给 Svelte”
- Svelte 响应的是 store 的发布行为



## 7. 改进说明

### 相比 HW1，你改进了什么？

相比 HW1，我主要做了五个方面的改进。

第一，我把 `givens` 纳入了 `Sudoku`，让领域模型真正表达“固定题面不可编辑”。

第二，我修复了 `Game.getSudoku()` 暴露内部可变对象的问题，避免 UI 绕过 `Game` 的历史管理直接修改 `Sudoku`。

第三，我改进了 `Game.guess()` 的状态迁移方式，改成先在副本上执行，再提交结果，避免失败输入污染 undo 历史。

第四，我加强了序列化协议，不只序列化当前盘面，还能恢复 givens 和历史，使 round-trip 更完整。

第五，也是最关键的一点，我增加了 adapter，把领域对象真正接入了 Svelte 页面流程，而不是只在测试里可用。

### 为什么 HW1 中的做法不足以支撑真实接入？

HW1 最大的问题不是“有没有写出 `Sudoku` / `Game`”，而是“它们还没有成为真实页面的数据流中心”。

首先，HW1 的领域对象和真实页面流程是分离的。测试里看起来可以通过工厂函数创建并调用对象，但真实页面主要还是依赖旧的 store 和二维数组，所以模型存在不等于系统真的在用它。

其次，HW1 缺少一个面向 Svelte 的桥接层。Svelte 最适合消费的是 store 和 plain state，而不是直接消费 class 的内部状态。没有 adapter，领域对象变化就很难稳定地转换成 UI 可订阅状态。

再次，HW1 里 `Game.getSudoku()` 直接暴露真实对象，这对真实前端很危险。组件一旦直接持有内部对象，就可能绕过 `Game` 的历史管理，也可能在 `undo()` / `redo()` 后继续拿旧对象做操作。

另外，HW1 中领域对象的变化不会自然变成 Svelte 的响应式更新。Svelte 3 不会自动感知 class 私有字段变化，因此即使模型变了，页面也不一定跟着变。

最后，HW1 的领域边界还不够强。比如固定题面保护、失败输入与历史的关系、序列化恢复约束，都还没有强到足以支持真实页面中的连续交互。一旦接到真实界面里，这些问题会被放大成明显的交互错误。

###  你的新设计有哪些 trade-off？

这个设计的主要优点是：

- 领域边界更清楚
- UI 和业务逻辑分离更明显
- 响应式行为更容易推理
- 更适合以后继续扩展提示、自动保存等能力

对应的代价是：

- 增加了一层 adapter，结构比“直接改数组”更复杂
- 每次更新都要重新发布一份 plain state
- `getSudoku()` 返回 clone，读取时会有少量额外复制成本

不过对 9x9 数独来说，这些成本很小，换来的是更稳定的封装和更清晰的响应式边界。
## 8. 当前实现中最稳定和最可能变化的层

如果以后迁移到 Svelte 5：

- 最稳定的层是 `src/domain/*`
- 最可能变化的是 store adapter

因为领域规则和 undo/redo 语义与框架无关，而 adapter 是专门为当前 Svelte 3 store 机制服务的桥接层。
