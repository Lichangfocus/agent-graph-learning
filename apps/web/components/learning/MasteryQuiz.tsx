"use client";

import { useId, useState } from "react";
import type { Unit } from "@engine/lib/schemas/unit";
import { updateUnitProgress, useProgress } from "@engine/lib/progress";
import { shuffleOptions } from "@engine/lib/utils/quiz";

type Question = Unit["sections"]["checkYourself"][number];

export function MasteryQuiz({ unitId, questions }: { unitId: string; questions: Question[] }) {
  const progress = useProgress();
  const record = progress.units[unitId];
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [retellingDraft, setRetellingDraft] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const retellingId = useId();
  const mcqs = questions.filter((question) => question.options?.length);
  const allCorrect = mcqs.length > 0 && mcqs.every((question) => record?.answers[question.id] === true);
  const retelling = retellingDraft ?? record?.retelling ?? "";

  function choose(question: Question, optionIndex: number) {
    const option = shuffleOptions(question.options!, question.id)[optionIndex];
    setAttempts((current) => ({ ...current, [question.id]: optionIndex }));
    try {
      updateUnitProgress(unitId, { answers: { [question.id]: option.correct === true } });
      setMessage("");
    } catch {
      setMessage("暂时无法保存答案，请检查浏览器本地存储及已有记录，再试一次。");
    }
  }

  return (
    <div className="space-y-4">
      {questions.map((question) => {
        if (!question.options?.length) return (
          <details key={question.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <summary className="cursor-pointer font-medium">{question.question}</summary>
            <div className="mt-2 text-sm text-zinc-700">
              <p>答案：{question.answer}</p>
              {question.explanation && <p className="mt-1">解析：{question.explanation}</p>}
            </div>
          </details>
        );
        const options = shuffleOptions(question.options, question.id);
        const solved = record?.answers[question.id] === true;
        const selected = attempts[question.id] === undefined ? undefined : options[attempts[question.id]];
        const correctOption = options.find((option) => option.correct === true)!;
        return (
          <fieldset key={question.id} className="min-w-0 rounded-lg border bg-white p-4 shadow-sm">
            <legend className="px-1 font-medium">{question.question}</legend>
            <div className="space-y-2">
              {options.map((option, index) => (
                <button key={index} type="button" disabled={solved} onClick={() => choose(question, index)}
                  aria-pressed={solved ? option.correct === true : selected === option}
                  className={`w-full rounded border px-3 py-2 text-left text-sm leading-6 transition ${
                    solved && option.correct ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                      : selected === option ? "border-amber-700 bg-amber-50 text-amber-900"
                      : "border-zinc-200 hover:bg-zinc-50"
                  } disabled:cursor-default`}>
                  {option.text}
                </button>
              ))}
            </div>
            <div aria-live="polite" className="mt-3 text-sm leading-6">
              {solved || selected?.correct ? <p className="text-emerald-800">答对了。{correctOption.why || question.explanation || question.answer}</p>
                : selected && <p className="text-amber-800">再想一想：{question.hint || selected.why || "回到概念，看看这个解释能否与观察相符。"} 可以重新选择。</p>}
            </div>
          </fieldset>
        );
      })}
      {allCorrect && <div className="rounded-lg border bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm text-emerald-800">选择题已逐一答对。可以对照掌握证据，再用自己的话整理一次。</p>
        <label htmlFor={retellingId} className="text-sm font-medium">用自己的话复述（可选，≤200 字）</label>
        <textarea id={retellingId} rows={4} maxLength={200} value={retelling}
          onChange={(event) => setRetellingDraft(event.target.value)}
          className="mt-2 w-full rounded border p-3 text-sm leading-6" placeholder="关上材料，写下你理解的主线……" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="rounded bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-800"
            onClick={() => {
              try {
                updateUnitProgress(unitId, { lit: true, litAt: record?.litAt ?? new Date().toISOString(), retelling });
                setMessage(record?.lit ? "已更新复述" : "已点亮这个单元");
              } catch { setMessage("暂时无法保存，请检查浏览器本地存储及已有记录，再试一次。"); }
            }}>{record?.lit ? "保存复述" : "点亮这个单元"}</button>
          {record?.lit && <span className="text-sm text-emerald-800">这个单元已点亮</span>}
        </div>
      </div>}
      <p role="status" className="text-sm text-zinc-600">{message}</p>
    </div>
  );
}
