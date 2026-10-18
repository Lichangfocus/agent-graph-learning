"use client";
import Image from "next/image";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

type Hotspot = { id: string; xPct: number; yPct: number; title: string; description: string };

type Props = {
  src: string;
  hotspots?: Hotspot[];
  height?: number;
};

export function ZoomAnnotate({ src, hotspots = [], height = 480 }: Props) {
  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-lg border bg-black" style={{ height }}>
        <TransformWrapper initialScale={1} minScale={0.5} maxScale={6}>
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: "100%", height: "100%", position: "relative" }}
          >
            <Image src={src} alt="" fill className="object-contain" sizes="100vw" />
            {hotspots.map((h) => (
              <div
                key={h.id}
                className="absolute"
                style={{ left: `${h.xPct}%`, top: `${h.yPct}%`, transform: "translate(-50%, -50%)" }}
              >
                <div className="group relative">
                  <div className="h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white shadow" />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 hidden min-w-[200px] rounded bg-white p-2 text-xs text-zinc-800 shadow group-hover:block">
                    <div className="font-semibold">{h.title}</div>
                    <div className="mt-1 opacity-80">{h.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </TransformComponent>
        </TransformWrapper>
      </div>
      <div className="mt-2 text-xs text-zinc-500">提示：用手势或鼠标滚轮缩放，拖拽平移。</div>
    </div>
  );
}

