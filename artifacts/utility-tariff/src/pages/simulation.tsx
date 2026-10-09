import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import {
  getGetRunQueryKey, getGetSimulationQueryKey, getGetWorkspaceSummaryQueryKey, getListRunsQueryKey, getListSimulationsQueryKey,
  useCalculateSimulation, useCreateReport, useDuplicateSimulation, useGetRun, useGetSimulation, useListRuns, useUpdateSimulation,
  type Report, type SimulationUpdate, type SimulationValues,
} from "@workspace/api-client-react";
import { Check, ChevronLeft, ChevronRight, Copy, FileDown, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorRetry, Notice, PageTitle, Shell } from "@/components/shell";
import { EvidencePanel, Field, ObservationsEditor, ProjectsEditor } from "@/components/editors";
import { RunView } from "@/components/run-view";
import { NUM_FIELDS, numberOrNull, SECTIONS, SECTION_HELP, type NumField } from "@/lib/fields";
import { errMsg, spanOk, when } from "@/lib/format";
import { useLocation } from "wouter";

type Draft = Omit<SimulationUpdate, "version">;
const payload = (d: Draft) => JSON.stringify(d);

function NumInput({ f, v, onChange, disabled }: { f: NumField; v: number | null | undefined; onChange: (n: number | null) => void; disabled: boolean }) {
  return (
    <Field label={f.label} unit={f.unit} help={f.help}>
      <input type="number" step={f.step ?? "any"} className="fi num mt-1" disabled={disabled} value={v ?? ""} placeholder="Not provided" onChange={(e) => onChange(numberOrNull(e.target.value))} data-testid={`input-${f.key}`} />
    </Field>
  );
}

export default function SimulationPage() {
  const { id = "" } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [, nav] = useLocation();
  const { isAuthenticated, login } = useAuth();
  const simQ = useGetSimulation(id, { query: { enabled: !!id, queryKey: getGetSimulationQueryKey(id) } });
  const sim = simQ.data;
  const runsQ = useListRuns(id, { query: { enabled: !!id, queryKey: getListRunsQueryKey(id) } });
  const [draft, setDraft] = useState<Draft | null>(null);
  const inited = useRef<string | null>(null);
  const [step, setStep] = useState(1);
  const [runId, setRunId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const update = useUpdateSimulation();
  const calc = useCalculateSimulation();
  const mkReport = useCreateReport();
  const dup = useDuplicateSimulation();

  useEffect(() => {
    if (sim && inited.current !== sim.id) {
      inited.current = sim.id;
      setDraft({ name: sim.name, utility: sim.utility, startYear: sim.startYear, endYear: sim.endYear, currency: sim.currency, inputs: sim.inputs });
    }
  }, [sim]);

  const sortedRuns = useMemo(() => [...(runsQ.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [runsQ.data]);
  const activeRunId = runId ?? sim?.latestRunId ?? sortedRuns[0]?.id ?? "";
  const runQ = useGetRun(activeRunId, { query: { enabled: !!activeRunId, queryKey: getGetRunQueryKey(activeRunId) } });

  const saved: Draft | null = sim ? { name: sim.name, utility: sim.utility, startYear: sim.startYear, endYear: sim.endYear, currency: sim.currency, inputs: sim.inputs } : null;
  const dirty = !!(draft && saved && payload(draft) !== payload(saved));
  const readOnly = !!sim?.readOnly;
  const locked = readOnly || !isAuthenticated;

  if (simQ.isLoading || (sim && !draft)) return <Shell><Skeleton className="h-10 w-80 mb-4" /><Skeleton className="h-96" /></Shell>;
  if (simQ.isError || !sim || !draft || !saved) {
    const st = (simQ.error as { status?: number } | null)?.status;
    return <Shell><PageTitle title="Simulation" />{st === 401 || st === 403 ? <Notice tone="warn">This simulation is private. <button className="underline font-semibold" onClick={login}>Log in</button> to open it.</Notice> : <ErrorRetry message={st === 404 ? "We could not find this simulation." : errMsg(simQ.error)} onRetry={() => simQ.refetch()} />}<p className="mt-4"><Link href="/" className="underline">Back to My simulations</Link></p></Shell>;
  }

  const inp = draft.inputs;
  const setIn = (p: Partial<SimulationValues>) => setDraft({ ...draft, inputs: { ...inp, ...p } });
  const projectsBad = (inp.projects ?? []).some((p) => p.grantPercent + p.equityPercent > 100);
  const spanBad = !spanOk(draft.startYear, draft.endYear);
  const invalid = projectsBad ? "Fix project funding shares (grant plus equity over 100 percent)." : spanBad ? "The forecast must be 30 years or fewer, ending after it starts." : !draft.name.trim() || !draft.utility.trim() ? "Name and utility are required." : "";

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getListSimulationsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey() });
  };
  const save = async () => {
    const s = await update.mutateAsync({ id, data: { ...draft, version: sim.version } });
    qc.setQueryData(getGetSimulationQueryKey(id), s);
    refresh();
    return s;
  };
  const onSave = async () => {
    setMsg(null);
    try { await save(); setMsg({ tone: "info", text: "Saved." }); } catch (e) { setMsg({ tone: "error", text: errMsg(e) }); }
  };
  const onCalculate = async () => {
    setMsg(null);
    try {
      const s = dirty ? await save() : sim;
      const run = await calc.mutateAsync({ id, data: { version: s.version } });
      setRunId(run.id); setReport(null);
      await qc.invalidateQueries({ queryKey: getListRunsQueryKey(id) });
      qc.invalidateQueries({ queryKey: getGetSimulationQueryKey(id) });
      refresh(); setStep(8);
    } catch (e) { setMsg({ tone: "error", text: errMsg(e) }); }
  };
  const onReport = () => mkReport.mutate({ id: activeRunId }, { onSuccess: (r) => { setReport(r); refresh(); }, onError: (e) => setMsg({ tone: "error", text: errMsg(e) }) });
  const onDup = () => { if (!isAuthenticated) return login(); dup.mutate({ id }, { onSuccess: (n) => { refresh(); nav(`/simulations/${n.id}`); inited.current = null; }, onError: (e) => setMsg({ tone: "error", text: errMsg(e) }) }); };

  const filled = (n: number) => (NUM_FIELDS[n] ?? []).filter((f) => inp[f.key] !== null && inp[f.key] !== undefined).length;
  const total = (n: number) => (NUM_FIELDS[n] ?? []).length;
  const nums = (n: number) => <div className="grid gap-4 md:grid-cols-2">{(NUM_FIELDS[n] ?? []).map((f) => <NumInput key={f.key} f={f} v={inp[f.key] as number | null | undefined} disabled={locked} onChange={(v) => setIn({ [f.key]: v } as Partial<SimulationValues>)} />)}</div>;
  const run = runQ.data;
  const stale = run && run.inputVersion !== sim.version;

  return (
    <Shell>
      <PageTitle title={draft.name || "Simulation"} desc={`${draft.utility} | ${draft.startYear}\u2013${draft.endYear}`} />
      {readOnly && <div className="mb-4"><Notice tone="warn"><div className="flex flex-wrap items-center gap-3">This is the original reference example and is read-only. Duplicate it to edit your own copy.
        <Button size="sm" onClick={onDup} disabled={dup.isPending} data-testid="button-duplicate-to-edit"><Copy className="h-4 w-4 mr-1" />Duplicate to edit</Button></div></Notice></div>}
      {!readOnly && !isAuthenticated && <div className="mb-4"><Notice>Sign in to save changes. <button className="underline font-semibold" onClick={login}>Log in</button></Notice></div>}
      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="Sections" className="lg:sticky lg:top-4 self-start">
          <ol className="space-y-1">{SECTIONS.map((s, i) => {
            const n = i + 1; const done = total(n) > 0 && filled(n) === total(n);
            return <li key={s}><button onClick={() => setStep(n)} aria-current={step === n ? "step" : undefined} data-testid={`step-${n}`}
              className={`w-full text-left flex gap-3 items-start rounded-md px-3 py-2 text-sm ${step === n ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <span className={`num h-6 w-6 shrink-0 rounded-full border grid place-items-center text-xs ${done ? "bg-accent text-accent-foreground border-accent" : ""}`}>{done ? <Check className="h-3 w-3" /> : n}</span>
              <span>{s}{total(n) > 0 && <span className="block text-xs opacity-70">{filled(n)} of {total(n)} numbers entered</span>}</span></button></li>;
          })}</ol>
        </nav>
        <section key={step} className="rise min-w-0" aria-labelledby="sec-h">
          <h2 id="sec-h" className="font-display text-2xl text-primary">{step}. {SECTIONS[step - 1]}</h2>
          <p className="text-muted-foreground mb-5">{SECTION_HELP[step - 1]}</p>
          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Simulation name"><input className="fi" disabled={locked} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} data-testid="input-name" /></Field>
              <Field label="Utility"><input className="fi" disabled={locked} value={draft.utility} onChange={(e) => setDraft({ ...draft, utility: e.target.value })} data-testid="input-utility" /></Field>
              <Field label="First forecast year" unit="year"><input type="number" className="fi num" disabled={locked} value={draft.startYear} onChange={(e) => setDraft({ ...draft, startYear: Number(e.target.value) })} data-testid="input-startYear" /></Field>
              <Field label="Last forecast year" unit="year" help="The forecast can be at most 30 years long."><input type="number" className="fi num" disabled={locked} value={draft.endYear} onChange={(e) => setDraft({ ...draft, endYear: Number(e.target.value) })} data-testid="input-endYear" /></Field>
              <Field label="Currency" help="Used for labels only, for example PHP."><input className="fi" disabled={locked} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} data-testid="input-currency" /></Field>
              <div className="hidden md:block" />
              <Field label="Historical period starts" help="The period your current figures describe."><input type="date" className="fi" disabled={locked} value={inp.historicalStart ?? ""} onChange={(e) => setIn({ historicalStart: e.target.value })} data-testid="input-historicalStart" /></Field>
              <Field label="Historical period ends"><input type="date" className="fi" disabled={locked} value={inp.historicalEnd ?? ""} onChange={(e) => setIn({ historicalEnd: e.target.value })} data-testid="input-historicalEnd" /></Field>
              {spanBad && <div className="md:col-span-2"><Notice tone="error">Choose an end year that is not before the start year and no more than 30 years in total.</Notice></div>}
            </div>
          )}
          {[2, 3, 4].includes(step) && nums(step)}
          {step === 5 && <div className="space-y-4">{nums(5)}
            <Field label="Efficiency actions planned" help="Describe actions such as leak repair, metering or energy savings, and when they happen."><textarea rows={4} className="fi" disabled={locked} value={inp.actions ?? ""} onChange={(e) => setIn({ actions: e.target.value })} data-testid="input-actions" /></Field></div>}
          {step === 6 && <div className="space-y-4"><ProjectsEditor projects={inp.projects ?? []} onChange={(projects) => setIn({ projects })} disabled={locked} startYear={draft.startYear} endYear={draft.endYear} />{inp.projects === undefined && <Notice tone="warn">The investment program is not yet confirmed. <button className="underline font-semibold" disabled={locked} onClick={() => setIn({projects:[]})}>Confirm no planned investments</button>, or add a project above.</Notice>}</div>}
          {step === 7 && (
            <div className="space-y-8">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Calculation method" help="Reviewed is recommended. Workbook reference repeats the legacy spreadsheet for comparison."><select className="fi" disabled={locked} value={inp.method ?? "reviewed"} onChange={(e) => setIn({ method: e.target.value as SimulationValues["method"] })} data-testid="select-method"><option value="reviewed">Reviewed method (recommended)</option><option value="workbook_reference">Workbook reference (legacy)</option></select></Field>
                <Field label="What do you want to find out?"><select className="fi" disabled={locked} value={inp.objective ?? "required_tariff"} onChange={(e) => setIn({ objective: e.target.value as SimulationValues["objective"] })} data-testid="select-objective"><option value="required_tariff">The tariff needed to cover costs</option><option value="chosen_tariff">What happens at a tariff I choose</option></select></Field>
                {inp.objective === "chosen_tariff" && <NumInput f={{ key: "chosenTariff", label: "Chosen tariff", unit: "currency per cubic metre", help: "Average tariff to test.", step: 0.01 }} v={inp.chosenTariff} disabled={locked} onChange={(v) => setIn({ chosenTariff: v })} />}
                {(NUM_FIELDS[7] ?? []).map((f) => <NumInput key={f.key} f={f} v={inp[f.key] as number | null} disabled={locked} onChange={(v) => setIn({ [f.key]: v } as Partial<SimulationValues>)} />)}
                <Field label="General notes"><textarea rows={3} className="fi" disabled={locked} value={inp.notes ?? ""} onChange={(e) => setIn({ notes: e.target.value })} data-testid="input-notes" /></Field>
                <Field label="Source notes" help="Where each key figure came from."><textarea rows={3} className="fi" disabled={locked} value={inp.sourceNotes ?? ""} onChange={(e) => setIn({ sourceNotes: e.target.value })} data-testid="input-sourceNotes" /></Field>
              </div>
              <div><h3 className="font-display text-xl mb-2">Assumption review</h3>
                <div className="rounded-lg border bg-card divide-y">{[2, 3, 4, 5].flatMap((n) => NUM_FIELDS[n]).map((f) => { const v = inp[f.key]; return (
                  <div key={f.key} className="flex justify-between gap-4 px-4 py-2 text-sm"><span>{f.label}</span>{v === null || v === undefined ? <span className="text-accent-foreground bg-accent/30 rounded px-2">Not provided</span> : <span className="num">{v} <span className="text-muted-foreground font-sans">{f.unit}</span></span>}</div>); })}
                  <div className="flex justify-between px-4 py-2 text-sm"><span>Investment projects</span><span className="num">{inp.projects?.length ?? 0}</span></div></div>
                <p className="text-xs text-muted-foreground mt-2">Missing items stay unknown. They are never treated as zero.</p></div>
              <div><h3 className="font-display text-xl mb-2">Observations</h3><ObservationsEditor items={inp.observations ?? []} onChange={(observations) => setIn({ observations })} disabled={locked} /></div>
              <div><h3 className="font-display text-xl mb-2">Evidence files</h3><EvidencePanel simId={id} canUpload={!locked} signedIn={isAuthenticated} /></div>
            </div>
          )}
          {step === 8 && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={onCalculate} disabled={calc.isPending || update.isPending || !isAuthenticated || readOnly || !!invalid} data-testid="button-calculate"><Play className="h-4 w-4 mr-1" />{calc.isPending ? "Calculating" : dirty ? "Save and calculate" : "Calculate"}</Button>
                {!isAuthenticated && <span className="text-sm text-muted-foreground">Sign in to run a calculation.</span>}
                {readOnly && <span className="text-sm text-muted-foreground">Duplicate to run your own calculation.</span>}
              </div>
              {sim.resultsOutdated && <Notice tone="warn">Your saved inputs have changed since the latest run. Calculate again for current results.</Notice>}
              {runsQ.isError && <ErrorRetry message={errMsg(runsQ.error)} onRetry={() => runsQ.refetch()} />}
              {sortedRuns.length > 0 && (
                <Field label="Run history" help="Each run is frozen. Choosing an older run shows exactly what was calculated then."><select className="fi" value={activeRunId} onChange={(e) => { setRunId(e.target.value); setReport(null); }} data-testid="select-run">
                  {sortedRuns.map((r) => <option key={r.id} value={r.id}>{when(r.createdAt)} | version {r.inputVersion}</option>)}</select></Field>)}
              {sortedRuns.length === 0 && !runsQ.isLoading && <div className="rounded-lg border-2 border-dashed p-8 text-center"><p className="font-display text-xl">No results yet</p><p className="text-muted-foreground text-sm mt-1">Fill in what you know, then calculate. Gaps will show up as warnings.</p></div>}
              {runQ.isLoading && activeRunId && <Skeleton className="h-64" />}
              {runQ.isError && <ErrorRetry message={errMsg(runQ.error)} onRetry={() => runQ.refetch()} />}
              {run && (<>
                {(stale || dirty) && <Notice tone="warn">{dirty ? "You have unsaved changes. " : ""}{stale ? `These results come from saved version ${run.inputVersion}; the latest saved version is ${sim.version}.` : "These results do not include your unsaved edits."}</Notice>}
                <RunView run={run} currency={run.inputs.currency || draft.currency} />
                <div className="rounded-lg border bg-card p-4 space-y-2">
                  <h3 className="font-display text-xl">Report for this run</h3>
                  <p className="text-sm text-muted-foreground">Reports reflect the frozen run shown above, not the forms.</p>
                  <Button variant="outline" onClick={onReport} disabled={mkReport.isPending || !isAuthenticated} data-testid="button-create-report"><FileDown className="h-4 w-4 mr-1" />{mkReport.isPending ? "Preparing" : "Create report"}</Button>
                  {report && report.runId === run.id && <ul className="flex flex-wrap gap-4 text-sm">{([["PDF", report.pdfUrl], ["Word", report.docxUrl], ["CSV", report.csvUrl], ["JSON", report.jsonUrl]] as const).map(([l, u]) => <li key={l}><a className="underline text-primary" href={u} data-testid={`link-report-${l.toLowerCase()}`}>{l}</a></li>)}</ul>}
                </div>
              </>)}
              <Link href="/compare" className="inline-block underline text-primary">Compare with other simulations</Link>
            </div>
          )}
          <div className="flex justify-between mt-8">
            <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)} data-testid="button-prev"><ChevronLeft className="h-4 w-4" />Back</Button>
            <Button disabled={step === 8} onClick={() => setStep(step + 1)} data-testid="button-next">Next<ChevronRight className="h-4 w-4" /></Button>
          </div>
        </section>
      </div>
      <div className="sticky bottom-0 mt-8 -mx-4 px-4 py-3 bg-card/95 border-t flex flex-wrap items-center gap-3" data-testid="save-bar">
        <span className="text-sm" data-testid="text-save-state">{readOnly ? "Read-only example" : dirty ? "Unsaved changes" : `All changes saved (version ${sim.version}, ${when(sim.updatedAt)})`}</span>
        {invalid && !locked && <span className="text-sm text-destructive">{invalid}</span>}
        {msg && <span role="status" className={`text-sm ${msg.tone === "error" ? "text-destructive" : "text-primary"}`}>{msg.text}</span>}
        <div className="ml-auto flex gap-2">
          {dirty && !locked && <Button variant="ghost" onClick={() => setDraft(saved)} data-testid="button-discard">Discard</Button>}
          <Button onClick={onSave} disabled={locked || !dirty || update.isPending || !!invalid} data-testid="button-save"><Save className="h-4 w-4 mr-1" />{update.isPending ? "Saving" : "Save"}</Button>
        </div>
      </div>
    </Shell>
  );
}
