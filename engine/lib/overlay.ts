import { validateAtlasGraph, type Diagnostics } from "./atlas";
import type { Atlas, AtlasEdge, AtlasNode, Topic } from "./schemas/atlas";
import type { UserPack } from "./userpack";

export type MergedGraph = {
  atlasVersion: string;
  domains: Atlas["domains"];
  topics: (Topic & { source: "atlas" | "user" })[];
  nodes: (AtlasNode & { source: "atlas" | "user" })[];
  edges: (AtlasEdge & { source: "atlas" | "user" })[];
  diagnostics: Diagnostics;
};

/**
 * 把用户覆盖层叠到 Atlas 上。规则（03-spec §2.4）：
 * 1. 只引用、不改写：用户条目 id 与 Atlas 冲突 → 丢弃并报错，Atlas 内容不变；
 * 2. 用户 topic 是视角：成员只能引用已存在的节点；成员节点的 topics 里追加该 topic（不复制节点）；
 * 3. 用户边两端必须存在（Atlas 或用户节点），否则丢弃并报错；
 * 4. 用户节点挂到已有领域，topic 不存在时报错丢弃。
 */
export function mergeOverlay(atlas: Atlas, pack: Pick<UserPack, "nodes" | "edges" | "topics">): MergedGraph {
  const errors: string[] = [];
  const atlasIds = new Set([...atlas.domains, ...atlas.topics, ...atlas.nodes, ...atlas.edges].map((x) => x.id));
  const domains = new Set(atlas.domains.map((d) => d.id));

  const topics: MergedGraph["topics"] = atlas.topics.map((t) => ({ ...t, members: [...t.members], source: "atlas" as const }));
  const nodes: MergedGraph["nodes"] = atlas.nodes.map((n) => ({ ...n, topics: [...n.topics], source: "atlas" as const }));
  const edges: MergedGraph["edges"] = atlas.edges.map((e) => ({ ...e, source: "atlas" as const }));
  const userIds = new Set<string>();
  const claim = (id: string, what: string) => {
    if (atlasIds.has(id)) { errors.push(`用户${what} ${id} 与 Atlas 冲突，已忽略（覆盖层不能改写 Atlas）`); return false; }
    if (userIds.has(id)) { errors.push(`用户${what} ${id} 重复，已忽略`); return false; }
    userIds.add(id);
    return true;
  };

  const userTopics = pack.topics.filter((t) => claim(t.id, " topic") && (domains.has(t.domain) || (errors.push(`用户 topic ${t.id} 的领域 ${t.domain} 不存在，已忽略`), false)));
  const topicIds = new Set([...topics.map((t) => t.id), ...userTopics.map((t) => t.id)]);
  for (const n of pack.nodes) {
    if (!claim(n.id, "节点")) continue;
    if (!domains.has(n.domain)) { errors.push(`用户节点 ${n.id} 的领域 ${n.domain} 不存在，已忽略`); continue; }
    const missing = n.topics.filter((t) => !topicIds.has(t));
    if (missing.length) { errors.push(`用户节点 ${n.id} 引用了不存在的 topic ${missing.join(",")}，已忽略`); continue; }
    nodes.push({ ...n, topics: [...n.topics], source: "user" });
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const t of pack.topics.filter((t) => userTopics.includes(t))) {
    const members = t.members.filter((m) => byId.has(m.id) || (errors.push(`用户 topic ${t.id} 的成员 ${m.id} 不存在，已忽略该成员`), false));
    topics.push({ ...t, members, source: "user" });
    for (const m of members) {
      const node = byId.get(m.id)!;
      if (!node.topics.includes(t.id)) node.topics.push(t.id);
    }
  }
  // 用户节点声明的 topic，也要出现在 topic.members 里（视角一致）
  for (const n of nodes.filter((x) => x.source === "user")) {
    for (const tid of n.topics) {
      const t = topics.find((x) => x.id === tid)!;
      if (!t.members.some((m) => m.id === n.id)) t.members.push({ id: n.id });
    }
  }
  for (const e of pack.edges) {
    if (!claim(e.id, "边")) continue;
    if (!byId.has(e.src) || !byId.has(e.dst)) { errors.push(`用户边 ${e.id} 引用了不存在的节点 (${e.src} → ${e.dst})，已忽略`); continue; }
    edges.push({ ...e, source: "user" });
  }
  const graph = { domains: atlas.domains, topics, nodes, edges };
  const diag = validateAtlasGraph(graph);
  return { atlasVersion: atlas.version, ...graph, diagnostics: { errors: [...errors, ...diag.errors], warnings: diag.warnings } };
}
