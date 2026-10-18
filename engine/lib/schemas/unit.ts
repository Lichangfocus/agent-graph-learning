import { z } from "zod";

/**
 * Zod schema describing the normalized structure parsed from units/<id>/source.md.
 * The markdown source contains frontmatter plus structured sections.
 * We validate the normalized JSON after parsing.
 */
export const ArtworkSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  creator: z.string().optional(),
  year: z.string().optional(),
  sourceUrl: z.string().url(),
  license: z.string().min(1),
  localAsset: z.string().optional(), // filled by asset downloader, e.g. /assets/units/<id>/artworks/<artworkId>.jpg
  caption: z.string().optional(),
});

export const KeyConceptSchema = z.object({
  term: z.string().min(1),
  explanation: z.string().min(1),
  analogy: z.string().optional(),
  analogyLimit: z.string().optional(),
  canon: z.object({
    formal: z.string().min(1),
    source: z.string().min(1),
    textbook: z.string().optional(),
    quote: z.boolean(),
  }).optional(),
  relatedArtworks: z.array(z.string()).optional(), // artwork ids
});

export const SubtitleCueSchema = z.object({
  startSec: z.number().nonnegative(),
  endSec: z.number().positive(),
  text: z.string().min(1),
});

export const StoryboardSceneSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  images: z.array(z.string()).min(1), // artwork ids or absolute URLs
  narration: z.string().min(1),
  durationSec: z.number().positive(),
  transition: z.enum(["cut", "fade", "pan", "zoom"]).default("cut"),
  subtitles: z.array(SubtitleCueSchema).optional(),
});

export const ImageComparisonSpecSchema = z.object({
  id: z.string().min(1),
  leftArtworkId: z.string().min(1),
  rightArtworkId: z.string().min(1),
  prompt: z.string().optional(),
  labelLeft: z.string().optional(),
  labelRight: z.string().optional(),
});

export const HotspotSchema = z.object({
  id: z.string().min(1),
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  title: z.string(),
  description: z.string(),
});

export const ZoomAnnotateSpecSchema = z.object({
  id: z.string().min(1),
  artworkId: z.string().min(1),
  hotspots: z.array(HotspotSchema).default([]),
});

export const TimelineItemSchema = z.object({
  id: z.string().min(1),
  date: z.string().min(1), // free-form date label, e.g., "1863", "1890-05"
  label: z.string().min(1),
  description: z.string().optional(),
});

export const TimelineSpecSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  items: z.array(TimelineItemSchema).min(1),
});

export const PredictRevealSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  answer: z.string().min(1),
  explanation: z.string().optional(),
});


export const FunctionMapBinSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
});

export const FunctionMapWorkSchema = z.object({
  artworkId: z.string().min(1),
  label: z.string().optional(),
});

export const FunctionMapScholarViewSchema = z.object({
  artworkId: z.string().min(1),
  primary: z.array(z.string().min(1)).min(1),
  also: z.array(z.string().min(1)).optional(),
  claimType: z.enum(["fact", "consensus", "disputed", "ai-inferred"]),
  summary: z.string().min(1),
  source: z.string().optional(),
});

export const FunctionMapSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  instruction: z.string().optional(),
  bins: z.array(FunctionMapBinSchema).min(1),
  works: z.array(FunctionMapWorkSchema).min(1),
  scholarViews: z.array(FunctionMapScholarViewSchema).min(1),
  reflectPrompt: z.string().optional(),
});

// New interactive specs for U01 and reusable usage
export const LuminanceExplorerSchema = z.object({
  id: z.string().min(1),
  imageUrl: z.string().min(1),
  sunCenter: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).optional(),
  sunRadiusFracOfWidth: z.number().min(0).max(1).optional(),
  skyRingRadiusMultipliers: z.array(z.number()).optional(),
  fixationPoint: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).optional(),
  measuredLstar: z
    .object({
      sun: z.number().optional(),
      skyMean: z.number().optional(),
      skySd: z.number().optional(),
    })
    .optional(),
});

export const FrequencyToggleSchema = z.object({
  id: z.string().min(1),
  combinedImage: z.string().min(1), // can be /assets/... or absolute URL
  labels: z.array(z.string()).length(3).optional(),
});

export const CheckYourselfSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  choices: z.array(z.string()).optional(),
  answer: z.string().min(1),
  explanation: z.string().optional(),
  options: z.array(z.object({
    text: z.string().min(1),
    correct: z.boolean().optional(),
    why: z.string().optional(),
  })).optional(),
  hint: z.string().optional(),
}).refine(
  (question) => question.options === undefined ||
    question.options.filter((option) => option.correct === true).length === 1,
  { path: ["options"], message: "MCQ options 必须恰好有一个 correct: true 的选项（exactly one correct option）。" }
);

export const InteractiveSpecSchema = z.object({
  imageComparisons: z.array(ImageComparisonSpecSchema).default([]),
  zoomAnnotates: z.array(ZoomAnnotateSpecSchema).default([]),
  timeline: TimelineSpecSchema.optional(),
  predictReveals: z.array(PredictRevealSchema).default([]),
  luminanceExplorers: z.array(LuminanceExplorerSchema).default([]),
  frequencyToggles: z.array(FrequencyToggleSchema).default([]),
  functionMaps: z.array(FunctionMapSchema).default([]),
});

export const UnitFrontmatterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  module: z.string().min(1),
  estTimeMinutes: z.number().int().positive(),
  sources: z.array(z.string()).default([]), // references to lectures/textbooks/links
  tags: z.array(z.string()).optional(),
});

export const UnitSectionsSchema = z.object({
  hookQuestion: z.string().min(1),
  coreNarrative: z.array(z.string()).min(1), // paragraphs
  keyConcepts: z.array(KeyConceptSchema).min(1),
  masteryEvidence: z.array(z.string().min(1)).optional(),
  artworks: z.array(ArtworkSchema).min(1),
  storyboard: z.array(StoryboardSceneSchema).min(1),
  interactive: InteractiveSpecSchema,
  checkYourself: z.array(CheckYourselfSchema).min(1),
  aiAndFutureLife: z.string().min(1),
});

export const UnitSchema = z.object({
  frontmatter: UnitFrontmatterSchema,
  sections: UnitSectionsSchema,
});

export type Unit = z.infer<typeof UnitSchema>;
export type Artwork = z.infer<typeof ArtworkSchema>;
export type StoryboardScene = z.infer<typeof StoryboardSceneSchema>;
export type InteractiveSpec = z.infer<typeof InteractiveSpecSchema>;

/**
 * Helper to validate unknown input and throw readable ZodError if invalid.
 */
export function validateUnit(unit: unknown): Unit {
  const parsed = UnitSchema.safeParse(unit);
  if (!parsed.success) {
    // Format minimal but informative error path list
    const message = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Unit validation failed: ${message}`);
  }
  return parsed.data;
}
