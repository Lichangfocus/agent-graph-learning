# 课程 Markdown + 学习者画像 → course/graph.yaml

你负责为成人学习者建立课程级知识地图。输入为课程方案 Markdown（本项目为 `course-q4-2026.md`）、只读的 `profile/learner-profile.yaml`、`docs/source-registry.md` 和已有 `units/<id>/source.md`。输出只更新 `course/graph.yaml`；不要复制单元内容到另一份 site.json，不生成 UI，不改画像。

方法参考 `agent-graph-learning` 的 learn-map 第 1–3 步：先收集权威材料，先落原典依据再连边，校验通过后才交给渲染器。本项目以单元为节点，画像为转译层，采用成人的周次安排。

## 1. 先读材料与画像

- 从课程方案的资源清单和本地来源登记提取实际存在的教材、课程与章节依据。优先公认教材、奠基论文、大学讲义；不能凭模型记忆编造出处、链接或章节。
- 仅使用已提供的本地材料；不添加下载、搜索、API Key 等网络依赖。未提供原文时，如实写明待核，不把登记中的“搜索确认”升级为原文已核实。
- 读取画像的已有知识、类比偏好、薄弱领域、`dependency_order`、`framework_first`、`dual_layer`、`recall_and_pass_questions` 等规则。生物学等低置信度领域不能当作已掌握的锚点。
- 梳理每个单元的核心问题、概念正式表述及真实出处，再判断理解依赖。已有 canon 位于 `source.md` 的 Key Concepts 中；图谱不另存 canon、掌握证据或 HTML 屏幕。
- 节点范围严格来自课程方案；已有单元的 id 与目录名保持一致。尚无 source.md 的节点仍可规划，不为了凑数新增节点。

## 2. 生成规范 YAML

以 `src/lib/schemas/graph.ts` 为数据契约。以下占位值须替换为输入中的真实内容，示例边不代表本项目的教学判断：

```yaml
id: course-id
title: 课程知识地图标题
status: draft
updated: "YYYY-MM-DD"
reorder: >-
  指明所依据教材的常规顺序，逐项解释本图在哪里偏离、为什么更适合画像中的学习者，
  并注明课程方案中的依据。没有偏离也要说明依赖关系与教材顺序如何一致。
sources_ref: "课程方案文件及资源清单章节；docs/source-registry.md"
domains:
  - {id: domain-id, name: 领域名称}
nodes:
  - {id: unit-a, icon: "📖", name: 简短单元名, domain: domain-id, module: M1, week: 1, desc: 核心问题}
  - {id: unit-b, icon: "📖", name: 另一单元名, domain: domain-id, module: M1, week: 2, desc: 核心问题}
edges:
  - from: unit-a
    to: unit-b
    type: soft
    why: "【AI推断】先理解 A 的具体概念，能帮助解释 B 的哪一步；写出依据与推断边界。"
    status: draft
```

- 顶层必填 `id/title/status/updated/reorder/sources_ref/domains/nodes/edges`；`updated` 是 ISO 日期字符串，`reorder` 和 `sources_ref` 不得为空。
- 领域为 `{id, name}`；节点必填 `id/icon/name/domain/module/week/desc`，week 为正整数。id 为字母、数字、下划线或短横线构成的稳定标识。domain 必须引用已声明领域。
- 节点 `status: built|planned` 由加载器按 `units/<id>/source.md` 是否存在派生，不在规范 YAML 手写状态；built 仅表示有内容，不表示已经掌握。
- 边方向固定为 `from: 先修单元` → `to: 后继单元`。边必填 `from/to/type/why`；每条边都必须有非空的 `why`，说明具体依赖、教学价值和材料依据，不得只写“相关”。
- `hard`：理解后继关键步骤时建议先学；`soft`：已有相关经验会更易理解；`cross`：跨领域的对照或共鸣。成人学习不做硬锁；渲染器将来只作提示。
- **AI推断边必须写 `status: draft`，并在 why 标注“AI推断”**；课程整体初稿也写 `status: draft`。未明确审定的边不可写 confirmed。可选的边 status 省略时继承图谱 status。
- **reorder 必须解释相对于教材顺序的偏离及理由**，不能只复述课表。例如先有具体体验再引入理论、为东西方对照而相邻安排单元；必须来自输入材料和画像，不能套用示例凭空判断。

## 3. 校验并交付

运行本地命令：

```bash
npm run graph:validate
npm run check
```

- 修复全部 ERROR 后重跑，只有 PASS 才交付。引用必须存在、节点与领域 id 不重复、不能自环，hard+soft 先修图必须无环（报告并修复环路径）；cross 仅表达关联，不参与先修环检测。
- 至少有一个没有 incoming hard 边的起点。只画直接硬先修：存在 A→B→C 硬路径时不要重复 A→C，必要时降为 soft 并解释理由。
- 逐项处理 WARN：hard/soft 边先修周次晚于后继时，先检查方向，再判断课表需要调整；孤立节点和硬边传递冗余也要解释或修正。警告不会单独导致退出失败。
- 核对校验器列出的 built/planned 与实际目录。它不会为 planned 节点自动创建单元，也不会写入学习进度。
- 在交付说明中列出重排理由、待审的 AI推断边、待核来源及仍保留的警告。不自动提交或推送；渲染器从验证后的图谱和单元真源生成静态产物。
