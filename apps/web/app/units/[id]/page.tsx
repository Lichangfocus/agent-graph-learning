import { loadUnitFromMarkdown } from "@engine/lib/utils/content";
import { notFound } from "next/navigation";
import { join } from "node:path";
import { listUnitDirs, unitAssetDir, unitDir, unitVideoPath } from "@engine/lib/paths";
import fs from "node:fs";
import { ImageCompare } from "@/components/interactive/ImageCompare";
import { ZoomAnnotate } from "@/components/interactive/ZoomAnnotate";
import { Timeline } from "@/components/interactive/Timeline";
import { PredictReveal } from "@/components/interactive/PredictReveal";
import { LuminanceExplorer } from "@/components/interactive/LuminanceExplorer";
import { FrequencyToggle } from "@/components/interactive/FrequencyToggle";
import { FunctionMap } from "@/components/interactive/FunctionMap";
import Link from "next/link";
import { KeyConcept } from "@/components/learning/KeyConcept";
import { MasteryQuiz } from "@/components/learning/MasteryQuiz";
import { ProgressControls } from "@/components/learning/ProgressControls";
import { AskAI } from "@/components/learning/AskAI";
import { loadProfileHighlights } from "@engine/lib/utils/profile-highlights";

type Params = { id: string };

export function generateStaticParams() {
  return listUnitDirs().map((unit) => ({ id: unit.id }));
}

export default async function UnitPage(props: { params: Promise<Params> }) {
  const params = await props.params;
  const dir = unitDir(params.id);
  if (!dir) {
    notFound();
  }
  const mdPath = join(dir, "source.md");
  const unit = loadUnitFromMarkdown(mdPath);
  const profileHighlights = loadProfileHighlights();
  // 私人单元的素材经 `npm run data:link` 链接到 apps/web/public/assets/units/<id>
  const publicArtDir = join(unitAssetDir(unit.frontmatter.id), "artworks");
  const artworkIdToSrc = new Map<string, string>();
  for (const a of unit.sections.artworks) {
    const localCandidates = ["jpg", "jpeg", "png", "webp"].map((ext) =>
      join(publicArtDir, `${a.id}.${ext}`)
    );
    const found = localCandidates.find((p) => fs.existsSync(p));
    if (found) {
      const rel = `/assets/units/${unit.frontmatter.id}/artworks/${found.split(/[\\/]/).pop()}`;
      artworkIdToSrc.set(a.id, rel);
    } else {
      artworkIdToSrc.set(a.id, a.sourceUrl);
    }
  }
  const videoPublicPath = `/videos/${unit.frontmatter.id}.mp4`;
  const hasVideo = fs.existsSync(unitVideoPath(unit.frontmatter.id));
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/" className="mb-4 inline-block text-sm text-emerald-800 hover:underline">← 课程知识地图</Link>
        <h1 className="text-3xl font-bold mb-2">{unit.frontmatter.title}</h1>
        <p className="text-sm text-zinc-600 mb-6">
          模块：{unit.frontmatter.module} · 预计用时 {unit.frontmatter.estTimeMinutes} 分钟
        </p>
        <div className="mb-8"><ProgressControls /></div>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">引子问题</h2>
          <p className="leading-7">{unit.sections.hookQuestion}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">核心叙事</h2>
          <div className="space-y-4">
            {unit.sections.coreNarrative.map((p, i) => (
              <p key={i} className="leading-8">
                {p}
              </p>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">关键概念</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {unit.sections.keyConcepts.map((kc) => (
              <KeyConcept key={kc.term} concept={kc} unitTitle={unit.frontmatter.title} profileHighlights={profileHighlights} />
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">课程视频</h2>
          {hasVideo ? (
            <video
              controls
              className="w-full rounded-lg border bg-black"
              src={videoPublicPath}
            />
          ) : (
            <div className="rounded-lg border bg-white p-4 text-sm text-zinc-600">
              演示视频尚未生成。请运行脚本生成，或查看下方交互内容。
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">对比滑块</h2>
          {unit.sections.interactive.imageComparisons.map((c) => (
            <div key={c.id} className="mb-6">
              <ImageCompare
                leftSrc={artworkIdToSrc.get(c.leftArtworkId)!}
                rightSrc={artworkIdToSrc.get(c.rightArtworkId)!}
                labelLeft={c.labelLeft}
                labelRight={c.labelRight}
                prompt={c.prompt}
              />
            </div>
          ))}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">缩放与热点标注</h2>
          {unit.sections.interactive.zoomAnnotates.map((z) => (
            <div key={z.id} className="mb-6">
              <ZoomAnnotate
                src={artworkIdToSrc.get(z.artworkId)!}
                hotspots={z.hotspots.map((h) => ({
                  id: h.id,
                  xPct: h.xPct,
                  yPct: h.yPct,
                  title: h.title,
                  description: h.description,
                }))}
              />
            </div>
          ))}
        </section>

        {unit.sections.interactive.timeline && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-3">互动时间轴</h2>
            <Timeline
              title={unit.sections.interactive.timeline.title}
              items={unit.sections.interactive.timeline.items}
            />
          </section>
        )}

        {unit.sections.interactive.predictReveals.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-3">预测—揭示</h2>
            <div className="space-y-4">
              {unit.sections.interactive.predictReveals.map((pr) => (
                <PredictReveal
                  key={pr.id}
                  prompt={pr.prompt}
                  answer={pr.answer}
                  explanation={pr.explanation}
                />
              ))}
            </div>
          </section>
        )}

        {unit.sections.interactive.luminanceExplorers?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-3">明度探索器</h2>
            {unit.sections.interactive.luminanceExplorers.map((it) => (
              <div key={it.id} className="mb-6">
                <LuminanceExplorer
                  imageUrl={it.imageUrl}
                  sunCenter={it.sunCenter}
                  sunRadiusFracOfWidth={it.sunRadiusFracOfWidth}
                  skyRingRadiusMultipliers={it.skyRingRadiusMultipliers}
                  fixationPoint={it.fixationPoint}
                  measuredLstar={it.measuredLstar}
                />
              </div>
            ))}
          </section>
        )}

        {unit.sections.interactive.frequencyToggles?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-3">空间频率切换</h2>
            {unit.sections.interactive.frequencyToggles.map((it) => (
              <div key={it.id} className="mb-6">
                <FrequencyToggle combinedImage={it.combinedImage} labels={it.labels ? [it.labels[0], it.labels[1], it.labels[2]] : undefined} />
              </div>
            ))}
          </section>
        )}

        
        {unit.sections.interactive.functionMaps?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-3">功能地图</h2>
            {unit.sections.interactive.functionMaps.map((item) => (
              <div key={item.id} className="mb-6">
                <FunctionMap
                  title={item.title}
                  instruction={item.instruction}
                  bins={item.bins}
                  works={item.works.map((work) => ({
                    ...work,
                    src: artworkIdToSrc.get(work.artworkId),
                  }))}
                  scholarViews={item.scholarViews}
                  reflectPrompt={item.reflectPrompt}
                />
              </div>
            ))}
          </section>
        )}

        {unit.sections.masteryEvidence?.length ? <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">怎样算真的懂了</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-700">
            {unit.sections.masteryEvidence.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section> : null}

        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-2">自查练习</h2>
          <MasteryQuiz unitId={unit.frontmatter.id} questions={unit.sections.checkYourself} />
          <AskAI unitTitle={unit.frontmatter.title} profileHighlights={profileHighlights} />
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-2">连接 AI 与未来生活</h2>
          <p className="leading-7">{unit.sections.aiAndFutureLife}</p>
        </section>
      </div>
    </div>
  );
}
