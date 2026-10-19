/**
 * npm run site:build —— 生成 GitHub Pages 静态站点（只用示例数据包，可公开）：
 *   index.html / atlas-map.html / preview/ / explain/ / more.html   （来自 build-demo）
 *   maps/  my/        方法论 v1 旧在线地址，原样复制
 *   favicon.svg  manifest.webmanifest  .nojekyll  404.html  version.json
 * 输出目录：SITE_OUT 或 <repo>/site-dist（每次清空重建）。
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { extname, join, relative, resolve, sep } from "node:path";
import { loadAtlas } from "../lib/atlas";
import { REPO_ROOT } from "../lib/paths";

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (process.env.LEARN_DATA_DIR && process.env.LEARN_DATA_DIR.trim() !== "") {
  fail("公开站点只能用示例数据包构建：请先取消 LEARN_DATA_DIR（unset LEARN_DATA_DIR）再运行 npm run site:build。");
}

const out = resolve(process.env.SITE_OUT || join(REPO_ROOT, "site-dist"));
const rel = relative(out, REPO_ROOT);
if (rel === "" || !rel.startsWith("..")) fail(`输出目录不能是仓库根目录或其上级：${out}`);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// 1. 星图 + 预览 + 讲解 + 目录（示例包）
const env: NodeJS.ProcessEnv = { ...process.env, DEMO_OUT: out };
delete env.LEARN_DATA_DIR;
const demo = spawnSync(process.execPath, ["--import", "tsx", join(REPO_ROOT, "engine/pipeline/build-demo.ts")], {
  cwd: REPO_ROOT, env, encoding: "utf-8",
});
if (demo.status !== 0) fail(`build-demo 失败：\n${demo.stderr || demo.stdout}`);
process.stdout.write(demo.stdout);

// 2. 旧在线地址：maps/ 与 my/ 原样复制
for (const dir of ["maps", "my"]) {
  const src = join(REPO_ROOT, dir);
  if (!existsSync(src)) fail(`缺少目录：${dir}/`);
  cpSync(src, join(out, dir), { recursive: true });
}

// 3. 站点元文件
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="g"><stop offset="0" stop-color="#fde68a"/><stop offset="1" stop-color="#fbbf24" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="32" r="32" fill="#04060f"/><circle cx="32" cy="32" r="22" fill="url(#g)" opacity=".55"/><path d="M32 9L36.5 27.5L55 32L36.5 36.5L32 55L27.5 36.5L9 32L27.5 27.5Z" fill="#fbbf24"/></svg>\n`;
writeFileSync(join(out, "favicon.svg"), FAVICON_SVG);
writeFileSync(join(out, "manifest.webmanifest"), JSON.stringify({
  name: "学者 · 人类知识星图",
  short_name: "学者",
  start_url: "./",
  scope: "./",
  display: "standalone",
  background_color: "#04060f",
  theme_color: "#04060f",
  icons: [{ src: "favicon.svg", sizes: "any", type: "image/svg+xml" }],
}, null, 2) + "\n");
writeFileSync(join(out, ".nojekyll"), "");
// GitHub Pages 对任意子路径都返回 404.html，相对链接会失效，故用绝对路径
writeFileSync(join(out, "404.html"), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>页面不存在 · 学者</title><meta name="theme-color" content="#04060f">
<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#04060f;color:#e6edf7;font-family:"PingFang SC","Noto Sans CJK SC",system-ui,sans-serif;text-align:center;padding:0 18px}h1{font-weight:600;letter-spacing:.1em}p{color:#8b9ab3}a{color:#fbbf24}</style>
<h1>这颗星还没被点亮</h1>
<p>你要找的页面不存在，可能已移动或地址有误。</p>
<p><a href="/agent-graph-learning/">← 回到人类知识星图</a></p></html>
`);

function gitCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO_ROOT, encoding: "utf-8" });
  return r.status === 0 ? r.stdout.trim() : "unknown";
}
const atlas = loadAtlas();
writeFileSync(join(out, "version.json"), JSON.stringify({
  commit: gitCommit(),
  builtAt: new Date().toISOString(),
  atlasVersion: atlas.version,
  nodes: atlas.nodes.length,
}, null, 2) + "\n");

// 4. 首页注入 manifest / apple-touch-icon
const indexPath = join(out, "index.html");
const indexHtml = readFileSync(indexPath, "utf-8");
if (!indexHtml.includes("</head>")) fail("index.html 缺少 </head>，无法注入 manifest");
writeFileSync(indexPath, indexHtml.replace("</head>",
  `<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="favicon.svg">\n</head>`));

// 5. 安全扫描
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk(out);
const TEXT_EXT = new Set([".html", ".json", ".js", ".css", ".txt", ".webmanifest", ".md"]);
const host = hostname();
const needles = ["learn-data/", "units-private", "/workspace/", "/Users/", "/home/", ...(host.length >= 4 ? [host] : [])];
const problems: string[] = [];
for (const f of files) {
  const r = relative(out, f);
  if (r.startsWith(`maps${sep}`) || r.startsWith(`my${sep}`)) continue;
  if (!TEXT_EXT.has(extname(f))) continue;
  const text = readFileSync(f, "utf-8");
  for (const n of needles) if (text.includes(n)) problems.push(`${r}：包含 "${n}"`);
}
const finalIndex = readFileSync(indexPath, "utf-8");
for (const n of ['src="/', 'href="/']) if (finalIndex.includes(n)) problems.push(`index.html：含绝对路径 ${n}（子路径 /agent-graph-learning/ 下会失效）`);
if (problems.length) fail(`站点安全扫描未通过：\n  ${problems.join("\n  ")}`);

console.log(`✓ 站点：${out}（${files.length} 个文件）`);
