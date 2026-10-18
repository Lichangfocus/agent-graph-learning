import { z } from "zod";
import { KeyConceptSchema, CheckYourselfSchema } from "./unit";

/**
 * 速讲单元（units-explain/<slug>/source.md）。
 * 复用正式单元的 KeyConcept / CheckYourself 信约，但去掉艺术品、分镜等重型必填项，
 * 让任意知识点（文章、问题）都能快速成稿。
 */
export const ExplainFrontmatterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "id 只能用小写字母、数字、短横线"),
  title: z.string().min(1),
  kind: z.literal("explain"),
  estTime: z.number().int().positive(),
  sources: z.array(z.string()).default([]),
  tags: z.array(z.string()).optional(),
});

export const MisconceptionSchema = z.object({
  myth: z.string().min(1),
  truth: z.string().min(1),
});

export const ExampleSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});

export const ExplainSectionsSchema = z.object({
  essence: z.string().min(1),           // 本质一句话
  hookQuestion: z.string().min(1),
  coreNarrative: z.array(z.string()).min(1),
  keyConcepts: z.array(KeyConceptSchema.extend({
    analogy: z.string().min(1),
    analogyLimit: z.string().min(1),    // 类比失效处：必填
  })).min(1),
  example: ExampleSchema,
  diagram: z.string().min(1),           // mermaid flowchart 源码
  misconceptions: z.array(MisconceptionSchema).min(1),
  checkYourself: z.array(CheckYourselfSchema).min(3).refine(
    (qs) => qs.every((q) => q.options !== undefined),
    { message: "速讲单元的自测题必须都是选择题（带 options）" }),
  missing: z.string().optional(),       // 缺什么材料 / 不确定处
});

export const ExplainUnitSchema = z.object({
  frontmatter: ExplainFrontmatterSchema,
  sections: ExplainSectionsSchema,
});
export type ExplainUnit = z.infer<typeof ExplainUnitSchema>;
