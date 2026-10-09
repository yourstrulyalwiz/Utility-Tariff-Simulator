import { readFile } from "node:fs/promises";
import type { Snapshot, Values } from "./engine";
import { prepareInteractive, calculateInteractive } from "./interactive";
import { workspaceFile } from "./seed";

let referencePromise:Promise<Snapshot>|undefined;
async function reference() {
  referencePromise??=readFile(workspaceFile("data/tagbilaran.seed.json"),"utf8").then(raw=>({...JSON.parse(raw),version:1}));
  return referencePromise;
}
export function isDemoCopy(v:Values) {
  return v.method==="workbook_reference" && !!v.observations?.some(o=>o.metric.startsWith("legacy_")&&o.source.includes("02 Financial Model /"));
}
/** No database access or writes: saved record only establishes provenance/permissions. */
export async function previewDraft(draft:Snapshot,savedInputs:Values) {
  const demoEligible=isDemoCopy(savedInputs);
  const inputs=draft.inputs.method==="workbook_reference"?prepareInteractive(draft.inputs,demoEligible):structuredClone(draft.inputs);
  const seed=await reference();
  const defaults=demoEligible?prepareInteractive(seed.inputs,true):{};
  const original=demoEligible?calculateInteractive({...seed,inputs:defaults}).baseline.filter(y=>y.year>=draft.startYear&&y.year<=draft.endYear):[];
  const supported=inputs.method==="workbook_reference" && (inputs.projects??[]).every(p=>p.grantPercent===100&&p.equityPercent===0);
  return {result:calculateInteractive({...draft,inputs}),original,inputs,defaults,demoEligible,supported};
}
