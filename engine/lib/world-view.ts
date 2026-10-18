import type { MergedGraph } from "./overlay";
import { EDGE_KINDS, MASTERY_LEVELS } from "./schemas/atlas";

/**
 * Atlas（learn.atlas.v1）+ 覆盖层 → 电影感星图模板读取的视图（与 scholar-engine world-map v3 同形）。
 * 只做形状转换，不增删内容：
 *   - node.topics[0] → home_topic；kind → node_type；data.* 平铺到节点上；mech / interp 的 [k, v] 对 → 对象；
 *   - 归属关系还原成 belongs 边（节点→每个 topic、topic→领域），星图上的连线与 v3 一致；
 *   - topic.status：有 ready/draft 成员为 active，否则 stub。
 */
export const EDGE_KIND_LABELS: Record<(typeof EDGE_KINDS)[number] | "belongs", string> = {
  prereq: "建议先学", belongs: "属于", causes: "导致", leads_to: "铺垫下一步", contrast: "对照", related: "相关", parallel: "同期平行",
};

type Pair = [string, string];
const pairs = (v: unknown, a: string, b: string) =>
  Array.isArray(v) ? (v as unknown[]).map((x) => (Array.isArray(x) ? { [a]: (x as Pair)[0], [b]: (x as Pair)[1] } : x)) : v;

export function toWorldView(graph: MergedGraph, updated?: string) {
  const nodes = graph.nodes.map((n) => {
    const data = (n.data ?? {}) as Record<string, unknown>;
    const drivers = Array.isArray(data.drivers)
      ? Object.fromEntries((data.drivers as { label: string; value: string }[]).map((d) => [d.label, d.value]))
      : data.drivers;
    return {
      id: n.id, kind: "node", node_type: n.kind, name: n.name, domain: n.domain, home_topic: n.topics[0], topics: n.topics,
      status: n.status, summary: n.summary, core: n.summary, ...(n.icon ? { icon: n.icon } : {}),
      ...(n.time ? { ya: n.time.ya, mark: n.time.mark } : {}),
      ...data,
      ...(data.mech ? { mech: pairs(data.mech, "k", "v") } : {}),
      ...(data.interp ? { interp: pairs(data.interp, "who", "text") } : {}),
      ...(drivers ? { drivers } : {}),
      ...(n.time?.label && !data.dates ? { dates: n.time.label } : {}),
      ...(n.quiz ? { quiz: n.quiz } : {}),
      ...(n.sources ? { sources: n.sources } : {}),
      source: n.source,
    };
  });
  const topics = graph.topics.map((t) => {
    const members = t.members.map((m) => m.id);
    const active = members.some((id) => graph.nodes.find((n) => n.id === id)?.status !== "stub");
    return {
      id: t.id, kind: "topic", name: t.name, domain: t.domain, members, status: active ? "active" : "stub",
      ...(t.desc ? { description: t.desc } : {}), ...(t.created ? { created: t.created } : {}), source: t.source,
    };
  });
  const belongs = [
    ...graph.nodes.flatMap((n) => n.topics.map((t) => ({ id: `e-${t}-${n.id}`, src: n.id, dst: t, kind: "belongs", note: "", claim_type: "事实", source: n.source }))),
    ...topics.map((t) => ({ id: `e-${t.domain}-${t.id}`, src: t.id, dst: t.domain, kind: "belongs", note: "", claim_type: "事实", source: t.source })),
  ];
  return {
    schema: "learn.atlas.view.v1",
    version: graph.atlasVersion,
    ...(updated ? { updated } : {}),
    note: "全局唯一节点 + 有类型的边；topic 是视图。claim_type=AI推断 的连线尚未核实。",
    edge_kinds: EDGE_KIND_LABELS,
    mastery_levels: MASTERY_LEVELS,
    domains: graph.domains.map((d, i) => ({ ...d, kind: "domain", order: i })),
    topics,
    nodes,
    edges: [...belongs, ...graph.edges],
  };
}
export type WorldView = ReturnType<typeof toWorldView>;
