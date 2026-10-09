import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import {
  getGetRunQueryKey, getGetSimulationQueryKey, getGetWorkspaceSummaryQueryKey, getListRunsQueryKey, getListSimulationsQueryKey,
  useCalculateSimulation, useCreateReport, useDuplicateSimulation, useGetRun, useGetSimulation, useListRuns, usePreviewSimulation, useUpdateSimulation,
  type InteractivePreview, type InteractiveSettings, type Observation, type Report, type SimulationUpdate, type SimulationValues,
} from "@workspace/api-client-react";
import { Copy, FileDown, Play, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorRetry, Notice, PageTitle, Shell } from "@/components/shell";
import { Field } from "@/components/editors";
import { GrantProjectsEditor } from "@/components/grant-projects";
import { RunView } from "@/components/run-view";
import { LegacySimulation } from "@/components/legacy-simulation";
import { AnnualChart, at, EditCard, Kpi, NumBox, show } from "@/components/interactive";
import { errMsg, spanOk, when } from "@/lib/format";
import { snapshotKey } from "@/lib/snapshot-key";

type Draft = Omit<SimulationUpdate, "version">;
type Tab = "setup" | "tariff" | "improve";
const payload = (d: Draft) => snapshotKey(d);
const C = { ref: "hsl(197 15% 55%)", cur: "hsl(199 86% 28%)", imp: "hsl(28 85% 48%)", opex: "hsl(352 60% 45%)", bill: "hsl(160 45% 32%)" };
const OBS_UNITS: Record<string, string> = { legacy_connections: "connections", legacy_deep_well: "m3/year", legacy_pwsp: "m3/year", legacy_bbwsp: "m3/year", legacy_bulk_price: "PHP/m3" };
const obsYear = (o: Observation) => Number(o.periodStart.slice(0, 4));
const usable = (o: Observation) => o.quality === "Known" || o.quality === "Estimated";

export default function SimulationPage() {
  const { id = "" } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();
  const simQ = useGetSimulation(id, { query: { enabled: !!id, queryKey: getGetSimulationQueryKey(id) } });
  const update = useUpdateSimulation();
  const [msg, setMsg] = useState<string | null>(null);
  const sim = simQ.data;
  if (simQ.isLoading) return <Shell><Skeleton className="h-10 w-80 mb-4" /><Skeleton className="h-96" /></Shell>;
  if (!sim) return <LegacySimulation />; // legacy component renders error / auth branches
  const poc = sim.inputs.method === "workbook_reference" || Object.keys(sim.inputs).length === 0;
  if (poc) return <InteractiveSimulation key={sim.id} />;
  const enter = async () => {
    setMsg(null);
    try {
      const s = await update.mutateAsync({ id, data: { name: sim.name, utility: sim.utility, startYear: sim.startYear, endYear: sim.endYear, currency: sim.currency, version: sim.version,
        inputs: { ...sim.inputs, method: "workbook_reference", interactive: { appliedTariffSource: "inferred", collectEnabled: false, nrwEnabled: false, omEnabled: false } } } });
      qc.setQueryData(getGetSimulationQueryKey(id), s);
    } catch (e) { setMsg(errMsg(e)); }
  };
  return <LegacySimulation banner={!sim.readOnly && isAuthenticated ? (
    <div className="mb-4"><Notice>
      <div className="flex flex-wrap items-center gap-3">
        <span>This scenario uses the reviewed method, so it opens in its saved-results view. You can switch it to the interactive workbook tariff simulator; it will start from only the inputs you have entered, never another utility's figures. Your saved values and runs are kept.</span>
        <Button size="sm" variant="outline" onClick={enter} disabled={update.isPending} data-testid="button-enter-poc">{update.isPending ? "Switching" : "Use the tariff simulator"}</Button>
        {msg && <span className="text-sm text-destructive">{msg}</span>}
      </div></Notice></div>) : undefined} />;
}

function InteractiveSimulation() {
  const { id = "" } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [, nav] = useLocation();
  const { isAuthenticated, login } = useAuth();
  const simQ = useGetSimulation(id, { query: { enabled: !!id, queryKey: getGetSimulationQueryKey(id) } });
  const sim = simQ.data;
  const runsQ = useListRuns(id, { query: { enabled: !!id, queryKey: getListRunsQueryKey(id) } });
  const [draft, setDraft] = useState<Draft | null>(null);
  const inited = useRef<string | null>(null);
  const normalized = useRef(false);
  const [tab, setTab] = useState<Tab>("setup");
  const [year, setYear] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [revView, setRevView] = useState<"cash" | "target">("cash");
  const update = useUpdateSimulation();
  const calc = useCalculateSimulation();
  const mkReport = useCreateReport();
  const dup = useDuplicateSimulation();
  const preview = usePreviewSimulation();
  const previewRef = useRef(preview.mutateAsync);
  previewRef.current = preview.mutateAsync;

  const [pv, setPv] = useState<{ key: string; data: InteractivePreview } | null>(null);
  const [pvErr, setPvErr] = useState<{ key: string; text: string } | null>(null);
  const seq = useRef(0);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (sim && inited.current !== sim.id) {
      inited.current = sim.id;
      setDraft({ name: sim.name, utility: sim.utility, startYear: sim.startYear, endYear: sim.endYear, currency: sim.currency,
        inputs: Object.keys(sim.inputs).length === 0 ? { method: "workbook_reference" } : sim.inputs });
      setYear(sim.startYear);
      const hasDrivers = (sim.inputs.observations ?? []).some((o) => o.metric.startsWith("legacy_"));
      setTab(hasDrivers ? "tariff" : "setup");
    }
  }, [sim]);

  const saved: Draft | null = sim ? { name: sim.name, utility: sim.utility, startYear: sim.startYear, endYear: sim.endYear, currency: sim.currency, inputs: sim.inputs } : null;
  const readOnly = !!sim?.readOnly;
  const locked = readOnly || !isAuthenticated;
  // Protected reference: always preview the saved snapshot; server ignores overrides anyway.
  const reqDraft = readOnly ? saved : draft;
  const reqKey = reqDraft ? payload(reqDraft) : "";
  const reqOk = !!reqDraft && spanOk(reqDraft.startYear, reqDraft.endYear) && !!reqDraft.name.trim() && !!reqDraft.utility.trim();
  const draftKeyRef = useRef("");
  draftKeyRef.current = reqKey;

  useEffect(() => {
    const mine = ++seq.current;
    if (!reqDraft || !sim || !reqOk) return;
    const body: SimulationUpdate = { ...reqDraft, version: sim.version };
    const key = reqKey;
    const t = setTimeout(async () => {
      try {
        const r = await previewRef.current({ id, data: body });
        if (mine !== seq.current || key !== draftKeyRef.current) return;
        setPvErr(null);
        if (!readOnly && !normalized.current && !sim.inputs.interactive && key === draftKeyRef.current) {
          normalized.current = true;
          const next = { ...reqDraft, inputs: r.inputs };
          setDraft(next);
          setDemoLoaded(!!r.demoEligible);
          setPv({ key: payload(next), data: r });
          return;
        }
        normalized.current = true;
        setPv({ key, data: r });
      } catch (e) {
        if (mine === seq.current && key === draftKeyRef.current) setPvErr({ key, text: errMsg(e) });
      }
    }, 250);
    return () => { clearTimeout(t); seq.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqKey, reqOk, retryTick]);

  const sortedRuns = useMemo(() => [...(runsQ.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [runsQ.data]);
  const activeRunId = runId ?? sim?.latestRunId ?? sortedRuns[0]?.id ?? "";
  const runQ = useGetRun(activeRunId, { query: { enabled: !!activeRunId, queryKey: getGetRunQueryKey(activeRunId) } });

  if (simQ.isLoading || (sim && !draft)) return <Shell><Skeleton className="h-10 w-80 mb-4" /><Skeleton className="h-96" /></Shell>;
  if (simQ.isError || !sim || !draft || !saved) return <Shell><PageTitle title="Simulation" /><ErrorRetry message={errMsg(simQ.error)} onRetry={() => simQ.refetch()} /><p className="mt-4"><Link href="/" className="underline">Back to My simulations</Link></p></Shell>;

  const dirty = !readOnly && payload(draft) !== payload(saved);
  const view = readOnly ? (pv?.data.inputs ?? saved.inputs) : draft.inputs;
  const I: InteractiveSettings = view.interactive ?? {};
  const updating = !pv || pv.key !== reqKey;
  const p = pv?.data;
  const res = p?.result;
  const cal = res?.calibration;
  const sy = draft.startYear, ey = draft.endYear;
  const years = spanOk(sy, ey) ? Array.from({ length: ey - sy + 1 }, (_, i) => sy + i) : [];
  const y = year !== null && year >= sy && year <= ey ? year : sy;
  const B = at(res?.baseline, y), M = at(res?.improved, y), O = at(p?.original, y);
  const anyIntervention = !!(I.collectEnabled || I.nrwEnabled || I.omEnabled);

  const setIn = (patch: Partial<SimulationValues>) => setDraft((d) => (d ? { ...d, inputs: { ...d.inputs, ...patch } } : d));
  const setI = (patch: Partial<InteractiveSettings>) => setDraft((d) => (d ? { ...d, inputs: { ...d.inputs, interactive: { ...(d.inputs.interactive ?? {}), ...patch } } } : d));
  const obsVal = (metric: string) => {
    const list = view.observations ?? [];
    return (list.find((o) => o.metric === metric && obsYear(o) === y && usable(o)) ?? list.find((o) => o.metric === metric && obsYear(o) === y))?.value ?? null;
  };
  const setObs = (metric: string, value: number | null) => setDraft((d) => {
    if (!d) return d;
    const list = [...(d.inputs.observations ?? [])];
    let idx = list.findIndex((o) => o.metric === metric && obsYear(o) === y && usable(o));
    if (idx < 0) idx = list.findIndex((o) => o.metric === metric && obsYear(o) === y);
    if (idx >= 0) list[idx] = { ...list[idx], value, quality: value===null ? "Not available" : "Estimated" };
    else list.push({ metric, value, unit: OBS_UNITS[metric] ?? "", periodStart: `${y}-01-01`, periodEnd: `${y}-12-31`, quality: "Estimated", source: "Entered in tariff simulator", scope: "Workbook reference" });
    return { ...d, inputs: { ...d.inputs, observations: list } };
  });

  const projectsBad = (view.projects ?? []).some((pr) => pr.grantPercent + pr.equityPercent > 100);
  const incompleteProjects=(view.projects??[]).some(pr=>!pr.name.trim()||![pr.amount,pr.year,pr.usefulLife].every(Number.isFinite)||pr.amount<0||pr.usefulLife<=0);
  const invalid = incompleteProjects ? "Complete each investment's name, year, non-negative amount and positive asset life." : projectsBad ? "Fix project funding shares (grant plus equity over 100 percent)." : !spanOk(sy, ey) ? "The forecast must be 30 years or fewer, ending after it starts." : !draft.name.trim() || !draft.utility.trim() ? "Name and utility are required." : "";

  const refresh = () => { qc.invalidateQueries({ queryKey: getListSimulationsQueryKey() }); qc.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey() }); };
  const save = async () => {
    const s = await update.mutateAsync({ id, data: { ...draft, version: sim.version } });
    qc.setQueryData(getGetSimulationQueryKey(id), s);
    setDemoLoaded(false); refresh();
    return s;
  };
  const onSave = async () => { setMsg(null); try { await save(); setMsg({ tone: "info", text: "Saved." }); } catch (e) { setMsg({ tone: "error", text: errMsg(e) }); } };
  const onRecord = async () => {
    setMsg(null);
    try {
      const s = dirty ? await save() : sim;
      const run = await calc.mutateAsync({ id, data: { version: s.version } });
      setRunId(run.id); setReport(null);
      await qc.invalidateQueries({ queryKey: getListRunsQueryKey(id) });
      qc.invalidateQueries({ queryKey: getGetSimulationQueryKey(id) }); refresh();
      setMsg({ tone: "info", text: "Saved and recorded a frozen run." });
    } catch (e) { setMsg({ tone: "error", text: errMsg(e) }); }
  };
  const onDup = () => { if (!isAuthenticated) return login(); dup.mutate({ id }, { onSuccess: (n) => { refresh(); nav(`/simulations/${n.id}`); }, onError: (e) => setMsg({ tone: "error", text: errMsg(e) }) }); };
  const onReport = () => mkReport.mutate({ id: activeRunId }, { onSuccess: (r) => { setReport(r); refresh(); }, onError: (e) => setMsg({ tone: "error", text: errMsg(e) }) });

  const resetInterventions = () => setI({ collectEnabled: false, collectionTarget: I.baselineCollectionPercent ?? null, nrwEnabled: false, nrwTarget: cal?.baselineNrw ?? null, omEnabled: false, omSavingPercent: 0, programmeCost: 0 });
  const resetWorkbook = () => {
    if (!p?.demoEligible) return;
    const dv = p.defaults, di = dv.interactive ?? {};
    setDraft((d) => d ? { ...d, inputs: { ...d.inputs,
      energyCost: dv.energyCost, inflation: dv.inflation, workingCapitalMonths: dv.workingCapitalMonths,
      observations:[...(d.inputs.observations??[]).filter(o=>!o.metric.startsWith("legacy_")),...(dv.observations??[]).filter(o=>o.metric.startsWith("legacy_"))], projects: dv.projects,
      forecastConnections: dv.forecastConnections, connectionGrowth: dv.connectionGrowth, consumption: dv.consumption,
      interactive: { ...(d.inputs.interactive ?? {}), staffPer1000: di.staffPer1000, monthlySalary: di.monthlySalary, payMonths: di.payMonths, chemicalUnitCost: di.chemicalUnitCost,
        miscellaneousPercent: di.miscellaneousPercent, serviceFeePercent: di.serviceFeePercent, baselineCollectionPercent: di.baselineCollectionPercent, appliedTariffSource: "inferred" } } } : d);
  };

  const delta = (a?: number | null, b?: number | null, d = 2, unit = "") => (a === null || a === undefined || b === null || b === undefined ? "Change: unavailable" : `Change from no improvements: ${b - a >= 0 ? "+" : ""}${show(b - a, d)}${unit}`);
  const cur = draft.currency || "PHP";
  const inferred = (I.appliedTariffSource ?? "inferred") === "inferred";

  const status = !reqOk ? null : pvErr && pvErr.key === reqKey ? (
    <span className="text-sm text-destructive flex items-center gap-2" role="alert">Preview failed: {pvErr.text} <button className="underline" onClick={() => setRetryTick((n) => n + 1)} data-testid="button-retry-preview">Retry</button></span>
  ) : updating ? <span className="text-sm text-muted-foreground" role="status" data-testid="status-updating">Updating</span>
    : <span className="text-sm text-muted-foreground" data-testid="status-preview">Live preview{dirty ? " of unsaved edits" : ""}</span>;

  const yearPicker = (
    <label className="flex items-center gap-2 text-sm">Inspect year
      <select className="fi w-auto py-1" value={y} onChange={(e) => setYear(Number(e.target.value))} data-testid="select-year">{years.map((v) => <option key={v} value={v}>{v}</option>)}</select>
    </label>
  );
  const firstLoad = !p && reqOk && !(pvErr && pvErr.key === reqKey);

  return (
    <Shell>
      <PageTitle title={draft.name || "Simulation"} desc={`${draft.utility} | ${sy}\u2013${ey}`} />
      {readOnly && <div className="mb-4"><Notice tone="warn"><div className="flex flex-wrap items-center gap-3">This is the original reference example and is read-only. You can explore its results here; make a copy to change assumptions.
        <Button size="sm" onClick={onDup} disabled={dup.isPending} data-testid="button-duplicate-to-edit"><Copy className="h-4 w-4 mr-1" />Try your own scenario</Button></div></Notice></div>}
      {!readOnly && !isAuthenticated && <div className="mb-4"><Notice>Sign in to save changes. <button className="underline font-semibold" onClick={login}>Log in</button></Notice></div>}
      {demoLoaded && <div className="mb-4"><Notice>Starting assumptions from the Tagbilaran workbook example were loaded into this copy, including labelled estimates for demand. Save to keep them.</Notice></div>}
      {p && !p.supported && <div className="mb-4"><Notice tone="warn">This scenario's financing is not supported by the workbook tariff simulator (it supports only the fully grant-funded example). Results may be unavailable.</Notice></div>}

      <div role="tablist" aria-label="Simulation sections" className="flex flex-wrap gap-1 border-b mb-6">
        {([["setup", "1. Setup"], ["tariff", "2. Tariff simulator"], ["improve", "3. Operational improvements"]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`tab-${k}`}
            className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{l}</button>))}
        <div className="ml-auto flex items-center gap-4 pb-1">{tab !== "setup" && yearPicker}{status}</div>
      </div>

      {tab === "setup" && (
        <section className="rise grid gap-4 md:grid-cols-2 max-w-3xl" aria-label="Setup">
          <Field label="Simulation name"><input className="fi" disabled={locked} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} data-testid="input-name" /></Field>
          <Field label="Utility"><input className="fi" disabled={locked} value={draft.utility} onChange={(e) => setDraft({ ...draft, utility: e.target.value })} data-testid="input-utility" /></Field>
          <Field label="First forecast year" unit="year"><input type="number" className="fi num" disabled={locked} value={draft.startYear} onChange={(e) => setDraft({ ...draft, startYear: Number(e.target.value) })} data-testid="input-startYear" /></Field>
          <Field label="Last forecast year" unit="year" help="At most 30 years."><input type="number" className="fi num" disabled={locked} value={draft.endYear} onChange={(e) => setDraft({ ...draft, endYear: Number(e.target.value) })} data-testid="input-endYear" /></Field>
          <Field label="Currency" help="Used for labels only."><input className="fi" disabled={locked} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} data-testid="input-currency" /></Field>
          {invalid && <div className="md:col-span-2"><Notice tone="error">{invalid}</Notice></div>}
          <div className="md:col-span-2"><Button onClick={() => setTab("tariff")} data-testid="button-go-tariff">Continue to Tariff simulator</Button></div>
        </section>
      )}

      {tab !== "setup" && firstLoad && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><Skeleton className="h-72" /></div>}
      {tab !== "setup" && !p && pvErr && pvErr.key === reqKey && <ErrorRetry message={pvErr.text} onRetry={() => setRetryTick((n) => n + 1)} />}
      {tab !== "setup" && !reqOk && <Notice tone="error">{invalid || "Complete Setup to see results."}</Notice>}
      {tab !== "setup" && <div className="mb-4"><Notice tone="warn">Illustrative forecast: workbook projected costs and utility billed-volume estimates.</Notice></div>}
      {tab !== "setup" && res && res.warnings.filter(w=>!w.startsWith("Illustrative forecast:")).length > 0 && <details className="mb-4 text-sm"><summary className="cursor-pointer text-primary">Input checks and calculation notes</summary><ul className="list-disc pl-5 mt-2">{res.warnings.filter(w=>!w.startsWith("Illustrative forecast:")).map(w=><li key={w}>{w}</li>)}</ul></details>}

      {tab === "tariff" && p && (
        <section className="rise space-y-8" aria-label="Tariff simulator">
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi label={`Required tariff, ${y}`} value={show(B?.workbookTariff)} unit={`${cur}/m3 (workbook volume)`} updating={updating} testId="required-tariff" delta={O ? `Original workbook: ${show(O.workbookTariff)}` : "Original workbook: no reference data for this year"} />
            <Kpi label={`Operating costs, ${y}`} value={show(B?.opex, 0)} unit={`${cur}/year`} updating={updating} testId="opex" delta={`Fixed ${show(B?.fixedOpex, 0)} | Variable ${show(B?.variableOpex, 0)}`} />
            <Kpi label={`Annual revenue requirement, ${y}`} value={show(B?.requiredRevenue, 0)} unit={`${cur}/year`} updating={updating} testId="revenue-requirement" delta={`Depreciation ${show(B?.depreciation, 0)} | Working capital ${show(B?.workingCapital, 0)}`} />
          </div>

          <div><h3 className="font-display text-xl">Required tariff over time</h3>
            <AnnualChart years={years} unit={`${cur}/m3`} label="Required tariff over time" updating={updating}
              series={[{ name: "Original workbook reference", rows: p.original, field: "workbookTariff", color: C.ref, dashed: true }, { name: "Current edited assumptions", rows: res?.baseline, field: "workbookTariff", color: C.cur }]} />
            <p className="text-xs text-muted-foreground">{cur}/m3 per year. The original reference exists only where source drivers exist; other years are left blank.</p></div>

          <div><h3 className="font-display text-xl mb-1">Selected year: workbook drivers for {y}</h3><p className="text-sm text-muted-foreground mb-3">These cards edit the {y} figures only.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <EditCard label="Connections used for staffing" unit="connections" scope="Selected year" value={obsVal("legacy_connections")} onChange={(v) => setObs("legacy_connections", v)} disabled={locked} testId="obs-connections" />
              <div className="rounded-lg border bg-card p-4" data-testid="card-workbook-volume">
                <div className="flex justify-between"><div className="text-xs uppercase tracking-wide text-muted-foreground">Volume used in workbook tariff</div><span className="text-[10px] uppercase rounded bg-muted px-1.5 py-0.5 text-muted-foreground">Selected year</span></div>
                <div className={`num text-2xl text-primary mt-1 ${updating ? "opacity-50" : ""}`}>{show(B?.workbookVolume, 0)}</div><div className="text-xs text-muted-foreground">m3/year, sum of the three sources</div>
                <details className="mt-2 text-sm"><summary className="cursor-pointer text-primary">Edit sources</summary>
                  {([["legacy_deep_well", "Deep wells"], ["legacy_pwsp", "PWSP supply"], ["legacy_bbwsp", "BBWSP supply"]] as const).map(([m, l]) => (
                    <label key={m} className="block mt-2 text-xs">{l} <span className="text-muted-foreground">(m3/year)</span><NumBox value={obsVal(m)} onChange={(v) => setObs(m, v)} disabled={locked} testId={`input-obs-${m}`} label={`${l} m3/year`} /></label>))}
                </details>
              </div>
              <EditCard label="Bulk water price" unit={`${cur}/m3 of BBWSP volume`} scope="Selected year" step={0.01} value={obsVal("legacy_bulk_price")} onChange={(v) => setObs("legacy_bulk_price", v)} disabled={locked} testId="obs-bulk-price" />
              <div className="rounded-lg border bg-card p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground">Operating costs</div>
                <div className={`num text-2xl text-primary mt-1 ${updating ? "opacity-50" : ""}`}>{show(B?.opex, 0)}</div><div className="text-xs text-muted-foreground">{cur}/year, calculated from the cost assumptions below</div></div>
            </div></div>

          <details className="rounded-lg border bg-card p-4">
            <summary className="font-display text-xl cursor-pointer">Cost assumptions <span className="text-sm font-sans text-muted-foreground">Applies across the forecast</span></summary>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-4">
              <EditCard label="Staff per 1,000 connections" unit="staff/1,000 connections" scope="Applies across the forecast" step={0.1} value={I.staffPer1000} onChange={(v) => setI({ staffPer1000: v })} disabled={locked} testId="staffPer1000" note="4 is one staff member per 250 connections." />
              <EditCard label="Monthly salary" unit={`${cur}/staff/month`} scope="Applies across the forecast" value={I.monthlySalary} onChange={(v) => setI({ monthlySalary: v })} disabled={locked} testId="monthlySalary" />
              <EditCard label="Paid months per year" unit="months" scope="Applies across the forecast" step={1} value={I.payMonths} onChange={(v) => setI({ payMonths: v })} disabled={locked} testId="payMonths" />
              <EditCard label="Booster power cost" unit={`${cur}/m3 of BBWSP volume`} scope="Applies across the forecast" step={0.01} value={view.energyCost} onChange={(v) => setIn({ energyCost: v })} disabled={locked} testId="energyCost" />
              <EditCard label="Chemical cost" unit={`${cur}/m3 of deep-well volume`} scope="Applies across the forecast" step={0.01} value={I.chemicalUnitCost} onChange={(v) => setI({ chemicalUnitCost: v })} disabled={locked} testId="chemicalUnitCost" />
              <EditCard label="Miscellaneous allowance" unit="percent of direct costs" scope="Applies across the forecast" step={0.1} slider={[0, 30]} value={I.miscellaneousPercent} onChange={(v) => setI({ miscellaneousPercent: v })} disabled={locked} testId="miscellaneousPercent" />
              <EditCard label="Service fee" unit="percent of direct costs plus miscellaneous" scope="Applies across the forecast" step={0.1} slider={[0, 30]} value={I.serviceFeePercent} onChange={(v) => setI({ serviceFeePercent: v })} disabled={locked} testId="serviceFeePercent" />
              <EditCard label="Inflation" unit="percent/year" scope="Applies across the forecast" step={0.1} slider={[0, 15]} value={view.inflation} onChange={(v) => setIn({ inflation: v })} disabled={locked} testId="inflation" />
              <EditCard label="Working-capital allowance" unit="months of operating costs" scope="Applies across the forecast" step={0.1} slider={[0, 12]} value={view.workingCapitalMonths} onChange={(v) => setIn({ workingCapitalMonths: v })} disabled={locked} testId="workingCapitalMonths" />
            </div>
          </details>

          <details className="rounded-lg border bg-card p-4">
            <summary className="font-display text-xl cursor-pointer">Investment and asset life</summary>
            <p className="text-sm text-muted-foreground my-2">Each project's useful life sets its yearly depreciation.</p>
            <GrantProjectsEditor projects={view.projects} onChange={(projects) => setIn({ projects })} disabled={locked} startYear={sy} currency={cur} />
          </details>

          <div className="rounded-lg border bg-card p-4 space-y-4">
            <h3 className="font-display text-xl">Revenue preview</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <Kpi label={`Gross billings, ${y}`} value={show(B?.grossBillings, 0)} unit={`${cur}/year`} updating={updating} testId="billings" />
              <Kpi label={`Expected collections, ${y}`} value={show(B?.collections, 0)} unit={`${cur}/year`} updating={updating} testId="collections" />
              <Kpi label={`Cash O&M coverage, ${y}`} value={B?.cashOmCoverage == null ? "Unavailable" : `${show(B.cashOmCoverage, 1)}%`} unit={B?.cashOmCoverage == null ? "Needs operating costs above zero" : "100% means collections cover operating costs"} updating={updating} testId="coverage" />
              <Kpi label={`Utility billed volume, ${y}`} value={show(B?.utilityBilledVolume, 0)} unit="m3/year. Annualised estimate; no seasonality adjustment" updating={updating} testId="billed-volume" />
            </div>
            <AnnualChart years={years} unit={`${cur}/year`} label="Billings, collections and operating costs" updating={updating} digits={0}
              series={[{ name: "Gross billings", rows: res?.baseline, field: "grossBillings", color: C.bill }, { name: "Collections", rows: res?.baseline, field: "collections", color: C.cur }, { name: "Operating costs", rows: res?.baseline, field: "opex", color: C.opex }]} />
            <details><summary className="cursor-pointer text-primary text-sm">Revenue inputs</summary>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                <div className="rounded-lg border bg-card p-4" data-testid="card-applied-tariff">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Tariff to test</div>
                  <div className="text-[11px] mt-1 font-semibold text-primary">{inferred ? "Assumed from collections" : "Entered by you"}</div>
                  <NumBox value={inferred ? cal?.inferredAverageTariff ?? null : view.chosenTariff} disabled={locked} step={0.01} testId="input-applied-tariff" label={`Tariff to test (${cur}/m3)`}
                    onChange={(v) => setDraft((d) => (d ? { ...d, inputs: { ...d.inputs, chosenTariff: v, interactive: { ...(d.inputs.interactive ?? {}), appliedTariffSource: "manual" } } } : d))} />
                  <div className="text-xs text-muted-foreground">{cur}/m3, held constant across years</div>
                  {!inferred && <Button size="sm" variant="outline" className="mt-2" disabled={locked} onClick={() => setI({ appliedTariffSource: "inferred" })} data-testid="button-use-inferred">Use inferred rate ({show(cal?.inferredAverageTariff)})</Button>}
                </div>
                <EditCard label="Assumed baseline collection efficiency" unit="percent of billings" step={0.1} slider={[1, 100]} value={I.baselineCollectionPercent} onChange={(v) => setI({ baselineCollectionPercent: v })} disabled={locked} testId="baselineCollectionPercent" note="Changing this recalibrates the inferred billings and rate." />
                <EditCard label="First forecast year average connections" unit="connections" value={view.forecastConnections} onChange={(v) => setIn({ forecastConnections: v })} disabled={locked} testId="forecastConnections" note="A flat-demand assumption unless you enter a forecast." />
                <EditCard label="Annual connection growth" unit="percent/year" step={0.1} slider={[0, 10]} value={view.connectionGrowth} onChange={(v) => setIn({ connectionGrowth: v })} disabled={locked} testId="connectionGrowth" />
                <EditCard label="Monthly consumption" unit="m3/connection/month" step={0.1} value={view.consumption} onChange={(v) => setIn({ consumption: v })} disabled={locked} testId="consumption" />
              </div>
              <h4 className="font-semibold mt-5 mb-2">Historical calibration data</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <Field label="Reporting period starts"><input type="date" className="fi" disabled={locked} value={view.historicalStart ?? ""} onChange={(e) => setIn({ historicalStart: e.target.value })} data-testid="input-historicalStart" /></Field>
                <Field label="Reporting period ends"><input type="date" className="fi" disabled={locked} value={view.historicalEnd ?? ""} onChange={(e) => setIn({ historicalEnd: e.target.value })} data-testid="input-historicalEnd" /></Field>
                <Field label="Reported collections" unit={`${cur} in period`}><NumBox value={view.collections} onChange={(v) => setIn({ collections: v })} disabled={locked} testId="input-collections" label="Reported collections" /></Field>
                <Field label="Billed volume" unit="m3 in period"><NumBox value={view.billedVolume} onChange={(v) => setIn({ billedVolume: v })} disabled={locked} testId="input-billedVolume" label="Billed volume" /></Field>
                <Field label="System input" unit="m3 in period"><NumBox value={view.production} onChange={(v) => setIn({ production: v })} disabled={locked} testId="input-production" label="System input" /></Field>
                <Field label="Connection snapshot" unit="connections"><NumBox value={view.connections} onChange={(v) => setIn({ connections: v })} disabled={locked} testId="input-connections" label="Connection snapshot" /></Field>
              </div>
              <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-2 text-sm mt-4">
                {([["Implied billings for the period (inferred, not observed)", show(cal?.impliedHistoricalBillings, 2) + ` ${cur}`], ["Inferred average rate", show(cal?.inferredAverageTariff, 4) + ` ${cur}/m3`], ["Months covered", show(cal?.historicalMonths, 1)], ["Observed billings", view.billings == null ? "Unknown" : show(view.billings, 2)], ["Observed current tariff", view.currentTariff == null ? "Unknown" : show(view.currentTariff, 4)]] as [string, string][]).map(([l, v]) => (
                  <div key={l} className="flex justify-between border-b py-1"><dt className="text-muted-foreground">{l}</dt><dd className="num">{v}</dd></div>))}
              </dl>
            </details>
            <details><summary className="cursor-pointer text-primary text-sm">Balances and collection-adjusted rate, {y}</summary>
              <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-2 text-sm mt-2">
                {([["Collections less operating costs", show(B?.operatingBalance, 0) + ` ${cur}`], ["Balance against modelled revenue target", show(B?.targetBalance, 0) + ` ${cur}`], ["Tariff to collect the modelled revenue target", show(B?.targetCollectionTariff) + ` ${cur}/m3 of utility billed volume`]] as [string, string][]).map(([l, v]) => (
                  <div key={l} className="flex justify-between border-b py-1"><dt className="text-muted-foreground">{l}</dt><dd className="num">{v}</dd></div>))}
              </dl>
              <p className="text-xs text-muted-foreground mt-2">These are not cash-flow closing balances: the revenue target includes non-cash depreciation and a working-capital allowance. The collection-adjusted rate uses utility billed volume, not the workbook volume, so it is not comparable with the workbook tariff.</p>
            </details>
          </div>
        </section>
      )}

      {tab === "improve" && p && (
        <section className="rise space-y-8" aria-label="Operational improvements">
          <p className="text-sm text-muted-foreground">Uses the current Tariff simulator assumptions. Targets apply from {sy} throughout the forecast. Each preview compares the same assumptions with and without the switched-on improvements.</p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {([
              { k: "collect", on: I.collectEnabled, label: "Collect more bills", help: "Raises collections and coverage. Does not change costs or billings.", current: `${show(I.baselineCollectionPercent, 1)}%`, val: I.collectionTarget, set: (v: number | null) => setI({ collectionTarget: v }), toggle: (b: boolean) => setI({ collectEnabled: b, collectionTarget: I.collectionTarget ?? I.baselineCollectionPercent ?? null }), unit: "target collection, percent of billings", range: [0, 100] as [number, number] },
              { k: "nrw", on: I.nrwEnabled, label: "Reduce NRW", help: "Lowers volume-related costs only; staffing is unchanged and no extra sales are counted.", current: `${show(cal?.baselineNrw, 1)}%`, val: I.nrwTarget, set: (v: number | null) => setI({ nrwTarget: v }), toggle: (b: boolean) => setI({ nrwEnabled: b, nrwTarget: I.nrwTarget ?? cal?.baselineNrw ?? null }), unit: "target NRW, percent of system input", range: [0, 60] as [number, number] },
              { k: "om", on: I.omEnabled, label: "Reduce O&M costs", help: "Saving applied to the remaining operating costs.", current: "0%", val: I.omSavingPercent, set: (v: number | null) => setI({ omSavingPercent: v }), toggle: (b: boolean) => setI({ omEnabled: b, omSavingPercent: I.omSavingPercent ?? 0 }), unit: "saving, percent of operating costs", range: [0, 50] as [number, number] },
            ]).map((c) => (
              <div key={c.k} className={`rounded-lg border p-4 bg-card ${c.on ? "ring-2 ring-primary/40" : ""}`} data-testid={`card-intervention-${c.k}`}>
                <label className="flex items-center justify-between gap-2 font-semibold">{c.label}
                  <input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={!!c.on} disabled={locked} onChange={(e) => c.toggle(e.target.checked)} data-testid={`toggle-${c.k}`} /></label>
                <p className="text-xs text-muted-foreground mt-1">{c.help}</p>
                <div className="flex justify-between text-sm mt-3"><span className="text-muted-foreground">Current</span><span className="num">{c.current}</span></div>
                <div className="text-sm mt-2 text-muted-foreground">Proposed <span className="text-xs">({c.unit})</span></div>
                <NumBox value={c.val} onChange={c.set} disabled={locked || !c.on} step={0.1} testId={`input-${c.k}-target`} label={`${c.label} proposed value`} />
                <input type="range" min={c.range[0]} max={c.range[1]} step={0.5} value={c.val ?? c.range[0]} disabled={locked || !c.on} onChange={(e) => c.set(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--primary))]" aria-label={`${c.label} slider`} data-testid={`slider-${c.k}-target`} />
              </div>))}
            <EditCard label="Annual improvement programme cost" unit={`${cur}/year (assumption)`} value={I.programmeCost} onChange={(v) => setI({ programmeCost: v })} disabled={locked} testId="programmeCost" note={anyIntervention ? "Added to operating costs while an improvement is switched on." : "Applies only when an improvement is switched on."} />
          </div>
          {!locked && <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={resetInterventions} data-testid="button-reset-interventions"><RotateCcw className="h-4 w-4 mr-1" />Reset interventions</Button>
          </div>}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label={`Required tariff, ${y}`} value={show(M?.workbookTariff)} unit={`${cur}/m3 with improvements`} updating={updating} testId="imp-tariff" delta={`Before: ${show(B?.workbookTariff)} | ${delta(B?.workbookTariff, M?.workbookTariff)}`} />
            <Kpi label={`Operating costs, ${y}`} value={show(M?.opex, 0)} unit={`${cur}/year with improvements`} updating={updating} testId="imp-opex" delta={`Before: ${show(B?.opex,0)} | ${delta(B?.opex, M?.opex, 0)}`} />
            <Kpi label={`Collections, ${y}`} value={show(M?.collections, 0)} unit={`${cur}/year with improvements`} updating={updating} testId="imp-collections" delta={`Before: ${show(B?.collections,0)} | ${delta(B?.collections, M?.collections, 0)}`} />
            <Kpi label={`Cash O&M coverage, ${y}`} value={M?.cashOmCoverage == null ? "Unavailable" : `${show(M.cashOmCoverage, 1)}%`} unit={M?.cashOmCoverage == null ? "Needs operating costs above zero" : "with improvements"} updating={updating} testId="imp-coverage" delta={`Before: ${show(B?.cashOmCoverage,1)}% | ${delta(B?.cashOmCoverage, M?.cashOmCoverage, 1, " points")}`} />
          </div>
          <p className="text-sm" data-testid="text-combined-benefit">Combined effect in {y}: operating costs {delta(B?.opex, M?.opex, 0).replace("Change from no improvements: ", "")} {cur}, collections {delta(B?.collections, M?.collections, 0).replace("Change from no improvements: ", "")} {cur}. Effects are calculated together, not added up one by one.</p>

          <div><h3 className="font-display text-xl">Cost-based required tariff</h3>
            <AnnualChart years={years} unit={`${cur}/m3`} label="Cost-based required tariff, without and with improvements" updating={updating}
              series={[{ name: "Without improvements", rows: res?.baseline, field: "workbookTariff", color: C.ref, dashed: true }, { name: "With improvements", rows: res?.improved, field: "workbookTariff", color: C.imp }]} /></div>
          <div><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-xl">{revView === "cash" ? "Collections and operating costs" : "Tariff to collect the modelled revenue target"}</h3>
            <select className="fi w-auto py-1 text-sm" value={revView} onChange={(e) => setRevView(e.target.value as "cash" | "target")} data-testid="select-improve-chart"><option value="cash">Collections and operating costs</option><option value="target">Tariff to collect the modelled revenue target</option></select></div>
            {revView === "cash" ? <AnnualChart years={years} unit={`${cur}/year`} digits={0} label="Collections and operating costs, baseline and improved" updating={updating}
              series={[{ name: "Collections, baseline", rows: res?.baseline, field: "collections", color: C.cur, dashed: true }, { name: "Collections, improved", rows: res?.improved, field: "collections", color: C.cur }, { name: "Operating costs, baseline", rows: res?.baseline, field: "opex", color: C.opex, dashed: true }, { name: "Operating costs, improved", rows: res?.improved, field: "opex", color: C.imp }]} />
              : <><AnnualChart years={years} unit={`${cur}/m3 of utility billed volume`} label="Tariff to collect the modelled revenue target" updating={updating}
                series={[{ name: "Without improvements", rows: res?.baseline, field: "targetCollectionTariff", color: C.ref, dashed: true }, { name: "With improvements", rows: res?.improved, field: "targetCollectionTariff", color: C.imp }]} />
                <p className="text-xs text-muted-foreground">Uses utility billed volume and the collection rate, so it differs from the workbook tariff and is not a regulatory tariff.</p></>}
          </div>
        </section>
      )}

      {tab !== "setup" && (
        <div className="mt-10 space-y-4">
          {p?.demoEligible && !locked && <Button variant="ghost" size="sm" onClick={resetWorkbook} data-testid="button-reset-workbook"><RotateCcw className="h-4 w-4 mr-1" />Reset to workbook assumptions</Button>}
          <details className="text-sm"><summary className="cursor-pointer text-primary" data-testid="link-details">Sources and technical notes</summary>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
              <li>Costs reproduce the workbook method: staff costs inflate yearly; power, chemicals and bulk purchases follow each year's volumes. Each year uses its own calculated costs.</li>
              <li>The baseline collection efficiency is an assumption used to infer an illustrative billing base from reported collections. Observed billings and the current tariff remain unknown. Arrears timing is not modelled.</li>
              <li>Baseline NRW comes from historical billed volume and system input. Applying it to workbook costs is an illustrative sensitivity, not a validated engineering estimate.</li>
              <li>Demand is unconstrained and is not proof of supply adequacy. The five-year minimum charge is not a per-m3 rate and is not charted here.</li>
              <li>Source documents remain protected; see <Link href="/sources" className="underline">Sources</Link> where you have access.</li>
            </ul>
          </details>
          <details className="rounded-lg border bg-card p-4">
            <summary className="font-display text-lg cursor-pointer">Saved runs (frozen calculations)</summary>
            <p className="text-sm text-muted-foreground mt-1">Runs are frozen snapshots recorded on request. They are separate from the live preview above.</p>
            {runsQ.isLoading && <Skeleton className="h-10 mt-3" />}
            {runsQ.isError && <ErrorRetry message={errMsg(runsQ.error)} onRetry={() => runsQ.refetch()} />}
            {sortedRuns.length === 0 && !runsQ.isLoading && !runsQ.isError && <p className="text-sm mt-3">No runs recorded yet.</p>}
            {sortedRuns.length > 0 && <div className="mt-3 space-y-4">
              <Field label="Run history"><select className="fi" value={activeRunId} onChange={(e) => { setRunId(e.target.value); setReport(null); }} data-testid="select-run">{sortedRuns.map((r) => <option key={r.id} value={r.id}>{when(r.createdAt)} | version {r.inputVersion}</option>)}</select></Field>
              {runQ.isLoading && <Skeleton className="h-40" />}
              {runQ.isError && <ErrorRetry message={errMsg(runQ.error)} onRetry={() => runQ.refetch()} />}
              {runQ.data && <>
                {runQ.data.inputVersion !== sim.version && <Notice tone="warn">This run used saved version {runQ.data.inputVersion}; the latest saved version is {sim.version}.</Notice>}
                {runQ.data.interactive && (() => { const rb = at(runQ.data.interactive.baseline, y), ri = at(runQ.data.interactive.improved, y); return (
                  <div className="grid gap-3 sm:grid-cols-3"><Kpi label={`Saved snapshot: required tariff, ${y}`} value={show(rb?.workbookTariff)} unit={`${cur}/m3, frozen`} testId="run-tariff" />
                    <Kpi label={`Saved snapshot: with improvements, ${y}`} value={show(ri?.workbookTariff)} unit={`${cur}/m3, frozen`} testId="run-imp-tariff" />
                    <Kpi label={`Saved snapshot: collections, ${y}`} value={show(ri?.collections, 0)} unit={`${cur}/year, frozen`} testId="run-collections" /></div>); })()}
                <details><summary className="cursor-pointer text-primary text-sm">Legacy frozen calculation details</summary><div className="mt-3"><RunView run={runQ.data} currency={runQ.data.inputs.currency || cur} /></div></details>
                <div className="space-y-2"><p className="text-sm text-muted-foreground">Reports contain only the legacy frozen calculation for this run. They are not an export of the interactive intervention view.</p>
                  <Button variant="outline" size="sm" onClick={onReport} disabled={mkReport.isPending || !isAuthenticated} data-testid="button-create-report"><FileDown className="h-4 w-4 mr-1" />{mkReport.isPending ? "Preparing" : "Create legacy calculation report"}</Button>
                  {report && report.runId === runQ.data.id && <ul className="flex flex-wrap gap-4 text-sm">{([["PDF", report.pdfUrl], ["Word", report.docxUrl], ["CSV", report.csvUrl], ["JSON", report.jsonUrl]] as const).map(([l, u]) => <li key={l}><a className="underline text-primary" href={u} data-testid={`link-report-${l.toLowerCase()}`}>{l}</a></li>)}</ul>}</div>
              </>}
            </div>}
          </details>
        </div>
      )}

      <div className="sticky bottom-0 mt-8 -mx-4 px-4 py-3 bg-card/95 border-t flex flex-wrap items-center gap-3" data-testid="save-bar">
        <span className="text-sm" data-testid="text-save-state">{readOnly ? "Read-only example" : dirty ? "Unsaved changes (preview only)" : `All changes saved (version ${sim.version}, ${when(sim.updatedAt)})`}</span>
        {invalid && !locked && <span className="text-sm text-destructive">{invalid}</span>}
        {msg && <span role="status" className={`text-sm ${msg.tone === "error" ? "text-destructive" : "text-primary"}`}>{msg.text}</span>}
        <div className="ml-auto flex flex-wrap gap-2">
          {dirty && !locked && <Button variant="ghost" onClick={() => { normalized.current=false; setDraft(saved); setDemoLoaded(false); }} data-testid="button-discard">Discard</Button>}
          <Button variant="outline" onClick={onRecord} disabled={locked || calc.isPending || update.isPending || !!invalid} data-testid="button-record-run"><Play className="h-4 w-4 mr-1" />{calc.isPending ? "Recording" : dirty ? "Save and record run" : "Record run"}</Button>
          <Button onClick={onSave} disabled={locked || !dirty || update.isPending || !!invalid} data-testid="button-save"><Save className="h-4 w-4 mr-1" />{update.isPending ? "Saving" : "Save"}</Button>
        </div>
      </div>
    </Shell>
  );
}
