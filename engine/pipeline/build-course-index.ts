import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { loadCourseGraph } from "../lib/utils/graph";
import { WEB_PUBLIC_DIR, dataPath, unitDir as unitDirOf } from "../lib/paths";

type UnitIdx = {
  id: string; // u01
  title: string;
  week?: string; // W1
  dates?: string; // 10/10–11
  moduleId?: string; // M1
  status: "ready" | "upcoming";
};

type ModuleIdx = {
  id: string; // M1
  title: string;
  weekends?: string; // "W1 ... · W2 ..."
  units: UnitIdx[];
};

function parseFrontmatter(md: string) {
  const m = /^---\n([\s\S]*?)\n---/m.exec(md);
  if (!m) return {};
  const fm = m[1];
  const get = (k: string) => {
    const r = new RegExp(`^${k}:\\s*(.+)$`, "m").exec(fm);
    return r?.[1]?.trim();
  };
  return { id: get("id")?.replace(/"/g, ""), title: get("title")?.replace(/"/g, "") };
}

function main() {
  const curriculum = dataPath("curriculum");
  const candidates = existsSync(curriculum) ? readdirSync(curriculum).filter((f) => /^course(-.+)?\.md$/.test(f)).sort().reverse() : [];
  const src = process.env.COURSE_FILE ? resolve(process.env.COURSE_FILE) : join(curriculum, candidates.includes("course.md") ? "course.md" : candidates[0] ?? "course.md");
  if (!existsSync(src)) {
    console.log(`跳过课程索引：数据包里没有 ${src}（可用 COURSE_FILE 指定）`);
    return;
  }
  const md = readFileSync(src, "utf-8");
  const fm = parseFrontmatter(md);
  const modules: ModuleIdx[] = [];
  // Parse modules table rows
  const moduleRowRe =
    /\|\s*\*\*(M\d+)\s+([^\*]+)\*\*\s*\|\s*([^|]+)\|/g; // captures id, title, weekends text
  const section3Idx = md.indexOf("## 3.");
  const section4Idx = md.indexOf("## 4.");
  const modTable = md.slice(section3Idx, section4Idx > 0 ? section4Idx : md.length);
  let m: RegExpExecArray | null;
  while ((m = moduleRowRe.exec(modTable))) {
    modules.push({
      id: m[1],
      title: m[2].trim(),
      weekends: m[3].trim(),
      units: [],
    });
  }
  // Parse units
  // e.g. **U01（W1，10/10–11）看见是一种建构：……**
  const unitRe = /\*\*U(\d{2})（(W\d+)[，,、]\s*([^）]+)）([^\*\n]+)\*\*/g;
  const units: UnitIdx[] = [];
  while ((m = unitRe.exec(md))) {
    const idNum = m[1];
    const id = `u${idNum}`;
    const week = m[2];
    const dates = m[3];
    const title = m[4].trim();
    const status: "ready" | "upcoming" = Boolean(unitDirOf(id))
      ? "ready"
      : "upcoming";
    units.push({ id, title, week, dates, status });
  }
  // Assign units to modules by scanning headings "### Mx ... " context
  const modHeaderRe = /###\s*(M\d+)\s+([^\n]+)/g;
  const modPositions: { id: string; index: number }[] = [];
  while ((m = modHeaderRe.exec(md))) {
    modPositions.push({ id: m[1], index: m.index });
  }
  for (const u of units) {
    // find nearest preceding module header
    const pos = md.indexOf(`**U${u.id.slice(1)}`);
    let chosen: string | undefined;
    let best = -1;
    for (const mh of modPositions) {
      if (mh.index <= pos && mh.index > best) {
        best = mh.index;
        chosen = mh.id;
      }
    }
    u.moduleId = chosen;
    const mod = modules.find((mm) => mm.id === chosen);
    if (mod) mod.units.push(u);
  }
  const graph = loadCourseGraph();
  const course = {
    id: fm.id ?? "q4-2026-humanities-arts",
    title: fm.title ?? "2026 Q4 人文艺术",
    modules,
    unitsFlat: units,
    graph,
    generatedAt: new Date().toISOString(),
  };
  const outDir = WEB_PUBLIC_DIR;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "course.json"), JSON.stringify(course, null, 2), "utf-8");
  writeFileSync(join(outDir, "graph.json"), JSON.stringify(graph, null, 2), "utf-8");
  console.log(`Wrote course index to public/course.json with ${modules.length} modules.`);
}

main();
