# con-oo-kukudeboy - Review

## Review 结论

代码已经完成了基本的真实接入：开局、渲染、输入、撤销重做和胜利判定都能通过一个 Svelte store adapter 回到 `Game`/`Sudoku`。但设计质量还没有到很稳的程度，主要问题集中在领域不变量不够严、历史语义会被无效操作污染，以及 adapter 仍保留了部分影子状态和业务逻辑，导致领域层还不是唯一、完整的业务中心。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | good |
| JS Convention | good |
| Sudoku Business | fair |
| OOD | fair |

## 缺点

### 1. Sudoku 没有守住 givens 与当前 grid 的核心不变量

- 严重程度：core
- 位置：src/domain/Sudoku.js:37-44; src/domain/index.js:27-30
- 原因：构造器只分别校验了 `grid` 和 `givens` 的形状与取值范围，但没有校验 `givens` 中非 0 的格子必须与当前 `grid` 一致。这样可以构造出“固定题面与当前盘面互相矛盾”的非法对象，领域模型本身无法阻止不可能状态。

### 2. Game.guess 会为无效变更写入历史，真实界面的 Undo/Redo 语义会被污染

- 严重程度：core
- 位置：src/domain/Game.js:60-68; src/components/Controls/Keyboard.svelte:13-19
- 原因：`Game.guess` 在写入前没有比较前后盘面，只要被调用就会 push 一份快照。`Keyboard.svelte` 的 notes 模式每次都会执行 `userGrid.set($cursor, 0)`，即使该格本来就是 0，也会产生一条撤销记录。这样 Undo/Redo 会回放“没有改动盘面”的伪操作，不符合数独游戏对历史的直觉。

### 3. 历史只存 raw grid，使 Game 反向依赖 Sudoku 的内部表示

- 严重程度：major
- 位置：src/domain/Game.js:30-45; src/domain/Game.js:78-99
- 原因：Undo/Redo 栈只保存 `number[][]`，恢复时再手工 `new Sudoku(...)` 并额外传入 `givens`。当前虽然能工作，但这让 `Game` 必须知道 `Sudoku` 的构造细节，而不是把快照/恢复封装在 `Sudoku` 自身；一旦 `Sudoku` 将来增加更多领域状态，现有历史机制就会静默丢失这些状态。

### 4. Svelte 适配层维护了 puzzleGrid 的影子状态，领域对象没有成为唯一事实来源

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/grid.js:49-62; src/node_modules/@sudoku/stores/grid.js:82-100; src/node_modules/@sudoku/stores/grid.js:126-127
- 原因：adapter 内部同时持有 `game` 和独立的 `puzzleGrid` 副本；渲染题面与分享编码都读这个外部副本，而不是统一从 `Sudoku` 的 `givens` 或序列化结果导出。这样 view-model 对领域对象的理解过深，状态边界变散，后续一旦题面表示发生变化，adapter 与领域层更容易失步。

### 5. Hint 业务放在适配层，并且基于当前 userGrid 求解而不是基于题目真解

- 严重程度：major
- 位置：src/node_modules/@sudoku/stores/grid.js:158-170
- 原因：`applyHint` 直接对当前玩家盘面调用 `solveSudoku(...)`，再把结果写回 `Game`。这样 hint 的正确性依赖于外部 solver 对“当前盘面可能已冲突/已填错”的处理方式，而 `Game`/`Sudoku` 本身并不掌握这个业务规则。从建模上看，核心游戏规则仍有一部分留在领域层外。

## 优点

### 1. Sudoku 对盘面与 givens 做了封装防御

- 位置：src/domain/Sudoku.js:27-60
- 原因：使用私有字段保存状态，并通过 `getGrid()`、`getGivens()` 返回深拷贝，避免 UI 或外部逻辑直接越过对象边界去 mutate 内部二维数组。

### 2. 数独规则判断集中在领域对象内部

- 位置：src/domain/Sudoku.js:96-170
- 原因：冲突检测、合法性判断和完成判定都落在 `Sudoku` 上，组件不需要自己扫描行、列、宫，职责划分明显好于把规则散落在 `.svelte` 文件中。

### 3. 通过 store adapter 把 Game 接进了真实 Svelte 流程

- 位置：src/node_modules/@sudoku/stores/grid.js:49-100; src/node_modules/@sudoku/stores/grid.js:143-195
- 原因：`domainGame` 内部持有 `Game`，并把 `userGrid`、`invalidCells`、`won`、`canUndo`、`canRedo` 这些 UI 关心的状态发布为可订阅数据；输入、开局、撤销和重做都会回到这个适配层。

### 4. 组件层基本保持了“读状态 + 发命令”的薄视图角色

- 位置：src/components/Controls/Keyboard.svelte:10-25; src/components/Controls/ActionBar/Actions.svelte:18-25; src/components/Controls/ActionBar/Actions.svelte:31-37
- 原因：键盘输入、提示、撤销、重做都调用 store/game 暴露的方法，组件本身没有重写 `guess`/`undo`/`redo` 规则，这符合 Svelte 中用 store 作为 UI 边界的惯例。

### 5. 开局与胜利流程已经接到响应式状态上

- 位置：src/components/Modal/Types/Welcome.svelte:16-24; src/App.svelte:12-31
- 原因：`Welcome.svelte` 通过 `startNew`/`startCustom` 创建新局，`App.svelte` 又订阅 `gameWon` 触发暂停和结束弹窗，说明领域状态变化已经能驱动真实界面流程。

## 补充说明

- 本次结论仅基于静态阅读 `src/domain/*`、`src/App.svelte`、`src/components/*` 以及直接承接接入职责的 `src/node_modules/@sudoku/game.js`、`src/node_modules/@sudoku/stores/{grid,game}.js`；未运行测试，也未实际操作界面。
- 关于 hint 在错误/冲突盘面下的表现，以及 notes 模式是否会产生无意义的 undo 记录，结论来自代码路径推断，未做运行验证。
- 未扩展审查无关目录，因此评价集中在领域对象本身、store adapter，以及它们被 Svelte 消费的主流程。
