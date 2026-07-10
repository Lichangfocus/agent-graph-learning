# ReLearn · 重构学习方式

> 用 agent 重构学生的学习方式：让任何知识跨学科、跨语言地被重新组织，让人真正理解，像多邻国一样愉快地学习。

## 初衷

教科书有两个天生的局限：

1. **按年级编排**，但更重要的是**知识之间的理解关系**——学会 B 之前必须真正懂 A；
2. **按学科切分**，但一件事的本质往往要**跨学科**才能看见——"找规律"同时属于科学、数学和侦探。

ReLearn 把学习内容重构成**先修关系驱动的知识地图**：知识点是图上的星星，点亮先修才能解锁下一颗；每个知识点是一张 3-5 屏的图文卡（生活钩子 → 动手实验 → 掌握确认），全程像探险游戏。内容由 agent 按学习者的年龄、语言、已有基础实时重构——同一个概念，讲给 6 岁孩子和成人的方式不同，但底下的理解结构是同一张图。

## 这个仓库里有什么

```
.claude/skills/learn-map/     核心 skill：主题 → 知识地图站点的完整生成管线
  ├── SKILL.md                五步管线 + 构图规则 + 易学性内容规范
  ├── scripts/validate_graph.py   图谱校验器（环/方向/冗余/quiz 完整性）
  └── assets/template.html    站点模板（自动布局/解锁逻辑/本地进度持久化）
maps/                         已生成的知识地图（每张是一个自包含的单文件站点）
  └── sound-journey/          示例：声音之旅（改编自 Marble 开源图谱）
prompts/workbuddy.md          给任何 Claude Code / agent 环境的使用指令
docs/feasibility.md           可行性实验：AI 构图 vs 专家标注的盲测结果
```

## 怎么用：一句话开始

把下面这行发给你的 AI agent（Claude Code、workbuddy 或任何能联网执行的 agent），剩下的交给它——它会自动安装 skill，然后引导你选主题、生成你的第一张知识地图：

```
请获取 https://raw.githubusercontent.com/Lichangfocus/relearn/main/INSTALL.md 并严格按其中步骤执行
```

其他方式：

- **克隆使用（Claude Code）**：克隆本仓库并在仓库目录打开 Claude Code，直接说"我想学 光合作用，给 8 岁孩子"，skill 自动触发完整管线，产出 `maps/<主题>/index.html`。
- **生成并在线发布**：把 [prompts/workbuddy.md](prompts/workbuddy.md) 整段发给你的 agent，产出会 push 到本仓库并获得 Pages 在线地址。

**在线访问**：仓库开启了 GitHub Pages，`maps/` 下的每张地图都有在线地址：
`https://lichangfocus.github.io/relearn/maps/<主题>/`
（示例：[声音之旅](https://lichangfocus.github.io/relearn/maps/sound-journey/)）

**进度持久化**：学习进度保存在浏览器 localStorage（按地图隔离），站点内"学习档案"支持导出/导入进度文件，换设备可迁移。卡片上的"问 AI"按钮会复制一句带完整上下文的提问（年龄 + 当前知识点 + 已学清单），粘贴给任何 AI 就能继续追问——图谱既是教材也是 agent 的上下文。

## 为什么相信这条路能走通

**同类开源项目的论证**：[oseducation/knowledge-graph](https://github.com/oseducation/knowledge-graph) 验证了"微小知识点 + 先修边"的产品模型；[adaptive-knowledge-graph](https://github.com/MysterionRise/adaptive-knowledge-graph) 验证了"图谱 + LLM 家教 + 掌握度追踪"的架构；[zoonk](https://github.com/zoonk/zoonk) 验证了"AI 把任意主题变成结构化课程"的方向。但它们要么靠人工填图谱（填不动），要么生成的是线性课程（不是理解结构）——**图驱动 + AI 生成 + 自动校验**的组合是本项目的差异点。

**可行性盲测**（详见 [docs/feasibility.md](docs/feasibility.md)）：拿专家人工标注的 [Marble os-taxonomy](https://github.com/withmarbleapp/os-taxonomy) 图谱（1590 知识点 / 3221 先修边）做标准答案，让 AI 只看知识点列表盲推先修关系——**决定解锁顺序的硬先修边找回约 80%，方向错误率仅 3-6%，且集中在专家之间也会争论的边上**。配合本仓库的校验器（环检测、年龄反向、传递冗余）和交叉审查，生成质量足以支撑产品。产品设计也吸收了残余误差：只有硬边锁内容，软边只影响顺序——错一条软边的代价接近于零。

## 架构（三层，可独立演化）

1. **内容生产层**（build-time）：对焦 → 检索复用 → 生成补缺 → 自动校验 → 人工裁决。今天就跑在 Claude Code 上。
2. **图谱数据层**（真正的资产）：知识点 + 掌握证据 + 硬/软/跨域先修边 + 学习者掌握状态。schema 见 SKILL.md。
3. **学习运行时**：探险地图站点（展示层）+ 讲解 agent（learn-time，用图谱做上下文的实时延展）。

## 致谢与许可

- 本仓库代码采用 [MIT License](LICENSE)。
- 示例地图的知识结构改编自 [Marble os-taxonomy](https://github.com/withmarbleapp/os-taxonomy)（数据库 ODbL 1.0 / 内容 CC BY-SA 4.0），在此致谢。凡复用其数据生成的地图，请保留此致谢。
