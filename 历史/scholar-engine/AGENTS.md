# AGENTS.md — 面向 AI 代理的扩展指南

目标：让后续 AI 代理在“低惊扰”的前提下扩展本项目，把它塑造成「知识转译引擎 / 个人学习 OS」：本地持久化、持续采集、按画像转译与渲染，最终在 Electron 壳中运行；保持静态优先、可插拔、可回退。

## 关键约束

- UI 语言：`zh-CN`
- 静态优先：尽量生成到 `public/`（JSON/MD/视频）
- 可插拔：新增后端（如 TTS、Remotion）需开关可控、无密钥可回退
- 文件命名与结构稳定，新增单元 = 新增文件夹

## 目录与职责

- `profile/`：读取并影响所有转换（不要写入）
- `units/<id>/source.md`：单元真源（解析->标准 JSON 见 `src/lib/schemas/unit.ts`）
- `pipeline/`：新增或改造脚本（保持 Node 无密钥可运行）
  - `validate-units.ts`：勿移除；校验关键信约
  - `download-assets.ts`：可替换下载器（支持 UA/重定向）
  - `build-exports.ts`：可附加更多导出（例如 RAG 切片）
  - `render-video.ts`：可切换后端（ffmpeg/Remotion/Manim），默认静音+字幕
- `components/interactive/`：新增交互组件时，保持“声明式配置 -> 组件渲染”的模式

## 如何新增交互组件

1) 在 `src/lib/schemas/unit.ts` 扩展 `InteractiveSpecSchema`  
2) 在 `components/interactive/` 新增组件（客户端组件优先）  
3) 在 `app/units/[id]/page.tsx` 引用并根据 YAML 渲染  
4) 更新 `pipeline/prompts/source_to_source_md.md` 中的结构说明  

保持最小 UI 依赖（Tailwind + shadcn/ui）。

## 集成 TTS（建议）

- 为 `render-video.ts` 增加 `--tts <engine>` 参数与接口：
  - `none`（默认）：静音 + `.srt`
  - `espeakng`：本地命令行
  - `coqui`/`kokoro` 等：需密钥时应读取环境变量并优雅失败
- 为每个 scene 生成 wav（缓存到 `.cache/tts/<hash>.wav`），再 `-i` 进 ffmpeg 并 `amix`

## LLM 调用（可选）

本仓库不内置 API Key。若要集成：
- 在 `pipeline/` 下新增 `llm/` 并约定 `LLM_PROVIDER` 环境变量
- 保证无密钥时脚本直接回退为打印提示与输出模板

## 预览 / Preview

- `npm run preview:build` 生成 `out-preview/index.html`，双击即可通过 `file://` 使用，无需本地服务。
- 使用与 Next 页面相同的 Zod 数据加载路径，读取课程图、画像和全部单元；`source.md` 保持唯一真源，正文按源文件段落顺序渲染。
- 预览包括依赖地图、原典转述、作品、交互、自测点亮、进度 JSON 导入／导出和“问 AI”。所有图片用本地 ffmpeg 压缩并内嵌；有视频才复制 MP4 到 HTML 同目录。图片缺失时先运行 `npm run assets:download`。
- 批注分要改／有疑问／认可／补资料四类，以单元和 `source.md` 条目路径为锚点，存本地；“导出修订简报”生成 Markdown，供代理逐条修订真源。
- 保持无外部字体／CDN／脚本、无 `fetch()` 或 ES 模块导入。JSON 注入只替换占位符第一次出现，转义 `</script`；用户内容始终转义后渲染。
- `out-preview/index.html`、MP4、PNG 截图可提交；只忽略 `out-preview/.cache/`。不得修改画像文件。

## 回归核查清单

- `npm run units:validate` 通过  
- `npm run preview:build` 通过，桌面与手机宽度可用，批注能导出修订简报
- 演示单元页面 `/units/demo-hokusai` 正常显示所有交互  
- `npm run exports:build` 产出 `public/units.json` 与 `public/llms.txt`  
- `npm run video:render -- demo-hokusai` 产出 `public/videos/*.mp4|.srt`（或优雅失败）  

感谢协作。保持“可读、可删、可回退”。提交前尽量拆分原子化 commit。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
