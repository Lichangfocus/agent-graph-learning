import { z } from "zod";

/** Atlas（全人类知识地图）+ 用户数据包（learn.userpack.v1）的数据模型。见 03-spec/整体spec.md §2。 */
const Id = z.string().trim().regex(/^[a-z0-9][a-z0-9_-]*$/i, "id 只能是字母/数字/-/_");
const Text = z.string().trim().min(1);

export const EDGE_KINDS = ["prereq", "belongs", "causes", "leads_to", "contrast", "related", "parallel"] as const;
/** 个人判断：用户自建连线（只出现在覆盖层），不代表事实。 */
export const CLAIM_TYPES = ["事实", "学界共识", "主流解释", "有争议", "AI推断", "个人判断"] as const;
export const NODE_KINDS = ["concept", "event", "era", "lesson"] as const;
export const NODE_STATUS = ["stub", "draft", "ready"] as const;
export const MASTERY_LEVELS = ["locked", "seen", "learning", "lit", "mastered"] as const;
export const LOG_ACTIONS = ["open", "play", "quiz", "lit", "review", "note", "ask", "topic_create", "link_create", "done"] as const;

/** 事实核查来源（TASK-005）：标题必填，url 可选（书籍可只写出处）。 */
export const SourceSchema = z.object({ title: Text, url: z.url().optional(), note: z.string().optional() }).strict();

export const DomainSchema = z.object({
  id: Id, name: Text, icon: Text.optional(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), desc: z.string().optional(),
}).strict();

export const TopicMemberSchema = z.object({ id: Id, x: z.number().optional(), y: z.number().optional() }).strict();
export const TopicSchema = z.object({
  id: Id, domain: Id, name: Text, desc: z.string().optional(),
  members: z.array(TopicMemberSchema).default([]),
  created: z.string().optional(),
}).strict();

export const QuizSchema = z.object({
  q: Text, options: z.array(Text).min(2).max(6), answer: z.number().int().nonnegative(), explain: z.string().optional(),
}).strict().refine((item) => item.answer < item.options.length, { message: "answer 下标越界" });

export const NodeSchema = z.object({
  id: Id,
  kind: z.enum(NODE_KINDS),
  name: Text,
  summary: Text,
  status: z.enum(NODE_STATUS),
  domain: Id,
  topics: z.array(Id).min(1),
  icon: z.string().optional(),
  /** 时间：距今年数区间（ya，越大越早）与代表点 mark；只对 event/era 有意义 */
  time: z.object({ ya: z.tuple([z.number(), z.number()]), mark: z.number().optional(), label: z.string().optional() }).optional(),
  content: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  quiz: z.array(QuizSchema).optional(),
  sources: z.array(SourceSchema).optional(),
}).strict();

export const EdgeSchema = z.object({
  id: Id,
  src: Id,
  dst: Id,
  kind: z.enum(EDGE_KINDS),
  note: Text,
  claim_type: z.enum(CLAIM_TYPES),
  sources: z.array(SourceSchema).optional(),
}).strict();

export const AtlasSchema = z.object({
  schema: z.literal("learn.atlas.v1"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  updated: z.iso.date(),
  license: Text,
  claim_note: z.string().optional(),
  domains: z.array(DomainSchema).min(1),
  topics: z.array(TopicSchema).min(1),
  nodes: z.array(NodeSchema).min(1),
  edges: z.array(EdgeSchema),
}).strict();

/** 用户自建节点 / 边：id 必须以 u- 开头。 */
const UserId = Id.refine((id) => id.startsWith("u-"), { message: "用户自建 id 必须以 u- 开头" });
export const OverlayNodeSchema = NodeSchema.extend({ id: UserId, status: z.enum(NODE_STATUS).default("stub") });
export const OverlayEdgeSchema = EdgeSchema.extend({ id: UserId, claim_type: z.enum(CLAIM_TYPES).default("AI推断") });
export const UserTopicSchema = TopicSchema.extend({ id: UserId });

export const LogEventSchema = z.object({
  ts: z.iso.datetime({ offset: true }),
  device: Text.optional(),
  node: Id.optional(),
  action: z.enum(LOG_ACTIONS),
  payload: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const PackMetaSchema = z.object({
  schema: z.literal("learn.userpack.v1"),
  owner: Text,
  atlas_version: z.string(),
  engine_version: z.string(),
}).passthrough();

export type Source = z.infer<typeof SourceSchema>;
export type Atlas = z.infer<typeof AtlasSchema>;
export type AtlasNode = z.infer<typeof NodeSchema>;
export type AtlasEdge = z.infer<typeof EdgeSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type LogEvent = z.infer<typeof LogEventSchema>;
export type MasteryLevel = (typeof MASTERY_LEVELS)[number];
export type OverlayNode = z.infer<typeof OverlayNodeSchema>;
export type OverlayEdge = z.infer<typeof OverlayEdgeSchema>;
export type UserTopic = z.infer<typeof UserTopicSchema>;
