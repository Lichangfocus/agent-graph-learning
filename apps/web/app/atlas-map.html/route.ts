import { renderMainMap } from "@engine/lib/map-page";

export const dynamic = "force-static";

export function GET() {
  const html = renderMainMap({
    endpoint: process.env.NODE_ENV === "development" ? "/api/events/" : undefined,
    links: [{ href: "/units/", label: "单元" }],
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
