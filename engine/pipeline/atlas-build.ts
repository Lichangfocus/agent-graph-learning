/**
 * npm run atlas:build  → atlas/world-map.json（learn.atlas.v1，CC BY-SA 4.0）
 * 输入：atlas/src/skeleton.yaml（领域/topic/stub 节点/跨领域边）
 *     + atlas/src/history-stages.json（人类文明 11 阶段，来自 engine/roadmap/stages.py，npm run atlas:stages 重新导出）
 *     + atlas/src/history-quiz.json（每阶段 3 道自测）
 * 可选：--from <另一个 world-map.json>  合并外部构建（如 scholar-engine/knowledge/world-map.json）里的同 id 节点自测题与新节点/边。
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";
import { parseAtlas, validateAtlasGraph } from "../lib/atlas";
import { REPO_ROOT, ATLAS_PATH } from "../lib/paths";
import { EdgeSchema, NodeSchema, QuizSchema, type Atlas, type AtlasEdge, type AtlasNode } from "../lib/schemas/atlas";

type Skeleton = {
  domains: Atlas["domains"];
  topics: { id: string; domain: string; name: string; desc?: string }[];
  nodes: { id: string; topic: string; kind: AtlasNode["kind"]; name: string; summary: string }[];
  edges: { src: string; dst: string; kind: AtlasEdge["kind"]; note: string; claim_type?: AtlasEdge["claim_type"] }[];
};
type Stage = Record<string, unknown> & { id: string; name: string; icon: string; core: string; dates: string; ya: [number, number]; mark: number; next: string };

const SRC = join(REPO_ROOT, "atlas", "src");
const VERSION = "0.1.0";

export function buildAtlas(updated = new Date().toISOString().slice(0, 10)): Atlas {
  const sk = yamlLoad(readFileSync(join(SRC, "skeleton.yaml"), "utf-8")) as Skeleton;
  const { stages, drivers } = JSON.parse(readFileSync(join(SRC, "history-stages.json"), "utf-8")) as { stages: Stage[]; drivers: [string, string, string, string[]][] };
  const quiz = JSON.parse(readFileSync(join(SRC, "history-quiz.json"), "utf-8")) as Record<string, unknown>;
  const topicDomain = new Map(sk.topics.map((t) => [t.id, t.domain]));

  const nodes: AtlasNode[] = sk.nodes.map((n) => ({
    id: n.id, kind: n.kind, name: n.name, summary: n.summary, status: "stub",
    domain: topicDomain.get(n.topic) ?? "unknown", topics: [n.topic],
  }));
  stages.forEach((s, i) => {
    const { id, name, icon, core, dates, ya, mark, no, short, mech, abc, east, west, facts, interp, next, lenses } = s;
    const q = Array.isArray(quiz[id]) ? (quiz[id] as unknown[]).map((x) => QuizSchema.parse(x)) : undefined;
    nodes.push({
      id, kind: "era", name, icon, summary: core, status: q && q.length >= 3 ? "ready" : "draft",
      domain: "history", topics: ["t-civ"],
      time: { ya, mark, label: dates },
      data: {
        no, short, dates, mech, abc, east, west, facts, interp, next, lenses,
        drivers: drivers.map(([label, emoji, question, values]) => ({ label, emoji, question, value: values[i] })),
      },
      quiz: q,
    });
  });
  const edges: AtlasEdge[] = [];
  for (let i = 0; i + 1 < stages.length; i++) {
    edges.push({ id: `e-${stages[i].id}-${stages[i + 1].id}`, src: stages[i].id, dst: stages[i + 1].id, kind: "leads_to", note: stages[i].next, claim_type: "主流解释" });
  }
  for (const e of sk.edges) edges.push({ id: `e-${e.src}-${e.kind}-${e.dst}`, src: e.src, dst: e.dst, kind: e.kind, note: e.note, claim_type: e.claim_type ?? "AI推断" });

  const topics = sk.topics.map((t) => ({ ...t, members: nodes.filter((n) => n.topics.includes(t.id)).map((n) => ({ id: n.id })) }));
  return parseAtlas({
    schema: "learn.atlas.v1", version: VERSION, updated,
    license: "CC BY-SA 4.0",
    claim_note: "节点内容中事实与解释分开标注；跨领域边默认 claim_type=AI推断，待 focus 审。",
    domains: sk.domains, topics, nodes, edges,
  });
}

/** 宽松合并外部 world-map：同 id 节点补自测题；新节点/边若能通过 schema 则追加。 */
export function mergeExternal(atlas: Atlas, ext: Record<string, unknown>): { atlas: Atlas; report: string[] } {
  const report: string[] = [];
  const next: Atlas = structuredClone(atlas);
  const byId = new Map(next.nodes.map((n) => [n.id, n]));
  const normQuiz = (raw: unknown) => {
    if (!Array.isArray(raw)) return undefined;
    const items = raw.map((q: Record<string, unknown>) => QuizSchema.safeParse({
      q: q.q ?? q.question, options: q.options ?? q.choices, answer: q.answer ?? q.answer_index ?? q.correct, explain: q.explain ?? q.explanation,
    })).filter((r) => r.success).map((r) => r.data!);
    return items.length >= 3 ? items : undefined;
  };
  for (const raw of (ext.nodes as Record<string, unknown>[] | undefined) ?? []) {
    const id = String(raw.id ?? "");
    const existing = byId.get(id);
    if (existing) {
      const q = normQuiz(raw.quiz);
      if (q) { existing.quiz = q; existing.status = "ready"; report.push(`补自测：${id}（${q.length} 题）`); }
      continue;
    }
    const candidate = NodeSchema.safeParse(raw);
    if (candidate.success) { next.nodes.push(candidate.data); byId.set(id, candidate.data); report.push(`新节点：${id}`); }
  }
  for (const raw of (ext.edges as Record<string, unknown>[] | undefined) ?? []) {
    const e = EdgeSchema.safeParse(raw);
    if (e.success && !next.edges.some((x) => x.id === e.data.id) && byId.has(e.data.src) && byId.has(e.data.dst)) { next.edges.push(e.data); report.push(`新边：${e.data.id}`); }
  }
  for (const t of next.topics) for (const n of next.nodes) if (n.topics.includes(t.id) && !t.members.some((m) => m.id === n.id)) t.members.push({ id: n.id });
  const diag = validateAtlasGraph(next);
  if (diag.errors.length) throw new Error(`合并后校验失败：\n${diag.errors.join("\n")}`);
  return { atlas: next, report };
}

function main() {
  const args = process.argv.slice(2);
  const fromIdx = args.indexOf("--from");
  const keepDate = existsSync(ATLAS_PATH) ? (JSON.parse(readFileSync(ATLAS_PATH, "utf-8")) as { updated?: string }).updated : undefined;
  let atlas = buildAtlas(process.env.ATLAS_UPDATED ?? keepDate);
  if (fromIdx >= 0) {
    const path = args[fromIdx + 1];
    if (!path || !existsSync(path)) { console.log(`--from 文件不存在，跳过：${path}`); }
    else {
      const merged = mergeExternal(atlas, JSON.parse(readFileSync(path, "utf-8")));
      atlas = merged.atlas;
      console.log(merged.report.length ? merged.report.join("\n") : "外部文件没有可合并的内容");
    }
  }
  writeFileSync(ATLAS_PATH, JSON.stringify(atlas, null, 1) + "\n");
  const diag = validateAtlasGraph(atlas);
  console.log(`Atlas v${atlas.version}：领域 ${atlas.domains.length} · topic ${atlas.topics.length} · 节点 ${atlas.nodes.length}（ready ${atlas.nodes.filter((n) => n.status === "ready").length}） · 边 ${atlas.edges.length} · 警告 ${diag.warnings.length}`);
  console.log(`→ ${ATLAS_PATH}`);
}

if (process.argv[1]?.endsWith("atlas-build.ts")) main();
