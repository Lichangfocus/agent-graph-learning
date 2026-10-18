import type { CourseGraph } from "../schemas/graph";

/** Cross edges express associations and never influence dependency depth. */
export function layoutGraph(graph: Pick<CourseGraph, "nodes" | "edges">) {
  const layers = new Map(graph.nodes.map((node) => [node.id, 0]));
  const incoming = new Map(graph.nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(graph.nodes.map((node) => [node.id, new Set<string>()]));
  for (const edge of graph.edges) {
    if (!layers.has(edge.from) || !layers.has(edge.to)) throw new Error("图谱边引用了未知节点");
    if (edge.type === "cross" || outgoing.get(edge.from)!.has(edge.to)) continue;
    outgoing.get(edge.from)!.add(edge.to);
    incoming.set(edge.to, incoming.get(edge.to)! + 1);
  }
  const queue = graph.nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    for (const next of outgoing.get(id)!) {
      layers.set(next, Math.max(layers.get(next)!, layers.get(id)! + 1));
      incoming.set(next, incoming.get(next)! - 1);
      if (incoming.get(next) === 0) queue.push(next);
    }
  }
  if (queue.length !== graph.nodes.length) throw new Error("hard + soft 先修图中有环");

  const nodeWidth = 164;
  const nodeHeight = 106;
  const columns = Array.from({ length: Math.max(0, ...layers.values()) + 1 }, (_, layer) =>
    graph.nodes.filter((node) => layers.get(node.id) === layer).sort((a, b) => a.week - b.week)
  );
  const rows = Math.max(1, ...columns.map((column) => column.length));
  const height = 96 + rows * 150;
  const nodes = columns.flatMap((column, layer) => column.map((node, row) => ({
    ...node,
    layer,
    x: 24 + layer * 216,
    y: 76 + (rows - column.length) * 75 + row * 150,
  })));
  return { nodes, width: 48 + (columns.length - 1) * 216 + nodeWidth, height, nodeWidth, nodeHeight };
}
