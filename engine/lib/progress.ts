"use client";

import { useSyncExternalStore } from "react";
import { z } from "zod";

export const PROGRESS_KEY = "scholar-engine:progress:v1";
const RecordId = z.string().min(1)
  .refine((id) => !["__proto__", "constructor", "prototype"].includes(id));
export const UnitProgressSchema = z.object({
  lit: z.boolean(),
  litAt: z.iso.datetime({ offset: true }).optional(),
  retelling: z.string().max(200).optional(),
  answers: z.record(RecordId, z.boolean()),
}).strict();
export const ProgressSchema = z.object({
  version: z.literal(1),
  units: z.record(RecordId, UnitProgressSchema),
}).strict();
export type Progress = z.infer<typeof ProgressSchema>;
export type UnitProgress = z.infer<typeof UnitProgressSchema>;

const EMPTY: Progress = { version: 1, units: {} };
const CHANGE_EVENT = "scholar-engine:progress-change";
let cachedRaw: string | null | undefined;
let cachedProgress = EMPTY;

function readProgress(): Progress {
  const raw = window.localStorage.getItem(PROGRESS_KEY);
  return raw === null ? EMPTY : ProgressSchema.parse(JSON.parse(raw));
}

function getSnapshot(): Progress {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      const parsed = raw === null ? { success: true as const, data: EMPTY }
        : ProgressSchema.safeParse(JSON.parse(raw));
      cachedProgress = parsed.success ? parsed.data : EMPTY;
    }
    return cachedProgress;
  } catch {
    cachedRaw = undefined;
    cachedProgress = EMPTY;
    return EMPTY;
  }
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === PROGRESS_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

export function useProgress() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

function saveProgress(progress: Progress) {
  const validated = ProgressSchema.parse(progress);
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(validated));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function updateUnitProgress(id: string, patch: Partial<UnitProgress>) {
  RecordId.parse(id);
  // Read the latest store; never replace damaged records silently.
  const progress = readProgress();
  const unit = progress.units[id] ?? { lit: false, answers: {} };
  saveProgress({ ...progress, units: {
    ...progress.units,
    [id]: { ...unit, ...patch, answers: { ...unit.answers, ...patch.answers } },
  } });
}

/** Union achievements; preserve the newest nonempty retelling and lit date. */
export function mergeProgress(current: Progress, incoming: Progress): Progress {
  const units = { ...current.units };
  for (const [id, next] of Object.entries(incoming.units)) {
    const prior = units[id];
    if (!prior) { units[id] = next; continue; }
    const nextIsNewer = Date.parse(next.litAt ?? "") > Date.parse(prior.litAt ?? "") || !prior.litAt;
    const answers = { ...prior.answers };
    for (const [qid, correct] of Object.entries(next.answers)) answers[qid] = answers[qid] === true || correct;
    units[id] = {
      lit: prior.lit || next.lit,
      litAt: nextIsNewer ? (next.litAt ?? prior.litAt) : (prior.litAt ?? next.litAt),
      retelling: nextIsNewer ? (next.retelling || prior.retelling) : (prior.retelling || next.retelling),
      answers,
    };
  }
  return ProgressSchema.parse({ version: 1, units });
}

export async function importProgress(file: File) {
  const incoming = ProgressSchema.parse(JSON.parse(await file.text()));
  saveProgress(mergeProgress(readProgress(), incoming));
}

export function exportProgress() {
  const blob = new Blob([JSON.stringify(readProgress(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `scholar-engine-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
