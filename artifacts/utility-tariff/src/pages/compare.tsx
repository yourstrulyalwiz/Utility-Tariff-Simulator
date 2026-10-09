import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { getListRunsQueryKey, listRuns, useListSimulations, type CalculationRun } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ErrorRetry, Notice, PageTitle, Shell } from "@/components/shell";
import { RunChart } from "@/components/run-view";
import { errMsg, fmt, when } from "@/lib/format";

const COLORS = ["hsl(199 86% 28%)", "hsl(22 82% 52%)", "hsl(168 55% 32%)", "hsl(262 30% 45%)"];

export default function Compare() {
  const sims = useListSimulations();
  const [sel, setSel] = useState<string[]>([]);
  const [pick, setPick] = useState<Record<string, string>>({});
  const runsQ = useQueries({ queries: sel.map((id) => ({ queryKey: getListRunsQueryKey(id), queryFn: () => listRuns(id) })) });
  const cols = useMemo(() => sel.map((id, i) => {
    const runs = [...(runsQ[i]?.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const run: CalculationRun | undefined = runs.find((r) => r.id === pick[id]) ?? runs[0];
    return { id, sim: sims.data?.find((s) => s.id === id), runs, run, loading: runsQ[i]?.isLoading, err: runsQ[i]?.error };
  }), [sel, runsQ, pick, sims.data]);
  const ready = cols.filter((c) => c.run);
  const warn: string[] = [];
  if (ready.length > 1) {
    const span = (r: CalculationRun) => `${r.annual[0]?.year}-${r.annual[r.annual.length - 1]?.year}`;
    if (new Set(ready.map((c) => span(c.run!))).size > 1) warn.push("These runs cover different years, so the figures are not like for like.");
    if (new Set(ready.map((c) => c.run!.method)).size > 1) warn.push("These runs use different methods. Differences may come from the method rather than your assumptions.");
  }
  const toggle = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 4 ? [...p, id] : p));
  const rows: [string, (c: CalculationRun) => string][] = [
    ["Equivalent average tariff (per m3, not a household bill)", (r) => fmt(r.summary.equivalentTariff)],
    ["Total investment", (r) => fmt(r.summary.totalInvestment, 0)], ["Total funding gap", (r) => fmt(r.summary.totalFundingGap, 0)],
    ["Ending cash", (r) => fmt(r.summary.endingCash, 0)], ["Warnings", (r) => String(r.warnings.length)], ["Method", (r) => r.method],
  ];
  return (
    <Shell>
      <PageTitle title="Compare scenarios" desc="Choose up to four simulations. Each uses its own saved run, latest by default, so scenarios stay independent." />
      {sims.isError && <ErrorRetry message={errMsg(sims.error)} onRetry={() => sims.refetch()} />}
      <fieldset className="mb-6"><legend className="font-semibold mb-2">Simulations</legend>
        <div className="flex flex-wrap gap-2">{sims.data?.map((s) => (
          <label key={s.id} className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${sel.includes(s.id) ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            <input type="checkbox" className="sr-only" checked={sel.includes(s.id)} onChange={() => toggle(s.id)} data-testid={`check-compare-${s.id}`} />{s.name}</label>))}
        </div>
        {sims.data?.length === 0 && <p className="text-muted-foreground text-sm">No simulations to compare yet.</p>}</fieldset>
      {sel.length < 2 && <Notice>Pick at least two simulations that have a calculated run.</Notice>}
      {warn.map((w) => <div key={w} className="mb-3"><Notice tone="warn">{w}</Notice></div>)}
      {cols.some((c) => c.err) && <ErrorRetry message="Some runs could not be loaded." onRetry={() => runsQ.forEach((q) => q.refetch())} />}
      {cols.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-card mt-4">
          <table className="w-full text-sm">
            <caption className="sr-only">Scenario comparison</caption>
            <thead><tr className="bg-muted text-left"><th scope="col" className="p-3">Measure</th>{cols.map((c) => (
              <th key={c.id} scope="col" className="p-3 min-w-48 align-top"><div className="font-display text-base">{c.sim?.name ?? "Simulation"}</div>
                {c.runs.length > 0 && <select aria-label={`Run for ${c.sim?.name}`} className="fi mt-1 text-xs" value={c.run?.id} onChange={(e) => setPick((p) => ({ ...p, [c.id]: e.target.value }))} data-testid={`select-run-${c.id}`}>
                  {c.runs.map((r) => <option key={r.id} value={r.id}>{when(r.createdAt)} (v{r.inputVersion})</option>)}</select>}</th>))}</tr></thead>
            <tbody>{rows.map(([l, f]) => <tr key={l} className="border-t"><th scope="row" className="p-3 text-left font-medium">{l}</th>{cols.map((c) => <td key={c.id} className="p-3 num">{c.loading ? "Loading" : c.run ? f(c.run) : "No saved run"}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
      {ready.length > 0 && <section className="mt-8"><h2 className="font-display text-xl mb-2">Required tariff by year</h2>
        <RunChart series={ready.map((c, i) => ({ name: c.sim?.name ?? "Simulation", run: c.run!, color: COLORS[i % 4] }))} /></section>}
      {sel.length > 0 && <Button variant="ghost" className="mt-4" onClick={() => setSel([])}>Clear selection</Button>}
    </Shell>
  );
}
