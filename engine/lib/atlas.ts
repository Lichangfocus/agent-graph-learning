import { readFileSync } from "node:fs";
import { ATLAS_PATH } from "./paths";
import { AtlasSchema, type Atlas, type AtlasEdge, type AtlasNode, type Topic } from "./schemas/atlas";

export type Diagnostics = { errors: string[]; warnings: string[] };

/** 只用于语义校验的最小图结构：Atlas 与「Atlas + 覆盖层」合并结果共用。 */
export type GraphLike = { domains: { id: string }[]; topics: Topic[]; nodes: AtlasNode[]; edges: AtlasEdge[] };

/** 语义校验：id 唯一、引用存在、topic 成员与节点 topics 一致、prereq 无环、无自环与重复边。 */
export function validateAtlasGraph(graph: GraphLike): Diagnostics {
  const errors: string[] = [];
  const warnings: string[] = [];
  const domainIds = new Set<string>();
  for (const d of graph.domains) {
    if (domainIds.has(d.id)) errors.push(`重复的领域 id: ${d.id}`);
    domainIds.add(d.id);
  }
  const topicIds = new Map<string, Topic>();
  for (const t of graph.topics) {
    if (topicIds.has(t.id)) errors.push(`重复的 topic id: ${t.id}`);
    topicIds.set(t.id, t);
    if (!domainIds.has(t.domain)) errors.push(`topic ${t.id} 引用了不存在的领域 ${t.domain}`);
  }
  const nodeIds = new Map<string, AtlasNode>();
  for (const n of graph.nodes) {
    if (nodeIds.has(n.id) || topicIds.has(n.id) || domainIds.has(n.id)) errors.push(`重复的 id: ${n.id}`);
    nodeIds.set(n.id, n);
    if (!domainIds.has(n.domain)) errors.push(`节点 ${n.id} 引用了不存在的领域 ${n.domain}`);
    for (const t of n.topics) if (!topicIds.has(t)) errors.push(`节点 ${n.id} 引用了不存在的 topic ${t}`);
    if (n.status === "ready" && !(n.quiz && n.quiz.length >= 3)) warnings.push(`ready 节点 ${n.id} 少于 3 道自测题`);
  }
  for (const t of graph.topics) {
    for (const m of t.members) if (!nodeIds.has(m.id)) errors.push(`topic ${t.id} 的成员 ${m.id} 不存在`);
  }
  const edgeIds = new Set<string>();
  const pairs = new Set<string>();
  const prereq = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (edgeIds.has(e.id)) errors.push(`重复的边 id: ${e.id}`);
    edgeIds.add(e.id);
    if (!nodeIds.has(e.src) || !nodeIds.has(e.dst)) { errors.push(`边 ${e.id} 引用了不存在的节点 (${e.src} → ${e.dst})`); continue; }
    if (e.src === e.dst) errors.push(`自环: ${e.id}`);
    const key = `${e.kind}:${e.src}->${e.dst}`;
    if (pairs.has(key)) warnings.push(`重复的边: ${key}`);
    pairs.add(key);
    if (e.kind === "prereq") prereq.set(e.src, [...(prereq.get(e.src) ?? []), e.dst]);
  }
  const cycle = findCycle([...nodeIds.keys()], prereq);
  if (cycle) errors.push(`prereq 边有环: ${cycle.join(" → ")}`);
  const touched = new Set(graph.edges.flatMap((e) => [e.src, e.dst]));
  for (const id of nodeIds.keys()) if (!touched.has(id)) warnings.push(`节点 ${id} 没有任何边（孤立）`);
  return { errors, warnings };
}

export function findCycle(ids: string[], next: Map<string, string[]>): string[] | undefined {
  const state = new Map<string, 1 | 2>();
  const path: string[] = [];
  const visit = (id: string): string[] | undefined => {
    state.set(id, 1);
    path.push(id);
    for (const to of next.get(id) ?? []) {
      if (state.get(to) === 1) return [...path.slice(path.indexOf(to)), to];
      if (!state.has(to)) { const c = visit(to); if (c) return c; }
    }
    state.set(id, 2);
    path.pop();
  };
  for (const id of ids) if (!state.has(id)) { const c = visit(id); if (c) return c; }
}

export function parseAtlas(value: unknown): Atlas {
  const parsed = AtlasSchema.safeParse(value);
  if (!parsed.success) throw new Error(`Atlas schema 校验失败:\n${parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".")}: ${i.message}`).join("\n")}`);
  const diag = validateAtlasGraph(parsed.data);
  if (diag.errors.length) throw new Error(`Atlas 语义校验失败:\n${diag.errors.join("\n")}`);
  return parsed.data;
}

export function loadAtlas(path = ATLAS_PATH): Atlas {
  return parseAtlas(JSON.parse(readFileSync(path, "utf-8")));
}
