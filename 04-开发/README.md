# 04 · 开发

## 代码权威位置

| 位置 | 内容 |
|---|---|
| `engine/lib/` | 引擎核心：`paths.ts`（框架/数据分离唯一入口）、`schemas/`（zod：unit / graph / profile / explain / **atlas**）、`atlas.ts`（加载与语义校验）、`overlay.ts`（覆盖层合并）、`userpack.ts`（数据包读写、只追加日志）、`mastery.ts`（日志 → 掌握度）、`privacy.ts`、`atlas-map.ts`、`utils/`（单元解析、课程图、布局、测验） |
| `engine/pipeline/` | CLI：`atlas-build` `atlas-validate` `build-demo` `build-preview` `explain` `validate-units` `validate-graph` `build-exports` `build-course-index` `download-assets` `render-video` `link-data` `check-privacy` `log-event`；`prompts/` 转译提示词 |
| `engine/templates/` | 单文件 HTML 模板：`atlas-map/`（电影感星图 v0.2：星图 + 对数时间轴 + 11 部历史短片 + 自测点亮；来自 scholar-engine 的实现）、`preview/`（单元预览 + 批注） |
| `engine/atlas/import-v3.ts` | 一次性导入：scholar-engine world-map v3 → `atlas/src/`（v0.2 已导入，之后直接编辑 `atlas/src/`） |
| `engine/lib/world-view.ts` `map-page.ts` `migrate.ts` `log-api.ts` `log-import.ts` | Atlas → 星图视图；主视图渲染；id 迁移；dev 写回 API；浏览器导出导入 |
| `apps/web/app/atlas-map.html/route.ts` `app/api/events/route.dev.ts` | 星图主视图（静态导出为 `out/atlas-map.html`）；dev 专用写回接口 |
| `engine/schema/` | 生成的 JSON Schema |
| `apps/web/` | Next.js 16 应用（`next dev apps/web`）：`app/`、`components/`、`public/`；`@engine/*` 指向 `engine/` |
| `atlas/` | Atlas 内容（CC BY-SA 4.0）：`world-map.json`（构建产物，提交）、`src/`（真源）、`migrations/`、`content/` |
| `units/` `units-explain/` | 公开示例单元（公共领域 / 自写） |
| `examples/demo-pack/` | 示例数据包（虚构），未设 `LEARN_DATA_DIR` 时加载 |
| `tests/` | 单元测试（`node --test` + tsx） |
| `demo/` | `npm run demo` 生成的离线 demo（示例包，可公开） |
| `maps/` `my/` `.claude/skills/` `prompts/` `docs/` | 原 agent-graph-learning v1（零依赖单 HTML 地图、学习中心、learn-map skill），**原路径保留**，Pages 链接不断 |
| `skills/` | 给 agent 用的技能文档（通俗讲解） |

## 本地开发（Mac 与 box 相同）

```bash
mkdir -p ~/code/learn && cd ~/code/learn          # box 上是 /workspace
gh repo clone Lichangfocus/agent-graph-learning
gh repo clone Lichangfocus/learn-data
cd agent-graph-learning
nvm use || true                                   # Node >= 20（.nvmrc）
npm i
LEARN_DATA_DIR=../learn-data npm run dev          # http://localhost:43123
npm test                                          # 公开用例；加 LEARN_DATA_DIR 跑全量
npm run demo                                      # 示例包 → demo/；加 LEARN_DATA_DIR → ../learn-data/builds/
npm run check                                     # Atlas + 单元 + 课程图 + 隐私
```

其他：`npm run atlas:build`（改 `atlas/src/` 后）· `npm run log -- s1 lit --device mac`（手动记一条日志）· `LEARN_DATA_DIR=../learn-data npm run log:import -- ~/Downloads/browser-*.jsonl`（离线 HTML 导出的进度）· `npm run explain -- <URL|文件|"问题">`（起草顺序 OpenCode → Codex → 代理手填）· `npm run typecheck` · `npm run lint`。

ffmpeg：`preview:build` 压缩图片、`video:render` 需要；Mac 用 `brew install ffmpeg`。

## 分支与提交

- 按《本地 + 云端双端开发范式》：Mac `local/TASK-NNN-主题`，云端 `cloud/<worker>/TASK-NNN-主题`；一分支一主人；开 PR 前 `git fetch && git rebase origin/main`；只有 focus Squash 合入 `main`。
- 提交说明 Conventional Commits，带 TASK / CR 编号。
- `package-lock.json` 同一时间只一个分支改。

## CI

`04-开发/ci/ci.yml` 是 GitHub Actions 模板（Linux：`npm ci` → `typecheck` → `test` → `check` → `build`）。box 上 gh 令牌没有 `workflow` 权限，不能推 `.github/workflows/`；请在 Mac 上 `mkdir -p .github/workflows && git mv 04-开发/ci/ci.yml .github/workflows/ci.yml` 后提交。

## 技术现状（2026-10-18）

- 执行优先级：OpenCode → Codex → Grok Bot。本次 TASK-001 中 box 上 OpenCode 启动后无响应、Codex 未登录（401），由 Grok Bot 完成。
- 已知：电影感星图 v0.2 已是主视图（地图动画 + 东西对照 + 粒子点亮）；配音 / Remotion 在 M2。`npm run dev` 下打开、播放、自测、点亮直接写进 `learn-data/log/<设备>.jsonl`（TASK-006）。
- TASK-002/003/005：OpenCode（`aiyunrouter/claude-sonnet-5-5`，`< /dev/null`）可用，完成星图模板改造（Task A）和 dev 写回 / 导入 / 主视图（Task B）；Grok Bot 做 Atlas 映射、视图、迁移、事实核查、联调与修 bug。
