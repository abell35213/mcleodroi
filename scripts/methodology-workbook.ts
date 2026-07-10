import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { methodologyGoldenCases } from "./fixtures/methodology-golden";

/**
 * Regenerates docs/methodology/worked-examples.csv from the golden fixtures so
 * the human-readable spreadsheet can never drift from the tested source of
 * truth. Run with `npm run methodology:workbook`.
 */
function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function main() {
  const rows: string[] = [];
  rows.push(["module_key", "kind", "key", "value"].join(","));
  for (const goldenCase of methodologyGoldenCases) {
    for (const [key, value] of Object.entries(goldenCase.inputs)) {
      rows.push([goldenCase.moduleKey, "input", key, String(value)].map(csvEscape).join(","));
    }
    rows.push([goldenCase.moduleKey, "output", "valueType", goldenCase.expected.valueType].map(csvEscape).join(","));
    for (const [key, value] of Object.entries(goldenCase.expected.financialOutputs)) {
      rows.push([goldenCase.moduleKey, "output", key, String(value)].map(csvEscape).join(","));
    }
    for (const [key, value] of Object.entries(goldenCase.expected.derivedMetrics)) {
      rows.push([goldenCase.moduleKey, "derived", key, String(value)].map(csvEscape).join(","));
    }
  }
  const output = fileURLToPath(new URL("../docs/methodology/worked-examples.csv", import.meta.url));
  writeFileSync(output, `${rows.join("\n")}\n`, "utf8");
  console.log(output);
}

main();
