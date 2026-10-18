import matter from "gray-matter";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { listUnitDirs, unitDir } from "../paths";
import { load as yamlLoad } from "js-yaml";
import {
  Unit,
  validateUnit,
  UnitFrontmatterSchema,
  UnitSectionsSchema,
  InteractiveSpecSchema,
  ArtworkSchema,
} from "../schemas/unit";
import { readFileSync as fsRead } from "node:fs";

type SectionMap = Record<string, string>;
type AssetFile = {
  assets?: {
    id: string; title?: string; title_zh?: string; label?: string; artist?: string;
    date?: string; render_url?: string; original_url?: string; license?: string;
    annotations?: {
      sun_center?: [number, number]; sun_radius_frac_of_width?: number;
      sky_ring_radius_multipliers?: number[]; fixation_point_standing_figure_head?: [number, number];
      measured_Lstar?: { sun?: number; sky_ring_mean?: number; sky_ring_sd?: number };
    };
  }[];
  derived_assets?: { id: string; path?: string }[];
};

function splitSections(markdown: string): SectionMap {
  const lines = markdown.split(/\r?\n/);
  const sections: SectionMap = {};
  let current = "body";
  let buffer: string[] = [];
  const flush = () => {
    sections[current] = buffer.join("\n").trim();
    buffer = [];
  };
  for (const line of lines) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) {
      flush();
      current = m[1].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

function extractFirstYamlBlock(sectionBody: string): unknown {
  const codeBlock = /```(?:yaml|yml|json)\n([\s\S]*?)```/m.exec(sectionBody);
  if (!codeBlock) {
    return null;
  }
  const content = codeBlock[1].trim();
  // try YAML first, then JSON
  try {
    return yamlLoad(content);
  } catch {
    try {
      return JSON.parse(content);
    } catch {
      throw new Error("Failed to parse structured block as YAML or JSON.");
    }
  }
}

export function loadUnitFromMarkdown(mdPath: string): Unit {
  const raw = readFileSync(mdPath, "utf-8");
  const { data: fm, content } = matter(raw);
  // Support alt frontmatter shapes (e.g., est_time.core_minutes)
  const estMinutes =
    typeof fm.estTime === "number"
      ? fm.estTime
      : fm.est_time?.core_minutes ?? fm.est_time?.core ?? 30;
  const frontmatter = UnitFrontmatterSchema.parse(
    {
      id: fm.id,
      title: fm.title,
      module: fm.module ?? fm["module:"] ?? fm.course ?? "未分组",
      estTimeMinutes: estMinutes,
      sources: fm.sources ?? [],
      tags: fm.tags ?? [],
    },
    {}
  );
  const sections = splitSections(content);
  const hookQuestion = (sections["Hook Question"] || sections["hook question"] || "").trim();
  const coreNarrativeText = (sections["Core Narrative"] || "").trim();
  const coreNarrative = coreNarrativeText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const keyConcepts =
    extractFirstYamlBlock(sections["Key Concepts"]) ||
    extractFirstYamlBlock(sections["关键概念"]) ||
    []; // allow empty here; schema will enforce downstream
  const artworks = ArtworkSchema.array().parse(
    extractFirstYamlBlock(sections["Artworks"]) ||
    extractFirstYamlBlock(sections["作品与图片清单"]) ||
    []);
  const storyboard =
    extractFirstYamlBlock(sections["Video Storyboard"]) ||
    extractFirstYamlBlock(sections["视频脚本"]) ||
    [];
  const interactiveYaml = InteractiveSpecSchema.parse(
    extractFirstYamlBlock(sections["Interactive Components"]) ||
    extractFirstYamlBlock(sections["交互组件"]) ||
    extractFirstYamlBlock(sections["交互组件规格"]) ||
    {
      imageComparisons: [],
      zoomAnnotates: [],
      predictReveals: [],
      luminanceExplorers: [],
      frequencyToggles: [],
      functionMaps: [],
    });
  const checkYourself =
    extractFirstYamlBlock(sections["Check Yourself"]) ||
    extractFirstYamlBlock(sections["自测题"]) ||
    [];
  const masteryEvidence = sections["Mastery Evidence"] === undefined
    ? undefined
    : extractFirstYamlBlock(sections["Mastery Evidence"]);
  const aiAndFutureLife =
    (sections["Link to AI & Future Human Life"] ||
      sections["和 AI、未来人类生活的联系"] ||
      "").trim();

  // If artworks are empty but assets.json is referenced in frontmatter or near top of md, try to load it.
  if ((!artworks || artworks.length === 0) && raw.includes("assets.json")) {
    try {
      const baseDir = join(mdPath, "..");
      const jsonPath = join(baseDir, "assets.json");
      const json = JSON.parse(fsRead(jsonPath, "utf-8")) as AssetFile;
      if (Array.isArray(json.assets)) {
        const mapped = json.assets.map((a) => ({
          id: a.id,
          title: a.title ?? a.title_zh ?? a.label ?? "Untitled",
          creator: a.artist,
          year: a.date,
          sourceUrl: a.render_url ?? a.original_url ?? "",
          license: a.license ?? "Public Domain",
          caption: "",
        }));
        artworks.push(...mapped);
      }
      // derive interactives if missing
      if (
        interactiveYaml.luminanceExplorers?.length === 0 &&
        json.assets?.find((a) => a.id === "A1")
      ) {
        const a1 = json.assets!.find((a) => a.id === "A1")!;
        interactiveYaml.luminanceExplorers = [
          {
            id: "monet-luminance",
            imageUrl: a1.render_url ?? a1.original_url ?? "",
            sunCenter: a1.annotations?.sun_center,
            sunRadiusFracOfWidth: a1.annotations?.sun_radius_frac_of_width,
            skyRingRadiusMultipliers: a1.annotations?.sky_ring_radius_multipliers,
            fixationPoint: a1.annotations?.fixation_point_standing_figure_head,
            measuredLstar: a1.annotations?.measured_Lstar
              ? {
                sun: a1.annotations.measured_Lstar.sun,
                skyMean: a1.annotations.measured_Lstar.sky_ring_mean,
                skySd: a1.annotations.measured_Lstar.sky_ring_sd,
              }
              : undefined,
          },
        ];
      }
      if (
        interactiveYaml.frequencyToggles?.length === 0 &&
        Array.isArray(json.derived_assets)
      ) {
        const d2 = json.derived_assets.find((d) => d.id === "D2");
        if (d2?.path) {
          interactiveYaml.frequencyToggles = [
            {
              id: "monalisa-frequency",
              combinedImage: `/assets/units/${frontmatter.id}/${d2.path}`,
              labels: ["只留细节（高通）", "原图", "只留大块明暗（低通）"],
            },
          ];
        }
      }
    } catch {
      // ignore – keep empty, validation will fail loudly
    }
  }

  const interactive = InteractiveSpecSchema.parse(interactiveYaml);

  const sectionsObj = UnitSectionsSchema.parse({
    hookQuestion,
    coreNarrative,
    keyConcepts,
    masteryEvidence,
    artworks,
    storyboard,
    interactive,
    checkYourself,
    aiAndFutureLife,
  });

  return validateUnit({
    frontmatter,
    sections: sectionsObj,
  });
}

/** 不传目录时：公开 units/ + 数据包 units-private/（见 engine/lib/paths.ts）。 */
export function listUnitIds(unitsDir?: string): string[] {
  if (!unitsDir) return listUnitDirs().map((unit) => unit.id);
  return readdirSync(unitsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

export function loadAllUnits(unitsDir?: string): Unit[] {
  if (!unitsDir) return listUnitDirs().map((unit) => loadUnitFromMarkdown(join(unit.dir, "source.md")));
  return listUnitIds(unitsDir).map((id) => loadUnitFromMarkdown(join(unitsDir, id, "source.md")));
}

export function loadUnitById(id: string): Unit {
  const dir = unitDir(id);
  if (!dir) throw new Error(`找不到单元 ${id}（公开 units/ 与数据包 units-private/ 都没有）`);
  return loadUnitFromMarkdown(join(dir, "source.md"));
}
