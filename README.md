# Agent 图谱学习法

**Agent Graph Learning** —— 每个人的知识地图学习框架

> 框架自带一张可公开的「全人类知识地图（Atlas）」；每个人按自己的需求在上面建图、学习、点亮节点。人类知识是同一张图，每个人的进度、反馈和演化出来的理解结构各不相同。

## 两部分：框架 + 你的数据

| 部分 | 仓库 | 放什么 |
|---|---|---|
| **框架**（本仓库，公开） | `Lichangfocus/agent-graph-learning` | 引擎（schema、校验、转译管线、渲染模板）、Next.js 应用、Atlas（CC BY-SA 4.0）、示例数据包、方法论与 skill |
| **个人数据**（私有） | 例如 `Lichangfocus/learn-data` | 学习者画像、学习日志（按设备只追加）、自建节点 / 连线 / topic、批注、私人单元、课表、用个人数据构建的离线页面 |

框架没有数据包也能跑（加载 `examples/demo-pack`）；数据包只放数据、不放代码，用 `LEARN_DATA_DIR` 指过去。

## 快速开始（Mac / Linux）

需要 Node ≥ 20（`.nvmrc`）、git、[gh](https://cli.github.com/)；生成预览和视频需要 ffmpeg（`brew install ffmpeg`）。

```bash
mkdir -p ~/code/learn && cd ~/code/learn
gh repo clone Lichangfocus/agent-graph-learning
gh repo clone Lichangfocus/learn-data          # 你的私有数据包（别人用自己的）
cd agent-graph-learning
npm i
LEARN_DATA_DIR=../learn-data npm run dev        # 本地调试：http://localhost:43123
npm test                                        # 单元测试（加 LEARN_DATA_DIR 跑含私人数据的全量）
npm run demo                                    # 离线 demo → demo/index.html（加 LEARN_DATA_DIR → ../learn-data/builds/）
```

学完同步：`git -C ../learn-data pull --rebase && git -C ../learn-data add -A && git -C ../learn-data commit -m "log: …" && git -C ../learn-data push`。

**先看 demo**：双击 [`demo/index.html`](demo/index.html) → 知识星图（10 个领域、29 个节点、对数时间轴、人类文明 11 次大变革的节点短片与 3 题自测点亮）。

## 目录

| 目录 | 放什么 |
|---|---|
| `00-变更单/` | 每个修改点从登记到完成的唯一进度台账（`CR-YYYYMMDD-NN`） |
| `01-产品方案/` | 产品设计 v0.3（权威）、ADR、调研 |
| `02-功能清单/` | 最细的产品逻辑：功能编号、规则、异常、边界、实现状态 |
| `03-spec/` | 整体 spec + 每张变更单的设计稿（需求 → 验收 → 设计 → 测试 → 任务） |
| `04-开发/` | 代码权威位置、开发与交付说明、CI 模板 |
| `05-测试/` | 单元测试说明（命令、用例、人工验证 MV-、运行记录）、体验验证、真实数据测试 |
| `06-迭代管理/` | 迭代计划 M0–M3、版本简介 |
| `历史/` | 旧稿，只读 |
| `apps/web/` | Next.js 应用（单元页、课程图） |
| `engine/` | 引擎：`lib/`（schema、Atlas、覆盖层、日志、掌握度）、`pipeline/`（CLI）、`templates/`（单文件 HTML 模板） |
| `atlas/` | 全人类知识地图（`world-map.json` + `src/` 真源 + `migrations/`） |
| `units/` `units-explain/` | 公开示例单元 |
| `examples/demo-pack/` | 示例数据包 |
| `tests/` | 单元测试 |
| `demo/` | 离线 demo（`npm run demo` 生成） |
| `maps/` `my/` `.claude/skills/` `prompts/` `docs/` | 方法论 v1：零依赖单 HTML 地图、学习中心、learn-map skill（原路径保留，在线地址不变） |
| `AGENTS.md` | Agent 工作约定 |

<a id="flow"></a>
## 修改流程

```text
① 登记（00） → ② 产品（02，focus 确认） → ③ spec（03） → ④ 开发（分支 local/… 或 cloud/<worker>/…）
  → ⑤ 单元测试（npm test + npm run check） → ⑤.5 体验验证（界面类） → ⑥ focus review（PR） → ⑦ 归档（06）
```

`main` 只经 PR、只由 focus 合入（Squash）。数据仓库允许直接推 `main`。

## 初衷（方法论 v1）

教科书有两个天生的局限：

1. **按年级编排**，但更重要的是**知识之间的理解关系**——学会 B 之前必须真正懂 A；
2. **按学科切分**，但一件事的本质往往要**跨学科**才能看见——"找规律"同时属于科学、数学和侦探。

Agent 图谱学习法，就是让 agent 做两件教科书做不到的事：

**一、重构知识的形态——双层知识结构。** 每个知识点分两层：**原始知识层（canon）**保存教科书、课标、论文里的标准术语、正式表述和真实出处（如 NGSS 1-PS4-1、CCSS 3.MD.B.3、英国国家课标 Y4.Sci.Snd.1）——它是学习的锚，保证不歪曲、可对照课内；**通俗重构层**把 canon 重构成学习者能懂的图文卡（生活钩子 → 动手实验 → 掌握确认）。学习者随时可以点卡片上的"课本上怎么说"，在通俗解释和原始表述之间自由切换——先懂，再对上学术语言。

**二、重构学习的顺序。** 不按教科书的年级和章节顺序，而按**理解关系**排序：知识点是图上的星星，点亮先修才能解锁下一颗，顺序甚至可以跨学科（声学的规律用数学的条形图画出来，"找规律"这个通用能力串起所有学科）。每张地图都必须显式声明自己与教科书顺序的差别及理由（`reorder` 字段，学习档案中可见）——顺序重构不是副作用，它就是本方法论的名字。

内容由 agent 按学习者的年龄、语言、已有基础实时重构——同一个概念，讲给 6 岁孩子和成人的方式不同，但底下的理解结构和知识出处是同一套。

## 现在就能用

官方部署已上线，账户与云同步已启用，打开即学、可跨设备续学：

- **[AI 大模型训练 · 完整教材](https://lichangfocus.github.io/agent-graph-learning/maps/ai-training/)** —— 5 章 60 个知识点，从"机器怎么学习"到"推理模型"
- **[声音之旅](https://lichangfocus.github.io/agent-graph-learning/maps/sound-journey/)** —— 面向孩子的示例
- **[我的学习中心](https://lichangfocus.github.io/agent-graph-learning/my/)** —— 登录后管理全部课程与进度

想学别的主题？把 skill 的一句话指令（见下）发给任何 agent，现生成一张新地图。

## 方法论 v1：一句话生成一张地图

把下面这行发给你的 AI agent（Claude Code、workbuddy 或任何能联网执行的 agent），剩下的交给它——它会自动安装 skill，然后引导你选主题、生成你的第一张知识地图：

```
请获取 https://raw.githubusercontent.com/Lichangfocus/agent-graph-learning/main/INSTALL.md 并严格按其中步骤执行
```

其他方式：

- **克隆使用（Claude Code）**：克隆本仓库并在仓库目录打开 Claude Code，直接说"我想学 光合作用，给 8 岁孩子"，skill 自动触发完整管线，产出 `maps/<主题>/index.html`。
- **生成并在线发布**：把 [prompts/workbuddy.md](prompts/workbuddy.md) 整段发给你的 agent，产出会 push 到本仓库并获得 Pages 在线地址。

**在线访问**：仓库开启了 GitHub Pages，`maps/` 下的每张地图都有在线地址：
`https://lichangfocus.github.io/agent-graph-learning/maps/<主题>/`
（示例：[AI 大模型训练 · 完整教材](https://lichangfocus.github.io/agent-graph-learning/maps/ai-training/) · [声音之旅](https://lichangfocus.github.io/agent-graph-learning/maps/sound-journey/)）

**账户与云同步（本仓库已启用）**：每张地图右上角有"☁️ 登录"（邮箱魔法链接，无需密码），登录后学习进度自动同步到账户，换设备也能续学；[/my/ 学习中心](https://lichangfocus.github.io/agent-graph-learning/my/) 可查看全部课程、进度、重命名与删除。数据存在 Supabase，行级安全策略保证每个用户只能读写自己的数据（已通过跨用户隔离验证）。*自己 fork 部署时*，按 [docs/account-setup.md](docs/account-setup.md) 配置约 5 分钟即可启用；不配置则一切照旧走本地存储。

**进度持久化**：学习进度保存在浏览器 localStorage（按地图隔离），站点内"学习档案"支持导出/导入进度文件，换设备可迁移；登录账户后本地与云端自动合并（取并集），不会丢进度。卡片上的"问 AI"按钮会复制一句带完整上下文的提问（年龄 + 当前知识点 + 已学清单），粘贴给任何 AI 就能继续追问——图谱既是教材也是 agent 的上下文。

## 为什么相信这条路能走通

**同类开源项目的论证**：[oseducation/knowledge-graph](https://github.com/oseducation/knowledge-graph) 验证了"微小知识点 + 先修边"的产品模型；[adaptive-knowledge-graph](https://github.com/MysterionRise/adaptive-knowledge-graph) 验证了"图谱 + LLM 家教 + 掌握度追踪"的架构；[zoonk](https://github.com/zoonk/zoonk) 验证了"AI 把任意主题变成结构化课程"的方向。但它们要么靠人工填图谱（填不动），要么生成的是线性课程（不是理解结构）——**图驱动 + AI 生成 + 自动校验**的组合是本项目的差异点。

**可行性盲测**（详见 [docs/feasibility.md](docs/feasibility.md)）：拿专家人工标注的 [Marble os-taxonomy](https://github.com/withmarbleapp/os-taxonomy) 图谱（1590 知识点 / 3221 先修边）做标准答案，让 AI 只看知识点列表盲推先修关系——**决定解锁顺序的硬先修边找回约 80%，方向错误率仅 3-6%，且集中在专家之间也会争论的边上**。配合本仓库的校验器（环检测、年龄反向、传递冗余）和交叉审查，生成质量足以支撑产品。产品设计也吸收了残余误差：只有硬边锁内容，软边只影响顺序——错一条软边的代价接近于零。

## 架构（三层，可独立演化）

1. **内容生产层**（build-time）：对焦 → 采集权威材料（教材/课标/论文）→ 构图 → 自动校验 → 双层内容生成。今天就跑在 Claude Code 上，权威源目录随每次生成累积。
2. **图谱数据层**（真正的资产）：知识点 + 掌握证据 + 硬/软/跨域先修边 + 学习者掌握状态。schema 见 SKILL.md。
3. **学习运行时**：探险地图站点（展示层）+ 讲解 agent（learn-time，用图谱做上下文的实时延展）。

## 致谢与许可

- 本仓库代码采用 [MIT License](LICENSE)；`atlas/` 下的知识地图内容采用 [CC BY-SA 4.0](atlas/LICENSE)。
- 示例地图的知识结构改编自 [Marble os-taxonomy](https://github.com/withmarbleapp/os-taxonomy)（数据库 ODbL 1.0 / 内容 CC BY-SA 4.0），在此致谢。凡复用其数据生成的地图，请保留此致谢。
