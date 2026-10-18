# -*- coding: utf-8 -*-
import math, html, re, sys
sys.path.insert(0, '.')
from stages import STAGES, DRIVERS, WEEKS
src = open('/workspace/share/学者-通史学习地图-v0.1.html', encoding='utf-8').read()
base_css = src[src.find('<style>')+7:src.find('</style>')]
OUT = sys.argv[1] if len(sys.argv) > 1 else '/workspace/share/学者-人类文明演化roadmap-v0.1.html'

LENS = {"A": ("A 文化发展", "#7c3aed", "#ede9fe"), "B": ("B 宗教与制度", "#b45309", "#fef3c7"), "C": ("C 生产力革命", "#1d4ed8", "#dbeafe")}
def warn(t):  # ⚠ highlight
    return t.replace('⚠', '<span class="unc" title="有争议 / 不确定">⚠</span>')
def lens_tags(ls):
    return ''.join(f'<span class="lt l{l}">{LENS[l][0]}</span>' for l in ls)

# ---------- log timeline SVG ----------
W, L, R = 1000, 30, 30
LMAX = math.log10(4_000_000)
def X(ya): return L + (LMAX - math.log10(max(ya, 1))) / LMAX * (W - L - R)
ticks = [(1_000_000, "100万年前"), (100_000, "10万年前"), (10_000, "1万年前<br>≈前8000"), (1000, "1000年前<br>≈1026"), (100, "100年前<br>≈1926"), (10, "10年前"), (1, "今天")]
eras = [(4_000_000, 12000, "旧石器 · 狩猎采集", "#f1f5f9"), (12000, 5200, "新石器", "#ecfdf5"), (5200, 1476, "古代文明", "#fef9c3"), (1476, 526, "中古", "#fce7f3"), (526, 1, "近现代", "#e0f2fe")]
H = 330
svg = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="对数时间轴" class="tl">']
for a, b, name, col in eras:
    x1, x2 = X(a), X(b)
    svg.append(f'<rect x="{x1:.1f}" y="20" width="{x2-x1:.1f}" height="{H-70}" fill="{col}"/>')
    svg.append(f'<text x="{(x1+x2)/2:.1f}" y="14" text-anchor="middle" class="era">{name}</text>')
for ya, lab in ticks:
    x = X(ya)
    svg.append(f'<line x1="{x:.1f}" y1="20" x2="{x:.1f}" y2="{H-50}" stroke="#cbd5e1" stroke-dasharray="3 4"/>')
    for k, part in enumerate(lab.split('<br>')):
        svg.append(f'<text x="{x:.1f}" y="{H-32+k*15}" text-anchor="middle" class="tick">{part}</text>')
lanes = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1]
for st, lane in zip(STAGES, lanes):
    a, b = st['ya']; x1, x2 = X(a), X(b)
    y = 46 + lane * 82 + (st['no'] % 2) * 0
    col = LENS[st['lenses'][0]][1]
    svg.append(f'<a href="#{st["id"]}" class="tlst" data-lenses="{" ".join(st["lenses"])}">')
    svg.append(f'<rect x="{x1:.1f}" y="{y}" width="{max(x2-x1,6):.1f}" height="12" rx="6" fill="{col}" opacity=".85"/>')
    xm = X(st['mark'])
    svg.append(f'<circle cx="{xm:.1f}" cy="{y+6}" r="7" fill="#fff" stroke="{col}" stroke-width="2.5"/>')
    svg.append(f'<text x="{xm:.1f}" y="{y+10}" text-anchor="middle" class="num">{st["no"]}</text>')
    svg.append(f'<text x="{xm:.1f}" y="{y+30}" text-anchor="middle" class="sname">{st["icon"]} {st["short"]}</text>')
    svg.append('</a>')
svg.append('</svg>')
TL = '\n'.join(svg)

# ---------- stage cards ----------
cards = []
for st in STAGES:
    mech = ''.join(f'<li><b>{k}</b>：{warn(v)}</li>' for k, v in st['mech'])
    abc = ''.join(f'<div class="abc l{l}"><span class="lt l{l}">{LENS[l][0]}</span><p>{warn(st["abc"][l])}</p></div>' for l in ["A", "B", "C"])
    facts = ''.join(f'<li>{warn(f)}</li>' for f in st['facts'])
    interp = ''.join(f'<li><span class="who">{w}</span>{warn(t)}</li>' for w, t in st['interp'])
    weeks = ' '.join(f'<span class="wk">{w}</span>' for w in st['weeks'])
    cards.append(f'''<section class="stage" id="{st["id"]}" data-lenses="{" ".join(st["lenses"])}">
<div class="sthead"><span class="stno">{st["no"]}</span><div><h3>{st["icon"]} {st["name"]}</h3>
<div class="dates">🕰 {warn(st["dates"])}</div><div class="tags">{lens_tags(st["lenses"])} <span class="sep">课程周</span>{weeks}</div></div></div>
<p class="core"><b>一句话</b>　{st["core"]}</p>
<div class="cols2"><div><h4>机制：为什么会发生</h4><ul class="mech">{mech}</ul></div>
<div><h4>东西方对照</h4><div class="ew"><div><span class="ewl">东方 / 中国</span>{warn(st["east"])}</div><div><span class="ewl">西方 / 其他</span>{warn(st["west"])}</div></div></div></div>
<h4>改变了什么（三块透镜）</h4><div class="abcrow">{abc}</div>
<div class="cols2"><div class="fact"><h4>✅ 事实锚点</h4><ul>{facts}</ul></div><div class="interp"><h4>🔍 解释框架（非定论）</h4><ul>{interp}</ul></div></div>
<p class="next"><b>➜ 为下一步铺了什么</b>　{warn(st["next"])}</p>
</section>''')
CARDS = '\n'.join(cards)

# ---------- drivers matrix ----------
th = ''.join(f'<th>{ic} {name}<small>{q}</small></th>' for name, ic, q, vals in DRIVERS)
rows = ''
for i, st in enumerate(STAGES):
    rows += f'<tr><th class="dn"><a href="#{st["id"]}">{st["icon"]} {st["no"]} {st["short"]}</a></th>' + ''.join(f'<td>{d[3][i]}</td>' for d in DRIVERS) + '</tr>'
MATRIX = f'<div class="table-wrap mx"><table><thead><tr><th>阶段</th>{th}</tr></thead><tbody>{rows}</tbody></table></div>'

# ---------- weeks ----------
sname = {s['id']: f'{s["no"]} {s["short"]}' for s in STAGES}
wr = ''
for w in WEEKS:
    wk, title, date, lens, sids, note = w
    chips = '全部阶段' if sids == '全部' else ' '.join(f'<a class="chip" href="#{i}">{sname[i]}</a>' for i in sids.split(','))
    lt = f'<span class="lt l{lens}">{LENS[lens][0]}</span>' if lens in LENS else f'<span class="tag gray">{lens}</span>'
    wr += f'<tr><td><b>{wk}</b></td><td>{title}<div class="muted">{date}</div></td><td>{lt}</td><td>{chips}</td><td>{warn(note)}</td></tr>'
WEEKT = f'<div class="table-wrap"><table><thead><tr><th>周</th><th>主题</th><th>块</th><th>对应阶段</th><th>怎么用这张图</th></tr></thead><tbody>{wr}</tbody></table></div>'

linear_pct = 5200 / 2_800_000 * 100

CSS = base_css + '''
:root{--maxw:1120px}
.unc{color:#d97706;font-weight:700;cursor:help}
.lt{display:inline-block;padding:0 9px;border-radius:99px;font-size:12.5px;line-height:1.75;white-space:nowrap;margin-right:4px;font-weight:600}
.lt.lA{background:#ede9fe;color:#6d28d9}.lt.lB{background:#fef3c7;color:#92400e}.lt.lC{background:#dbeafe;color:#1e40af}
.lensbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0}
.lensbar button{font:inherit;font-size:13.5px;border:1px solid var(--line);background:#fff;border-radius:99px;padding:3px 14px;cursor:pointer}
.lensbar button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
svg.tl{width:100%;height:auto;display:block}
svg.tl .era{font-size:12px;fill:#64748b}
svg.tl .tick{font-size:11.5px;fill:#64748b}
svg.tl .num{font-size:10px;font-weight:700;fill:#0f172a}
svg.tl .sname{font-size:12.5px;fill:#0f172a;font-weight:600}
svg.tl a.dim{opacity:.15}
.stage{background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:22px 26px;margin:18px 0;box-shadow:0 1px 3px rgba(15,23,42,.04);transition:opacity .2s}
.stage.dim{opacity:.25}
.sthead{display:flex;gap:14px;align-items:flex-start}
.stno{flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--hero1),var(--hero2));color:#fff;font-weight:700;font-size:18px}
.stage h3{margin:0;font-size:21px}
.dates{font-size:14px;color:var(--muted)}
.tags{margin-top:4px}.sep{font-size:12px;color:var(--muted);margin:0 4px 0 6px}
.wk{display:inline-block;font-size:12px;font-family:var(--mono);background:#0f172a;color:#fff;border-radius:6px;padding:0 6px;margin-right:3px}
.core{background:var(--tint);border-left:4px solid var(--brand);padding:8px 14px;border-radius:8px;font-size:16.5px;color:var(--ink)}
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.stage h4{margin:.9em 0 .3em;font-size:14.5px;color:#334155}
.stage ul{margin:.2em 0;padding-left:1.2em;font-size:14.5px;line-height:1.7}
.ew{display:grid;gap:8px;font-size:14.5px;line-height:1.7}
.ew>div{background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:8px 12px}
.ewl{display:block;font-size:12px;font-weight:700;color:var(--brand)}
.abcrow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.abc{border-radius:10px;padding:8px 12px;font-size:14px;line-height:1.65;border:1px solid var(--line)}
.abc p{margin:.3em 0 0}
.abc.lA{background:#faf5ff}.abc.lB{background:#fffbeb}.abc.lC{background:#eff6ff}
.fact,.interp{border-radius:10px;padding:2px 14px 8px}
.fact{background:#f0fdf4;border:1px solid #bbf7d0}.interp{background:#fff7ed;border:1px solid #fed7aa}
.who{display:inline-block;font-weight:700;margin-right:6px;color:#9a3412}
.next{margin-top:12px;font-size:15px;border-top:1px dashed var(--line);padding-top:10px}
.mx table{font-size:13px}.mx td{min-width:7.5em;line-height:1.55}
.mx thead th{white-space:normal}.mx th.dn{background:#fff;white-space:nowrap;font-weight:600}.mx th.dn a{color:var(--ink);text-decoration:none}
.mx th small{display:block;font-weight:400;color:var(--muted);font-size:11.5px}
.chip{display:inline-block;font-size:12.5px;background:#f1f5f9;border-radius:6px;padding:0 7px;margin:1px 2px;text-decoration:none;color:var(--ink)}
.muted{color:var(--muted);font-size:12.5px}
.legend{display:flex;flex-wrap:wrap;gap:14px;font-size:14px}
.arrowline{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:14px}
.arrowline span.s{background:#fff;border:1px solid var(--line);border-radius:8px;padding:2px 8px}
@media (max-width:820px){.cols2,.abcrow{grid-template-columns:1fr}}
@media print{.lensbar{display:none}.stage{break-inside:avoid}}
'''

arrow = ' <span>→</span> '.join(f'<span class="s">{s["icon"]} {s["short"]}</span>' for s in STAGES)

HTML = f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>学者 · 人类文明演化 Roadmap v0.1</title><style>{CSS}</style></head><body>
<header class="hero"><div class="wrap"><span class="badge">草案 v0.1 · 待 focus 看大纲</span><h1>人类文明演化 Roadmap</h1>
<p class="sub">从人属到 AI：11 次转变，看人类如何一步步走到今天</p><p class="meta">2026-10-18（北京时间）· 人生-学者 · 配合 Q4「人类文明通史」W0–W10</p></div></header>
<main class="wrap after-hero">
<div class="metrics"><div class="metric"><b>11 次转变</b><span class="label">从约 280 万年前到今天</span></div>
<div class="metric"><b>3 块透镜</b><span class="label">A 文化 · B 宗教与制度 · C 生产力</span></div>
<div class="metric"><b>4 条驱动力</b><span class="label">能量 · 信息载体 · 协作规模 · 观念</span></div>
<div class="metric"><b>W1–W10</b><span class="label">每个阶段都标了对应课程周</span></div></div>

<div class="callout summary"><div class="callout-title">先看结论</div>
<p>人类史可以看成<strong>四个量反复突破上限</strong>的过程：能调动多少<strong>能量</strong>、靠什么<strong>存储和传播信息</strong>、能组织多少<strong>陌生人协作</strong>、用什么<strong>观念</strong>证明秩序正当。每一次大转变，通常是其中一两个量先突破，再把另外几个量拖着走。</p>
<div class="arrowline">{arrow}</div></div>

<div class="callout info"><div class="callout-title">怎么读这页</div>
<div class="legend"><span>✅ <b>事实锚点</b>：考古、文献上的共识</span><span>🔍 <b>解释框架</b>：某位作者或学派的观点（赫拉利、戴蒙德、雅斯贝尔斯等），可以争论</span><span><span class="unc">⚠</span> 年代或结论有争议</span><span>≈ 共识区间的近似值</span></div>
<p style="margin-top:6px">课程按 A/B/C 三块分主题讲，本页按时间顺序讲；最后一节是两者的对照表。</p></div>

<div class="card"><h2><span class="n">1</span>总时间轴（对数刻度）</h2>
<p>时间跨度相差太大：人属约 280 万年，有文字的历史只有约 5200 年。如果用线性刻度，有文字的历史只占整条轴的 <b>{linear_pct:.2f}%</b>，在屏幕上就是一条细线。所以这里用<b>对数刻度</b>：越靠右，每一格代表的时间越短。</p>
<div class="lensbar"><span class="muted">按透镜高亮：</span><button class="on" data-l="all">全部</button><button data-l="A">A 文化发展</button><button data-l="B">B 宗教与制度</button><button data-l="C">C 生产力革命</button></div>
{TL}
<p class="muted">条带 = 阶段大致的时间范围，圆点 = 代表性节点；颜色按该阶段的主透镜着色。点击可以跳到对应阶段。</p></div>

<h2 style="margin-top:34px">2. 十一次转变</h2>
{CARDS}

<div class="card"><h2><span class="n">3</span>横向看：四条驱动力的演化</h2>
<p>把 11 个阶段压进一张表，竖着读每一列，就能看到同一个量是怎样一级一级跳上去的。</p>
{MATRIX}
<div class="cards brand">
<div class="item"><p><b>⚡ 能量</b>：两次真正的断层是农业（驯化太阳能）和工业（开采化石里储存的太阳能）。AI 时代算力变成了电力的函数。</p></div>
<div class="item"><p><b>📡 信息载体</b>：语言 → 文字 → 印刷 → 电信 → 互联网 → 模型。每一次都降低了复制和检验知识的成本。</p></div>
<div class="item"><p><b>🤝 协作规模</b>：亲缘 → 城邦 → 帝国 → 民族国家与市场 → 平台。每一级都需要新的「信任技术」（法律、货币、宗教、科层）。</p></div>
<div class="item"><p><b>💡 观念</b>：观念回答「凭什么服从」：神王 → 天道或上帝 → 人民与权利 → ？观念既是结果，也是原因。</p></div></div>
<p class="muted">🔍 这四条驱动力是本页用的分析框架（受莫里斯「社会发展指数」、斯密尔的能源史、赫拉利的「虚构与协作」等启发，属于 AI 推断的组织方式），不是学界的统一模型。</p></div>

<div class="card"><h2><span class="n">4</span>对照课程：W0–W10</h2>
{WEEKT}
<div class="callout warn"><div class="callout-title">一个顺序上的提醒</div><p>课程按块排，所以「农业革命」排在 W7，但按时间顺序它是第 2 个阶段。建议在 W1 之前花 15 分钟扫一遍本页的阶段 1–3，这样后面每周都有可挂靠的位置。这和之前「W0 并入 W1 开场」的安排一致。</p></div></div>

<div class="card"><h2><span class="n">5</span>书架对照（来自 Q4 课程书单）</h2>
<div class="table-wrap"><table><thead><tr><th>书</th><th>主要对应阶段</th><th>主张类型</th></tr></thead><tbody>
<tr><td>麦克尼尔《世界简史》</td><td>全部（主骨架）</td><td>通史综合</td></tr>
<tr><td>贡布里希《世界小史》</td><td>1–7，W0 入门</td><td>通史入门</td></tr>
<tr><td>赫拉利《人类简史》</td><td>1、2、8</td><td><span class="tag yellow">科普叙事，需标注解释</span></td></tr>
<tr><td>戴蒙德《枪炮、病菌与钢铁》</td><td>2、3、7</td><td><span class="tag yellow">地理解释，需标注</span></td></tr>
<tr><td>弗里曼《埃及、希腊与罗马》/ 赵林 / 吴晓群</td><td>3、4、5</td><td>学术入门 / 科普</td></tr>
<tr><td>李筠《中世纪》/ 杜兰特《信仰的时代》</td><td>5、6</td><td>制度史 / 通史</td></tr>
<tr><td>库马尔《千年帝国史》</td><td>5、9</td><td>比较史</td></tr>
<tr><td>吴京平《工业革命400年》</td><td>9、10</td><td>科普</td></tr>
<tr><td>里德利《创新的起源》</td><td>9–11</td><td>科普，观点鲜明</td></tr>
</tbody></table></div>
<p class="muted">微信读书链接见《学者 · 通史学习地图 v0.1》的书架一节。</p></div>

<div class="card"><h2><span class="n">6</span>不确定点与待你拍板</h2>
<ul>
<li><span class="unc">⚠</span> 语言起源时间、「认知革命」是突变还是渐进：没有定论。</li>
<li><span class="unc">⚠</span> 良渚算不算国家、二里头是不是夏、周灭商的具体年份（前 1046 是断代工程的推定年）。</li>
<li><span class="unc">⚠</span> 佛陀、老子、琐罗亚斯德的生卒年。</li>
<li><span class="unc">⚠</span> 美洲原住民人口崩溃的规模；宋代用煤和冶铁的规模估计。</li>
<li><span class="unc">⚠</span> 大分流发生在何时（约 1800 年还是更早）；AI 时代算不算独立阶段。</li>
<li>📌 阶段划分本身是一种解释（11 段是为了配合课程而选的粒度），你可以合并或拆分，例如把阶段 10 拆成「电气化与大战」「信息革命」两段。</li>
</ul></div>
</main>
<footer class="foot">学者 · 人类文明演化 Roadmap v0.1 · 离线单文件，可双击打开 · 数据源 scholar-engine/roadmap/stages.py</footer>
<script>
(function(){{var bs=document.querySelectorAll('.lensbar button');
bs.forEach(function(b){{b.addEventListener('click',function(){{var l=b.getAttribute('data-l');
bs.forEach(function(x){{x.classList.toggle('on',x===b)}});
document.querySelectorAll('.stage,.tlst').forEach(function(el){{var ls=(el.getAttribute('data-lenses')||'').split(' ');
var on=(l==='all')||ls.indexOf(l)>=0;el.classList.toggle('dim',!on)}});}});}});}})();
</script></body></html>'''
open(OUT, 'w', encoding='utf-8').write(HTML)
print(OUT, len(HTML))
