---
id: "demo-hokusai"
title: "北斋的浪与赤富士：图像的力量（演示）"
module: "艺术与视觉叙事·演示"
estTime: 15
sources:
  - "Wikimedia Commons · Hokusai"
  - "The Met Open Access"
tags:
  - "演示"
  - "公共领域"
---

## Hook Question

为什么《神奈川冲浪里》的巨浪比真实海浪更“震撼”？艺术家如何用构图与色彩，让我们直觉理解力量与尺度？

## Core Narrative

本单元用两幅公共领域的浮世绘作品，演示“知识翻译引擎”如何把艺术史知识转译为易于吸收的叙事与交互体验。我们将从“引子问题”出发，结合关键概念卡片、可交互对比、热点标注与时间轴，帮助你形成“看到—理解—记住”的连贯体验。

在阅读过程中，请先预测，再验证并揭示答案；这是提升记忆与理解的有效策略。

## Key Concepts

```yaml
- term: 视觉叙事（Visual Narrative）
  explanation: 图像中的元素、节奏与对比，组织成可理解的“故事”。
  analogy: 像电影镜头语言：远景交代环境，特写强化情绪。
- term: 构图（Composition）
  explanation: 画面元素的布局与关系，决定我们的视线如何移动与停留。
  analogy: 像城市道路与地标，引导人群的流动。
- term: 负形（Negative Space）
  explanation: 主体周围的留白或背景形状，同样携带意义与力量。
  analogy: 像音乐的停顿，让“声音”更响亮。
```

## Artworks

```yaml
- id: great-wave
  title: "神奈川冲浪里（The Great Wave off Kanagawa）"
  creator: "葛饰北斋"
  year: "1830–1832（版本各异）"
  sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/The_Great_Wave_off_Kanagawa.jpg?width=1600"
  license: "Public Domain (Wikimedia Commons)"
  caption: "巨浪形成的三角形与富士山形成大小对位；泡沫像‘爪’。"
- id: red-fuji
  title: "凱風快晴（Red Fuji / Fine Wind, Clear Morning）"
  creator: "葛饰北斋"
  year: "1830–1832（版本各异）"
  sourceUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Red_Fuji_southern_wind_clear_morning.jpg?width=1600"
  license: "Public Domain (Wikimedia Commons)"
  caption: "清晨南风，富士山被红色阳光笼罩，色块简练而有力。"
```

## Video Storyboard

```yaml
- id: s1
  title: "引子与两幅作品"
  images: ["great-wave", "red-fuji"]
  narration: "如果你从未见过海，为什么这幅浪让你感到紧张？艺术家如何用形状与色彩，让你直觉理解力量与尺度？"
  durationSec: 6
  transition: "fade"
- id: s2
  title: "构图与视线"
  images: ["great-wave"]
  narration: "巨浪与富士的大小对位，形成张力；视线沿着弧形浪尖被‘抛出’，再落到小船与山体。"
  durationSec: 7
  transition: "pan"
- id: s3
  title: "色彩与气候"
  images: ["red-fuji"]
  narration: "《赤富士》用大片红色，直接传递清晨南风与晴朗的温度感；极简让意义更集中。"
  durationSec: 6
  transition: "zoom"
```

## Interactive Components

```yaml
imageComparisons:
  - id: compare-1
    leftArtworkId: great-wave
    rightArtworkId: red-fuji
    prompt: "拖动比较：张力 vs. 宁静"
    labelLeft: "巨浪的张力"
    labelRight: "清晨的宁静"
zoomAnnotates:
  - id: z1
    artworkId: great-wave
    hotspots:
      - id: h1
        xPct: 65
        yPct: 30
        title: "浪尖爪形"
        description: "泡沫形成‘爪’，营造威胁与动作感。"
      - id: h2
        xPct: 35
        yPct: 70
        title: "小船与人"
        description: "尺度对比让巨浪更巨大，观者共情乘船者的处境。"
timeline:
  id: t1
  title: "浮世绘与现代图像"
  items:
    - id: ti1
      date: "1830-1832"
      label: "《富岳三十六景》"
      description: "系列出版，包含《神奈川冲浪里》《凱風快晴》等。"
    - id: ti2
      date: "19世纪末"
      label: "对欧洲的影响"
      description: "日本主义影响印象派、后印象派的构图与色彩。"
predictReveals:
  - id: pr1
    prompt: "你觉得哪幅作品更“动”？为什么？（先写下理由）"
    answer: "《神奈川冲浪里》因曲线与对角线张力更强。"
    explanation: "弧形浪尖与对角线构图传递速度与动作。"
```

## Check Yourself

```yaml
- id: q1
  question: "‘负形’指的是？"
  choices: ["画面边缘的黑边", "主体周围的留白或背景形状", "图像的分辨率"]
  answer: "主体周围的留白或背景形状"
  explanation: "负形与正形共同构成叙事与节奏。"
- id: q2
  question: "《赤富士》中哪一要素最直接传达‘清晨南风与晴朗’？"
  answer: "大片的红色与干净的色块"
  explanation: "色彩与极简形状共同营造温度与气候感。"
```

## Link to AI & Future Human Life

图像“直觉传义”的能力，在人机协作中至关重要。未来的 AI 助手也需要把抽象信息转译成我们眼前“一眼懂”的形状、节奏与对比。这正是“知识翻译引擎”的目标。

