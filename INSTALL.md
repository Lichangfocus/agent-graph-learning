# Agent 图谱学习法 · 安装与新用户引导（本文件供 AI agent 直接执行）

你是一个 AI agent，用户希望通过你使用「Agent 图谱学习法」——把任何主题变成"多邻国式知识探险地图"的工具。请严格按以下三步执行。

## 第 1 步：安装 skill 到当前项目

在当前工作目录执行（curl 不可用时，用你的网页抓取能力获取同样的 URL 内容并写入对应路径）：

```bash
mkdir -p .claude/skills/learn-map/scripts .claude/skills/learn-map/assets
BASE=https://raw.githubusercontent.com/Lichangfocus/agent-graph-learning/main/.claude/skills/learn-map
curl -fsSL "$BASE/SKILL.md"                    -o .claude/skills/learn-map/SKILL.md
curl -fsSL "$BASE/scripts/validate_graph.py"   -o .claude/skills/learn-map/scripts/validate_graph.py
curl -fsSL "$BASE/assets/template.html"        -o .claude/skills/learn-map/assets/template.html
```

安装后自检：三个文件都存在且非空；`template.html` 中恰好有 1 处 `/*__DATA__*/null` 占位符。

## 第 2 步：通读 SKILL.md

完整阅读 `.claude/skills/learn-map/SKILL.md`。后续一切生成都以它为准，重点：双层知识结构（canon 原始知识层必填、出处必须真实）、五步管线（对焦→构图→校验→内容→组装）、构图规则（DAG、不做传递闭包、只有硬边锁解锁、reorder 顺序重构声明必填）、校验必须 PASS、8 条易学性内容规范、模板注入只替换第一处占位符。

## 第 3 步：新用户引导流程

按顺序进行，语气友好简短：

1. **一句话介绍**：告诉用户——"Agent 图谱学习法会把你想学的任何主题，重构成一张知识探险地图：知识点像星星，点亮先修才能解锁下一颗，每颗星是几屏通俗图文加一个小挑战，还能一键翻到'课本上怎么说'对照标准表述和出处；学习顺序按理解关系重排（不按教科书章节），进度自动保存在你的浏览器里。"
2. **对焦提问**（一次问完，有交互问答工具就用，没有就直接列出来问）：
   - 想学什么主题？（举例：光合作用 / 恐龙 / 分数 / Transformer）
   - 学习者是谁？（6-8 岁 / 8-10 岁 / 10-12 岁 / 成人入门 / 成人有基础）
   - 最想从哪个角度切入？（**根据用户给的主题**现场拟 3 个具体选项）
3. **生成第一张地图**：按 SKILL.md 管线完整执行，产出 `学习地图/<主题slug>/index.html`（自包含单文件）。
4. **交付与教学**：给出文件路径并帮用户在浏览器打开；用 3 句话教玩法——"发光的圆圈可以点开学习；答对小挑战就能点亮它、解锁下一颗星；右上角'学习档案'能看掌握证据、导出进度。卡片上的'问 AI'按钮会复制一句带上下文的提问，粘贴回来问我就行。"
5. **可选进阶**（一句话提及即可）：完整仓库在 https://github.com/Lichangfocus/agent-graph-learning ，克隆后 `maps/` 里的地图可通过 GitHub Pages 在线发布分享。

## 红线

- 校验不 PASS 不许交付；事实没把握先联网核实；不为凑数造节点。
