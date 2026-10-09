import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { db, simulationsTable, revisionsTable, runsTable, observationsTable, projectsTable } from "@workspace/db";
import { calculate, type Snapshot } from "./engine";
export const PILOT_ID = "tagbilaran-reference";
export function workspaceFile(relative: string) {
  const roots = [process.cwd(), path.resolve(process.cwd(),"../.."), path.resolve(import.meta.dirname,"../../../.."), path.resolve(import.meta.dirname,"../../..")];
  for (const root of roots) { const full=path.join(root,relative); if(existsSync(full)) return full; }
  throw new Error("Required reference file is unavailable: " + relative);
}
export async function addRevisionDetails(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], id:string, s:Snapshot) {
  const obs=s.inputs.observations??[], projects=s.inputs.projects??[];
  if(obs.length) await tx.insert(observationsTable).values(obs.map(o=>({id:randomUUID(),simulationId:id,revision:s.version,...o,value:o.value===null?null:String(o.value)})));
  if(projects.length) await tx.insert(projectsTable).values(projects.map(p=>({id:randomUUID(),simulationId:id,revision:s.version,projectKey:p.id,name:p.name,year:p.year,amount:String(p.amount),grantPercent:String(p.grantPercent),equityPercent:String(p.equityPercent),financing:{interestRate:p.interestRate,loanTerm:p.loanTerm,usefulLife:p.usefulLife,graceYears:p.graceYears??0,source:p.source??""}})));
}
// Explicit initialization command only. No startup schema changes or destructive seeds.
export async function initializeReference() {
  const seed = JSON.parse(await readFile(workspaceFile("data/tagbilaran.seed.json"),"utf8")) as Omit<Snapshot,"version">;
  await db.transaction(async tx=>{
    const inserted = await tx.insert(simulationsTable).values({id:PILOT_ID,...seed,version:1,readOnly:true}).onConflictDoNothing().returning();
    if(!inserted.length) return;
    const snapshot:Snapshot={...seed,version:1};
    await tx.insert(revisionsTable).values({id:randomUUID(),simulationId:PILOT_ID,version:1,snapshot});
    await addRevisionDetails(tx,PILOT_ID,snapshot);
    const result={id:randomUUID(),simulationId:PILOT_ID,inputVersion:1,createdAt:new Date().toISOString(),inputs:snapshot,...calculate(snapshot)};
    await tx.insert(runsTable).values({id:result.id,simulationId:PILOT_ID,inputVersion:1,inputHash:createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),engineVersion:result.engineVersion,result});
  });
}
