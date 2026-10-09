import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, TextRun } from "docx";
import { objectStorageClient, ObjectStorageService } from "./objectStorage";
import type { calculate, Snapshot } from "./engine";
export type FrozenRun = ReturnType<typeof calculate> & {
  id: string; simulationId:string; inputVersion:number; createdAt:string; inputs:Snapshot;
};
const fmt = (n:unknown) => typeof n==="number"?n.toLocaleString("en",{maximumFractionDigits:4}):"Not available";
export function reportLines(run:FrozenRun) {
  const s=run.inputs;
  return [
    ["Utility Tariff Simulator", `${s.name} | ${s.utility}`],
    ...(run.interactive?[["Export scope","Base frozen calculation only. Annual tables and CSV exclude operational intervention results; this is not an export of the interactive improved scenario. The JSON download includes the separately labelled interactive snapshot."]]:[]),
    ["Report status", "Indicative / partial planning report. Not an approved tariff or a financial viability certification."],
    ["Version and period", `${s.startYear}-${s.endYear} | Input revision ${run.inputVersion} | Run ${run.id} | ${run.createdAt}`],
    ["Methodology", `${run.method} | ${run.engineVersion} | Currency ${s.currency}`],
    ["Summary", Object.entries(run.summary).map(([k,v])=>`${k}: ${fmt(v)}`).join("\n")],
    ["Historical baseline", `${s.inputs.historicalStart??"Missing"} to ${s.inputs.historicalEnd??"Missing"}\n`+Object.entries(run.baseline).map(([k,v])=>`${k}: ${fmt(v)}`).join("\n")],
    ["Management actions", s.inputs.actions||"No confirmed actions entered."],
    ["Assumptions", JSON.stringify(s.inputs,null,2)],
    ["Annual results", run.annual.map(r=>Object.entries(r).map(([k,v])=>`${k}: ${fmt(v)}`).join(" | ")).join("\n\n")],
    ["Limitations and missing information", run.warnings.join("\n")||"No validation warnings."],
    ["Calculation explanations", run.explanations.join("\n\n")],
    ["Evidence and source notes", s.inputs.sourceNotes||"No source notes provided."],
    ["Planning notes", s.inputs.notes||"No planning notes provided."],
    ["Traceability", "This report uses a frozen saved calculation run. Later changes to simulation inputs do not change this report. Historical observations retain their periods, units, quality and source locators. Equivalent average tariffs must not be presented as actual household bills."],
  ];
}
export async function pdfBuffer(run:FrozenRun):Promise<Buffer> {
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:"A4",margin:48,info:{Title:run.inputs.name,Author:"Utility Tariff Simulator",CreationDate:new Date(run.createdAt),ModDate:new Date(run.createdAt)}});
    const chunks:Buffer[]=[];
    doc.on("data",c=>chunks.push(c));doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);
    for(const [heading,body] of reportLines(run)) {
      if(doc.y>720) doc.addPage();
      doc.font("Helvetica-Bold").fontSize(heading==="Utility Tariff Simulator"?21:12).fillColor("#123f48").text(heading!);
      doc.moveDown(0.4).font("Helvetica").fontSize(9).fillColor("#22343b").text(body!,{lineGap:3}).moveDown(1);
    }
    doc.end();
  });
}
export async function docxBuffer(run:FrozenRun) {
  const doc=new Document({
    creator:"Utility Tariff Simulator",title:run.inputs.name,description:"Frozen utility planning report",
    sections:[{children:[...reportLines(run).flatMap(([heading,body])=>[
      new Paragraph({text:heading,heading:HeadingLevel.HEADING_1}),
      ...body!.split("\n").map(line=>new Paragraph({children:[new TextRun(line)]})),
    ]),
      new Paragraph({text:"Annual summary",heading:HeadingLevel.HEADING_1}),
      new Table({rows:[
        new TableRow({children:["Year","Billed m³","OPEX","Average tariff","Closing cash"].map(x=>new TableCell({children:[new Paragraph(x)]}))}),
        ...run.annual.map(r=>new TableRow({children:[r.year,r.billedVolume,r.opex,r.requiredTariff,r.closingCash].map(x=>new TableCell({children:[new Paragraph(fmt(x))]}))})),
      ]}),
    ]}],
  });
  return Packer.toBuffer(doc);
}
export function csvBuffer(run:FrozenRun) {
  const keys=Object.keys(run.annual[0]??{});
  const quote=(x:unknown)=>`"${String(x??"").replace(/"/g,'""')}"`;
  return Buffer.from(keys.map(quote).join(",")+"\r\n"+run.annual.map(r=>keys.map(k=>quote(r[k as keyof typeof r])).join(",")).join("\r\n"),"utf8");
}
export async function storeReportFiles(reportId:string,run:FrozenRun) {
  const storage=new ObjectStorageService();
  const base=storage.getPrivateObjectDir().replace(/^\/+/,"");
  const [bucket,...prefix]=base.split("/");
  if(!bucket) throw new Error("Private storage is not configured");
  const buffers={pdf:await pdfBuffer(run),docx:await docxBuffer(run),csv:csvBuffer(run),json:Buffer.from(JSON.stringify(run,null,2))};
  const types={pdf:"application/pdf",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",csv:"text/csv",json:"application/json"};
  await Promise.all(Object.entries(buffers).map(async ([format,buffer])=>{
    const objectName=[...prefix,"reports",reportId,`report.${format}`].join("/");
    await objectStorageClient.bucket(bucket).file(objectName).save(buffer,{resumable:false,metadata:{contentType:types[format as keyof typeof types]}});
  }));
  return {bucket,prefix:[...prefix,"reports",reportId].join("/")};
}
