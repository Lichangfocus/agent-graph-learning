"use client";

import { useId, useState } from "react";
import { exportProgress, importProgress } from "@engine/lib/progress";

export function ProgressControls() {
  const inputId = useId();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <details className="rounded-lg border bg-white px-4 py-3 text-sm shadow-sm">
      <summary className="cursor-pointer font-medium">学习记录</summary>
      <p className="mt-2 text-zinc-500">记录保存在当前浏览器，可导出备份；导入会合并已有记录。</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className="rounded border px-3 py-1.5 hover:bg-zinc-50" onClick={() => {
          try { exportProgress(); setMessage("已导出学习记录"); }
          catch { setMessage("无法导出，请检查浏览器是否允许本地存储，以及已有记录是否有效。"); }
        }}>导出 JSON</button>
        <label htmlFor={inputId} className="font-medium">导入 JSON</label>
        <input id={inputId} type="file" accept=".json,application/json" disabled={busy}
          className="min-w-0 max-w-full text-xs file:mr-2 file:rounded file:border file:bg-white file:px-3 file:py-1.5"
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file) return;
            setBusy(true);
            try { await importProgress(file); setMessage("已合并学习记录"); }
            catch { setMessage("导入失败：请使用有效的 v1 学习记录 JSON，并检查本地存储。原记录未更改。"); }
            finally { setBusy(false); }
          }} />
      </div>
      <p role="status" className="mt-2 text-zinc-600">{busy ? "正在读取记录……" : message}</p>
    </details>
  );
}
