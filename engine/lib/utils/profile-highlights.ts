import { profilePath } from "../paths";
import { readFileSync } from "node:fs";
import { load as yamlLoad } from "js-yaml";
import { LearningProfileSchema } from "../schemas/profile";

// Read the fields actually present in this profile; pass only learning context to the browser.
export function loadLearningProfile(path = profilePath("learner-profile.yaml")) {
  return LearningProfileSchema.parse(yamlLoad(readFileSync(path, "utf-8")));
}

export function loadProfileHighlights(path = profilePath("learner-profile.yaml")): string[] {
  const profile = loadLearningProfile(path);
  const highlights: string[] = [];
  const known = profile.known_domains?.filter((item) => item.confidence === "high").slice(0, 2);
  if (known?.length) highlights.push(`熟悉的领域：${known.map((item) => item.domain).join("、")}`);
  if (profile.analogy_sources_ranked?.length) highlights.push(`偏好的类比来源：${profile.analogy_sources_ranked.slice(0, 3).join("、")}`);
  for (const id of ["framework_first", "reduce_to_known"]) {
    const preference = profile.explanation_preferences?.find((item) => item.id === id);
    if (preference) highlights.push(preference.rule);
  }
  return highlights;
}
