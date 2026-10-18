标题：将原始课程材料转译为 units/<id>/source.md（结构化、贴合学习者画像）

使用方法：
- 输入：讲义/教材摘录/课堂笔记等（原始材料）
- 必读：profile/learner-profile.yaml 与 profile/learner-profile.md
- 目标：生成遵循 schema/unit.schema.json 的 Markdown（见“sections”标题与 YAML 代码块）

约束：
- UI 语言：简体中文
- 避免术语堆砌；必要术语请先用类比解释
- 所有“结构化”内容务必放入 YAML 代码块中（Key Concepts / Artworks / Video Storyboard / Interactive Components / Check Yourself）

输出骨架（示例，替换内容保持字段名不变）：

```md
---
id: "<新单元ID（短横线命名）>"
title: "<标题>"
module: "<模块名>"
estTime: <整数分钟>
sources:
  - "<来源1>"
  - "<来源2>"
tags:
  - "<标签1>"
---

## Hook Question
<一到两句引子问题>

## Core Narrative
<2-5 段核心叙事，每段 2-4 句>

## Key Concepts
```yaml
- term: 概念 A
  explanation: 简明解释
  analogy: 日常类比
- term: 概念 B
  explanation: 简明解释
  analogy: 日常类比
```

## Artworks
```yaml
- id: <art1>
  title: "<作品标题>"
  creator: "<作者>"
  year: "<年代>"
  sourceUrl: "<公共领域或开放协议图片 URL（优先 Wikimedia Commons Special:FilePath）>"
  license: "<许可说明>"
  caption: "<一句话说明>"
```

## Video Storyboard
```yaml
- id: s1
  title: "<场景标题>"
  images: ["<art1>", "<art2>"]
  narration: "<旁白中文>"
  durationSec: 6
  transition: "fade"
```

## Interactive Components
```yaml
imageComparisons: []
zoomAnnotates: []
timeline:
  id: t1
  title: "<可选>"
  items: []
predictReveals: []
```

## Check Yourself
```yaml
- id: q1
  question: "<问题>"
  answer: "<答案>"
  explanation: "<解析>"
```

## Link to AI & Future Human Life
<一段落，讲此主题与 AI/未来生活的连接>
```

