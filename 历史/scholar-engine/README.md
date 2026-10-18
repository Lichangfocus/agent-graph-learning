# 知识转译引擎（Personal Learning OS · 预览）

把课程与资料持续收集并按「学习者画像」转译成最容易吸收的内容：中文解说视频（目前有字幕、旁白待接入）+ 交互网页（滚动叙事、对比滑块、热点标注、时间轴、预测-揭示问答）。本仓目前提供渲染与管线，未来将作为 Electron 桌面应用中的「渲染器」运行（参见 `docs/PRODUCT.md` → 产品方向 / 产品方案）。

## 目录结构

- `profile/` 学习者画像（占位）：`learner-profile.yaml`（结构化）、`learner-profile.md`（自然语言）。转换/渲染必须读取。
- `units/<id>/source.md` 单元源（规范化 Markdown）：
  - Frontmatter：`id`、`title`、`module`、`sources`、`estTime`
  - Sections（标题英文固定）：Hook Question、Core Narrative、Key Concepts（YAML）、Artworks（YAML）、Video Storyboard（YAML）、Interactive Components（YAML）、Check Yourself（YAML）、Link to AI & Future Human Life
- `src/lib/schemas/unit.ts` Zod 模型；`schema/unit.schema.json` 对应 JSON Schema 生成产物
- `pipeline/` 可插拔脚本与 Prompt 模板（无需 API Key）：
  - `validate-units.ts` 校验所有单元
  - `download-assets.ts` 下载 `Artworks` 图片到 `public/assets/units/<id>/artworks/`
  - `build-exports.ts` 导出 `public/units.json`、`public/units-md/<id>.md`、站点根 `llms.txt`
  - `render-video.ts` 读取 Storyboard 以 ffmpeg 生成 `public/videos/<id>.mp4` 与字幕 `.srt`（默认静音+字幕，TTS 可后续接入）
  - `prompts/*.md` 转换提示模板（原文 -> source.md、画像->写作指南、单元->视频）
- `app/` Next.js App Router 页面：`/` 课程索引、`/units/[id]` 单元页（滚动叙事）
- `components/interactive/` 交互组件：对比滑块、缩放标注、时间轴、预测-揭示
- `public/` 静态资源与机器可读导出

## 快速开始

1) 安装依赖（已包含于脚手架）  
2) 运行开发服务器（非常规端口，减少冲突）：

```bash
npm run dev
# 打开 http://localhost:43123
```

3) 生成演示资源：

```bash
# 校验 + 下载素材 + 导出 JSON/llms.txt
npm run units:validate
npm run assets:download
npm run exports:build

# 渲染演示视频（ffmpeg 已预装；若不可用则仅输出 .srt 并给出说明）
npm run video:render -- demo-hokusai
```

## 预览 / Preview

```bash
npm run preview:build
```

双击 `out-preview/index.html` 即可通过 `file://` 打开，无需启动服务器。它读取并校验课程图、学习者画像和所有 `units/<id>/source.md`，展示知识地图、概念与原典转述、作品、交互实验、自测与点亮。图片通过本地 ffmpeg 压缩并内嵌；已有视频复制到 HTML 同目录（分发时一起保留）。构建需要图片已下载，可先运行 `npm run assets:download`。

学习进度保存在 `scholar-engine:progress:v1`，支持 JSON 导入／导出；“问 AI”复制带学习背景的追问提示词。正文段落、概念和题目旁可添加四类批注（要改／有疑问／认可／补资料），保存于 `scholar-engine:notes:v1`。“导出修订简报”生成按单元和源路径锚点分组的 Markdown，可交给代理修订 `source.md`。不同浏览器或文件路径的本地存储可能独立，迁移时请导出记录。

`out-preview/index.html`、视频和 PNG 截图可纳入版本管理；`out-preview/.cache/` 仅存压缩缓存，已忽略。预览模板位于 `pipeline/preview/`，不使用外部字体、脚本或运行时网络请求。

## 添加一个新单元

1) 在 `units/<your-id>/source.md` 按示例与 Schema 填写（强烈建议复制 `units/demo-hokusai/source.md` 作为模板）。  
2) 运行：

```bash
npm run units:validate
npm run assets:download
npm run exports:build
npm run video:render -- <your-id>   # 可选；无 ffmpeg 时将只生成字幕
```

3) 打开 `http://localhost:43123/units/<your-id>` 检查交互效果；视频会在页面“课程视频”区域自动加载（若存在）。

## 交互组件（最少集）

- 对比滑块（ImageCompare）：两幅图的滑动对比
- 缩放/标注（ZoomAnnotate）：热点提示 + 缩放/拖拽
- 互动时间轴（Timeline）
- 预测—揭示（PredictReveal）

均由 `Interactive Components` 段的 YAML 配置驱动。

## 机器可读导出（AI 读者）

- `public/units.json`：全站单元 JSON（遵循 `schema/unit.schema.json`）
- `public/units-md/<id>.md`：每单元紧凑版 Markdown 导出
- `public/llms.txt`：入口清单与使用说明

## TTS 与视频渲染

- 默认无密钥环境：静音 MP4 + `.srt` 字幕（`render-video.ts`，基于 ffmpeg）
- 可插拔 TTS：未来可接入本地 eSpeakNG、Coqui TTS 或云端服务（保留占位，未强制）
- Remotion/Manim：亦可替换/并行作为视频后端（建议后续 PR）

## 学习者画像（占位）

真实的 `profile/learner-profile.yaml` 与 `.md` 将由你后续提供。所有转换与渲染均应尊重：
- 语言与难度
- 偏好的类比类型
- 已具备的先验知识
- 避免项（敏感或挫败因素）

## 开发脚本

```bash
npm run schema:gen     # 由 zod 生成 JSON Schema
npm run units:validate # 校验所有单元
npm run assets:download# 下载 Artworks
npm run exports:build  # 生成 JSON/llms.txt/MD 导出
npm run video:render -- <id> # 渲染视频（静音+字幕）
```

## 许可与素材

演示素材来自 Wikimedia Commons 等公共领域/开放许可来源。请在添加新单元时，确保 `license` 字段准确，并遵循相应再利用规范。***

## 速讲快速通道（npm run explain）

```bash
npm run explain -- https://example.com/article     # URL
npm run explain -- notes/某文章.md                   # 本地 .md/.txt
npm run explain -- "什么是边际效用？"                 # 问题
npm run explain -- --build <slug>                    # 手填/修改 source.md 后只校验+重建
# 选项：--slug <s>  --force（重新起草）  --no-llm  --model <m>（默认 gpt-6.1-sol，或 EXPLAIN_MODEL）
```

流程：取材 → `units-explain/<slug>/input.md` → 起草 `units-explain/<slug>/source.md` → 校验（`src/lib/schemas/explain.ts`）→ `out-explain/<slug>.html`（单文件、离线、中文、可点选自测）。

- 起草：若 `codex` 已登录（或有 `OPENAI_API_KEY`），自动 `codex exec -m gpt-6.1-sol -c model_reasoning_effort=high`。
- **无 LLM 时（退出码 2）**：脚本写出 `pipeline/prompts/explain-<slug>.md`（完整提示词+原文）和 `units-explain/<slug>/source.template.md`（骨架）。代理读提示词、写 `source.md`，再跑 `npm run explain -- --build <slug>`。
- 速讲单元放在 `units-explain/`（不是 `units/`）：正式单元要求艺术品图片与分镜，放进 `units/` 会让 `units:validate` / `preview:build` 失败。成熟后可升级为正式单元。
- 方法与给其他 bot 的技能见 `docs/skill-tongsu-jiangjie.md`。
