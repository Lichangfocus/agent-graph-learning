import { REPO_ROOT } from "../lib/paths";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { CheckYourselfSchema, UnitSchema } from "../lib/schemas/unit";
import { z } from "zod";

function main() {
  const jsonSchema = z.toJSONSchema(UnitSchema, {
    target: "draft-2020-12",
    // Custom Zod refinements need an explicit JSON Schema equivalent.
    override: ({ zodSchema, jsonSchema }) => {
      if (zodSchema !== CheckYourselfSchema) return;
      const options = jsonSchema.properties?.options;
      if (options && typeof options === "object") {
        options.contains = { required: ["correct"], properties: { correct: { const: true } } };
        options.minContains = 1;
        options.maxContains = 1;
      }
    },
  });
  const outDir = resolve(REPO_ROOT, "engine", "schema");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "unit.schema.json");
  writeFileSync(outPath, JSON.stringify(jsonSchema, null, 2), "utf-8");
  console.log(`Wrote JSON Schema to ${outPath}`);
}

main();
