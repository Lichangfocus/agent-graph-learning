import { profilePath } from "../paths";
import { readFileSync } from "node:fs";
import { load as yamlLoad } from "js-yaml";
import matter from "gray-matter";

export type LearnerProfile = {
  name?: string;
  language: "zh-CN" | "zh" | "en";
  readingLevel?: "middle-school" | "high-school" | "undergrad" | "general-public";
  prefersAnalogies?: string[];
  interests?: string[];
  priorKnowledge?: string[]; // concepts already mastered
  avoid?: string[]; // sensitivities or demotivators
  notes?: string;
};

export function loadLearnerProfileYAML(
  path = profilePath("learner-profile.yaml")
): LearnerProfile {
  const text = readFileSync(path, "utf-8");
  const data = yamlLoad(text) as Partial<LearnerProfile> | null;
  const profile: LearnerProfile = {
    name: data?.name,
    language: data?.language ?? "zh-CN",
    readingLevel: data?.readingLevel ?? "undergrad",
    prefersAnalogies: data?.prefersAnalogies ?? [],
    interests: data?.interests ?? [],
    priorKnowledge: data?.priorKnowledge ?? [],
    avoid: data?.avoid ?? [],
    notes: data?.notes ?? "",
  };
  return profile;
}

export function loadLearnerProfileMarkdown(
  path = profilePath("learner-profile.md")
): { summary: string; raw: string } {
  const raw = readFileSync(path, "utf-8");
  const { content } = matter(raw);
  return { summary: content.trim(), raw };
}
