# 参考项目评审：agent-graph-learning（Agent 图谱学习法）

> 评审人：人生-学者 · 2026-10-07
> 对象：https://github.com/Lichangfocus/agent-graph-learning （本地只读克隆：`/workspace/refs/agent-graph-learning`，HEAD `ad7037d`，2026-07-10 → 07-14 共 10 个提交，28 个文件）
> 顺带看了：`Lichangfocus/agent-report`、`Lichangfocus/htmlcollab`（结论在第 6 节）
> 原则：只写仓库里真实存在的东西；“我们怎么用”是学者的判断，单独标出。

## 1. 一句话

把任意主题变成“先修关系驱动”的**知识探险地图**：知识点是星星，点亮先修才解锁下一颗；每颗星 3–5 屏图文卡 + 掌握确认题；产物是**单文件 HTML**，进度存 localStorage。核心方法论是两件事：**双层知识**（canon 原典层 + 通俗重构层）和**顺序重构**（按理解关系而不是教科书章节排序，并强制写出 `reorder` 理由）。

## 2. 仓库里实际有什么

| 部分 | 文件 | 内容 |
|---|---|---|
| 生成管线（skill） | `.claude/skills/learn-map/SKILL.md` | 六步：对焦 → 采集权威材料 → 构图（先落 canon）→ 校验（必须 PASS）→ 写图文卡（8 条易学性规范）→ 组装（模板注入）。另有“多章教材模式”和质量红线 |
| 数据契约 | SKILL.md 内的 site.json schema | 顶层 `id/title/tag/about/reorder/sources/nodes/edges`；节点 `id/icon/name/domain/age/ageStart/desc/canon{term,formal,source,textbook}/evidence[]/screens[]`；屏幕是 `{h, body(HTML)}` 或 `{quiz:{q,opts[{t,ok}],fb,hint}}`；边 `{from,to,type: hard|soft|cross}` |
| 校验器 | `scripts/validate_graph.py`（140 行） | 引用完整、自环、type 合法、**全边环检测**、至少一个起点、硬边年龄反向（抓方向写反）、**硬边传递冗余**、孤立节点、quiz 恰好 1 个正确项、canon/evidence/sources/reorder 缺失告警 |
| 站点模板 | `assets/template.html`（641 行，零依赖） | 按最长路径分层自动布局（左→右）、领域自动配色、硬边才锁、点亮动画与“新解锁了谁”、学习档案抽屉（掌握证据、reorder、sources）、**导出/导入进度 JSON**、“📖 课本上怎么说”切换、“🤖 问 AI”复制带上下文的提问、可选 Supabase 账户同步 |
| 总入口模板 | `assets/hub-template.html` | 多章教材入口，读各章 localStorage 汇总进度、标“从这里继续” |
| 权威源目录 | `references/source-registry.md` | 按领域累积“去哪找权威材料”+ 权威度层级（课标 > 教科书 > 奠基论文 > 名校讲义 > 百科）+ 每次生成必须回流 |
| 示例 | `maps/ai-training/`（5 章 60 节点 + 入口 + materials.md）、`maps/sound-journey/`（儿童示例） | 节点质量高：canon 给到教科书章节/论文，quiz 干扰项对应真实误解 |
| 学习中心 / 账户 | `my/index.html`、`account-config.json`、`docs/account-setup.md` | Supabase 邮箱+密码登录、`map_progress` 表 + RLS、跨设备合并（取并集） |
| 可行性实验 | `docs/feasibility.md` | 用 Marble os-taxonomy（专家图谱）盲测：AI 盲推硬先修边查全约 77–82%，方向反转 1/32、2/36；结论是“只让硬边锁内容、软边只影响顺序”来吸收误差 |
| 分发 | `INSTALL.md`、`prompts/workbuddy.md` | 一句话让任意 agent 安装 skill 并引导新用户；可选 push 到 GitHub Pages |

## 3. 和我们的关系：方法论几乎同源

我们的画像（`profile/learner-profile.yaml`）里已经写着这些规则，而且有证据：

| 画像规则 | agent-graph-learning 的对应实现 |
|---|---|
| `dual_layer`（原文+出处 与 白话两层，L1 已确认） | canon 层 + “课本上怎么说”按钮 |
| `dependency_order`（按理解依赖排序） | 先修边 + 分层布局 + `reorder` 声明 |
| `framework_first`（先给框架和位置） | 地图本身就是框架：先看到全图，再进单个点 |
| `recall_and_pass_questions`（复述 + 过关题） | evidence（可观察的掌握证据）+ quiz 掌握确认 |
| `no_fake_mastery`（不显示无依据的掌握度百分比） | 它只记“点亮/未点亮”，依据是题目全对——这点可以直接沿用，但**我们不显示百分比** |
| `ai_tutor_optional`（只追问不给答案） | “问 AI”按钮——我们要改成苏格拉底式追问的提示词 |

所以这不是“借一个功能”，而是把 focus 自己早先验证过的方法，合并进现在的引擎。差别在于：它的单位是“一个主题一张图、儿童到成人”，内容是 agent 一次性生成的图文卡；我们的单位是“一个季度课程、一个学习者”，内容是 `source.md` 规范源 → 视频 + 交互网页 + 机器可读导出。

## 4. 合并什么（以及放在我们架构的哪一层）

原则：**`source.md`/YAML 仍是唯一真源，渲染器只读；画像是翻译层。**借来的东西都要落在这个结构里，而不是另起一套 site.json。

1. **课程知识地图（course graph）** → 新增规范源 `course/graph.yaml`：节点 = 12 个单元（领域、核心问题、周次），边 = `hard / soft / cross` + 每条边一句 `why`（比原项目多一个字段：画像要求“讲清为什么”）。顶层写 `reorder`（我们的顺序和贡布里希式编年顺序差在哪、为什么，依据课程方案第 2 节）。边是学者起草的**教学判断（AI 推断）**，标 `status: draft`，等 focus 调。
2. **图谱校验器** → 把 `validate_graph.py` 的规则移植成 `pipeline/validate-graph.ts`（引用、自环、环、起点、硬边传递冗余、孤立节点、quiz 恰好一个正确项），接进 `npm run check`。“年龄反向”改成“周次反向”告警（硬先修排在后面的周次 = 课表顺序和依赖冲突）。
3. **地图视图** → 课程首页（Next.js）和单文件预览都加一张地图：按依赖分层自动布局、领域配色、硬边实线 / 软边虚线 / 跨域金色虚线，单元状态 = 已点亮 / 可学 / 建议先修 / 即将上线。
4. **双层知识** → `Key Concepts` 每条可选 `canon: {formal, source, textbook}`，渲染为“📖 原典怎么说”切换。U01 只填课程方案里核实过的出处；`formal` 是规范转述，页面上明说“转述，非原文引用”。
5. **掌握证据 + 过关题 + 点亮** → `source.md` 新增 `## Mastery Evidence`；`Check Yourself` 题目可带 `options`（恰好一个正确，干扰项对应真实误解）和 `hint`。点亮条件 = 过关题全对 +（可选）≤200 字复述。进度存本地，可导出/导入 JSON——这也是将来 Electron 本地存储的数据形状。
6. **“问 AI”** → 复制一句带上下文的提问：画像要点（他懂什么、偏好的类比源）+ 当前单元/概念 + 已点亮单元 + “只追问、不直接给答案”。
7. **单文件模板 + 数据注入** → 新增 `pipeline/build-preview.ts`：把课程图、单元数据、图片（压缩后 base64）注入一个 HTML，产出 `out-preview/index.html`，双击即开（focus 明确不要 Cursor 托管页面）。
8. **权威源目录** → `docs/source-registry.md`：按人文艺术领域整理课程方案第 1 节里**已核实**的课程和教材，写明“每做一个新单元，新验证的源回流到这里”。
9. **方法论提示词** → `pipeline/prompts/curriculum_to_graph.md`：把 SKILL.md 第 1–3 步（采材 → 先 canon 后连边 → 校验 PASS）改写成面向成人、读画像的版本。

## 5. 不合并什么，为什么

| 不要的 | 原因 |
|---|---|
| Supabase 账户 / 云同步 / `/my/` 学习中心 | 我们走 Electron 本地持久化；单用户、不需要账号；学习记录不出本机更符合隐私约定。数据形状（`lit` 集合 + 导出/导入）保留，换成本地存储 |
| 硬锁（未满足硬先修就点不开） | focus 是成人、按周末推进，硬锁只会挡路。改成**软提示**：“建议先学 U04”，仍可打开。原项目自己也承认 AI 连边有 3–6% 方向误差 |
| 年龄分级语言规则（6–8 岁 ≤60 字/屏 等） | 我们用画像做翻译层，不按年龄分级 |
| 儿童风格（夜空星星、大量 emoji、庆祝动画） | 保留“点亮/解锁”的反馈感，视觉收敛成我们现有的素雅风格 |
| `screens` 用 HTML 字符串写内容 | 我们的内容在 `source.md` 结构化段落里，渲染器生成 HTML；不让内容里混 HTML |
| INSTALL.md 一句话安装 / push 到 GitHub Pages | 分发场景不同；本项目不对外发布 |
| Marble os-taxonomy 复用 | 它是 K-12 数学/科学图谱，与人文艺术无关 |
| 生成 12–20 个知识点的“单图”粒度 | 我们的图分两级：课程级（单元）先做；单元内概念级以后再说（每单元只有 3–5 个概念，暂时不值得画图） |

## 6. 另外两个仓库的结论

**agent-report（Agent 汇报协作法，2 个提交，10 个文件）**——**值得借，排在下一步。**
- 真实内容：`schema/deck.schema.json`（每页 `narration` 讲稿、`answerable` 可回答范围、必填 `grounding` 生成溯源、v2+ 必填 `reconciliation` 逐条对账）；单文件 `assets/template.html`（演示模式、浏览器 TTS 连播、评注四类意图：要求修改 / 有疑问 / 已确认 / 要资源、导出“修订简报”md+json）；`player/serve.js`（打断即锚定当前页 → 可插拔大脑 `BRAIN_CMD` 回答 → 对话并入修订简报）。
- 对我们：**“讲给你听 + 随时打断提问”就是视频之外的另一种讲解媒介**，而且问答能穿透到 `source.md` 和出处（grounding）。四类意图 + 修订简报 + 下一版逐条对账，正好是“focus 微调 → agent 改 → 证明改了”的闭环。
- 本轮先借最小的一块：预览页里的**评注 → 导出修订简报**（四类意图，锚定到 `source.md` 的单元/段落）。讲稿播报 + 打断问答（需要本地 player 和大脑 CLI，可接 Codex）放到 Electron 阶段。

**htmlcollab（AI 在线 HTML 协作，15 个提交，72 个文件）**——**借思路，不借服务。**
- 真实内容：Next.js 15 + node:sqlite，部署在 Cloudflare Workers；`lib/instrument.ts` 用 parse5 给块级元素注入稳定锚点 `data-cc-id`（跨版本保留）；`lib/context.ts` 把评论整理成给 agent 的 markdown（待处理 / 锚点失效 / 已解决三区）；CLI `push / pull`；无限画布、版本时间轴、角色权限。
- 对我们：**“元素级锚点 + 评论回流成 agent 上下文”**正是微调回路需要的；但我们的锚点不该是随机 id，而应直接映射到 `source.md` 的单元/段落/条目（`u01#key-concepts/明度`），这样反馈天然落回真源。在线协作、账号、画布对单人学习用不上。

## 7. 合并后的验收

- `npm run check`（单元校验 + 图谱校验）PASS；`npm run build` 通过。
- `out-preview/index.html` 双击打开：先看到课程地图，点 U01 进入单元（钩子、概念 + 原典切换、两个交互、过关题、点亮、问 AI、评注 → 导出修订简报），刷新后进度还在。
