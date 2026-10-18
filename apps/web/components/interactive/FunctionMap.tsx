"use client";
import { useMemo, useState } from "react";

type Bin = { id: string; label: string; description?: string };
type Work = { artworkId: string; label?: string; src?: string };
type ScholarView = {
  artworkId: string;
  primary: string[];
  also?: string[];
  claimType: "fact" | "consensus" | "disputed" | "ai-inferred";
  summary: string;
  source?: string;
};

type Props = {
  title?: string;
  instruction?: string;
  bins: Bin[];
  works: Work[];
  scholarViews: ScholarView[];
  reflectPrompt?: string;
};

const CLAIM_LABEL: Record<ScholarView["claimType"], string> = {
  fact: "可测量事实",
  consensus: "学界共识",
  disputed: "有争议",
  "ai-inferred": "AI 推断",
};

export function FunctionMap({
  title,
  instruction,
  bins,
  works,
  scholarViews,
  reflectPrompt,
}: Props) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const binById = useMemo(() => new Map(bins.map((bin) => [bin.id, bin])), [bins]);
  const allAssigned = works.every((work) => Boolean(assignments[work.artworkId]));

  function assign(artworkId: string, binId: string) {
    setAssignments((prev) => ({ ...prev, [artworkId]: binId }));
    setSelectedWork(null);
  }

  function clear(artworkId: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[artworkId];
      return next;
    });
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="font-semibold">{title || "功能地图"}</div>
      <p className="mt-1 text-sm text-zinc-600">
        {instruction ||
          "把作品放到你认为的主功能格子里。功能常常叠加，没有唯一正确答案。"}
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        操作：先点选作品，再点格子；或直接拖到格子。可随时改。
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {works.map((work) => {
          const assigned = assignments[work.artworkId];
          const active = selectedWork === work.artworkId;
          return (
            <button
              key={work.artworkId}
              type="button"
              draggable
              onDragStart={() => setDragging(work.artworkId)}
              onDragEnd={() => setDragging(null)}
              onClick={() =>
                setSelectedWork((prev) =>
                  prev === work.artworkId ? null : work.artworkId
                )
              }
              className={`flex items-center gap-3 rounded border p-2 text-left transition ${
                active
                  ? "border-emerald-600 ring-2 ring-emerald-200"
                  : "border-zinc-200 hover:border-emerald-400"
              }`}
            >
              {work.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={work.src}
                  alt={work.label || work.artworkId}
                  className="h-16 w-16 rounded object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400">
                  {work.artworkId}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {work.label || work.artworkId}
                </div>
                <div className="text-xs text-zinc-500">
                  {assigned
                    ? `已放入：${binById.get(assigned)?.label || assigned}`
                    : active
                      ? "已选中 · 再点一个格子"
                      : "未放置"}
                </div>
                {assigned && (
                  <span
                    className="mt-1 inline-block text-[11px] text-emerald-700 underline"
                    onClick={(event) => {
                      event.stopPropagation();
                      clear(work.artworkId);
                    }}
                  >
                    清除
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {bins.map((bin) => {
          const inBin = works.filter(
            (work) => assignments[work.artworkId] === bin.id
          );
          return (
            <div
              key={bin.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragging) assign(dragging, bin.id);
              }}
              onClick={() => {
                if (selectedWork) assign(selectedWork, bin.id);
              }}
              className={`min-h-[120px] rounded-lg border-2 border-dashed p-3 transition ${
                selectedWork || dragging
                  ? "border-emerald-500 bg-emerald-50/60"
                  : "border-zinc-200 bg-zinc-50"
              }`}
            >
              <div className="text-sm font-semibold">{bin.label}</div>
              {bin.description && (
                <div className="mt-1 text-[11px] leading-4 text-zinc-500">
                  {bin.description}
                </div>
              )}
              <div className="mt-2 space-y-1">
                {inBin.length === 0 ? (
                  <div className="text-[11px] text-zinc-400">拖入或点选放入</div>
                ) : (
                  inBin.map((work) => (
                    <div
                      key={work.artworkId}
                      className="truncate rounded bg-white px-2 py-1 text-xs shadow-sm"
                    >
                      {work.label || work.artworkId}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!allAssigned}
          onClick={() => setRevealed(true)}
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          看学者们怎么分
        </button>
        <span className="text-xs text-zinc-500">
          {allAssigned
            ? "已全部放置。学者视图是解释模型，不是标准答案。"
            : `还差 ${works.filter((w) => !assignments[w.artworkId]).length} 件`}
        </span>
      </div>

      {revealed && (
        <div className="mt-4 space-y-3 border-t pt-4">
          <div className="text-sm font-semibold">学者视图（功能常叠加）</div>
          {scholarViews.map((view) => {
            const work = works.find((item) => item.artworkId === view.artworkId);
            const yours = assignments[view.artworkId];
            return (
              <div
                key={view.artworkId}
                className="rounded border border-zinc-200 bg-zinc-50 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{work?.label || view.artworkId}</strong>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900">
                    {CLAIM_LABEL[view.claimType]}
                  </span>
                </div>
                <div className="mt-1 text-xs text-zinc-600">
                  你的主功能：{binById.get(yours)?.label || yours || "未放置"} ·
                  学者主功能：
                  {view.primary
                    .map((id) => binById.get(id)?.label || id)
                    .join("、")}
                  {view.also?.length
                    ? `；也常见：${view.also
                        .map((id) => binById.get(id)?.label || id)
                        .join("、")}`
                    : ""}
                </div>
                <p className="mt-2 leading-6 text-zinc-700">{view.summary}</p>
                {view.source && (
                  <p className="mt-1 text-xs text-zinc-500">出处：{view.source}</p>
                )}
              </div>
            );
          })}
          {reflectPrompt && (
            <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-950">
              {reflectPrompt}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
