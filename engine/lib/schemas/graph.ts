import { z } from "zod";

const NonEmptyString = z.string().trim().min(1);
const IdSchema = NonEmptyString.regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, "id 必须是稳定的目录/领域标识");
const ReviewStatusSchema = z.enum(["draft", "confirmed"]);

export const GraphDomainSchema = z.object({
  id: IdSchema,
  name: NonEmptyString,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "领域颜色使用六位十六进制色值").optional(),
}).strict();

export const GraphNodeSchema = z.object({
  id: IdSchema,
  icon: NonEmptyString,
  name: NonEmptyString,
  domain: IdSchema,
  module: NonEmptyString,
  week: z.number().int().positive(),
  desc: NonEmptyString,
  // Derived from source.md availability by the loader, never mastery progress.
  status: z.enum(["built", "planned"]).optional(),
}).strict();

export const GraphEdgeSchema = z.object({
  from: IdSchema,
  to: IdSchema,
  type: z.enum(["hard", "soft", "cross"]),
  why: NonEmptyString,
  // Omitted edges inherit the graph's review status; AI推断 stays draft.
  status: ReviewStatusSchema.optional(),
}).strict();

export const CourseGraphSchema = z.object({
  id: IdSchema,
  title: NonEmptyString,
  status: ReviewStatusSchema,
  updated: z.iso.date(),
  reorder: NonEmptyString,
  sources_ref: NonEmptyString,
  domains: z.array(GraphDomainSchema).min(1),
  nodes: z.array(GraphNodeSchema).min(1),
  edges: z.array(GraphEdgeSchema),
}).strict();

export type CourseGraph = z.infer<typeof CourseGraphSchema>;
