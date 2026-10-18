import matter from "gray-matter";
import { load as yamlLoad } from "js-yaml";
import { readFileSync } from "node:fs";
import { ExplainUnit, ExplainUnitSchema } from "../schemas/explain";

const HEADINGS: Record<string, string> = {
  "Essence": "essence", "Hook Question": "hookQuestion", "Core Narrative": "coreNarrative",
  "Key Concepts": "keyConcepts", "Example": "example", "Diagram": "diagram",
  "Misconceptions": "misconceptions", "Check Yourself": "checkYourself", "Missing": "missing",
};

function fenced(body: string, lang: RegExp) {
  const m = new RegExp("```(?:" + lang.source + ")\\n([\\s\\S]*?)```").exec(body);
  return m ? m[1].trim() : null;
}

export function parseExplainMarkdown(raw: string): unknown {
  const { data, content } = matter(raw);
  const sections: Record<string, string> = {};
  let cur = ""; let buf: string[] = [];
  const flush = () => { if (cur) sections[cur] = buf.join("\n").trim(); buf = []; };
  for (const line of content.split(/\r?\n/)) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) { flush(); cur = m[1].trim(); } else buf.push(line);
  }
  flush();
  const out: Record<string, unknown> = {};
  for (const [h, key] of Object.entries(HEADINGS)) {
    const body = sections[h];
    if (body === undefined) continue;
    if (["keyConcepts", "example", "misconceptions", "checkYourself"].includes(key)) {
      const y = fenced(body, /yaml|yml/);
      out[key] = y ? yamlLoad(y) : undefined;
    } else if (key === "diagram") {
      out[key] = fenced(body, /mermaid/) ?? body;
    } else if (key === "coreNarrative") {
      out[key] = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    } else out[key] = body;
  }
  return { frontmatter: data, sections: out };
}

export function loadExplainUnit(path: string): ExplainUnit {
  const parsed = ExplainUnitSchema.safeParse(parseExplainMarkdown(readFileSync(path, "utf-8")));
  if (!parsed.success) {
    throw new Error("速讲单元校验失败：\n" + parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n"));
  }
  return parsed.data;
}
