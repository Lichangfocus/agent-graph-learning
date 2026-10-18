/**
 * npm run demo —— 生成可双击打开的离线 demo：
 *   atlas-map.html   知识星图（Atlas + 数据包覆盖层）+ 时间轴 + 11 个历史节点短片与自测
 *   preview/         单元预览（公开单元 + 数据包私人单元）
 *   explain/         讲解单页示例
 *   index.html       入口
 * 未设置 LEARN_DATA_DIR → 用示例数据包，输出到 demo/（可提交、可公开）；
 * 设置了 LEARN_DATA_DIR → 输出到 <data>/builds/（含个人数据，只进私有仓库）。
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadAtlas } from "../lib/atlas";
import { renderAtlasMap } from "../lib/atlas-map";
import { countLit, masteryFromLog } from "../lib/mastery";
import { mergeOverlay } from "../lib/overlay";
import { REPO_ROOT, dataDir, dataPath, usingUserData } from "../lib/paths";
import { loadUserPack } from "../lib/userpack";
import { loadExplainUnit } from "../lib/utils/explain";
import { renderExplainHtml } from "./explain-render";

const out = process.env.DEMO_OUT ?? (usingUserData() ? dataPath("builds") : join(REPO_ROOT, "demo"));
mkdirSync(out, { recursive: true });

const atlas = loadAtlas();
const pack = loadUserPack();
const merged = mergeOverlay(atlas, pack);
if (merged.diagnostics.errors.length || pack.problems.length) {
  console.error([...pack.problems, ...merged.diagnostics.errors].join("\n"));
  process.exit(1);
}
writeFileSync(join(out, "atlas-map.html"), renderAtlasMap(merged, pack.log, { owner: pack.meta?.owner ?? "local", demo: !usingUserData() }));
const { lit, total } = countLit(masteryFromLog(pack.log, merged.nodes.map((n) => n.id), merged.edges));
console.log(`✓ 星图：${join(out, "atlas-map.html")}（节点 ${total}，已点亮 ${lit}）`);

const preview = spawnSync(process.execPath, ["--import", "tsx", join(REPO_ROOT, "engine/pipeline/build-preview.ts")], {
  cwd: REPO_ROOT, env: { ...process.env, PREVIEW_OUT: join(out, "preview") }, encoding: "utf-8",
});
if (preview.status !== 0) { console.error(preview.stderr || preview.stdout); process.exit(1); }
console.log(`✓ 单元预览：${join(out, "preview", "index.html")}`);

const explainRoot = usingUserData() && existsSync(dataPath("units-explain")) ? dataPath("units-explain") : join(REPO_ROOT, "units-explain");
const explained: string[] = [];
if (existsSync(explainRoot)) {
  mkdirSync(join(out, "explain"), { recursive: true });
  for (const slug of readdirSync(explainRoot)) {
    const src = join(explainRoot, slug, "source.md");
    if (!existsSync(src)) continue;
    writeFileSync(join(out, "explain", `${slug}.html`), renderExplainHtml(loadExplainUnit(src)));
    explained.push(slug);
  }
}
console.log(`✓ 讲解页：${explained.length} 个`);

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
writeFileSync(join(out, "index.html"), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agent Graph Learning · Demo</title>
<style>body{font-family:"PingFang SC","Noto Sans CJK SC",system-ui,sans-serif;background:#0b1020;color:#e5e7eb;max-width:760px;margin:40px auto;padding:0 18px;line-height:1.7}a{color:#7dd3fc}li{margin:6px 0}.m{color:#94a3b8;font-size:14px}</style>
<h1>Agent Graph Learning · 离线 Demo</h1>
<p class="m">数据包：${esc(usingUserData() ? dataDir() : "示例包 examples/demo-pack")} · Atlas v${esc(atlas.version)} · 生成于 ${new Date().toISOString().slice(0, 10)}</p>
<ul>
<li><a href="atlas-map.html">知识星图</a>：${atlas.domains.length} 个领域、${merged.nodes.length} 个节点；时间轴视图；11 个历史节点可「播放」并做 3 题自测点亮（已点亮 ${lit} / 共 ${total}）。</li>
${existsSync(join(out, "cinematic", "index.html")) ? `<li><a href="cinematic/index.html">电影化地图 v0.1（快照）</a>：scholar-engine 构建的星图 / 时间轴 / 自测原型，待 TASK-002 并入。</li>` : ""}
<li><a href="preview/index.html">单元预览</a>：单元页、批注与修订简报。</li>
${explained.map((s) => `<li><a href="explain/${esc(s)}.html">讲解页：${esc(s)}</a></li>`).join("\n")}
</ul>
<p class="m">全部文件离线可用，双击即可打开；进度存在浏览器本地，可在星图里「导出日志」后追加到 learn-data/log/。</p></html>
`);
console.log(`✓ 入口：${join(out, "index.html")}`);
