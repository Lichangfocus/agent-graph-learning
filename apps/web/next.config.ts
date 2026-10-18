import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { resolve } from "node:path";

// 应用在 apps/web，引擎代码在仓库根 engine/；turbopack 根设为仓库根，才能引用 ../../engine。
const repoRoot = resolve(__dirname, "../..");

export default function config(phase: string): NextConfig {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    images: { unoptimized: true },
    // 构建 = 纯静态导出；dev 不设 output，才能跑写回日志的 POST 路由（Next 在 export 模式下连 dev 也拒绝动态路由）。
    output: dev ? undefined : "export",
    trailingSlash: true,
    turbopack: { root: repoRoot },
    outputFileTracingRoot: repoRoot,
    // 不让 Next 自动生成 apps/web/AGENTS.md（仓库根 AGENTS.md 是唯一 Agent 约定）
    agentRules: false,
    // *.dev.ts 路由（写回 API）只在 next dev 存在；静态导出里没有 api。
    pageExtensions: dev ? ["tsx", "ts", "jsx", "js", "dev.ts"] : ["tsx", "ts", "jsx", "js"],
  };
}
