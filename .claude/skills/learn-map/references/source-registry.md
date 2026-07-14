# 权威材料源目录（Source Registry）

这是项目的**长期积累资产**：按领域记录"去哪里找权威原始材料"。每次生成新地图，第 1 步从这里选源；生成中新验证的优质源必须回流追加到这里。

**权威度层级**（选源时从高到低）：
1. 课程标准 / 官方课标（定义"该学什么"的法定文本）
2. 领域公认教科书（第一版权威表述）
3. 奠基论文与高引综述（前沿主题的 canon 只能来自这里）
4. 名校公开课讲义（结构好，适合借目录）
5. 高质量百科（Wikipedia 等：只作入口和交叉核对，不作最终出处）

**使用规则**：canon.source 必须能落到本目录中某个源（或本次新验证后回流的源）；引用教科书给到章节，论文给"作者+年份+标题"（有 arXiv 编号更好）；版本要写明。

---

## K-12 通识（数学/科学/语文类）

- **Marble os-taxonomy** — github.com/withmarbleapp/os-taxonomy — 1590 个小学知识点+3221 先修边，已对齐下面三个课标，构图时优先检索复用（本项目的种子图谱）
- **NGSS（美国科学课标）** — nextgenscience.org — 条目编码如 1-PS4-1，可按年级/学科浏览
- **CCSS（美国共同核心，数学+英语）** — corestandards.org — 编码如 3.MD.B.3；数学实践标准 MP1-MP8 是跨学科通用能力的权威出处
- **英国国家课标 2013（DfE National Curriculum）** — gov.uk/government/collections/national-curriculum — 按 Key Stage/Year 组织，科学条目细到单元
- **人教版教材目录** — 中国课内对照用（如"物理八年级上册第二章 声现象"）；网上可查目录，正文引用需谨慎核对
- **Khan Academy** — khanacademy.org — 知识点粒度好，适合借"切分方式"，不作最终出处
- **OpenStax** — openstax.org — 免费开放教科书（数学/物理/生物/化学/经济），可作教科书级出处

## AI / 机器学习 / 大模型

- **arXiv** — arxiv.org — 前沿主题 canon 的主要来源；关键奠基论文（含编号）：Attention Is All You Need (1706.03762)、GPT-3 (2005.14165)、Scaling Laws (2001.08361)、Chinchilla (2203.15556)、InstructGPT (2203.02155)、DPO (2305.18290)、Constitutional AI (2212.08073)、LoRA (2106.09685)、Adam (1412.6980)、Switch Transformers (2101.03961)、RoPE (2104.09864)、DeepSeek-R1 (2501.12948)
- **《Deep Learning》Goodfellow, Bengio & Courville (2016)** — deeplearningbook.org 免费全文 — 深度学习基础概念的教科书级出处（第4章优化、第5章机器学习基础、第6-8章网络与训练）
- **《动手学深度学习》d2l.ai** — 中英双语开放教科书，代码+讲解，中文学习者友好
- **Sutton & Barto《Reinforcement Learning: An Introduction》(2nd ed. 2018)** — 强化学习的标准教科书，免费 PDF
- **Stanford CS231n / CS224n / CS324** — 讲义公开，结构适合借目录（视觉/NLP/LLM）
- **Hugging Face Course & Blog** — huggingface.co/learn — 工程实践的可靠参考（非 canon，作补充）

## 数学（高等）

- **MIT OCW** — ocw.mit.edu — 线代 18.06 (Strang)、微积分 18.01 等，讲义+视频全公开
- **OpenStax Calculus / Statistics** — 教科书级出处
- **3Blue1Brown** — 直觉可视化的典范，借"讲法"不作出处

## 物理 / 科学（进阶）

- **The Feynman Lectures on Physics** — feynmanlectures.caltech.edu 官方免费全文 — 直觉与严谨兼备的教科书出处
- **OpenStax Physics / Biology / Chemistry** — 教科书级出处
- **NCBI Bookshelf** — ncbi.nlm.nih.gov/books — 生物医学的权威开放文本

## 计算机科学（非 AI）

- **SICP / CLRS / CSAPP** — 各自领域的标准教科书
- **teachyourselfcs.com** — 选书指南，借它定"哪本是权威"

## 检索方法（找不到现成源时）

1. `<主题> site:edu syllabus/lecture notes` —— 找名校讲义定目录
2. Google Scholar 按引用数找奠基论文和综述（survey/review + 主题）
3. 课标类：搜 `<国家> national curriculum <学科>` 进官方站
4. 维基百科该主题页的 References 区——顺藤摸瓜到一手来源
5. 找到新的好源 → **追加进本文件对应领域**，注明验证日期

---
*回流记录：2026-07-14 初始版本，基于声音之旅（Marble/NGSS/UK NC/CCSS）与 AI 训练教材（arXiv 奠基论文 + Goodfellow）两次生成实战。*
