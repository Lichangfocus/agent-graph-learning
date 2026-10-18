import { dataDir } from "../lib/paths";
import { loadAllUnits } from "../lib/utils/content";

function main() {
  const units = loadAllUnits();
  console.log(`Validated ${units.length} unit(s)（公开 units/ + 数据包 ${dataDir()}/units-private）:`);
  for (const u of units) {
    const canon = u.sections.keyConcepts.filter((concept) => concept.canon).length;
    const evidence = u.sections.masteryEvidence?.length ?? 0;
    const mcq = u.sections.checkYourself.filter((question) => question.options !== undefined).length;
    console.log(`- ${u.frontmatter.id}: ${u.frontmatter.title} · canon 概念 ${canon} · 掌握证据 ${evidence} · MCQ ${mcq}`);
  }
}

main();
