# 00 · 变更单

> 当前：CR-20261018-01（PR #1）与 CR-20261018-02/03/04（分支 `cloud/grok/TASK-002-atlas-merge`，叠在 TASK-001 上）都在 ⑥ 待 focus review。

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
| CR-20261018-02 | 「把 scholar-engine world-map v3（47 节点 / 138 边）映射进 Atlas 真源，0 警告合并；电影感星图 + 11 部历史短片读 Atlas，成为 demo / 应用主视图」 | cloud/grok | `atlas/` `engine/atlas/` `engine/lib/`（world-view、migrate、map-page、atlas-map）`engine/templates/atlas-map/` `engine/pipeline/atlas-build.ts` `build-demo.ts` `apps/web/app/` `demo/` `examples/demo-pack/` `tests/` | ⑥ 待人工 review | 迭代计划 TASK-002；功能清单 F-01、F-07、F-08、F-09 | [CR-02/03/04](../03-spec/变更/CR-20261018-02-03-04-M0星图主视图.md) | `cloud/grok/TASK-002-atlas-merge` | 单元测试 §6 2026-10-18 v0.2 | M0 |
| CR-20261018-03 | 「dev 应用把打开、自测结果、点亮写进 $LEARN_DATA_DIR/log/<device>.jsonl；离线 HTML 保留 localStorage + 导出，可被日志导入」 | cloud/grok | `engine/lib/log-api.ts` `log-import.ts` `userpack.ts` `engine/pipeline/log-import.ts` `log-event.ts` `apps/web/app/api/` `apps/web/next.config.ts` `tests/log-*.test.ts` | ⑥ 待人工 review | 迭代计划 TASK-006（原 TASK-003，因与同步机制分支重名改号）；F-05、F-10 | 同上 | 同上 | 同上 | M0 |
| CR-20261018-04 | 「用 WebSearch/WebFetch 对照可靠来源核查历史 11 节点与跨领域边，改错、记来源，查不到的保持 AI推断」 | cloud/grok | `atlas/src/` `engine/lib/schemas/atlas.ts`（sources） | ⑥ 待人工 review | 迭代计划 TASK-005；F-01 | [fact-check.md](../atlas/src/fact-check.md) | 同上 | 同上 | M0 |
