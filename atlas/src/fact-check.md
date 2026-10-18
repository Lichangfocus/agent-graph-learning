# Atlas 事实核查记录（TASK-005 · CR-20261018-04）

- 范围：人类文明通史 11 个节点（s1–s11）的日期、事实、东西对照、解释框架署名、33 道自测题；58 条节点间的边（含跨领域边）。
- 方法：Grok Bot 于 2026-10-18（北京时间）用 WebSearch / WebFetch 对照可靠来源（原始论文、UNESCO、Britannica、官方文件、出版社页面），逐条核对；核实到的来源写进节点 / 边的 `sources`，在星图短片「解释」一幕与节点面板显示。
- 规则：查不到可靠来源、或只是主题关联（`related`）的边，保持 `AI推断`；能证实的改成 `事实` / `主流解释` 并附来源。解释框架一律标「非定论」，不因核查升格为事实。
- 待 focus 审：本记录只是 AI 核查，最终是否采信由 focus 决定。

## 1. 更正（改了内容）

| # | 节点 / 边 | 原文 | 改为 | 依据 |
|---|---|---|---|---|
| 1 | s3 解释框架 | 「斯科特 / 柴尔德『城市革命』」 | 「柴尔德『城市革命』（1950）」；斯科特另作为质疑「文明即进步」叙事的一方 | 「城市革命」是柴尔德提出（Town Planning Review 1950，10 条判据），与斯科特无关 —— [Childe 1950](https://doi.org/10.3828/tpr.21.1.k853061t614q42qh)、[Britannica](https://www.britannica.com/topic/urban-revolution) |
| 2 | s10 机制·信息 | 「智能手机（2007）」 | 「iPhone（2007）让触屏智能手机普及（首款智能手机 IBM Simon 1994 年上市）」 | [Britannica: smartphone](https://www.britannica.com/technology/smartphone)、[BBC 2014](https://www.bbc.com/news/technology-28802053) |
| 3 | s6 西方 + 自测题 | 黑死病「造成欧洲约 30%–60% 人口死亡」；选项「约 30%–60%」 | 「常见估计约三分之一，高估计达 50%–60%，地区差异很大（⚠ 估计区间）」；选项「约三分之一或更多（估计区间）」 | Britannica：各地死亡率 1/8–2/3，整体约三分之一 —— [Black Death](https://www.britannica.com/event/Black-Death) |
| 4 | s6 制度 C + 自测解析 + 边 e-x21 | 「官方交子（1020 年代）」 | 「官交子（1023 年设益州交子务，1024 年首发）」 | [全国哲学社会科学工作办公室：何平](http://www.nopss.gov.cn/n1/2023/0911/c219544-40075019.html) |
| 5 | s7 东方 | 「一条鞭法（张居正 1581 年推广至全国）」 | 「一条鞭法（嘉靖起各地试行，1581 年张居正下令通行全国）」 | 一条鞭法非张居正首创，1581 年是朝廷下令通行，各地落实有先后 —— [北大人文社科院](http://www.ihss.pku.edu.cn/wyjz1/articles/1373713217829867520.html) |
| 6 | s1 文化 A | 肖维洞穴「约 3.6 万年前」 | 「约 3.7–3.35 万年前」 | [Quiles et al. 2016, PNAS](https://www.pnas.org/doi/10.1073/pnas.1523158113)：两期 3.7–3.35 万、3.1–2.8 万年前 |
| 7 | s6 解释框架署名 | 「李筠《中世纪》」 | 「李筠《中世纪：权力、信仰和现代世界的孕育》（2023）」 | 书名补全 —— [读书网](https://www.dushu.com/book/13990978/) |
| 8 | s5 解释框架署名 | 「库马尔《千年帝国史》」 | 补原书名「Visions of Empire，2017」 | [Princeton UP](https://press.princeton.edu/books/ebook/9781400884919/visions-of-empire)、[豆瓣](https://book.douban.com/subject/33436176/) |
| 9 | s8 文化 A、s11 解释与自测解析 | 「课程 W3 会讨论…」「课程 W9 的核心问题」 | 去掉个人课表周次（公开 Atlas 不绑个人课程） | 隐私 / 解耦，非事实错误 |

## 2. 核实无误（附来源，未改）

| 节点 | 核实的说法 | 来源 |
|---|---|---|
| s1 | 人属 ≈280 万年前（Ledi-Geraru 下颌骨 2.80–2.75 Ma） | [Villmoare et al. 2015, Science](https://www.science.org/doi/10.1126/science.aaa1343) |
| s1 | 最早智人化石 ≈30 万年前（Jebel Irhoud 315±34 ka） | [Richter et al. 2017, Nature](https://www.nature.com/articles/nature22335) |
| s1 | 田园洞人约 4 万年前 | [Fu et al. 2013, PNAS](https://www.pnas.org/doi/10.1073/pnas.1221359110) |
| s2 | 哥贝克力石阵约 1.16 万年前起（前 9600–前 8200） | [UNESCO](https://whc.unesco.org/en/list/1572/) |
| s2 | 贾湖骨笛约 9000 年前 | [Zhang et al. 1999, Nature](https://doi.org/10.1038/43865) |
| s3 | 良渚约前 3300–前 2300，早期区域国家 | [UNESCO](https://whc.unesco.org/en/list/1592/) |
| s3 | 二里头约前 1750–前 1530（碳十四） | [河南省文物局](https://wwj.henan.gov.cn/2023/04-09/2721663.html) |
| s4 | 「轴心时代」出自雅斯贝尔斯 1949；Baumard 等 2015 富足假说 | Jaspers 1949；[Baumard et al. 2015, Current Biology](https://doi.org/10.1016/j.cub.2014.10.063) |
| s7 | 跨大西洋奴隶贸易约 1250 万人被运上船 | [SlaveVoyages](https://www.slavevoyages.org/assessment/estimates) |
| s9 | Wrigley「有机经济」框架 | [Wrigley 2010](https://doi.org/10.1017/CBO9780511779619) |
| s10 | 合成氨支撑大量人口（约 40%–48% 的估计） | [Erisman et al. 2008](https://www.nature.com/articles/ngeo325)、[Smil 1999](https://doi.org/10.1038/22672) |
| s11 | Transformer 2017；欧盟 AI 法 2024-05-21 理事会最终通过；《生成式人工智能服务管理暂行办法》2023-08-15 施行 | [arXiv 1706.03762](https://arxiv.org/abs/1706.03762)、[欧盟理事会](https://www.consilium.europa.eu/en/press/press-releases/2024/05/21/artificial-intelligence-ai-act-council-gives-final-green-light-to-the-first-worldwide-rules-on-ai/)、[中国政府网](https://www.gov.cn/zhengce/zhengceku/202307/content_6891752.htm) |

其余日期（秦统一前 221、汉、隋 581/589、罗马 476/1453、313/380、李希霍芬 1877、622、1054、1215、唐宋起止、《武经总要》1044、1492/1498/1519–1522/1521/1571、1517/1555/1648、皇家学会 1660、《原理》1687、《几何原本》1607、瓦特 1769、1830、1861/1871、1905、1947、1969、1989、ChatGPT 2022-11 等）为常识级、多个百科一致，本轮未逐条附来源，状态仍为「AI 核对」。

## 3. 边的 claim_type

| 边 | 原 | 现在 | 来源 |
|---|---|---|---|
| e-x4 全新世稳定气候 → 农业 | AI推断 | 主流解释 | Richerson, Boyd & Bettinger 2001 |
| e-x6 农业 → 人畜共患病 | AI推断 | 主流解释 | Wolfe, Dunavan & Diamond 2007 |
| e-x7 农业革命 — 贾湖骨笛 | AI推断 | 事实 | Zhang et al. 1999 |
| e-x21 宋 — 交子 | AI推断 | 事实（note 改为 1023 年） | 何平 2023 |
| e-x23 大航海 → 美洲人口崩溃 | AI推断 | 主流解释（规模仍标有争议） | Crosby 1972 |
| e-x28 科学革命 — 《几何原本》中译 1607 | AI推断 | 事实 | 徐光启、利玛窦译本 |
| e-x32 工业革命 → 化石能源 | AI推断 | 主流解释 | Wrigley 2010 |
| e-x35 工业时代 — 1905 废科举 | AI推断 | 事实 | 清廷 1905 诏停科举 |
| e-x38 电气化时代 → 合成氨 | AI推断 | 主流解释（note 补估计值） | Erisman 2008、Smil 1999 |
| e-x40 AI 时代 — AlexNet 2012 | AI推断 | 事实 | Krizhevsky et al. 2012 |
| e-x41 AI 时代 — Transformer 2017 | AI推断 | 事实 | Vaswani et al. 2017 |
| **新增** e-x48 概率论 — 科学革命 | — | 事实 | 1654 帕斯卡–费马通信，[Britannica](https://www.britannica.com/science/probability)（同时消除「n-prob 孤立」警告） |

其余 37 条跨领域 `related` / `leads_to` / `prereq` 边是主题关联或学习顺序建议，不是可证伪的事实陈述，保持 **AI推断**，待 focus 审。10 条 `e-next-sN`（阶段链）保持「主流解释」。
