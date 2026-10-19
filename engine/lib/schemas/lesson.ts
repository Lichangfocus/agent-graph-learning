import { z } from "zod";
import { CLAIM_TYPES, EDGE_KINDS, QuizSchema } from "./atlas";

/**
 * 课（learn.lesson.v1）：放在数据包 lessons/<id>.json（私人：课表、书架、截止日期都在这里），
 * 读包时变成一个 kind=lesson 的自建节点挂到 topic 上（engine/lib/lesson.ts）。
 * 主张标签沿用 Atlas 的 claim_type，另加「框架」：本课程自己的分析框架（不是史料、不是学界结论）。
 */
export const LESSON_CLAIMS = [...CLAIM_TYPES, "框架"] as const;
const Text = z.string().min(1);
const Claim = z.enum(LESSON_CLAIMS);
const SrcRefs = z.array(z.string()).optional();

export const LessonSourceSchema = z.object({ id: z.string().regex(/^[a-z0-9-]+$/), title: Text, url: z.url().optional(), note: z.string().optional() }).strict();

const Item = z.object({ text: Text, claim: Claim.optional(), src: SrcRefs, when: z.string().optional() }).strict();
export const SceneSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("title"), sec: z.number().positive().optional(), kicker: z.string().optional(), heading: Text, text: z.string().optional() }).strict(),
  z.object({ type: z.literal("points"), sec: z.number().positive().optional(), kicker: z.string().optional(), heading: Text, items: z.array(Item).min(1) }).strict(),
  z.object({ type: z.literal("timeline"), sec: z.number().positive().optional(), kicker: z.string().optional(), heading: Text, items: z.array(Item.extend({ when: Text })).min(2) }).strict(),
  z.object({
    type: z.literal("scale"), sec: z.number().positive().optional(), kicker: z.string().optional(), heading: Text,
    marks: z.array(z.object({ label: Text, ya: z.number().positive(), claim: Claim, src: SrcRefs }).strict()).min(2),
    caption: z.string().optional(),
  }).strict(),
  z.object({ type: z.literal("quote"), sec: z.number().positive().optional(), kicker: z.string().optional(), text: Text, who: Text, claim: Claim, src: SrcRefs, note: z.string().optional() }).strict(),
  z.object({
    type: z.literal("compare"), sec: z.number().positive().optional(), kicker: z.string().optional(), heading: Text,
    left: z.object({ h: Text, text: Text, claim: Claim, src: SrcRefs }).strict(), right: z.object({ h: Text, text: Text, claim: Claim, src: SrcRefs }).strict(),
  }).strict(),
]);

export const InteractionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("guess"), id: Text, prompt: Text, unit: z.enum(["clock24", "number"]),
    min: z.number(), max: z.number(), step: z.number().positive(), answer: z.number(), tolerance: z.number().nonnegative(),
    reveal: Text, claim: Claim, src: SrcRefs,
  }).strict().refine((g) => g.answer >= g.min && g.answer <= g.max, { message: "answer 超出范围" }),
  z.object({
    type: z.literal("sort"), id: Text, prompt: Text,
    buckets: z.array(z.object({ id: Text, label: Text, hint: z.string().optional() }).strict()).min(2).max(5),
    items: z.array(z.object({ text: Text, bucket: Text, why: Text, src: SrcRefs }).strict()).min(3),
  }).strict().refine((s) => s.items.every((i) => s.buckets.some((b) => b.id === i.bucket)), { message: "item.bucket 不在 buckets 里" }),
]);

export const ChapterSchema = z.object({
  id: z.string().regex(/^c\d+$/), part: Text, title: Text, minutes: z.number().positive(),
  scenes: z.array(SceneSchema).min(1), interaction: InteractionSchema.optional(),
}).strict();

export const LessonSchema = z.object({
  schema: z.literal("learn.lesson.v1"),
  id: z.string().regex(/^u-[a-z0-9-]+$/),
  no: z.number().int().positive(),
  title: Text, short: Text, icon: z.string().optional(), summary: Text,
  topic: Text, domain: Text,
  due: z.iso.date().optional(),
  minutes: z.number().positive(),
  links: z.array(z.object({ node: Text, kind: z.enum(EDGE_KINDS), note: Text }).strict()).default([]),
  prep: z.object({
    minutes: Text, prepare: z.array(Text).min(1),
    reading: z.array(z.object({ title: Text, author: z.string().optional(), url: z.url().optional(), part: z.string().optional(), note: z.string().optional(), required: z.boolean().default(false) }).strict()).default([]),
  }).strict(),
  chapters: z.array(ChapterSchema).min(1),
  quiz: z.array(QuizSchema).min(3).max(8),
  takeaway: z.object({ prompt: Text, placeholder: z.string().optional(), min: z.number().int().nonnegative().default(10), max: z.number().int().positive().default(600) }).strict(),
  close: z.object({ phrase: Text.default("完成"), hint: z.string().optional() }).strict(),
  sources: z.array(LessonSourceSchema).min(1),
}).strict().superRefine((l, ctx) => {
  const ids = new Set(l.sources.map((s) => s.id));
  const refs: string[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (k === "src" && Array.isArray(x)) refs.push(...(x as string[])); else walk(x); }
  };
  walk(l.chapters);
  for (const r of refs) if (!ids.has(r)) ctx.addIssue({ code: "custom", message: `引用了不存在的来源 ${r}` });
  const chIds = l.chapters.map((c) => c.id);
  if (new Set(chIds).size !== chIds.length) ctx.addIssue({ code: "custom", message: "章节 id 重复" });
  // 事实 / 学界共识 必须有来源
  const bare: string[] = [];
  const walk2 = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk2);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if ((o.claim === "事实" || o.claim === "学界共识") && !(Array.isArray(o.src) && o.src.length)) bare.push(String(o.text ?? o.label ?? o.h ?? o.prompt ?? "?").slice(0, 30));
      Object.values(o).forEach(walk2);
    }
  };
  walk2(l.chapters);
  for (const b of bare) ctx.addIssue({ code: "custom", message: `「事实 / 学界共识」缺来源：${b}` });
});

export type Lesson = z.infer<typeof LessonSchema>;
