import { loadCourseGraph, validateGraph } from "../lib/utils/graph";

function main() {
  try {
    const graph = loadCourseGraph();
    const { warnings, startingNodes } = validateGraph(graph);
    console.log(`图谱 ${graph.id}: 节点 ${graph.nodes.length} 个，边 ${graph.edges.length} 条，起点 ${startingNodes.length} 个（${startingNodes.join(", ")}）`);
    for (const node of graph.nodes) console.log(`- ${node.id}: ${node.status}${node.status === "built" ? "（有 unit content）" : "（待建单元）"}`);
    for (const warning of warnings) console.warn(`WARN: ${warning}`);
    console.log(`结果: PASS（${warnings.length} warning(s)）`);
  } catch (error) {
    console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    console.error("结果: FAIL");
    process.exitCode = 1;
  }
}

main();
