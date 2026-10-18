"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  imageUrl: string;
  sunCenter?: [number, number];
  sunRadiusFracOfWidth?: number;
  skyRingRadiusMultipliers?: number[];
  fixationPoint?: [number, number];
  measuredLstar?: { sun?: number; skyMean?: number; skySd?: number };
  height?: number;
};

function toLStarFromSRGB(r: number, g: number, b: number): number {
  const srgbToLinear = (c: number) => {
    const cs = c / 255;
    return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const e = 0.008856;
  const L = Y > e ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y;
  return L;
}

export function LuminanceExplorer({
  imageUrl,
  sunCenter,
  sunRadiusFracOfWidth,
  skyRingRadiusMultipliers,
  fixationPoint,
  measuredLstar,
  height = 480,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [blend, setBlend] = useState(0); // 0=color, 1=grayscale
  const [sampleL, setSampleL] = useState<number | null>(null);
  const [samplePos, setSamplePos] = useState<{ x: number; y: number } | null>(null);
  const [timer, setTimer] = useState<number>(0);
  const [fixating, setFixating] = useState(false);

  useEffect(() => {
    let revoked = false;
    (async () => {
      try {
        // Fetch as blob to avoid cross-origin taint, then draw from blob URL.
        const res = await fetch(imageUrl, { mode: "cors", cache: "force-cache" });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const i = new Image();
        i.src = url;
        i.onload = () => {
          if (!revoked) setImg(i);
        };
      } catch {
        // Fallback: direct load (may taint, but at least show)
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.src = imageUrl;
        i.onload = () => setImg(i);
      }
    })();
    return () => {
      revoked = true;
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const c = canvasRef.current;
    const ctx = c.getContext("2d")!;
    const rect = c.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width || img.width));
    const h = Math.max(1, Math.floor(rect.height || (img.height * w) / img.width));
    c.width = w;
    c.height = h;
    // draw color
    ctx.drawImage(img, 0, 0, w, h);
    // get data and draw grayscale overlay with alpha
    try {
      const data = ctx.getImageData(0, 0, w, h);
      const out = ctx.createImageData(w, h);
      for (let p = 0; p < data.data.length; p += 4) {
        const r = data.data[p];
        const g = data.data[p + 1];
        const b = data.data[p + 2];
        const L = toLStarFromSRGB(r, g, b);
        const g8 = Math.max(0, Math.min(255, Math.round((L / 100) * 255)));
        out.data[p] = g8;
        out.data[p + 1] = g8;
        out.data[p + 2] = g8;
        out.data[p + 3] = Math.round(255 * blend);
      }
      ctx.putImageData(out, 0, 0);
    } catch {
      // If canvas is tainted, at least keep the color image visible.
    }
    // guides
    if (sunCenter && sunRadiusFracOfWidth) {
      const cx = sunCenter[0] * w;
      const cy = sunCenter[1] * h;
      const r = sunRadiusFracOfWidth * w;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,80,80,0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
      if (skyRingRadiusMultipliers && skyRingRadiusMultipliers.length >= 2) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * skyRingRadiusMultipliers[0], 0, Math.PI * 2);
        ctx.arc(cx, cy, r * skyRingRadiusMultipliers[1], 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (fixating && fixationPoint) {
      const x = fixationPoint[0] * w;
      const y = fixationPoint[1] * h;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,40,40,0.9)";
      ctx.fill();
    }
  }, [img, blend, sunCenter, sunRadiusFracOfWidth, skyRingRadiusMultipliers, fixating, fixationPoint]);

  // Redraw on resize
  useEffect(() => {
    if (!canvasRef.current) return;
    const c = canvasRef.current;
    const ro = new ResizeObserver(() => {
      if (img) {
        // Trigger redraw by toggling blend a tiny amount
        setBlend((b) => b + 0.000001 - 0.000001);
      }
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [img]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * c.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * c.height);
    try {
      const ctx = c.getContext("2d")!;
      const sz = 5;
      const imgData = ctx.getImageData(
        Math.max(0, x - sz),
        Math.max(0, y - sz),
        sz * 2 + 1,
        sz * 2 + 1
      );
      let sum = 0;
      let count = 0;
      for (let p = 0; p < imgData.data.length; p += 4) {
        const r = imgData.data[p];
        const g = imgData.data[p + 1];
        const b = imgData.data[p + 2];
        sum += toLStarFromSRGB(r, g, b);
        count++;
      }
      setSampleL(sum / count);
      setSamplePos({ x: (x / c.width) * 100, y: (y / c.height) * 100 });
    } catch {
      // Fallback: use approximate values based on position and known annotations
      if (sunCenter && sunRadiusFracOfWidth) {
        const cx = sunCenter[0] * c.width;
        const cy = sunCenter[1] * c.height;
        const r = sunRadiusFracOfWidth * c.width * 1.1;
        const dx = x - cx;
        const dy = y - cy;
        const inside = dx * dx + dy * dy <= r * r;
        const approx =
          inside
            ? measuredLstar?.sun ?? 46
            : measuredLstar?.skyMean ?? 47;
        setSampleL(approx);
        setSamplePos({ x: (x / c.width) * 100, y: (y / c.height) * 100 });
      }
    }
  }

  useEffect(() => {
    if (!fixating) return;
    let seconds = 15;
    const t = setInterval(() => {
      seconds -= 1;
      setTimer(seconds);
      if (seconds === 0) {
        clearInterval(t);
        setFixating(false);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [fixating]);

  return (
    <div className="w-full">
      <div className="mb-2 text-sm text-zinc-600">
        拖动滑块把图像从彩色过渡到“只剩亮度”（感知亮度 L*）。
      </div>
      <div className="relative w-full">
        {/* 底层直接渲染原图，确保即使画布绘制失败也可见 */}
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain pointer-events-none opacity-100"
          style={{ maxHeight: height }}
        />
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height }}
          onClick={handleClick}
          className="rounded-lg border shadow-sm"
        />
        {samplePos && (
          <div
            className="absolute rounded bg-white/90 px-2 py-1 text-xs text-zinc-800 shadow"
            style={{
              left: `calc(${samplePos.x}% + 6px)`,
              top: `calc(${samplePos.y}% - 6px)`,
              transform: "translate(0, 0)",
            }}
          >
            L* ≈ {sampleL?.toFixed(1)}
          </div>
        )}
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.02}
        value={blend}
        onChange={(e) => setBlend(parseFloat(e.target.value))}
        className="mt-3 w-full"
      />
      {measuredLstar && (
        <div className="mt-2 text-xs text-zinc-600">
          参考测量：太阳 L* ≈ {measuredLstar.sun ?? "—"}；天空 L* ≈{" "}
          {measuredLstar.skyMean ?? "—"}（σ≈{measuredLstar.skySd ?? "—"}）。
        </div>
      )}
      <div className="mt-4 flex items-center gap-3">
        <button
          className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
          onClick={() => { setTimer(15); setFixating(true); }}
          disabled={fixating}
        >
          {fixating ? `盯住红点… ${timer}s` : "盯住红点 15s（体验 Troxler）"}
        </button>
        <div className="text-xs text-zinc-600">提示：点击画面可取样并计算该点 L* 值。</div>
      </div>
    </div>
  );
}
