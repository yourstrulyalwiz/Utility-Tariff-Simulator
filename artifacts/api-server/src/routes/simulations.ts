import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { randomUUID, createHash } from "node:crypto";
import { db, simulationsTable, revisionsTable, runsTable, reportsTable, evidenceTable } from "@workspace/db";
import { and, eq, or, desc, inArray } from "drizzle-orm";
import { CreateSimulationBody, UpdateSimulationBody, CalculateSimulationBody, RequestEvidenceUploadBody, ConfirmEvidenceBody, PreviewSimulationBody } from "@workspace/api-zod";
import { calculate, known, type Snapshot, type Values } from "../lib/engine";
import { sources } from "../lib/source-register";
import { addRevisionDetails, workspaceFile } from "../lib/seed";
import { ObjectStorageService, objectStorageClient } from "../lib/objectStorage";
import { storeReportFiles, type FrozenRun } from "../lib/reporting";
import { previewDraft } from "../lib/preview";
const router:IRouter=Router(), storage=new ObjectStorageService();
class HttpError extends Error { constructor(public status:number,message:string){super(message);} }
const wrap=(fn:(req:Request,res:Response)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>{fn(req,res).catch(next);};
const ownedScope=(req:Request)=>req.user ? or(eq(simulationsTable.readOnly,true),eq(simulationsTable.ownerId,req.user.id))! : eq(simulationsTable.readOnly,true);
function user(req:Request) { if(!req.isAuthenticated()) throw new HttpError(401,"Log in to save your simulations."); return req.user.id; }
async function simulation(req:Request,id:string,write=false) {
  const [row]=await db.select().from(simulationsTable).where(and(eq(simulationsTable.id,id),ownedScope(req))).limit(1);
  if(!row) throw new HttpError(404,"Simulation not found");
  if(write){user(req);if(row.readOnly)throw new HttpError(403,"Workbook reference is read-only. Duplicate to edit.");}
  return row;
}
function snapshot(row:typeof simulationsTable.$inferSelect):Snapshot {
  return {name:row.name,utility:row.utility,startYear:row.startYear,endYear:row.endYear,currency:row.currency,version:row.version,inputs:row.inputs as Values};
}
function validate(s:Snapshot) {
  if(s.endYear<s.startYear || s.endYear-s.startYear>29) throw new HttpError(400,"Choose a forecast period of 1–30 years");
  if(!/^[A-Z]{3}$/.test(s.currency)) throw new HttpError(400,"Use a three-letter currency code");
  const ids=new Set<string>();
  for(const p of s.inputs.projects??[]) {
    if(ids.has(p.id))throw new HttpError(400,"Investment project identifiers must be unique");
    ids.add(p.id);
    if(p.grantPercent+p.equityPercent>100)throw new HttpError(400,"Grant and equity shares cannot exceed 100%");
    if(p.year>2100||p.year<1900)throw new HttpError(400,"Invalid project year");
  }
  if((s.inputs.observations?.length??0)>1000 || (s.inputs.projects?.length??0)>100)throw new HttpError(400,"Too many detail records");
  for(const o of s.inputs.observations??[])if(o.metric.startsWith("legacy_")&&known(o.value)&&o.value<0)throw new HttpError(400,"Annual workbook volumes, connection counts and prices cannot be negative.");
}
async function view(row:typeof simulationsTable.$inferSelect) {
  const [latest]=await db.select({id:runsTable.id,inputVersion:runsTable.inputVersion}).from(runsTable).where(eq(runsTable.simulationId,row.id)).orderBy(desc(runsTable.createdAt)).limit(1);
  const v=row.inputs as Values;
  const sections = [
    !!row.utility,
    known(v.connections)||known(v.production)||known(v.billedVolume),
    known(v.collections)||known(v.billings)||known(v.historicalOpex),
    known(v.consumption)&&known(v.targetNrw),
    known(v.futureOpex),!!v.projects?.length,
    !!v.method,!!latest,
  ];
  return {...row,createdAt:row.createdAt.toISOString(),updatedAt:row.updatedAt.toISOString(),status:row.readOnly?"Workbook reference example":latest?.inputVersion===row.version?"Ready to review":"Draft",completedSections:sections.filter(Boolean).length,latestRunId:latest?.id??null,resultsOutdated:!!latest&&latest.inputVersion!==row.version};
}
async function accessibleRun(req:Request,id:string) {
  const [run]=await db.select().from(runsTable).where(eq(runsTable.id,id)).limit(1);
  if(!run)throw new HttpError(404,"Calculation run not found");
  await simulation(req,run.simulationId);
  return run;
}
router.get("/simulations",wrap(async(req,res)=>{
  const rows=await db.select().from(simulationsTable).where(ownedScope(req)).orderBy(desc(simulationsTable.updatedAt));
  res.json(await Promise.all(rows.map(view)));
}));
router.post("/simulations",wrap(async(req,res)=>{
  const ownerId=user(req), data=CreateSimulationBody.parse(req.body);
  validate({...data,currency:data.currency??"PHP",version:1,inputs:{}});
  const id=randomUUID();
  const row=await db.transaction(async tx=>{
    const [created]=await tx.insert(simulationsTable).values({id,ownerId,...data,currency:data.currency??"PHP",inputs:{method:"workbook_reference"},version:1}).returning();
    await tx.insert(revisionsTable).values({id:randomUUID(),simulationId:id,version:1,snapshot:snapshot(created!)});
    return created!;
  });
  res.status(201).json(await view(row));
}));
router.get("/simulations/:id",wrap(async(req,res)=>res.json(await view(await simulation(req,String(req.params.id))))));
router.post("/simulations/:id/preview",wrap(async(req,res)=>{
  const row=await simulation(req,String(req.params.id));
  if(!row.readOnly)user(req);
  const requested=PreviewSimulationBody.parse(req.body);
  // Protected examples ignore supplied overrides; they are never previewed as edited.
  const draft=row.readOnly?snapshot(row):requested;
  validate(draft);
  res.setHeader("Cache-Control","private, no-store");
  res.json(await previewDraft(draft,row.inputs as Values));
}));
router.put("/simulations/:id",wrap(async(req,res)=>{
  const id=String(req.params.id);await simulation(req,id,true);
  const data=UpdateSimulationBody.parse(req.body);validate(data);
  const row=await db.transaction(async tx=>{
    const [saved]=await tx.update(simulationsTable).set({name:data.name,utility:data.utility,startYear:data.startYear,endYear:data.endYear,currency:data.currency,inputs:data.inputs,version:data.version+1,updatedAt:new Date()}).where(and(eq(simulationsTable.id,id),eq(simulationsTable.version,data.version),eq(simulationsTable.ownerId,user(req)),eq(simulationsTable.readOnly,false))).returning();
    if(!saved)throw new HttpError(409,"Inputs changed in another session. Reopen the simulation before saving.");
    const snap=snapshot(saved);
    await tx.insert(revisionsTable).values({id:randomUUID(),simulationId:id,version:saved.version,snapshot:snap});
    await addRevisionDetails(tx,id,snap);
    return saved;
  });
  res.json(await view(row));
}));
router.post("/simulations/:id/duplicate",wrap(async(req,res)=>{
  const ownerId=user(req),original=await simulation(req,String(req.params.id));
  const id=randomUUID();
  const row=await db.transaction(async tx=>{
    const [created]=await tx.insert(simulationsTable).values({id,ownerId,name:original.name+" — copy",utility:original.utility,startYear:original.startYear,endYear:original.endYear,currency:original.currency,inputs:structuredClone(original.inputs),version:1,readOnly:false}).returning();
    const snap=snapshot(created!);
    await tx.insert(revisionsTable).values({id:randomUUID(),simulationId:id,version:1,snapshot:snap});
    await addRevisionDetails(tx,id,snap);
    return created!;
  });
  res.status(201).json(await view(row));
}));
router.get("/simulations/:id/runs",wrap(async(req,res)=>{
  const id=String(req.params.id);await simulation(req,id);
  const rows=await db.select().from(runsTable).where(eq(runsTable.simulationId,id)).orderBy(desc(runsTable.createdAt));
  res.json(rows.map(r=>r.result));
}));
router.post("/simulations/:id/runs",wrap(async(req,res)=>{
  const id=String(req.params.id);const original=await simulation(req,id);
  if(!original.readOnly)user(req);
  const {version}=CalculateSimulationBody.parse(req.body);
  const result=await db.transaction(async tx=>{
    const [current]=await tx.select().from(simulationsTable).where(eq(simulationsTable.id,id)).for("update");
    if(!current || current.version!==version)throw new HttpError(409,"Save or reload inputs before calculating.");
    const snap=snapshot(current);validate(snap);
    const hash=createHash("sha256").update(JSON.stringify(snap)).digest("hex");
    const computed=calculate(snap);
    const [existing]=await tx.select().from(runsTable).where(and(eq(runsTable.simulationId,id),eq(runsTable.inputHash,hash),eq(runsTable.engineVersion,computed.engineVersion))).limit(1);
    if(existing)return existing.result;
    const frozen={id:randomUUID(),simulationId:id,inputVersion:version,createdAt:new Date().toISOString(),inputs:snap,...computed};
    await tx.insert(runsTable).values({id:frozen.id,simulationId:id,inputVersion:version,inputHash:hash,engineVersion:frozen.engineVersion,result:frozen});
    return frozen;
  });
  res.status(201).json(result);
}));
router.get("/runs/:id",wrap(async(req,res)=>res.json((await accessibleRun(req,String(req.params.id))).result)));
router.get("/workspace/summary",wrap(async(req,res)=>{
  const sims=await db.select().from(simulationsTable).where(ownedScope(req));
  const ids=sims.map(s=>s.id);
  const runs=ids.length?await db.select().from(runsTable).where(inArray(runsTable.simulationId,ids)):[];
  const runIds=runs.map(r=>r.id);
  const reports=runIds.length?await db.select().from(reportsTable).where(inArray(reportsTable.runId,runIds)):[];
  res.json({simulations:sims.length,drafts:sims.filter(s=>!s.readOnly).length,runs:runs.length,reports:reports.length,recentActivity:sims.slice().sort((a,b)=>b.updatedAt.getTime()-a.updatedAt.getTime()).slice(0,5).map(s=>({label:`${s.name} ${s.readOnly?"reference initialized":"saved"}`,createdAt:s.updatedAt.toISOString()}))});
}));
router.get("/sources",(_req,res)=>res.json(sources));
router.get("/sources/:id/download",wrap(async(req,res)=>{
  user(req);
  const source=sources.find(s=>s.id===req.params.id);
  if(!source)throw new HttpError(404,"Source not found");
  res.setHeader("Cache-Control","private, no-store");
  res.download(workspaceFile("reference-package/source_files/"+source.name),source.name);
}));
router.post("/runs/:id/report",wrap(async(req,res)=>{
  user(req);const saved=await accessibleRun(req,String(req.params.id)),run=saved.result as FrozenRun;
  const report=await db.transaction(async tx=>{
    await tx.select().from(runsTable).where(eq(runsTable.id,saved.id)).for("update");
    const [existing]=await tx.select().from(reportsTable).where(eq(reportsTable.runId,saved.id)).limit(1);
    if(existing)return existing;
    const id=randomUUID(), files=await storeReportFiles(id,run);
    const [r]=await tx.insert(reportsTable).values({id,runId:saved.id,version:run.inputVersion,snapshot:{run,files}}).returning();
    return r!;
  });
  res.status(201).json({id:report.id,runId:report.runId,version:report.version,createdAt:report.createdAt.toISOString(),...Object.fromEntries(["pdf","docx","csv","json"].map(f=>[f+"Url",`/api/reports/${report.id}/download/${f}`]))});
}));
router.get("/reports/:id/download/:format",wrap(async(req,res)=>{
  user(req);
  const format=String(req.params.format);
  if(!["pdf","docx","csv","json"].includes(format))throw new HttpError(400,"Invalid report format");
  const [report]=await db.select().from(reportsTable).where(eq(reportsTable.id,String(req.params.id))).limit(1);
  if(!report)throw new HttpError(404,"Report not found");
  await accessibleRun(req,report.runId);
  const {files}=report.snapshot as {files:{bucket:string;prefix:string}};
  res.setHeader("Cache-Control","private, no-store");
  res.setHeader("Content-Disposition",`attachment; filename="utility-report-${report.version}.${format}"`);
  const types:Record<string,string>={pdf:"application/pdf",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",csv:"text/csv",json:"application/json"};
  res.setHeader("Content-Type",types[format]!);
  objectStorageClient.bucket(files.bucket).file(`${files.prefix}/report.${format}`).createReadStream().on("error",err=>{req.log.error({err},"Report storage read failed");res.destroy();}).pipe(res);
}));
router.get("/simulations/:id/evidence",wrap(async(req,res)=>{
  const id=String(req.params.id);const sim=await simulation(req,id);
  const docs=await db.select().from(evidenceTable).where(and(eq(evidenceTable.simulationId,id),eq(evidenceTable.confirmed,true)));
  res.json([...((sim.inputs as Values).sourceNotes?.includes("Seven original")?sources:[]),...docs.map(d=>({id:d.id,name:d.name,role:"Uploaded evidence",locator:d.locator,available:true,url:`/api/evidence/${d.id}/download`}))]);
}));
router.post("/simulations/:id/evidence/upload",wrap(async(req,res)=>{
  const id=String(req.params.id);await simulation(req,id,true);
  const ownerId=user(req),data=RequestEvidenceUploadBody.parse(req.body);
  if(data.name.length>240)throw new HttpError(400,"Filename is too long");
  const url=await storage.getObjectEntityUploadURL(),objectPath=storage.normalizeObjectEntityPath(url),documentId=randomUUID();
  await db.insert(evidenceTable).values({id:documentId,ownerId,simulationId:id,...data,objectPath});
  res.json({id:documentId,uploadURL:url});
}));
router.post("/simulations/:id/evidence",wrap(async(req,res)=>{
  const simulationId=String(req.params.id);await simulation(req,simulationId,true);
  const data=ConfirmEvidenceBody.parse(req.body);
  const [doc]=await db.select().from(evidenceTable).where(and(eq(evidenceTable.id,data.id),eq(evidenceTable.ownerId,user(req)),eq(evidenceTable.simulationId,simulationId))).limit(1);
  if(!doc)throw new HttpError(404,"Upload request not found");
  const file=await storage.getObjectEntityFile(doc.objectPath);
  const [meta]=await file.getMetadata();
  if(Number(meta.size)!==doc.size || Number(meta.size)>25000000)throw new HttpError(400,"Uploaded file size differs from declared size");
  const [bytes]=await file.download();
  const checksum=createHash("sha256").update(bytes).digest("hex");
  await db.update(evidenceTable).set({confirmed:true,checksum,locator:data.locator??""}).where(eq(evidenceTable.id,doc.id));
  res.status(201).json({id:doc.id,name:doc.name,role:"Uploaded evidence",locator:data.locator??"",available:true,url:`/api/evidence/${doc.id}/download`});
}));
router.get("/evidence/:id/download",wrap(async(req,res)=>{
  const ownerId=user(req);
  const [doc]=await db.select().from(evidenceTable).where(and(eq(evidenceTable.id,String(req.params.id)),eq(evidenceTable.ownerId,ownerId),eq(evidenceTable.confirmed,true))).limit(1);
  if(!doc)throw new HttpError(404,"Evidence not found");
  await simulation(req,doc.simulationId);
  const file=await storage.getObjectEntityFile(doc.objectPath);
  res.setHeader("Cache-Control","private, no-store");res.setHeader("Content-Type","application/octet-stream");
  res.setHeader("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(doc.name)}`);
  file.createReadStream().on("error",err=>{req.log.error({err},"Evidence read failed");res.destroy();}).pipe(res);
}));
router.use((err:unknown,req:Request,res:Response,_next:NextFunction)=>{
  if(err instanceof HttpError){res.status(err.status).json({error:err.message});return;}
  if(err && typeof err==="object" && "name" in err && err.name==="ZodError"){res.status(400).json({error:"Input validation failed",details:"issues" in err?err.issues:undefined});return;}
  req.log.error({err},"Simulation operation failed");
  res.status(500).json({error:"The operation could not be completed. Your saved inputs have not been discarded."});
});
export default router;
