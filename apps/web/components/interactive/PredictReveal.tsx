"use client";
import { useState } from "react";

type Props = {
  prompt: string;
  answer: string;
  explanation?: string;
};

export function PredictReveal({ prompt, answer, explanation }: Props) {
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="font-medium">{prompt}</div>
      {!revealed && (
        <div className="mt-3">
          <textarea
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="先写下你的预测或理由……"
            className="w-full rounded border p-2 text-sm"
            rows={3}
          />
          <div className="mt-2">
            <button
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
              onClick={() => setRevealed(true)}
            >
              揭示答案
            </button>
          </div>
        </div>
      )}
      {revealed && (
        <div className="mt-3">
          <div className="text-sm">
            <span className="font-semibold">参考答案：</span>
            {answer}
          </div>
          {explanation && (
            <div className="text-sm text-zinc-700 mt-1">解析：{explanation}</div>
          )}
          {guess.trim() && (
            <div className="text-xs text-zinc-500 mt-2">你的预测：{guess}</div>
          )}
        </div>
      )}
    </div>
  );
}

