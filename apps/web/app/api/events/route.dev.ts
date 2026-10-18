import { handleLogGet, handleLogPost } from "@engine/lib/log-api";

// 仅 next dev 存在（.dev.ts 后缀）；静态导出不含此路由。

const json = (r: { status: number; body: Record<string, unknown> }) => Response.json(r.body, { status: r.status });

export function GET() {
  return json(handleLogGet());
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost = "";
    try { originHost = new URL(origin).host; } catch { /* 非法 Origin 视为跨域 */ }
    if (originHost !== req.headers.get("host")) return Response.json({ error: "跨域请求被拒绝" }, { status: 403 });
  }
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 }); }
  return json(handleLogPost(body));
}
