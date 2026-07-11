import { calculateRoi } from "@/lib/calculations";
import { roiGoldenScenarios } from "./fixtures/roi-golden";

function main() {
  for (const scenario of roiGoldenScenarios) {
    const outcome = calculateRoi(scenario.inputs);
    if (!outcome.success) {
      console.error(`${scenario.name}: unexpected validation issues`, outcome.issues);
      process.exitCode = 1;
      continue;
    }
    console.log(scenario.name);
    console.log(JSON.stringify(outcome.result, null, 2));
  }
}

main();
