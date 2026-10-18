标题：从学习者画像生成写作与呈现指南（供转换与渲染管线使用）

输入：
- profile/learner-profile.yaml （结构化画像）
- profile/learner-profile.md （自然语言补充）

输出（要点）：
- 词汇难度级别与句式风格
- 类比素材偏好清单（优先次序）
- 已知先验知识与应避开内容
- 呈现偏好（图像/卡片/时间轴/问答的权重）

格式：
```yaml
language: zh-CN
readingLevel: undergrad
lexicalStyle: "简洁直观、段落短句、先例后名词"
analogyPreferences:
  - "日常生活（烹饪/旅行/城市）"
  - "艺术/音乐"
priorKnowledge:
  - "……"
avoid:
  - "……"
presentationHints:
  narrative: "每段 2-4 句，先问题再解释"
  keyConcepts: "每卡片 3-5 行，附类比"
  interactive: "至少包含对比滑块与预测揭示"
```

