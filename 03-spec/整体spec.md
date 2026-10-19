# 03 · 整体 spec（v0.2，2026-10-18；v0.2 改动见 CR-20261018-02/03/04；课见 CR-20261019-01）

> 依据：[产品设计 v0.3](../01-产品方案/产品设计-v0.3.md)、[功能清单](../02-功能清单/产品功能清单.md)。代码权威位置见 [04-开发/README.md](../04-开发/README.md)。

## 1. 两个仓库、两台机器

```text
~/code/learn/                       （Mac）   /workspace/            （box）
├── agent-graph-learning/  公开 · 框架 + Atlas（MIT / CC BY-SA 4.0）
└── learn-data/            私有 · 个人数据包（learn.userpack.v1）
```

- 框架改动：`local/TASK-NNN-*` 或 `cloud/<worker>/TASK-NNN-*` 分支 → PR → 只有 focus Squash 合入 `main`。
- 数据仓库：允许直接推 `main`，推前 `git pull --rebase`；日志按设备分文件只追加，几乎不冲突。

## 2. 数据模型（`engine/lib/schemas/atlas.ts`）

### 2.1 Atlas：`atlas/world-map.json`

| 字段 | 规则 |
|---|---|
| `schema` | 固定 `learn.atlas.v1`；`version` semver；`license` = `CC BY-SA 4.0` |
| `domains[]` | `{id, name, icon?, color?}`，10 个（`d-nat` `d-life` `d-math` `d-eng` `d-soc` `d-hist` `d-phil` `d-arts` `d-lang` `d-ai`） |
| `topics[]` | `{id, domain, name, desc?, members[{id,x?,y?}]}`——topic 是视角，成员只引用节点 |
| `nodes[]` | `{id, kind: concept/event/era, name, summary, status: stub/draft/ready, domain, topics[], icon?, time?{ya:[早,晚], mark, label}, data?, quiz?[{q, options, answer, explain}], sources?[{title, url?, note?}]}` |
| `edges[]` | `{id, src, dst, kind, note, claim_type, sources?}`，两端都是节点；kind ∈ prereq / belongs / causes / leads_to / contrast / related / parallel；claim_type ∈ 事实 / 学界共识 / 主流解释 / 有争议 / AI推断 / 个人判断（只用于覆盖层的自建连线）。未核实一律 AI推断；改成其他类型必须写 `sources`（TASK-005） |

构建：`npm run atlas:build` 由 `atlas/src/skeleton.yaml`（领域 / topic / stub 节点 / 节点间的边）+ `history-stages.json`（11 次大变革，含 `sources`）+ `history-quiz.json` 生成；测试保证提交的 JSON 与重新构建结果一致（不手改 JSON）。v0.2 的真源由 `engine/atlas/import-v3.ts` 从 scholar-engine world-map v3 一次性导入（快照在 `atlas/src/external/`），之后直接编辑 `atlas/src/`；事实核查记录在 `atlas/src/fact-check.md`。外部构建仍可 `--from <file>` 合并同 id 节点的自测题与新节点/边。

**v3 → Atlas 映射**：id 原样保留；v3 的 80 条 `belongs`（节点→topic 47、topic→领域 33）变成 `node.topics` / `topic.domain`，不再是边；58 条节点间的边保留 id；去掉与个人课表绑定的 `weeks`。

**视图**（`engine/lib/world-view.ts::toWorldView`）：星图模板读的是与 v3 同形的视图——`home_topic = topics[0]`、`data.*` 平铺、`mech`/`interp` 转对象、`belongs` 边从归属关系还原（所以星图上仍是「47 节点 / 138+ 条线」）。

**迁移**：改 id 时写 `atlas/migrations/<from>-to-<to>.json`；`loadUserPack` 按 `pack.json.atlas_version` 在内存里改写数据包里的引用（文件不改、日志仍只追加）。v0.1.0 → v0.2.0 有 38 个改名。

语义校验（`validateAtlasGraph`）：id 全局唯一；topic/领域/成员引用存在；边两端存在、无自环；prereq 无环；ready 节点 ≥3 题（警告）；孤立节点（警告）。

### 2.2 用户数据包：`learn-data/`

| 路径 | 内容 | 写入 |
|---|---|---|
| `pack.json` | `{schema: learn.userpack.v1, owner, atlas_version, engine_version}` | 手动 |
| `profile/learner-profile.{yaml,md}` | 学习者画像，所有转译读取 | 手动 / 学者 |
| `log/<device>.jsonl` | 学习日志 `{ts(带时区), device?, node?, action, payload?}`，只追加；`npm run dev` 下星图经 `/api/events/` 直接写 `log/<LEARN_DEVICE 或主机名>.jsonl`；离线 HTML 导出后 `npm run log:import` 写 `log/browser.jsonl` | 框架 |
| `overlay/nodes.jsonl` `overlay/edges.jsonl` | 自建节点 / 边，id 以 `u-` 开头 | 框架 / 手动 |
| `topics/<id>.json` | 自建 topic（id 以 `u-` 开头） | 框架 / 手动 |
| `lessons/<id>.json` | 课（`learn.lesson.v1`，`engine/lib/schemas/lesson.ts`）：课前说明、分章场景（每条带主张标签 + 来源引用）、章末互动、自测、感想、结束语；读包时变成 kind=lesson 的自建节点挂到 topic 上（CR-20261019-01）。同名 `.md` 是给人看的大纲与核查记录 | 学者 |
| `annotations/<device>.jsonl` | 批注（要改 / 有疑问 / 认可 / 补资料） | 框架 |
| `units-private/<id>/` | `source.md` + `public/`（作品图）+ `video/` | 学者 |
| `curriculum/` | 课程图 `graph.yaml`、课表 `course*.md` | 学者 / focus |
| `builds/` | 用个人数据构建的离线 HTML | `npm run demo` / `preview:build` |

### 2.3 路径解析（`engine/lib/paths.ts`）

- `REPO_ROOT`：向上找同时有 `atlas/` 与 `package.json` 的目录（可用 `LEARN_REPO_ROOT` 覆盖）。
- `dataDir()`：`LEARN_DATA_DIR`（相对 `REPO_ROOT` 解析）；未设置 → `examples/demo-pack`。
- 单元来源：公开 `units/` + `<data>/units-private/`（同 id 公开优先）；素材：公开在 `apps/web/public/assets/units/<id>`，私人在 `<data>/units-private/<id>/public`。

### 2.4 覆盖层合并（`engine/lib/overlay.ts::mergeOverlay`）

1. 只引用、不改写：用户条目与 Atlas 同 id → 丢弃 + 报错；Atlas 对象不被修改。
2. 用户 topic 是视角：成员必须存在；成员节点的 `topics` 追加该 topic，节点不复制。
3. 用户节点：领域与 topic 必须存在，否则丢弃 + 报错；其声明的 topic 的 `members` 自动包含它。
4. 用户边：两端必须存在（Atlas 或用户节点）；合并后整体再跑一遍语义校验（如用户 prereq 成环 → 报错）。

### 2.4.1 课的状态（`engine/lib/lesson.ts::lessonStatus`，星图内同一实现）

只由日志推算：有 `done` 事件 → 已完成；quiz 全对（≥3 题）或 lit → 已点亮·待完成；有任何事件 → 进行中（`play{chapter, progress:1}` 记已学完的章，`play{interaction}` 记做过的互动）；否则未开始。感想是 `note{kind:"takeaway", text}`。`done` 只在学习者输入「完成」时写（星图里要求先点亮）；在对话里回复「完成」时，由学者用 `npm run log -- <课 id> done '{"reply":"完成","via":"chat"}'` 记一条。

### 2.5 掌握度（`engine/lib/mastery.ts::masteryFromLog`，星图内同一实现）

| 等级 | 条件（按时间顺序扫描日志，等级只升不降） |
|---|---|
| seen | open / note / ask，或 play 进度 < 0.5 |
| learning | play 进度 ≥ 0.5，或答题未全对 |
| lit | `lit` 事件，或 quiz `correct === total` 且 `total ≥ 3` |
| mastered | lit 之后 ≥ `minReviewDays`（默认 1）天，`review` 且 `passed: true` |
| locked | 以上都没有，且存在未 lit 的 prereq 前置（软锁，仍可打开） |
| null | 未接触、无前置限制（显示「未开始」） |

界面只显示「已点亮 X / 共 Y」，不显示百分比。

## 3. 构建产物

| 命令 | 无 `LEARN_DATA_DIR`（示例包） | 有 `LEARN_DATA_DIR` |
|---|---|---|
| `npm run demo` | `demo/`（可提交、可公开） | `<data>/builds/` |
| `npm run preview:build` | `demo/preview/` | `<data>/builds/preview/` |
| `npm run explain` | `units-explain/` → `demo/explain/` | `<data>/units-explain/` → `<data>/builds/explain/` |
| `npm run dev` / `build` | Next 读示例包；`/` 是星图主视图（`/atlas-map.html`），单元列表在 `/units/` | Next 读数据包；私人素材经 `data:link` 符号链接（写进 `.git/info/exclude`）；dev 下星图事件写回 `log/` |

单文件 HTML 约束：无外部字体 / 脚本 / 图片 / fetch / ES 模块；JSON 注入只替换占位符一次并把 `<` 转义为 `\u003c`；用户内容一律转义。唯一例外：`renderAtlasMap(..., {endpoint})` 只在 dev 路由里把写回代码注入 `/*__WRITER__*/`，离线构建不含任何网络代码（测试检查）。

### 3.1 dev 写回（CR-20261018-03）

| 接口 | 行为 |
|---|---|
| `GET /api/events/` | `{writable, device, file}`；没设 `LEARN_DATA_DIR` 时 `writable:false`（示例包只读） |
| `POST /api/events/` `{events:[…]}` | 每条用 `LogEventSchema` 校验；客户端的 `device` 一律忽略，用服务端设备名；按 `ts|node|action` 去重；一次最多 500 条（413）；没设数据包 409；跨域 Origin 403 |

路由文件是 `apps/web/app/api/events/route.dev.ts`：`.dev.ts` 只在 `next dev` 的 `pageExtensions` 里，静态导出不含 api；dev 下不设 `output: export`（Next 在 export 模式下连 dev 也拒绝 POST 路由）。星图写回失败时事件留在 localStorage，下次打开重试。

### 3.2 浏览器导出 / 导入

星图「导出」= `browser-YYYYMMDD.jsonl`（每行一条 LogEvent，只含本机未写回的事件）+ `learn.export.v1` JSON（日志 + 自建 topic + 自建连线）。`npm run log:import -- <file…> [--device browser]` 接受 `.jsonl` / `learn.export.v1` / 旧版 `scholar.map.user.v1`：日志去重追加，topic 写 `topics/`，连线写 `overlay/edges.jsonl`。

## 4. 隐私

- 框架仓库不得跟踪：`profile/ log/ units-private/ annotations/ overlay/ revisions/ lessons/` 路径（`examples/demo-pack/`、`历史/` 例外）、`course-q4-2026.md` 等个人课表、`.env*`、任何符号链接 → `npm run check:privacy`（在 `npm run check` 里）。
- 公开 CI 不读私人数据；依赖私人单元的测试在没有 `LEARN_DATA_DIR` 时自动跳过并写明原因。

## 5. 执行优先级（focus 2026-10-18 定）

开发 / 起草类执行：OpenCode（注意性价比）→ Codex → Grok Bot 自己。`npm run explain` 已按此顺序回退。
