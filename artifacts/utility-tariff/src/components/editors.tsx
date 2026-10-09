import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListEvidenceQueryKey, useConfirmEvidence, useListEvidence, useRequestEvidenceUpload, type InvestmentProject, type Observation } from "@workspace/api-client-react";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/shell";
import { errMsg } from "@/lib/format";
import { numberOrNull } from "@/lib/fields";

const lab = "block text-sm";
export function Field({ label, unit, help, children }: { label: string; unit?: string; help?: string; children: React.ReactNode }) {
  return <label className={lab}><span className="font-medium">{label}</span>{unit && <span className="text-muted-foreground"> ({unit})</span>}{children}{help && <span className="block text-xs text-muted-foreground mt-1">{help}</span>}</label>;
}

export function ProjectsEditor({ projects, onChange, disabled, startYear, endYear }: { projects: InvestmentProject[]; onChange: (p: InvestmentProject[]) => void; disabled: boolean; startYear: number; endYear: number }) {
  const upd = (i: number, patch: Partial<InvestmentProject>) => onChange(projects.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const add = () => onChange([...projects, { id: crypto.randomUUID(), name: "", year: startYear, amount: 0, grantPercent: 0, equityPercent: 0, interestRate: 0, loanTerm: 20, usefulLife: 30, graceYears: 0, source: "" }]);
  return (
    <div className="space-y-4">
      {projects.length === 0 && <Notice>No projects yet. Add each capital project with its cost, year and funding mix.</Notice>}
      {projects.map((p, i) => {
        const over = p.grantPercent + p.equityPercent > 100;
        const loan = Math.max(0, 100 - p.grantPercent - p.equityPercent);
        const n = (k: keyof InvestmentProject) => (e: React.ChangeEvent<HTMLInputElement>) => upd(i, { [k]: numberOrNull(e.target.value) ?? 0 } as Partial<InvestmentProject>);
        return (
          <fieldset key={p.id} disabled={disabled} className="rounded-lg border bg-card p-4" data-testid={`project-${i}`}>
            <legend className="px-2 text-sm font-semibold">Project {i + 1}</legend>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Project name"><input className="fi" value={p.name} onChange={(e) => upd(i, { name: e.target.value })} data-testid={`input-project-name-${i}`} /></Field>
              <Field label="Year of spending" unit="year" help={`Between ${startYear} and ${endYear}.`}><input type="number" className="fi" min={startYear} max={endYear} value={p.year} onChange={n("year")} /></Field>
              <Field label="Cost" unit="currency"><input type="number" min={0} className="fi" value={p.amount} onChange={n("amount")} /></Field>
              <Field label="Grant share" unit="percent of cost"><input type="number" min={0} max={100} className="fi" value={p.grantPercent} onChange={n("grantPercent")} /></Field>
              <Field label="Utility equity share" unit="percent of cost"><input type="number" min={0} max={100} className="fi" value={p.equityPercent} onChange={n("equityPercent")} /></Field>
              <div className="text-sm rounded-md bg-muted p-3"><div className="text-muted-foreground">Remaining loan</div><div className="num text-lg">{over ? "n/a" : `${loan}%`}</div></div>
              <Field label="Loan interest rate" unit="percent per year"><input type="number" min={0} max={100} step={0.1} className="fi" value={p.interestRate} onChange={n("interestRate")} /></Field>
              <Field label="Loan term" unit="years, 1 to 50"><input type="number" min={1} max={50} className="fi" value={p.loanTerm} onChange={n("loanTerm")} /></Field>
              <Field label="Grace period" unit="years, 0 to 10" help="Interest only."><input type="number" min={0} max={10} className="fi" value={p.graceYears ?? 0} onChange={n("graceYears")} /></Field>
              <Field label="Useful life" unit="years, 1 to 100"><input type="number" min={1} max={100} className="fi" value={p.usefulLife} onChange={n("usefulLife")} /></Field>
              <div className="md:col-span-2"><Field label="Source of cost estimate"><input className="fi" value={p.source ?? ""} onChange={(e) => upd(i, { source: e.target.value })} /></Field></div>
            </div>
            {over && <p className="text-sm text-destructive mt-2" role="alert">Grant plus equity cannot be more than 100 percent.</p>}
            {!disabled && <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => onChange(projects.filter((_, j) => j !== i))} data-testid={`button-remove-project-${i}`}><Trash2 className="h-4 w-4 mr-1" />Remove project</Button>}
          </fieldset>
        );
      })}
      {!disabled && <Button type="button" variant="outline" onClick={add} data-testid="button-add-project"><Plus className="h-4 w-4 mr-1" />Add project</Button>}
    </div>
  );
}

const QUAL = ["Known", "Estimated", "Not available", "Not applicable"] as const;
const HEAD = "metric, value, unit, period start, period end, quality, source, scope";
function parsePaste(text: string): { rows: Observation[]; bad: number } {
  const rows: Observation[] = []; let bad = 0;
  text.split(/\r?\n/).filter((l) => l.trim()).forEach((l, idx) => {
    const c = l.split(l.includes("\t") ? "\t" : ",").map((x) => x.trim());
    if (idx === 0 && c[0]?.toLowerCase() === "metric") return;
    const q = QUAL.find((x) => x.toLowerCase() === (c[5] || "").toLowerCase());
    const raw = c[1] ?? "";
    const v = raw === "" ? null : Number(raw.replace(/,/g, ""));
    if (!c[0] || !q || (v !== null && !Number.isFinite(v))) { bad++; return; }
    rows.push({ metric: c[0], value: v, unit: c[2] ?? "", periodStart: c[3] ?? "", periodEnd: c[4] ?? "", quality: q, source: c[6] ?? "", scope: c[7] ?? "" });
  });
  return { rows, bad };
}

export function ObservationsEditor({ items, onChange, disabled }: { items: Observation[]; onChange: (o: Observation[]) => void; disabled: boolean }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ rows: Observation[]; bad: number } | null>(null);
  const blank: Observation = { metric: "", value: null, unit: "", periodStart: "", periodEnd: "", quality: "Estimated", source: "", scope: "" };
  const upd = (i: number, p: Partial<Observation>) => onChange(items.map((o, j) => (j === i ? { ...o, ...p } : o)));
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Optional. Record individual measured or estimated figures with their quality, unit, period, source and scope. A value left blank stays unknown.</p>
      {items.map((o, i) => (
        <fieldset key={i} disabled={disabled} className="rounded-lg border bg-card p-3 grid gap-2 md:grid-cols-4" data-testid={`observation-${i}`}>
          <legend className="px-2 text-xs text-muted-foreground">Observation {i + 1}</legend>
          <Field label="Metric"><input className="fi" value={o.metric} onChange={(e) => upd(i, { metric: e.target.value })} /></Field>
          <Field label="Value"><input type="number" className="fi" value={o.value ?? ""} onChange={(e) => upd(i, { value: numberOrNull(e.target.value) })} /></Field>
          <Field label="Unit"><input className="fi" value={o.unit} onChange={(e) => upd(i, { unit: e.target.value })} /></Field>
          <Field label="Quality"><select className="fi" value={o.quality} onChange={(e) => upd(i, { quality: e.target.value as Observation["quality"] })}>{QUAL.map((q) => <option key={q}>{q}</option>)}</select></Field>
          <Field label="Period start"><input type="date" className="fi" value={o.periodStart} onChange={(e) => upd(i, { periodStart: e.target.value })} /></Field>
          <Field label="Period end"><input type="date" className="fi" value={o.periodEnd} onChange={(e) => upd(i, { periodEnd: e.target.value })} /></Field>
          <Field label="Source"><input className="fi" value={o.source} onChange={(e) => upd(i, { source: e.target.value })} /></Field>
          <Field label="Scope"><input className="fi" value={o.scope} onChange={(e) => upd(i, { scope: e.target.value })} /></Field>
          {!disabled && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 mr-1" />Remove</Button>}
        </fieldset>))}
      {!disabled && (
        <>
          <Button type="button" variant="outline" onClick={() => onChange([...items, blank])} data-testid="button-add-observation"><Plus className="h-4 w-4 mr-1" />Add observation</Button>
          <details className="rounded-lg border bg-card p-3"><summary className="cursor-pointer font-medium">Paste a table of observations</summary>
            <p className="text-xs text-muted-foreground my-2">Columns, separated by tabs or commas: {HEAD}. Quality must be Known, Estimated, Not available or Not applicable. Nothing is added until you confirm.</p>
            <textarea className="fi font-mono" rows={5} value={text} onChange={(e) => { setText(e.target.value); setPreview(null); }} data-testid="input-paste" />
            <Button type="button" size="sm" className="mt-2" disabled={!text.trim()} onClick={() => setPreview(parsePaste(text))} data-testid="button-preview-paste">Preview</Button>
            {preview && (
              <div className="mt-3 space-y-2">
                <p className="text-sm">{preview.rows.length} rows ready{preview.bad > 0 && `, ${preview.bad} skipped because a field was missing or invalid`}.</p>
                {preview.rows.length > 0 && <div className="overflow-x-auto"><table className="text-xs w-full"><tbody>{preview.rows.map((r, i) => <tr key={i} className="border-t"><td className="p-1">{r.metric}</td><td className="p-1 num">{r.value ?? "blank"}</td><td className="p-1">{r.unit}</td><td className="p-1">{r.periodStart}</td><td className="p-1">{r.periodEnd}</td><td className="p-1">{r.quality}</td><td className="p-1">{r.source}</td><td className="p-1">{r.scope}</td></tr>)}</tbody></table></div>}
                <div className="flex gap-2"><Button type="button" size="sm" disabled={!preview.rows.length} onClick={() => { onChange([...items, ...preview.rows]); setText(""); setPreview(null); }} data-testid="button-confirm-paste">Add {preview.rows.length} rows</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPreview(null)}>Cancel</Button></div>
              </div>)}
          </details>
        </>
      )}
    </div>
  );
}

export function EvidencePanel({ simId, canUpload, signedIn }: { simId: string; canUpload: boolean; signedIn: boolean }) {
  const qc = useQueryClient();
  const list = useListEvidence(simId, { query: { enabled: signedIn || !canUpload, queryKey: getListEvidenceQueryKey(simId) } });
  const req = useRequestEvidenceUpload();
  const conf = useConfirmEvidence();
  const [locator, setLocator] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const upload = async (file: File) => {
    setErr(""); setBusy(true);
    try {
      const ct = file.type || "application/octet-stream";
      const up = await req.mutateAsync({ id: simId, data: { name: file.name, size: file.size, contentType: ct } });
      const put = await fetch(up.uploadURL, { method: "PUT", headers: { "Content-Type": ct }, body: file });
      if (!put.ok) throw new Error("The file could not be sent to storage.");
      await conf.mutateAsync({ id: simId, data: { id: up.id, ...(locator.trim() ? { locator: locator.trim() } : {}) } });
      setLocator("");
      await qc.invalidateQueries({ queryKey: getListEvidenceQueryKey(simId) });
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  return (
    <div className="space-y-3">
      {canUpload ? (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <Field label="Where in the document to look" help="Optional. For example: page 12, table 3."><input className="fi" value={locator} onChange={(e) => setLocator(e.target.value)} data-testid="input-evidence-locator" /></Field>
          <input ref={ref} type="file" className="text-sm" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} data-testid="input-evidence-file" aria-label="Choose evidence file" />
          <p className="text-xs text-muted-foreground">Up to 25 MB. {busy && "Uploading..."}</p>
          {err && <Notice tone="error">{err}</Notice>}
        </div>) : <Notice>{signedIn ? "This simulation is read-only, so evidence cannot be added." : "Sign in to attach evidence."}</Notice>}
      {list.isLoading && <p className="text-sm text-muted-foreground">Loading evidence</p>}
      {list.data?.length === 0 && <p className="text-sm text-muted-foreground">No evidence attached yet.</p>}
      <ul className="divide-y rounded-lg border bg-card">{list.data?.map((d) => (
        <li key={d.id} className="p-3 text-sm flex flex-wrap justify-between gap-2" data-testid={`evidence-${d.id}`}><span><Upload className="inline h-4 w-4 mr-1 text-primary" />{d.name}{d.locator && <span className="text-muted-foreground"> | {d.locator}</span>}</span>
          {d.available && signedIn && <a className="underline text-primary" href={d.url}>Download</a>}</li>))}</ul>
    </div>
  );
}
