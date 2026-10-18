# ADR-0001：采用 Electron + 本地 SQLite/JSON 作为应用外壳

- 状态：已接受（2026-10-06，原记录于 `docs/PRODUCT.md` v0.1，2026-10-07 原文迁移至此）
- 待议修订：存储改为「文件是真源（source.md / profile / graph），SQLite 只存学习状态、索引与任务」——见 [产品方案 §4](../product-plan.md#4-信息架构与数据模型) 与开放问题 4，focus 确认前以下原文不变。

决策：产品壳用 Electron（主进程+渲染器），本地持久化优先 SQLite，JSON 作为轻量回退。现有 Next.js 前端不改，作为 Electron 渲染器直接运行，IPC 读取/写入本地 store 与调用 FFmpeg/TTS。

动机：
- 需要离线可用、持久数据、批处理媒体（FFmpeg/TTS）、文件系统访问
- 渲染器（Next.js）已具备组件与导出能力，迁移成本最低

方案：
- 主进程：提供 IPC API：store.*（topics/units/profile/progress）、media.renderVideo、export.static
- 渲染器：复用现有页面；仅在数据加载处增加「Electron 环境分支」
- 数据模型：topics（id/title）、units（id/frontmatter/sections/status）、assets（paths/metadata）、profile（yaml+md）、progress（check/self/playedSeconds）

取舍：
- 放弃浏览器纯静态的完全无外壳形态，换取「持久化+本地任务」能力
- 保持可回退：所有渲染与导出仍可在纯 Node 环境运行

迁移影响：
- 现阶段不阻塞演示：Electron 壳在下一次迭代接入
- 代码位置：`docs/adr/0001-electron-shell.md`（本文）；产品文档见 `docs/product-direction.md`、`docs/product-plan.md`
