"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { CourseGraph } from "@engine/lib/schemas/graph";
import { layoutGraph } from "@engine/lib/utils/graph-layout";
import { useProgress } from "@engine/lib/progress";

const PALETTE = ["#52756b", "#8c7156", "#667d91", "#8b6875", "#747456", "#756c91"];
const EDGE_LABELS = { hard: "理解所需", soft: "建议先学", cross: "跨域联系" };

export function KnowledgeMap({ graph }: { graph: CourseGraph }) {
  const layout = layoutGraph(graph);
  const progress = useProgress();
  const [selectedId, setSelectedId] = useState(graph.nodes[0].id);
  const markerId = useId().replace(/:/g, "");
  const colors = new Map(graph.domains.map((domain, index) => [domain.id, domain.color ?? PALETTE[index % PALETTE.length]]));
  const positions = new Map(layout.nodes.map((node) => [node.id, node]));
  const selected = positions.get(selectedId)!;
  const prerequisites = graph.edges.filter((edge) => edge.to === selectedId && edge.type !== "cross");
  const associations = graph.edges.filter((edge) => edge.type === "cross" && (edge.to === selectedId || edge.from === selectedId));
  const missing = prerequisites.filter((edge) => !progress.units[edge.from]?.lit);
  const stateLabel = (id: string, built: boolean) => !built ? "即将上线" : progress.units[id]?.lit ? "已点亮" : "可学习";

  return (
    <section aria-labelledby="knowledge-map-heading" className="mb-10">
      <div className="mb-4">
        <h2 id="knowledge-map-heading" className="text-xl font-semibold">课程知识地图</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">从左到右按理解依赖展开。选择节点查看联系，也可直接打开已上线的单元。</p>
        {graph.status === "draft" && <p className="mt-1 text-xs text-zinc-500">教学关系草案 · AI 推断，待确认</p>}
      </div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-600">
        {graph.domains.map((domain) => <span key={domain.id} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: colors.get(domain.id) }} />{domain.name}
        </span>)}
      </div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-zinc-500">
        {(["hard", "soft", "cross"] as const).map((type) => <span key={type} className="flex items-center gap-2">
          <svg width="28" height="8" aria-hidden="true"><line x1="0" y1="4" x2="28" y2="4" stroke="currentColor"
            strokeWidth={type === "cross" ? 1 : 1.5} strokeDasharray={type === "hard" ? undefined : type === "soft" ? "6 4" : "1 4"} /></svg>
          {EDGE_LABELS[type]}
        </span>)}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 overflow-x-auto rounded-lg border bg-white shadow-sm" tabIndex={0} aria-label="可横向滚动的课程地图">
          <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="max-w-none" role="group" aria-label={graph.title}>
            <defs>
              <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#a1a1aa" />
              </marker>
            </defs>
            {graph.edges.map((edge, index) => {
              const from = positions.get(edge.from)!;
              const to = positions.get(edge.to)!;
              const x1 = from.x + layout.nodeWidth;
              const x2 = to.x;
              const y1 = from.y + layout.nodeHeight / 2;
              const y2 = to.y + layout.nodeHeight / 2;
              const association = edge.type === "cross";
              const distant = to.layer - from.layer > 1 || association;
              const lane = 20 + (index % 4) * 11;
              const d = distant
                ? `M ${from.x + layout.nodeWidth / 2} ${from.y} C ${from.x + layout.nodeWidth / 2} ${lane}, ${to.x + layout.nodeWidth / 2} ${lane}, ${to.x + layout.nodeWidth / 2} ${to.y}`
                : `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
              const relevant = edge.to === selectedId || edge.from === selectedId;
              return <path key={`${edge.from}-${edge.to}-${edge.type}`} d={d} fill="none"
                stroke={association ? "#a38a57" : relevant ? "#71717a" : "#a1a1aa"}
                strokeWidth={association ? 1 : relevant ? 1.7 : 1.3} opacity={relevant ? 1 : 0.55}
                strokeDasharray={edge.type === "hard" ? undefined : edge.type === "soft" ? "6 4" : "1 4"}
                strokeLinecap="round" markerEnd={`url(#${markerId})`}>
                <title>{`${positions.get(edge.from)!.name} → ${positions.get(edge.to)!.name}：${edge.why}`}</title>
              </path>;
            })}
            {layout.nodes.map((node) => {
              const built = node.status === "built";
              const lit = built && progress.units[node.id]?.lit;
              const active = selectedId === node.id;
              const color = colors.get(node.domain)!;
              return <g key={node.id} transform={`translate(${node.x},${node.y})`} onMouseEnter={() => setSelectedId(node.id)}>
                <g role="button" tabIndex={0} aria-label={`${node.id.toUpperCase()} ${node.name}，${stateLabel(node.id, built)}，查看详情`}
                  aria-pressed={active} onFocus={() => setSelectedId(node.id)} onClick={() => setSelectedId(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(node.id); }
                  }} className="cursor-pointer outline-offset-4">
                  <rect width={layout.nodeWidth} height={layout.nodeHeight} rx="8" fill={lit ? "#ecf3ef" : built ? "#ffffff" : "#f4f4f5"}
                    stroke={color} strokeOpacity={built || active ? 1 : 0.55} strokeWidth={active ? 2 : 1} />
                  <rect x="0" y="12" width="3" height="82" rx="1" fill={color} opacity={built ? 1 : 0.55} />
                  <text x="13" y="24" fontSize="10" fill="#71717a">{node.id.toUpperCase()} · 第 {node.week} 周 · {node.module}</text>
                  <text x="13" y="49" fontSize="13" fontWeight="500" fill={built ? "#27272a" : "#71717a"}>{node.icon} {node.name}</text>
                  <text x="13" y="70" fontSize="10" fill={lit ? "#3d6857" : "#71717a"}>{stateLabel(node.id, built)}</text>
                </g>
                {built && <a href={`/units/${node.id}`} aria-label={`打开 ${node.name}`} onFocus={() => setSelectedId(node.id)}>
                  <text x="13" y="92" fontSize="11" fill="#3d6857" className="hover:underline">打开单元 →</text>
                </a>}
              </g>;
            })}
          </svg>
        </div>
        <aside className="rounded-lg border bg-white p-4 shadow-sm" aria-label="单元详情" aria-live="polite">
          <p className="text-xs text-zinc-500">{selected.id.toUpperCase()} · 第 {selected.week} 周 · {selected.module}</p>
          <h3 className="mt-2 font-semibold">{selected.name}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">{selected.desc}</p>
          <p className="mt-2 text-xs text-zinc-500">{stateLabel(selected.id, selected.status === "built")}</p>
          {missing.length > 0 && <p className="mt-3 rounded bg-zinc-50 p-2 text-xs leading-5 text-zinc-600">
            建议先学：{missing.map((edge) => `${edge.from.toUpperCase()} ${positions.get(edge.from)!.name}`).join("、")}。也可以按自己的问题探索。
          </p>}
          {selected.status === "built" && <Link href={`/units/${selected.id}`} className="mt-3 inline-block text-sm text-emerald-800 hover:underline">打开单元 →</Link>}
          <h4 className="mt-4 text-sm font-medium">先修联系</h4>
          {prerequisites.length === 0 && <p className="mt-2 text-xs text-zinc-500">可从这里开始。</p>}
          {[...prerequisites, ...associations].map((edge) => {
            const otherId = edge.to === selectedId ? edge.from : edge.to;
            const other = positions.get(otherId)!;
            return <div key={`${edge.from}-${edge.to}-${edge.type}`} className="mt-3 border-t pt-3 text-xs leading-5">
              <p className="font-medium text-zinc-700">{EDGE_LABELS[edge.type]} · {other.id.toUpperCase()} {other.name}</p>
              <p className="mt-1 text-zinc-500">{edge.why}</p>
            </div>;
          })}
        </aside>
      </div>
      <details className="mt-4 rounded-lg border bg-white p-4 text-sm shadow-sm">
        <summary className="cursor-pointer font-medium">为什么不按教科书顺序</summary>
        <p className="mt-3 whitespace-pre-line leading-7 text-zinc-600">{graph.reorder}</p>
      </details>
    </section>
  );
}
