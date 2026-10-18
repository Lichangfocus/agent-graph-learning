import type { ExplainUnit } from "../lib/schemas/explain";

const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/【主张：(.+?)】/g, '<span class="claim">主张：$1</span>');

/** 把简单 mermaid flowchart（A[x] --> B[y] / A -->|t| B）离线画成 SVG；解析不了就展示源码。 */
export function mermaidToSvg(src: string): string | null {
  const labels = new Map<string, string>(); const edges: { a: string; b: string; t?: string }[] = [];
  const node = (tok: string) => {
    const m = /^([A-Za-z0-9_]+)\s*(?:[\[\(\{]+["]?(.+?)["]?[\]\)\}]+)?$/.exec(tok.trim());
    if (!m) return null;
    if (m[2]) labels.set(m[1], m[2]); else if (!labels.has(m[1])) labels.set(m[1], m[1]);
    return m[1];
  };
  for (const line of src.split("\n").map((l) => l.trim())) {
    if (!line || /^(flowchart|graph)\b/.test(line) || line.startsWith("%%")) continue;
    const m = /^(.+?)\s*-{2,}>?\s*(?:\|(.+?)\|)?\s*(.+)$/.exec(line);
    if (m) { const a = node(m[1]), b = node(m[3]); if (!a || !b) return null; edges.push({ a, b, t: m[2] }); }
    else if (!node(line)) return null;
  }
  if (!labels.size) return null;
  const ids = [...labels.keys()]; const level = new Map(ids.map((i) => [i, 0]));
  for (let k = 0; k < ids.length; k++) for (const e of edges) if (level.get(e.b)! <= level.get(e.a)! && k < ids.length - 1) level.set(e.b, level.get(e.a)! + 1);
  const rows: string[][] = [];
  for (const id of ids) (rows[level.get(id)!] ??= []).push(id);
  const W = 200, H = 54, GX = 30, GY = 56;
  const width = Math.max(...rows.map((r) => r?.length ?? 0)) * (W + GX) + GX;
  const pos = new Map<string, { x: number; y: number }>();
  rows.forEach((r, y) => r?.forEach((id, i) => {
    const off = (width - r.length * (W + GX) + GX) / 2;
    pos.set(id, { x: off + i * (W + GX), y: GX + y * (H + GY) });
  }));
  const height = rows.length * (H + GY) - GY + GX * 2;
  const wrap = (s: string) => { const out: string[] = []; for (let i = 0; i < s.length; i += 13) out.push(s.slice(i, i + 13)); return out.slice(0, 3); };
  let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" xmlns="http://www.w3.org/2000/svg"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#8a6d3b"/></marker></defs>`;
  for (const e of edges) {
    const p = pos.get(e.a)!, q = pos.get(e.b)!;
    const x1 = p.x + W / 2, y1 = p.y + H, x2 = q.x + W / 2, y2 = q.y;
    const back = y2 <= y1;
    const d = back ? `M${p.x + W},${p.y + H / 2} C${p.x + W + 60},${p.y + H / 2} ${q.x + W + 60},${q.y + H / 2} ${q.x + W},${q.y + H / 2}` : `M${x1},${y1} L${x2},${y2}`;
    svg += `<path d="${d}" fill="none" stroke="#8a6d3b" stroke-width="1.6" marker-end="url(#ar)"/>`;
    if (e.t) svg += `<text x="${back ? Math.max(p.x, q.x) + W + 40 : (x1 + x2) / 2 + 6}" y="${back ? (p.y + q.y) / 2 + H / 2 : (y1 + y2) / 2 + 4}" class="el">${esc(e.t)}</text>`;
  }
  for (const [id, { x, y }] of pos) {
    const lines = wrap(labels.get(id)!);
    svg += `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="10" class="nd"/>`;
    lines.forEach((l, i) => { svg += `<text x="${x + W / 2}" y="${y + H / 2 + (i - (lines.length - 1) / 2) * 17 + 5}" text-anchor="middle" class="nt">${esc(l)}</text>`; });
  }
  return svg + "</svg>";
}

export function renderExplainHtml(u: ExplainUnit): string {
  const s = u.sections, f = u.frontmatter;
  const svg = mermaidToSvg(s.diagram);
  const quiz = s.checkYourself.map((q, qi) => `
    <div class="q" data-q="${qi}"><p class="qt">${qi + 1}. ${inline(q.question)}</p>
      ${(q.options ?? []).map((o, oi) => `<button class="opt" data-ok="${o.correct ? 1 : 0}" data-i="${oi}">${esc(o.text)}</button><div class="why" hidden>${o.correct ? "✓ 对。" : "✗ 不对。"}${esc(o.why ?? "")}</div>`).join("")}
      ${q.hint ? `<details class="hint"><summary>提示</summary>${esc(q.hint)}</details>` : ""}
      <div class="ans" hidden>要点：${esc(q.answer)}</div></div>`).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(f.title)} · 通俗讲解</title><style>
:root{--ink:#2b2622;--mut:#6f665e;--bg:#faf7f2;--card:#fff;--acc:#8a6d3b;--ok:#2f7d4f;--bad:#b0413e}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.75 -apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif}
main{max-width:760px;margin:0 auto;padding:28px 18px 80px}h1{font-size:28px;line-height:1.3;margin:8px 0}h2{font-size:20px;margin:40px 0 12px;border-left:4px solid var(--acc);padding-left:10px}
.meta{color:var(--mut);font-size:14px}.essence{background:#fff3dc;border-radius:14px;padding:18px 20px;font-size:20px;font-weight:600;margin:20px 0}
.hook{font-style:italic;color:var(--mut)}.card{background:var(--card);border-radius:14px;padding:16px 18px;margin:12px 0;box-shadow:0 1px 3px #0001}
.card h3{margin:0 0 6px;font-size:18px}.an{background:#eef5ff;border-radius:10px;padding:8px 12px;margin:8px 0}.lim{background:#fff0ef;border-radius:10px;padding:8px 12px}
.lab{font-size:13px;font-weight:700;color:var(--mut);margin-right:6px}.claim{font-size:13px;color:var(--mut);background:#0000000a;border-radius:6px;padding:1px 6px}
svg{width:100%;height:auto}.nd{fill:#fff;stroke:var(--acc);stroke-width:1.5}.nt{font-size:14px;fill:var(--ink)}.el{font-size:12px;fill:var(--acc)}
pre{background:#f1ece4;padding:10px;border-radius:8px;overflow:auto;font-size:13px}.myth{color:var(--bad);text-decoration:line-through}.truth{color:var(--ok)}
.opt{display:block;width:100%;text-align:left;margin:6px 0;padding:10px 12px;border:1px solid #ddd;border-radius:10px;background:#fff;font:inherit;cursor:pointer}
.opt.ok{border-color:var(--ok);background:#ecf7f0}.opt.bad{border-color:var(--bad);background:#fbeeee}.why{font-size:15px;color:var(--mut);padding:0 12px 6px}
.ans{margin-top:8px;font-size:15px}.score{position:sticky;bottom:12px;background:var(--ink);color:#fff;border-radius:999px;padding:8px 16px;width:max-content;margin:24px auto 0}
.qt{font-weight:600}.missing{color:var(--mut);font-size:15px}@media print{.score{display:none}}
</style></head><body><main>
<p class="meta">通俗讲解 · 约 ${f.estTime} 分钟 · ${esc((f.tags ?? []).join(" / "))}</p>
<h1>${esc(f.title)}</h1>
<div class="essence">一句话：${inline(s.essence)}</div>
<p class="hook">先猜一下：${inline(s.hookQuestion)}</p>
<h2>讲清楚</h2>${s.coreNarrative.map((p) => `<p>${inline(p)}</p>`).join("")}
<h2>关键概念 · 类比与它在哪里不成立</h2>${s.keyConcepts.map((c) => `<div class="card"><h3>${esc(c.term)}</h3><p>${inline(c.explanation)}</p>
<div class="an"><span class="lab">类比</span>${inline(c.analogy)}</div><div class="lim"><span class="lab">类比失效处</span>${inline(c.analogyLimit)}</div></div>`).join("")}
<h2>一个例子：${esc(s.example.title)}</h2><div class="card">${s.example.body.split(/\n+/).map((p) => `<p>${inline(p)}</p>`).join("")}</div>
<h2>一张图</h2><div class="card">${svg ?? ""}<details${svg ? "" : " open"}><summary>图的源码（mermaid）</summary><pre>${esc(s.diagram)}</pre></details></div>
<h2>常见误解</h2>${s.misconceptions.map((m) => `<div class="card"><p class="myth">${esc(m.myth)}</p><p class="truth">→ ${inline(m.truth)}</p></div>`).join("")}
<h2>自测</h2>${quiz}<div class="score" id="score">已答 0 / ${s.checkYourself.length}</div>
${s.missing ? `<h2>还缺什么</h2><p class="missing">${inline(s.missing)}</p>` : ""}
<p class="meta">来源：${esc(f.sources.join("；") || "—")}</p>
</main><script>
(function(){var done=0,right=0,total=${s.checkYourself.length};
document.querySelectorAll('.q').forEach(function(q){q.addEventListener('click',function(e){var b=e.target.closest('.opt');if(!b||q.dataset.done)return;q.dataset.done=1;done++;
var ok=b.dataset.ok==='1';if(ok)right++;b.classList.add(ok?'ok':'bad');b.nextElementSibling.hidden=false;
q.querySelectorAll('.opt').forEach(function(o){if(o.dataset.ok==='1'){o.classList.add('ok');o.nextElementSibling.hidden=false}});
q.querySelector('.ans').hidden=false;document.getElementById('score').textContent='已答 '+done+' / '+total+' · 答对 '+right+(done===total?(right===total?' · 掌握 ✓':' · 回看错题'):'');});});})();
</script></body></html>
`;
}
