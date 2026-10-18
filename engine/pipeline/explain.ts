import { REPO_ROOT, dataPath, usingUserData } from "../lib/paths";
/**
 * 速讲快速通道：npm run explain -- <URL | 文件.md/.txt | "问题"> [--slug xxx] [--force] [--no-llm]
 *                npm run explain -- --build <slug>   # 只校验并重建 HTML（代理手填 source.md 后用）
 * 流程：取材 → 起草 units-explain/<slug>/source.md（Codex CLI，失败则输出提示词+模板）→ 校验 → out-explain/<slug>.html
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { loadExplainUnit } from "../lib/utils/explain";
import { renderExplainHtml } from "./explain-render";

const root = REPO_ROOT;
// 讲解单元：用个人数据包时写进 <data>/units-explain 与 <data>/builds/explain；否则用框架示例目录
const EXPLAIN_UNITS = usingUserData() ? dataPath("units-explain") : join(root, "units-explain");
const EXPLAIN_OUT = usingUserData() ? dataPath("builds", "explain") : join(root, "demo", "explain");
const PROMPTS = join(root, "engine", "pipeline", "prompts");
const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const positional = args.filter((a, i) => !a.startsWith("--") && !["--slug", "--build", "--model"].includes(args[i - 1] ?? ""));
const MODEL = opt("--model") ?? process.env.EXPLAIN_MODEL ?? "gpt-6.1-sol";

function htmlToText(html: string) {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? "";
  const body = (/<article[\s\S]*?<\/article>/i.exec(html)?.[0]) ?? html;
  const text = body.replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|h\d|li)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
  return { title, text };
}

async function acquire(input: string): Promise<{ kind: string; title: string; text: string; source: string }> {
  if (/^https?:\/\//.test(input)) {
    const res = await fetch(input, { headers: { "user-agent": "Mozilla/5.0 scholar-engine explain" } });
    if (!res.ok) throw new Error(`抓取失败 ${res.status}：${input}`);
    const { title, text } = htmlToText(await res.text());
    return { kind: "url", title, text: text.slice(0, 60000), source: input };
  }
  if (existsSync(input) && [".md", ".txt", ".markdown"].includes(extname(input).toLowerCase())) {
    const text = readFileSync(input, "utf-8");
    return { kind: "file", title: /^#\s+(.+)$/m.exec(text)?.[1] ?? "", text: text.slice(0, 60000), source: resolve(input) };
  }
  return { kind: "question", title: input, text: input, source: "用户提问" };
}

function slugFor(seed: string) {
  const ascii = seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const h = createHash("sha1").update(seed).digest("hex").slice(0, 6);
  return ascii.length >= 4 ? `${ascii}-${h}` : `explain-${h}`;
}

function tryOpenCode(prompt: string, outFile: string): { ok: boolean; why: string } {
  const which = spawnSync("bash", ["-lc", "command -v opencode"], { encoding: "utf-8" });
  if (which.status !== 0) return { ok: false, why: "未安装 opencode" };
  const model = process.env.EXPLAIN_OPENCODE_MODEL;
  const r = spawnSync("opencode", ["run", ...(model ? ["-m", model] : []), prompt],
    { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], timeout: Number(process.env.EXPLAIN_OPENCODE_TIMEOUT_MS ?? 10 * 60_000) });
  const out = (r.stdout ?? "").trim();
  if (r.status !== 0 || !/^---\s*\nid:/m.test(out)) return { ok: false, why: (r.stderr || "").trim().split("\n").slice(-2).join(" | ") || `opencode exit ${r.status ?? "timeout"}` };
  writeFileSync(outFile, out.slice(out.search(/^---\s*\nid:/m)).replace(/\n```\s*$/, "") + "\n");
  return { ok: true, why: "" };
}

function draftWithFallback(prompt: string, outFile: string): { ok: boolean; why: string } {
  const reasons: string[] = [];
  for (const [name, fn] of [["opencode", tryOpenCode], ["codex", tryCodex]] as const) {
    console.log(`起草中：${name} …`);
    const r = fn(prompt, outFile);
    if (r.ok) return r;
    reasons.push(`${name}: ${r.why}`);
  }
  return { ok: false, why: reasons.join("；") };
}

function tryCodex(prompt: string, outFile: string): { ok: boolean; why: string } {
  const which = spawnSync("bash", ["-lc", "command -v codex"], { encoding: "utf-8" });
  if (which.status !== 0) return { ok: false, why: "未安装 codex CLI" };
  const auth = spawnSync("codex", ["login", "status"], { encoding: "utf-8" });
  if (!process.env.OPENAI_API_KEY && /not logged in/i.test((auth.stdout ?? "") + (auth.stderr ?? ""))) return { ok: false, why: "codex 未登录（codex login 或设置 OPENAI_API_KEY）" };
  const r = spawnSync("codex", ["exec", "-m", MODEL, "-c", "model_reasoning_effort=high",
    "--skip-git-repo-check", "--sandbox", "read-only", "--output-last-message", outFile, prompt],
    { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"], timeout: 15 * 60_000 });
  if (r.status !== 0 && existsSync(outFile)) rmSync(outFile);
  if (r.status !== 0 || !existsSync(outFile)) return { ok: false, why: (r.stderr || r.stdout || "").trim().split("\n").slice(-3).join(" | ") || `exit ${r.status}` };
  const md = readFileSync(outFile, "utf-8").trim().replace(/^```(?:md|markdown)?\n([\s\S]*)\n```$/, "$1");
  writeFileSync(outFile, md + "\n");
  return { ok: true, why: "" };
}

function build(slug: string) {
  const src = join(EXPLAIN_UNITS, slug, "source.md");
  const unit = loadExplainUnit(src);
  console.log(`✓ 校验通过：${unit.frontmatter.title} · 概念 ${unit.sections.keyConcepts.length} · 误解 ${unit.sections.misconceptions.length} · 自测 ${unit.sections.checkYourself.length}`);
  mkdirSync(EXPLAIN_OUT, { recursive: true });
  const out = join(EXPLAIN_OUT, `${slug}.html`);
  writeFileSync(out, renderExplainHtml(unit));
  console.log(`✓ HTML：${out}（双击即可离线打开）`);
}

async function main() {
  const buildSlug = opt("--build");
  if (buildSlug) return build(buildSlug);
  const input = positional.join(" ").trim();
  if (!input) { console.error('用法：npm run explain -- <URL | file.md | "问题"> [--slug s] [--force] [--no-llm]\n      npm run explain -- --build <slug>'); process.exit(64); }
  const material = await acquire(input);
  const slug = opt("--slug") ?? slugFor(material.source === "用户提问" ? input : material.source);
  const dir = join(EXPLAIN_UNITS, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "input.md"), `<!-- kind: ${material.kind} · source: ${material.source} -->\n# ${material.title}\n\n${material.text}\n`);
  const prompt = readFileSync(join(PROMPTS, "explain_template.md"), "utf-8").replace("__SLUG__", slug)
    + `\n来源：${material.source}\n\n${material.text}\n`;
  mkdirSync(join(root, ".cache", "prompts"), { recursive: true });
  const promptFile = join(root, ".cache", "prompts", `explain-${slug}.md`);
  writeFileSync(promptFile, prompt);
  const src = join(dir, "source.md");
  console.log(`取材：${material.kind} · ${material.text.length} 字 → ${dir}`);

  if (existsSync(src) && !flag("--force")) {
    console.log("已有 source.md（--force 可重新起草），直接校验构建。");
  } else {
    // 执行优先级（focus 定）：OpenCode → Codex → 交给代理（Grok Bot）手填
    const r = flag("--no-llm") ? { ok: false, why: "--no-llm" } : draftWithFallback(prompt, src);
    if (!r.ok) {
      const tpl = readFileSync(join(PROMPTS, "explain_template.md"), "utf-8");
      const skeleton = tpl.slice(tpl.indexOf("---\nid:"), tpl.indexOf("【输入材料】")).trim().replace("__SLUG__", slug);
      writeFileSync(join(dir, "source.template.md"), skeleton + "\n");
      console.log(`\n⚠ 未能自动起草（${r.why}）。交给代理手填：`);
      console.log(`  1. 读提示词：${promptFile}`);
      console.log(`  2. 按骨架写：${src}（骨架见 ${join(dir, "source.template.md")}）`);
      console.log(`  3. 构建：npm run explain -- --build ${slug}`);
      process.exit(2);
    }
  }
  build(slug);
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
