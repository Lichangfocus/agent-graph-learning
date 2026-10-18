"use client";

import { useId, useState } from "react";
import type { Unit } from "@engine/lib/schemas/unit";
import { AskAI } from "./AskAI";

export function KeyConcept({ concept, unitTitle, profileHighlights }: {
  concept: Unit["sections"]["keyConcepts"][number]; unitTitle: string; profileHighlights: string[];
}) {
  const [showCanon, setShowCanon] = useState(false);
  const canonId = useId();
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="font-semibold">{concept.term}</h3>
      <p className="mt-1 text-sm leading-6 text-zinc-700">{concept.explanation}</p>
      {concept.analogy && <p className="mt-2 text-sm text-zinc-500">类比：{concept.analogy}</p>}
      {concept.analogyLimit && <p className="mt-2 border-l-2 pl-3 text-xs leading-5 text-zinc-500">类比的边界：{concept.analogyLimit}</p>}
      {concept.canon && <div className="mt-3">
        <button type="button" aria-expanded={showCanon} aria-controls={canonId} onClick={() => setShowCanon(!showCanon)}
          className="text-sm text-emerald-800 hover:underline">📖 原典怎么说</button>
        <div id={canonId} hidden={!showCanon} className="mt-3 rounded border bg-zinc-50 p-3 text-sm leading-6">
          {!concept.canon.quote && <p className="mb-2 text-xs text-zinc-500">转述，非原文引用</p>}
          <p>{concept.canon.formal}</p>
          <p className="mt-2 text-xs text-zinc-600">出处：{concept.canon.source}</p>
          {concept.canon.textbook && <p className="mt-1 text-xs text-zinc-600">教材对应：{concept.canon.textbook}</p>}
        </div>
      </div>}
      <AskAI unitTitle={unitTitle} concept={concept.term} profileHighlights={profileHighlights} />
    </div>
  );
}
