import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { JSON_SCHEMA, load as yamlLoad } from "js-yaml";
import { courseGraphPath, unitDir } from "../paths";
import { CourseGraphSchema, type CourseGraph } from "../schemas/graph";

export type GraphDiagnostics = {
  errors: string[];
  warnings: string[];
  startingNodes: string[];
};

/** Semantic checks shared by the CLI and course exporter. Cross edges are associations. */
export function validateGraph(graph: CourseGraph): GraphDiagnostics {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodes = new Map<string, CourseGraph["nodes"][number]>();
  const domains = new Set<string>();
  for (const domain of graph.domains) {
    if (domains.has(domain.id)) errors.push(`重复的领域 id: ${domain.id}`);
    domains.add(domain.id);
  }
  for (const node of graph.nodes) {
    if (nodes.has(node.id)) errors.push(`重复的节点 id: ${node.id}`);
    nodes.set(node.id, node);
    if (!domains.has(node.domain)) errors.push(`节点 ${node.id} 引用了不存在的领域 ${node.domain}`);
  }
  const hard = new Map<string, Set<string>>();
  const prerequisites = new Map<string, Set<string>>();
  for (const id of nodes.keys()) {
    hard.set(id, new Set());
    prerequisites.set(id, new Set());
  }
  const hardTargets = new Set<string>();
  const touched = new Set<string>();
  for (const edge of graph.edges) {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) {
      errors.push(`边 ${edge.from} -> ${edge.to} 引用了不存在的节点`);
      continue;
    }
    if (edge.from === edge.to) errors.push(`自环: ${edge.from} -> ${edge.to}`);
    touched.add(edge.from);
    touched.add(edge.to);
    if (edge.type === "hard") {
      hard.get(edge.from)!.add(edge.to);
      hardTargets.add(edge.to);
    }
    if (edge.type !== "cross") {
      prerequisites.get(edge.from)!.add(edge.to);
      if (from.week > to.week) {
        warnings.push(`${edge.type} 边 ${edge.from} -> ${edge.to}: 先修周次 W${from.week} 晚于后继 W${to.week}，请检查方向或课表顺序`);
      }
    }
  }

  // DFS over hard + soft only; report the actual cycle, without its entry path.
  const visited = new Set<string>();
  const active = new Set<string>();
  const path: string[] = [];
  function findCycle(id: string): string[] | undefined {
    visited.add(id);
    active.add(id);
    path.push(id);
    for (const next of prerequisites.get(id)!) {
      if (active.has(next)) return [...path.slice(path.indexOf(next)), next];
      if (!visited.has(next)) {
        const cycle = findCycle(next);
        if (cycle) return cycle;
      }
    }
    active.delete(id);
    path.pop();
  }
  for (const id of nodes.keys()) {
    if (visited.has(id)) continue;
    const cycle = findCycle(id);
    if (cycle) {
      errors.push(`hard+soft 先修图中有环: ${cycle.join(" -> ")}`);
      break;
    }
  }

  const startingNodes = [...nodes.keys()].filter((id) => !hardTargets.has(id));
  if (!startingNodes.length) errors.push("没有起点节点（每个节点都有 incoming hard 先修边）");

  function hasAlternateHardPath(from: string, to: string): boolean {
    const seen = new Set([from]);
    const stack = [from];
    while (stack.length) {
      const current = stack.pop()!;
      for (const next of hard.get(current)!) {
        if (current === from && next === to) continue;
        if (next === to) return true;
        if (!seen.has(next)) {
          seen.add(next);
          stack.push(next);
        }
      }
    }
    return false;
  }
  for (const [from, targets] of hard) {
    for (const to of targets) {
      if (hasAlternateHardPath(from, to)) {
        warnings.push(`硬边 ${from} -> ${to} 是传递冗余（已有其他硬路径），建议删除或降为 soft`);
      }
    }
  }
  for (const id of nodes.keys()) {
    if (!touched.has(id)) warnings.push(`节点 ${id} 没有任何边（孤立节点）`);
  }
  return { errors, warnings, startingNodes };
}

/** Read only the canonical YAML, validate it, then derive availability locally. */
export function loadCourseGraph(
  graphPath = courseGraphPath(),
  unitsDir?: string
) {
  // JSON_SCHEMA keeps unquoted YYYY-MM-DD as a string rather than a JS Date.
  const parsed = CourseGraphSchema.safeParse(yamlLoad(readFileSync(graphPath, "utf-8"), { schema: JSON_SCHEMA }));
  if (!parsed.success) {
    throw new Error(`Graph schema validation failed:\n${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n")}`);
  }
  const diagnostics = validateGraph(parsed.data);
  if (diagnostics.errors.length) {
    throw new Error(`Graph validation failed:\n${diagnostics.errors.join("\n")}`);
  }
  return {
    ...parsed.data,
    nodes: parsed.data.nodes.map((node) => ({
      ...node,
      status: (unitsDir ? existsSync(join(unitsDir, node.id, "source.md")) : Boolean(unitDir(node.id))) ? "built" as const : "planned" as const,
    })),
  };
}
