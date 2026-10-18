import { WEB_PUBLIC_DIR } from "../lib/paths";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadAllUnits } from "../lib/utils/content";

function unitToPublicMd(u: ReturnType<typeof loadAllUnits>[number]) {
  const lines: string[] = [];
  lines.push(`# ${u.frontmatter.title}`);
  lines.push(`模块：${u.frontmatter.module} · 预计用时：${u.frontmatter.estTimeMinutes} 分钟`);
  lines.push("");
  lines.push(`## 引子问题`);
  lines.push(u.sections.hookQuestion);
  lines.push("");
  lines.push(`## 核心叙事`);
  for (const p of u.sections.coreNarrative) {
    lines.push(p);
    lines.push("");
  }
  lines.push(`## 关键概念`);
  for (const kc of u.sections.keyConcepts) {
    lines.push(`- ${kc.term}：${kc.explanation}${kc.analogy ? `（类比：${kc.analogy}）` : ""}`);
    if (kc.analogyLimit) lines.push(`  类比失效点：${kc.analogyLimit}`);
    if (kc.canon) {
      lines.push("");
      lines.push(`> **${kc.canon.quote ? "原典（引用）" : "原典（转述）"}**`);
      for (const line of kc.canon.formal.split(/\r?\n/)) lines.push(`> ${line}`);
      lines.push(`> 出处：${kc.canon.source}`);
      if (kc.canon.textbook) lines.push(`> 教材位置：${kc.canon.textbook}`);
      lines.push("");
    }
  }
  lines.push("");
  if (u.sections.masteryEvidence?.length) {
    lines.push("## 掌握证据");
    for (const evidence of u.sections.masteryEvidence) lines.push(`- ${evidence}`);
    lines.push("");
  }
  lines.push("## 自查练习");
  for (const q of u.sections.checkYourself) {
    lines.push(`- ${q.id}: ${q.question}`);
    const options = q.options?.map((option) => option.text) ?? q.choices;
    options?.forEach((text, index) => lines.push(`  - ${index + 1}. ${text}`));
    if (q.hint) lines.push(`  提示：${q.hint}`);
  }
  lines.push("");
  lines.push(`## 连接 AI 与未来生活`);
  lines.push(u.sections.aiAndFutureLife);
  lines.push("");
  lines.push("## 答案与解析");
  for (const q of u.sections.checkYourself) {
    lines.push(`- ${q.id}: ${q.answer}`);
    if (q.options) {
      q.options.forEach((option, index) => {
        lines.push(`  - ${index + 1}. ${option.text}${option.correct === true ? "（正确）" : ""}`);
        if (option.why) lines.push(`    理由：${option.why}`);
      });
    }
    if (q.explanation) lines.push(`  解析：${q.explanation}`);
  }
  lines.push("");
  return lines.join("\n");
}

function buildLlmsTxt(unitsBaseUrl: string, jsonUrl: string) {
  return [
    "llms.txt: 供 AI 读取本站结构与内容的入口（机器可读）。",
    "",
    `- JSON 列表：${jsonUrl}`,
    `- 每个单元的 Markdown 导出位于：${unitsBaseUrl}/{unitId}.md`,
    "",
    "结构说明：",
    "- JSON 内字段遵循 schema/unit.schema.json。",
    "- Markdown 导出包含：引子、叙事、关键概念及原典层、掌握证据、自查题与提示、AI 链接和文末答案。",
    "",
    "使用建议：尊重学习者画像（profile/learner-profile.yaml），避免过多术语，遵循类比偏好。",
    "",
  ].join("\n");
}

function main() {
  const units = loadAllUnits();
  const outDir = WEB_PUBLIC_DIR;
  mkdirSync(join(outDir, "units-md"), { recursive: true });
  // write JSON
  writeFileSync(join(outDir, "units.json"), JSON.stringify(units, null, 2), "utf-8");
  // write per-unit md
  for (const u of units) {
    const md = unitToPublicMd(u);
    writeFileSync(join(outDir, "units-md", `${u.frontmatter.id}.md`), md, "utf-8");
  }
  // write llms.txt
  const unitsBaseUrl = "/units-md";
  const jsonUrl = "/units.json";
  writeFileSync(join(outDir, "llms.txt"), buildLlmsTxt(unitsBaseUrl, jsonUrl), "utf-8");
  console.log(`Wrote ${units.length} unit(s) to public/units.json and public/units-md/*.md`);
}

main();
