/**
 * 一次性导入（TASK-002）：scholar-engine world-map v3（scholar.worldmap.v1，47 节点 / 138 边）
 *   → Atlas 真源 atlas/src/{skeleton.yaml, history-stages.json, history-quiz.json}。
 * 映射规则（03-spec/变更/CR-20261018-02 §3）：
 *   - 领域 / topic / 节点 id 原样保留（d-hist、t-civ、n-thermo、s1…）；
 *   - 80 条结构边 belongs（节点→topic 47 条、topic→领域 33 条）不再是边，而是 node.topics / topic.domain；
 *     渲染时由 engine/lib/world-view.ts 还原，星图上仍是 138 条线；
 *   - 其余 58 条节点间的边保留 id / kind / note / claim_type；
 *   - 去掉与个人课表绑定的 weeks 字段；mech / interp 存成 [k, v] 对。
 * 用法：tsx engine/atlas/import-v3.ts [atlas/src/external/scholar-engine-world-map.v3.json]
 * 注意：会覆盖 atlas/src 下三份文件（事实核查后的修改会丢失），只在第一次导入或重新对齐时用。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dump } from "js-yaml";
import { REPO_ROOT } from "../lib/paths";

type V3 = {
  domains: { id: string; name: string; icon?: string; color?: string; order?: number }[];
  topics: { id: string; name: string; domain: string; members: string[]; description?: string }[];
  nodes: (Record<string, unknown> & { id: string; name: string; domain: string; home_topic: string; status: string; summary: string })[];
  edges: { id: string; src: string; dst: string; kind: string; note: string; claim_type: string }[];
};

const SRC = join(REPO_ROOT, "atlas", "src");
const input = process.argv[2] ?? join(SRC, "external", "scholar-engine-world-map.v3.json");
const v3 = JSON.parse(readFileSync(input, "utf-8")) as V3;
const topicIds = new Set(v3.topics.map((t) => t.id));
const domainIds = new Set(v3.domains.map((d) => d.id));
const stageNodes = v3.nodes.filter((n) => Array.isArray(n.quiz)).sort((a, b) => Number(a.no) - Number(b.no));
const stageIds = new Set(stageNodes.map((n) => n.id));

const structural = v3.edges.filter((e) => e.kind === "belongs" && (topicIds.has(e.dst) || domainIds.has(e.dst)));
const graphEdges = v3.edges.filter((e) => !structural.includes(e));
const nextEdges = graphEdges.filter((e) => e.id.startsWith("e-next-"));

const skeleton = {
  domains: [...v3.domains].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(({ id, name, icon, color }) => ({ id, name, icon, color })),
  topics: v3.topics.map(({ id, domain, name, description }) => ({ id, domain, name, ...(description ? { desc: description } : {}) })),
  nodes: v3.nodes.filter((n) => !stageIds.has(n.id)).map((n) => ({
    id: n.id, topic: n.home_topic, kind: (n.node_type as string) ?? "concept", name: n.name, summary: n.summary,
    ...(n.icon ? { icon: n.icon } : {}),
  })),
  edges: graphEdges.filter((e) => !nextEdges.includes(e)).map(({ id, src, dst, kind, note, claim_type }) => ({ id, src, dst, kind, note, claim_type })),
};
const header = `# Atlas 真源骨架：领域 → topic → stub 节点 + 节点间的边（人类文明通史 11 个节点在 history-stages.json）。
# 来源：scholar-engine world-map v3（engine/atlas/import-v3.ts 导入，2026-10-18），之后在这里直接编辑。
# 许可：CC BY-SA 4.0（atlas/LICENSE）。claim_type 未核实一律「AI推断」；核实过的边写 sources（TASK-005）。\n`;
writeFileSync(join(SRC, "skeleton.yaml"), header + dump(skeleton, { lineWidth: -1, flowLevel: 2, noRefs: true }));

const prevStages = JSON.parse(readFileSync(join(SRC, "history-stages.json"), "utf-8")) as { drivers: [string, string, string, string[]][] };
const driverLabels = prevStages.drivers.map((d) => d[0]);
const stages = stageNodes.map((n) => {
  const mech = (n.mech as { k: string; v: string }[]).map((m) => [m.k, m.v]);
  const interp = (n.interp as { who: string; text: string }[]).map((m) => [m.who, m.text]);
  const { id, no, icon, name, short, dates, ya, mark, lenses, core, abc, east, west, facts, next } = n;
  return { id, no, icon, name, short, dates, ya, mark, lenses, core, mech, abc, east, west, facts, interp, next };
});
const drivers = prevStages.drivers.map(([label, emoji, question]) => [label, emoji, question, stageNodes.map((n) => (n.drivers as Record<string, string>)[label])]);
if (driverLabels.length !== 4) throw new Error("drivers 应有 4 条");
writeFileSync(join(SRC, "history-stages.json"), JSON.stringify({
  _note: "人类文明 11 次大变革（Atlas 真源，CC BY-SA 4.0）。事实核查记录见 sources 与 atlas/src/fact-check.md。",
  stages, drivers,
}, null, 1) + "\n");
const quiz: Record<string, unknown> = { _note: "每阶段 3 道自测，answer 为 options 下标（0 起）。来源：scholar-engine world-map v3；TASK-005 核查。" };
for (const n of stageNodes) quiz[n.id] = n.quiz;
writeFileSync(join(SRC, "history-quiz.json"), JSON.stringify(quiz, null, 1) + "\n");

console.log(`导入 ${input}`);
console.log(`领域 ${skeleton.domains.length} · topic ${skeleton.topics.length} · stub 节点 ${skeleton.nodes.length} + 历史 ${stages.length} · 节点间边 ${graphEdges.length}（其中 leads_to 链 ${nextEdges.length}）· 结构边 ${structural.length} → 归属关系`);
