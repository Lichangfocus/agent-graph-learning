# Agent Graph Learning · Agent 工作约定

本仓库是**公开框架**：引擎 + 应用 + Atlas。个人数据在私有数据包（focus 的是 `../learn-data`），用 `LEARN_DATA_DIR` 指向。先读 [README.md](README.md)。

## 1. 文件关系（每类信息只有一个权威位置）

| 信息 | 权威文件 | 由谁决定 |
|---|---|---|
| 修改点与进度 | `00-变更单/README.md`（台账）；较大修改另建 `00-变更单/CR-YYYYMMDD-NN.md` | focus 口述，Agent 登记 |
| 方向、定位、阶段 | `01-产品方案/产品设计-v0.3.md` | focus 确认 |
| 功能行为与实现状态 | `02-功能清单/产品功能清单.md`（唯一一份） | 行为 focus 确认；状态 Agent 更新 |
| 开发怎么做 | `03-spec/整体spec.md`；`03-spec/变更/CR-*.md` | Agent，依据已确认的功能清单 |
| 代码位置与开发方式 | `04-开发/README.md` | Agent |
| 测试用例与结果 | `05-测试/单元测试.md` | Agent 写与跑；MV- 项由 focus 勾 |
| 迭代与已完成变更 | `06-迭代管理/迭代计划.md` | Agent，在 focus review 通过后 |
| Atlas 内容 | `atlas/src/`（真源）→ `npm run atlas:build` → `atlas/world-map.json`（不手改） | Agent 起草，focus 审 |

上游决定下游：`01 → 02 → 03 → 代码 / 05 → 06`。下游与上游不一致时改下游；真要改产品行为，退回 ①。`历史/` 只读。

## 2. 修改流程

1. **登记**：`00-变更单/README.md` 加一行（状态 ①），写所有者（`local` / `cloud/grok` / `cloud/opencode` / `cloud/codex`）与预计改动目录；一次口述多个修改 = 多张 CR。
2. **产品**：细化进 `02-功能清单`（正常链路、异常、边界、细节），列确认清单 Q1、Q2…，**停下等 focus 确认**（②）。
3. **spec**：按 `03-spec/变更/_模板.md` 写，最小变更，列出将改动的文件（③）。
4. **开发**：从最新 `origin/main` 开分支 `cloud/<worker>/TASK-NNN-主题`（Mac 为 `local/…`），只动 CR 声明的文件（④）。
5. **测试**：`npm test`、`npm run check`、`npm run typecheck`、`npm run build` 全绿，记录到 `05-测试/单元测试.md §6`（⑤）；界面类改动做 ⑤.5 体验验证。
6. **PR**：`git fetch && git rebase origin/main` → push 自己的分支 → `gh pr create --base main`；**不合入**，等 focus review（⑥）。
7. **归档**：合入后更新功能清单「实现」列与 `06-迭代管理`（⑦）。

## 3. 工程规则

- **框架 / 数据分离**：所有路径走 `engine/lib/paths.ts`；不要在代码里写 `process.cwd()/profile` 之类的路径。用个人数据构建的产物只写进 `<data>/builds/`。
- **隐私**：公开仓库禁止出现 `profile/ log/ units-private/ annotations/ overlay/ revisions/`（`examples/demo-pack/` 除外）、个人课表、`.env`、符号链接；`npm run check:privacy` 必须 PASS。带版权图片的单元只进私有数据包。
- **单文件 HTML**：无外部字体 / CDN / 脚本 / fetch / ES 模块；JSON 注入只替换占位符一次并转义 `</`；用户内容一律转义。
- **事实与解释分开**：节点内容里事实标「事实」，解释框架标作者并标「非定论」；边写 `note` 与 `claim_type`，AI 起草的边默认 `AI推断`。
- **掌握度只从日志推算**；日志只追加，按设备分文件；界面只显示个数，不显示百分比。
- **原路径保留**：`maps/ my/ .claude/ prompts/ docs/ INSTALL.md account-config.json` 是方法论 v1 与 Pages 在线地址，不移动。
- **锁文件**：`package-lock.json` 同一时间只一个分支改。
- **UI 语言** zh-CN；新增渲染后端（TTS、Remotion）必须可开关、无密钥可回退。

## 4. 执行优先级（focus 2026-10-18 定）

在电脑上做开发、上下文管理类执行时：**OpenCode（注意性价比）→ Codex → Grok Bot 自己**，任何一个不可用就换下一个。交付说明里写明用了哪个。

## 5. 双端开发速记

1. `main` 只经 PR、只由 focus 合；Squash；合并即删分支。
2. Mac 用 `local/TASK-NNN-主题`，云端用 `cloud/<worker>/TASK-NNN-主题`；一分支一主人。
3. 开工基于 `origin/main`，开 PR 前 rebase；只对自己分支 `--force-with-lease`。
4. 数据仓库 `learn-data` 允许直接推 `main`，推前 `pull --rebase`。

## 6. 体验验证速记

1. 能脚本化的用脚本；computer use 只做探索、无接口界面和写/修脚本；截图都进同一个判定。
2. 判定三层：代码断言一票否决 → AI 建议 → focus 在 ⑥ 勾最终结果。
3. 预期只来自功能清单 / spec 验收标准 / MV 预期列；不得改 check/expect/lock/禁点清单来通过。
4. 流程：④ → ⑤ → ⑤.5（采集 → 判定 → 修 → 重跑，≤ 3 轮）→ ⑥。
5. `05-测试` 两块：A 自动化（示例包，可云端，报告入 Git）；B 真实数据（learn-data，产物只进数据包）。
6. 预算：判定 ≤ $1/次，探索 ≤ 50 步/$3；禁点对外发出/支付/删除/发布。
