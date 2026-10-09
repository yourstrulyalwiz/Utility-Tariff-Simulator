import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { calculate, type Snapshot } from "./lib/engine";
import { workspaceFile } from "./lib/seed";
import { pdfBuffer, docxBuffer, csvBuffer, storeReportFiles, type FrozenRun } from "./lib/reporting";
import { objectStorageClient } from "./lib/objectStorage";
import { pool } from "@workspace/db";
import { logger } from "./lib/logger";
const inputs={...JSON.parse(await readFile(workspaceFile("data/tagbilaran.seed.json"),"utf8")),version:1} as Snapshot;
const run:FrozenRun={id:"report-verification",simulationId:"tagbilaran-reference",inputVersion:1,createdAt:"2026-10-08T00:00:00.000Z",inputs,...calculate(inputs)};
const pdf=await pdfBuffer(run),docx=await docxBuffer(run),csv=csvBuffer(run);
assert.equal(pdf.subarray(0,4).toString(),"%PDF");
assert.equal(docx.subarray(0,2).toString(),"PK");
assert.ok(csv.toString().includes('"2039"'));
await writeFile("/tmp/utility-report-check.pdf",pdf);
await writeFile("/tmp/utility-report-check.docx",docx);
const files=await storeReportFiles("verification-"+Date.now(),run);
for(const format of ["pdf","docx","csv","json"]) {
  const file=objectStorageClient.bucket(files.bucket).file(`${files.prefix}/report.${format}`);
  const [bytes]=await file.download();assert.ok(bytes.length>100);
  await file.delete();
}
logger.info("Report PDF, DOCX, CSV and JSON generation and private storage round trips passed");
await pool.end();
