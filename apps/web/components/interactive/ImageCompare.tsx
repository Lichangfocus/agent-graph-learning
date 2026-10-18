"use client";
import Image from "next/image";
import { useRef, useState } from "react";

type Props = {
  leftSrc: string;
  rightSrc: string;
  labelLeft?: string;
  labelRight?: string;
  prompt?: string;
  height?: number;
};

export function ImageCompare({
  leftSrc,
  rightSrc,
  labelLeft,
  labelRight,
  prompt,
  height = 420,
}: Props) {
  const [pos, setPos] = useState(50);
  return (
    <div className="w-full">
      {prompt && <div className="mb-2 text-sm text-zinc-600">{prompt}</div>}
      <div
        className="relative w-full overflow-hidden rounded-lg border bg-black"
        style={{ height }}
      >
        <Image
          src={leftSrc}
          alt={labelLeft || "left"}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        >
          <Image
            src={rightSrc}
            alt={labelRight || "right"}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div
          className="absolute inset-y-0"
          style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
        >
          <div className="h-full w-0.5 bg-white/70" />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="absolute inset-x-0 bottom-2 mx-4"
        />
        {labelLeft && (
          <div className="absolute left-2 bottom-2 rounded bg-white/80 px-2 py-1 text-xs">
            {labelLeft}
          </div>
        )}
        {labelRight && (
          <div className="absolute right-2 bottom-2 rounded bg-white/80 px-2 py-1 text-xs">
            {labelRight}
          </div>
        )}
      </div>
    </div>
  );
}

