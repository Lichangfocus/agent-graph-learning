import type { NextConfig } from "next";
import { resolve } from "node:path";

// 应用在 apps/web，引擎代码在仓库根 engine/；turbopack 根设为仓库根，才能引用 ../../engine。
const repoRoot = resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  output: "export",
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
  // 不让 Next 自动生成 apps/web/AGENTS.md（仓库根 AGENTS.md 是唯一 Agent 约定）
  agentRules: false,
};

export default nextConfig;
