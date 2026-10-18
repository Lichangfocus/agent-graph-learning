# 00 · 变更单

> 当前：v0.1 工程目录 + 引擎合并（CR-20261018-01）在分支 `cloud/grok/TASK-001-merge-engine`，状态 ⑥ 待 focus review（PR 未合入）。

你口述的每一个修改点都先在这里登记成一张变更单，然后按固定顺序推进。这里是**唯一的进度台账**。流程说明见 [README](../README.md#flow) 与 [AGENTS.md](../AGENTS.md)。

## 怎么登记

- 口述修改点时，Agent 先把原话摘要登记为新的一行（状态 ①）；一次口述多个独立修改就拆成多行。
- 较大的修改在本目录新建 `CR-YYYYMMDD-NN.md`；编号同一天从 01 递增。
- 「所有者」列：`local`（focus 的 Mac）/ `cloud/grok` / `cloud/opencode` / `cloud/codex`；一张 CR 只属于一边。
- 台账只追加自己的行，合并冲突时「两边都保留」。

## 状态

| 状态 | 含义 | 谁推进 |
|---|---|---|
| ① 待改方案 | 已登记，细化成完整产品逻辑（含异常、边界、细节），改功能清单／方案 | Agent |
| ② 待产品确认 | 功能清单已改，附确认清单（Q1、Q2…），等 focus 逐条确认 | **focus** |
| ③ 写 spec | 已确认，读代码后按最小变更写 `03-spec/变更/CR-*.md` | Agent |
| ④ 开发中 | 按 spec 开发，分支 `local/…` 或 `cloud/<worker>/…` | Agent |
| ⑤ 单元测试 | `npm test` + `npm run check` 全绿，记录到 `05-测试/单元测试.md §6` | Agent |
| ⑤.5 体验验证 | 界面类改动：脚本截图 → AI 判定建议 → 修 → 重跑（≤3 轮）；纯后端/文档注明「不适用」 | Agent |
| ⑥ 待人工 review | PR 已开，等 focus 看 demo / 本地验收 MV 项并合入 main | **focus** |
| ⑦ 已完成 | 合入 main；功能清单「实现」列更新，记入 `06-迭代管理` | Agent |
| ✂️ 已撤销 | 不做了，保留记录 | — |

| 编号 | 修改点（原话摘要） | 所有者 | 预计改动目录 | 状态 | 方案／功能清单 | spec | 分支 / PR | 测试记录 | 迭代 |
|---|---|---|---|---|---|---|---|---|---|
| CR-20261018-01 | 「把我的项目建起来…分两部分：底层框架 / 我的数据」；按方案 A 把 agent-graph-learning 演进成框架仓库、吸收 scholar-engine，新建私有 learn-data；按独立开发者研发规范建第一版工程目录 | cloud/grok | 全仓（新增 00–06、apps/、engine/、atlas/、examples/、tests/、demo/；`maps/` `my/` `.claude/` 原样不动） | ⑥ 待人工 review | 01-产品方案/产品设计-v0.3.md（focus 已确认方案 A）；02-功能清单 F-01…F-12 | [CR-20261018-01](../03-spec/变更/CR-20261018-01-M0工程与引擎合并.md) | `cloud/grok/TASK-001-merge-engine` | 单元测试 §6 2026-10-18 | M0 |
