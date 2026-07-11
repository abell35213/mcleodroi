import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createPresentation } from "@/lib/presentation/pptx/create-presentation";
import { buildAssumptionsAppendixSlide, buildCoverSlide, buildDualModuleSlide, buildExecutiveSummarySlide, buildOpportunitySummarySlide, buildSingleModuleSlide } from "@/lib/presentation/slides";
import { assumptionsAppendixModel, brokerModel, coverModel, dualModel, executiveModel, marginModel, opportunityModel } from "./fixtures/presentation-golden";
async function main() { const output="test-results/presentation-golden.pptx"; mkdirSync(dirname(output), { recursive:true }); const pptx=createPresentation({ title:"Golden Business Impact Analysis Fixture" }); buildCoverSlide(pptx, coverModel); buildExecutiveSummarySlide(pptx, executiveModel); buildSingleModuleSlide(pptx, brokerModel); buildDualModuleSlide(pptx, dualModel); buildSingleModuleSlide(pptx, marginModel); buildOpportunitySummarySlide(pptx, opportunityModel); buildAssumptionsAppendixSlide(pptx, assumptionsAppendixModel); await pptx.writeFile({ fileName: output }); console.log(output); }
main().catch((error)=>{ console.error(error); process.exit(1); });
