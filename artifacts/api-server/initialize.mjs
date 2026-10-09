import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
await mkdir(".tmp",{recursive:true});
await build({
  entryPoints:[process.argv.includes("--check-reports")?"src/check-reports.ts":"src/initialize.ts"], bundle:true, platform:"node",format:"esm",
  outfile:".tmp/initialize.mjs",external:["pino","pino-pretty","pdfkit","docx","@google-cloud/storage","google-auth-library"],
  banner:{js:"import { createRequire as __initRequire } from 'node:module'; const require = __initRequire(import.meta.url);"},
});
const child=spawnSync(process.execPath,[".tmp/initialize.mjs"],{stdio:"inherit",env:process.env});
await rm(".tmp/initialize.mjs");
process.exitCode=child.status??1;
