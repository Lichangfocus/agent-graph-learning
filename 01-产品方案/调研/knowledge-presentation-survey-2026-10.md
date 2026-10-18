# 知识呈现参考项目调研（2026-10）

> 目标：个人学习 OS = 一张持久化的「全人类知识地图」+ 可互相关联的 topic + 逐步「点亮」已学节点 + 电影感呈现。首批内容：人类文明 11 次大变革。
> 链接核验：2026-10-18 用 curl / WebFetch 检查。✅=可打开；⚠️=超时或不稳定（下面单独注明）。

## 一、知识地图 / 技能树

| 项目 | URL | 是什么 | 值得借鉴 | 技术 / 许可 |
|---|---|---|---|---|
| Metacademy | https://metacademy.org ⚠️（504，基本已停止维护）；代码：github.com/metacademy | 机器学习概念的依赖图，按「我想学 X」反推前置知识，生成学习路线 | **前置依赖 DAG + 目标驱动的路线生成**；每个概念有「目标、资源、前置」 | Django + JS，GPL-3 |
| Learn Anything | https://learn-anything.xyz ✅ | 社区共建的主题→资源图谱 | topic 层级 + 每个节点挂学习资源 + 个人状态（已学 / 在学） | 开源（GitHub learn-anything） |
| Obsidian Graph / Canvas | https://obsidian.md ✅ | 本地 Markdown 笔记的双链与力导向图 | **本地优先、纯文件**；局部图 + 全局图；用颜色分组 | 闭源，插件生态 |
| Logseq | https://logseq.com ✅ | 大纲式双链笔记，正在迁移到 DB 版本 | 块级引用、属性（status/tags）、本地 SQLite DB 模式 | AGPL-3 |
| Heptabase | https://heptabase.com ✅ | 白板 + 卡片的视觉化学习工具 | **空间白板：卡片可以出现在多个白板里**（一个节点，多个视图）；适合拿来做「topic 地图」 | 闭源 |
| Kumu | https://kumu.io ✅ | 系统 / 关系地图平台 | 元素、连接、回路都带类型和属性；用「视图」做筛选和配色；适合画因果图 | SaaS |
| Wolfram Alpha | https://www.wolframalpha.com ✅ | 可计算知识引擎 | 实体 + 属性的结构化知识模型 | 闭源 |
| Quanta Magazine 交互图 | https://www.quantamagazine.org ✅ | 有「数学地图」「物理理论地图」这类可缩放的概念图 | **语义缩放**：拉远看领域，拉近看具体概念，配叙述短文 | 自研 |
| Map of Science（Börner） | scimaps.org（mapofscience.com 已打不开） | 依据引文聚类画出的科学版图 | 用「学科大陆」做底图，所有知识都有一个空间坐标 | 研究项目 |

## 二、可视化 / 互动历史

| 项目 | URL | 值得借鉴 |
|---|---|---|
| Histography | https://histography.io ✅ | 维基百科事件按时间铺成点阵，**拖动时间轴就能从 140 亿年缩放到上周**；分类筛选。最贴近「对数时间轴」 |
| ChronoZoom | chronozoom.com ⚠️（打不开，已停更；代码在 GitHub，MS-PL 许可） | 大历史无限缩放时间轴，嵌套「时间段 → 展品」的数据模型 |
| Chronas | https://chronas.org ✅ | 世界地图 + 时间滑块，每一年的疆域、宗教、文化都能切换显示；**地图随年份变化** |
| TimeMaps | https://www.timemaps.com ✅ | 按年代切换的世界历史地图配文章，可以参考它的「文明节点」划分 |
| Running Reality | https://www.runningreality.org ✅ | 3D 地球 + 公元前 3000 年至今的逐年世界 |
| Our World in Data | https://ourworldindata.org ✅ | 长期数据图表（人口、能量、寿命），可以**嵌进每个变革节点当证据**；数据 CC-BY |
| The Fallen of World War II | http://www.fallen.io/ww2/ ✅ | **线性叙述的数据纪录片，在关键时刻暂停，让观众走进图表自己探索**，是「视频 + 交互」混合的标杆 |
| The Pudding | https://pudding.cool ✅ | 滚动叙事（scrollytelling）的视觉散文 |
| Big History Project | https://www.bighistoryproject.com ✅ | 「8 个门槛」（大爆炸 → 现代）课程框架，跟 11 次变革的思路一致 |

## 三、可探索解释与动画技术

| 项目 | URL | 用途 | 许可 |
|---|---|---|---|
| Bret Victor | https://worrydream.com ✅ | 「Explorable Explanations」、「Up and Down the Ladder of Abstraction」：理念来源 | — |
| Nicky Case | https://ncase.me ✅（还有 explorabl.es ✅） | 《The Evolution of Trust》；**Nutshell 可展开解释**，正好对应「点开概念就地展开」 | CC0 / 开源 |
| Distill | https://distill.pub ✅（2021 年起停刊，存档仍可看） | 交互论文排版；《Communicating with Interactive Articles》是设计综述 | CC-BY |
| Manim（社区版） | https://www.manim.community ✅ | 3Blue1Brown 风格的程序化数学动画（Python） | MIT |
| Motion Canvas | https://motioncanvas.io ✅ | TypeScript 写的程序化动画，配音时间线对齐好 | MIT |
| Remotion | https://www.remotion.dev ✅ | 用 React 写视频，可以批量渲染 MP4；**适合「节点数据 → 自动出短片」** | 个人 / 小团队免费，公司要买许可 |
| Theatre.js | https://www.theatrejs.com ✅ | 网页里的关键帧动画编辑器（配合 Three.js） | Apache-2 / AGPL（工作室部分） |
| GSAP ScrollTrigger | https://gsap.com/docs/v3/Plugins/ScrollTrigger/ ✅ | 滚动驱动动画，现在已全部免费 | 免费（GSAP 标准许可） |
| Scrollama | https://github.com/russellsamora/scrollama ✅ | 轻量滚动叙事（IntersectionObserver） | MIT |
| Globe.gl | https://globe.gl ✅ | Three.js 3D 地球（弧线、路径、多边形）：画丝路、大航海航线 | MIT |
| deck.gl | https://deck.gl ✅ | WebGL 大数据地理图层，带时间动画（TripsLayer） | MIT |
| D3 | https://d3js.org ✅ | 缩放时间轴、力导向图 | ISC |

## 四、AI 原生学习产品

| 产品 | URL | 借鉴 |
|---|---|---|
| NotebookLM | https://notebooklm.google ✅ | 资料 → 音频概览 / 视频概览（幻灯片 + 配音）+ 思维导图；**「资料生成多种介质」的产品形态** |
| Khanmigo | https://www.khanmigo.ai ✅ | 苏格拉底式辅导，不直接给答案；可汗的掌握度体系（熟悉 → 熟练 → 掌握） |
| Synthesis | https://www.synthesis.com ✅ | 游戏化、自适应的数学辅导 |
| Gauth | gauthmath.com ⚠️（403，可能是反爬） | AI 解题 + 讲解视频（「Infinite Mode」的具体信息没能核实） |

## 五、综合建议

### 1. 历史节点的呈现模式（「电影感」三层）
1. **总览层：对数时间轴 + 3D 地球**。顶部是 Histography 式的可缩放对数时间轴（D3 zoom），11 个变革节点就是轴上的「星」；下方用 Globe.gl 显示当前时代的文明分布和交流路线。拖动时间，地球跟着变（参考 Chronas）。
2. **节点层：滚动叙事**。点进一个节点，进入 Scrollama + GSAP 驱动的全屏叙事：每一屏是一个「变化 → 原因（能量 / 信息 / 组织）→ 后果 → 中西对照 → 为下一段铺垫」，地图和图表跟着滚动变形，OWID 数据作证据。
3. **影片层：60–120 秒短片**。用 Remotion（React，可复用同一份节点 JSON）程序化生成，TTS 配音、字幕同步；需要数学或机制演示的用 Motion Canvas / Manim。学 Fallen of WWII：片中设「暂停点」可以跳进交互图。
4. 每个节点结尾：类比及它不成立的地方、3 道自测题 → 答对后**点亮节点**。

### 2. 数据模型（SQLite）
```sql
node(id, slug, title, type /*domain|topic|concept|event|era*/, summary,
     time_start, time_end /*年，负数=公元前*/, geo /*GeoJSON*/, content_path, created_at)
edge(id, src, dst, kind /*prerequisite|part_of|causes|leads_to|contrasts|related*/, weight, note)
topic(id, title, root_node_id)          -- 一个 topic 是一个子图视图
topic_node(topic_id, node_id, x, y)    -- 同一节点可以出现在多个 topic（Heptabase 式）
mastery(node_id, state /*locked|seen|learning|lit|mastered*/, score, last_review, next_review /*SRS*/)
event_log(id, node_id, action /*open|quiz|note*/, payload_json, ts)
asset(id, node_id, kind /*html|video|audio|image*/, path)
source(id, node_id, url, citation, claim_type /*fact|scholar_view|disputed*/)
```
- 全局唯一节点 + 有类型的边 = 一张大图；topic 只是视图，不复制节点，所以不同 topic 天然相通。
- 点亮规则：自测达标 → lit；间隔复习通过 → mastered。前置节点没点亮的，显示为半透明。
- 内容仍是 `source.md` + JSON（沿用现在的引擎），DB 只存图结构和状态，方便 bot 读写和同步到 vault。

### 3. 技术栈（离线优先、Mac 可用）
- **Tauri 2**（https://tauri.app ✅，体积小，比 Electron 省内存）+ SQLite（tauri-plugin-sql）。前端用 React + Vite。
- 地图：Sigma.js（WebGL，可承载上万节点）或 D3-force + 语义缩放；地球用 Globe.gl；叙事用 Scrollama + GSAP。
- 视频：Remotion 离线渲染 MP4，放进 asset；TTS 用 macOS `say` 或本地 / 云端 TTS。
- 过渡方案：先做「单文件 HTML + IndexedDB」的 Web 版（双击就能打开，和现在的产物兼容），稳定后再套 Tauri 壳。
- 执行优先级沿用：OpenCode → Codex → Grok Bot。
