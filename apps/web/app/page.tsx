import Link from "next/link";
import fs from "node:fs";
import { join } from "node:path";
import { WEB_PUBLIC_DIR } from "@engine/lib/paths";
import { loadCourseGraph } from "@engine/lib/utils/graph";
import { KnowledgeMap } from "@/components/course/KnowledgeMap";
import { ProgressControls } from "@/components/learning/ProgressControls";

type Course = {
  title: string;
  modules: { id: string; title: string; units: { id: string; title: string; status: string }[] }[];
};

export default function Home() {
  const graph = loadCourseGraph();
  const coursePath = join(WEB_PUBLIC_DIR, "course.json");
  let course: Course | null = null;
  if (fs.existsSync(coursePath)) {
    course = JSON.parse(fs.readFileSync(coursePath, "utf-8"));
  }
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">个人“知识翻译引擎”演示站点</h1>
          <p className="text-zinc-600 mt-2">
            依据学习者画像，将课程材料转译为更易吸收的解释、视频与交互页面。
          </p>
        </header>
        <div className="mb-6"><ProgressControls /></div>
        <KnowledgeMap graph={graph} />
        {course ? (
          <section>
            <h2 className="text-xl font-semibold mb-2">课程：{course.title}</h2>
            <div className="space-y-6">
              {course.modules.map((m) => (
                <div key={m.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <div className="text-sm rounded bg-black text-white px-2 py-0.5">{m.id}</div>
                    <div className="font-semibold">{m.title}</div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {m.units.length === 0 && (
                      <div className="text-zinc-600 text-sm">（该模块的单元即将添加）</div>
                    )}
                    {m.units.map((u) => {
                      const upcoming = u.status !== "ready";
                      return (
                        <div
                          key={u.id}
                          className={`rounded-lg border bg-white p-4 shadow-sm ${
                            upcoming ? "opacity-60" : "hover:shadow-md transition"
                          }`}
                        >
                          <div className="text-xs text-zinc-500">{u.id.toUpperCase()}</div>
                          <div className="font-medium mt-1">{u.title}</div>
                          <div className="mt-3 flex items-center justify-between">
                            {upcoming ? (
                              <span className="text-xs text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
                                即将上线
                              </span>
                            ) : (
                              <Link
                                href={`/units/${u.id}`}
                                className="text-sm text-emerald-700 hover:underline"
                              >
                                打开单元 →
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section>
            <h2 className="text-xl font-semibold mb-4">课程单元</h2>
            <p className="text-zinc-600">尚无课程配置，或解析失败。</p>
          </section>
        )}
      </div>
    </div>
  );
}
