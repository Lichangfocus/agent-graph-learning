import { z } from "zod";

// Validate the learning context consumed by renderers; retain the profile's
// extensible editorial fields rather than defining a second profile format.
export const LearningProfileSchema = z.object({
  learner: z.object({
    display_name: z.string().min(1),
    language: z.string().min(1),
  }).passthrough().optional(),
  known_domains: z.array(z.object({ domain: z.string().min(1), confidence: z.string().min(1) }).passthrough()).optional(),
  analogy_sources_ranked: z.array(z.string().min(1)).optional(),
  explanation_preferences: z.array(z.object({ id: z.string().min(1), rule: z.string().min(1) }).passthrough()).optional(),
}).passthrough();
