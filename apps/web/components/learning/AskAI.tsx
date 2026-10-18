"use client";

import { useState } from "react";
import { useProgress } from "@engine/lib/progress";

type Props = { unitTitle: string; concept?: string; profileHighlights: string[] };

export function AskAI({ unitTitle, concept, profileHighlights }: Props) {
  const progress = useProgress();
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState("");
  async function copyPrompt() {
    const lit = Object.entries(progress.units).filter(([, value]) => value.lit).map(([id]) => id.toUpperCase());
    const prompt = [
      "请作为我的学习伙伴，结合以下学习背景引导我：",
      ...profileHighlights.slice(0, 4).map((item) => `- ${item}`),
      `当前单元：${unitTitle}`,
      ...(concept ? [`当前概念：${concept}`] : []),
      `已点亮单元：${lit.length ? lit.join("、") : "暂无"}`,
      "请只用追问引导我，不要直接给出答案；如果我说错了，指出矛盾让我自己发现。",
      "每次只追问一个点，先从我对当前内容的理解问起。",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(prompt);
      setMessage("已复制");
      setFallback("");
    } catch {
      setMessage("请选中下方提示词并复制，粘贴到你使用的 AI 中。");
      setFallback(prompt);
    }
  }
  return (
    <div className="mt-3 text-sm">
      <button type="button" onClick={copyPrompt} className="rounded border px-3 py-1.5 text-zinc-700 hover:bg-zinc-50">问 AI</button>
      <span role="status" className="ml-2 text-xs text-zinc-500">{message}</span>
      {fallback && <textarea aria-label="问 AI 提示词" readOnly value={fallback} rows={8}
        onFocus={(event) => event.currentTarget.select()} className="mt-3 w-full rounded border bg-zinc-50 p-3 text-sm" />}
    </div>
  );
}
