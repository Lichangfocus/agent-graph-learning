"use client";
import { useState } from "react";

type Props = {
  combinedImage: string; // 3 幅图拼成一张（左=高通，中=原图，右=低通）
  labels?: [string, string, string];
  height?: number;
};

export function FrequencyToggle({
  combinedImage,
  labels = ["只留细节（高通）", "原图", "只留大块明暗（低通）"],
  height = 360,
}: Props) {
  const [idx, setIdx] = useState(1);
  const bgPos =
    idx === 0 ? "0% 50%" : idx === 1 ? "50% 50%" : "100% 50%";
  return (
    <div className="w-full">
      <div className="mb-2 flex gap-2">
        {labels.map((lab, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`rounded px-3 py-1.5 text-sm ${
              idx === i ? "bg-emerald-600 text-white" : "bg-white text-zinc-800 border"
            }`}
          >
            {lab}
          </button>
        ))}
      </div>
      <div
        className="w-full rounded-lg border bg-black"
        style={{
          height,
          backgroundImage: `url(${combinedImage})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "300% 100%",
          backgroundPosition: bgPos,
        }}
      />
      <div className="mt-2 text-xs text-zinc-600">提示：切换观察“细节/原图/大块明暗”。把注视点移到眼睛与嘴部对比感受。</div>
    </div>
  );
}
