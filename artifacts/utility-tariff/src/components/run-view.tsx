import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CalculationRun } from "@workspace/api-client-react";
import { fmt } from "@/lib/format";
import { Notice } from "@/components/shell";

const COLS: [keyof CalculationRun["annual"][number], string][] = [
  ["connections", "Connections"], ["billedVolume", "Billed volume (m³)"], ["systemInput", "System input (m³)"], ["unmetDemand", "Unmet demand (m³)"],
  ["opex", "Operating cost"], ["depreciation", "Depreciation"], ["interest", "Interest"], ["principal", "Principal"],
  ["capex", "Capital spending"], ["grants", "Grants"], ["loanDraw", "Loan drawn"], ["equity", "Equity"],
  ["requiredTariff", "Required tariff"], ["revenue", "Revenue"], ["collectedRevenue", "Collected"], ["cashGap", "Cash gap"], ["closingCash", "Closing cash"],
];

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="num text-2xl text-primary mt-1" data-testid={`stat-${label.toLowerCase().replace(/\W+/g, "-")}`}>{value}</div>
      {note && <div className="text-xs text-muted-foreground mt-1">{note}</div>}
    </div>
  );
}

export function RunChart({ series }: { series: { name: string; run: CalculationRun; color: string }[] }) {
  const years = Array.from(new Set(series.flatMap((s) => s.run.annual.map((a) => a.year)))).sort();
  const data = years.map((y) => {
    const row: Record<string, number | null> = { year: y };
    series.forEach((s, i) => { row[`s${i}`] = s.run.annual.find((a) => a.year === y)?.requiredTariff ?? null; });
    return row;
  });
  return (
    <div role="img" aria-label={`Line chart of required average tariff per year for ${series.map((s) => s.name).join(", ")}. The same figures are in the table.`} className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(197 22% 82%)" />
          <XAxis dataKey="year" type="number" domain={["dataMin","dataMax"]} allowDecimals={false} /><YAxis width={56} domain={[0,"auto"]} /><Tooltip /><Legend />
          {series.map((s, i) => <Line key={i} type="stepAfter" dataKey={`s${i}`} name={s.name} stroke={s.color} strokeWidth={2.5} dot={false} connectNulls={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RunView({ run, currency }: { run: CalculationRun; currency: string }) {
  const s = run.summary, b = run.baseline;
  return (
    <div className="space-y-8">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label="Equivalent average tariff" value={fmt(s.equivalentTariff)} note={`${currency} per cubic metre. A system-wide average, not a household bill.`} />
        <Stat label="Total investment" value={fmt(s.totalInvestment, 0)} note={currency} />
        <Stat label="Total funding gap" value={fmt(s.totalFundingGap, 0)} note={currency} />
        <Stat label="Ending cash" value={fmt(s.endingCash, 0)} note={currency} />
        <Stat label="Affordability" value="Not assessed" note="Requires a confirmed representative household bill and comparable income." />
      </div>
      <Notice>The equivalent average tariff spreads required revenue over all water billed. It does not tell any household what its monthly bill will be, because bills depend on tariff structure and use.</Notice>
      {run.warnings.length > 0 && (
        <section aria-labelledby="warn"><h3 id="warn" className="font-display text-xl mb-2">Warnings</h3>
          <ul className="space-y-2">{run.warnings.map((w, i) => <li key={i}><Notice tone="warn">{w}</Notice></li>)}</ul></section>
      )}
      <section><h3 className="font-display text-xl mb-2">Required tariff over time</h3><RunChart series={[{ name: "Required tariff", run, color: "hsl(199 86% 28%)" }]} /><p className="text-xs text-muted-foreground">Annual scenario estimates in {currency}/m³. Uncertainty bounds are unavailable; gaps indicate missing calculations.</p></section>
      <section>
        <h3 className="font-display text-xl mb-2">Annual results</h3>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm num">
            <caption className="sr-only">Annual results by year, amounts in {currency}</caption>
            <thead><tr className="bg-muted text-left"><th scope="col" className="p-2 sticky left-0 bg-muted">Year</th>{COLS.map(([k, l]) => <th key={k} scope="col" className="p-2 whitespace-nowrap font-sans font-semibold">{l}</th>)}</tr></thead>
            <tbody>{run.annual.map((a) => (
              <tr key={a.year} className="border-t odd:bg-background/50"><th scope="row" className="p-2 sticky left-0 bg-card">{a.year}</th>
                {COLS.map(([k]) => <td key={k} className="p-2 text-right whitespace-nowrap">{k === "requiredTariff" ? fmt(a[k]) : fmt(a[k] as number | null, 0)}</td>)}</tr>))}</tbody>
          </table>
        </div>
      </section>
      <section>
        <h3 className="font-display text-xl mb-2">Baseline indicators</h3>
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {([["Days in period", b.days, ""], ["Billed volume", b.billedMld, "MLD"], ["System input", b.productionMld, "MLD"], ["Non-revenue water", b.nrw, "%"], ["Snapshot-based consumption estimate", b.consumption, "m³/connection/month"], ["Collection ratio", b.collectionRatio, "%"], ["Average billed tariff", b.averageBilledTariff, currency + "/m³"], ["Cash per cubic metre (not tariff)", b.cashPerM3, currency + "/m³"], ["Coverage", b.coverage, "%"]] as [string, number | null, string][]).map(([l, v, u]) => (
            <div key={l} className="flex justify-between border-b py-1"><dt className="text-muted-foreground">{l}</dt><dd className="num">{fmt(v)} {v !== null && u}</dd></div>))}
        </dl>
      </section>
      {run.explanations.length > 0 && (
        <section><h3 className="font-display text-xl mb-2">How to read these results</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm">{run.explanations.map((e, i) => <li key={i}>{e}</li>)}</ul></section>
      )}
      {(s.firstFiveYearMinimum !== null || s.secondFiveYearMinimum !== null) && (
        <Notice tone="warn"><strong>Legacy five-year minimum example (unvalidated method).</strong> First five years: {fmt(s.firstFiveYearMinimum)}; second five years: {fmt(s.secondFiveYearMinimum)} {currency} minimum charge for 10 m³. Independently reconstructed from cached workbook drivers for comparison only. Do not use it for decisions.</Notice>
      )}
      <p className="text-xs text-muted-foreground">Method: {run.method}. Engine {run.engineVersion}. Calculated on the server from input version {run.inputVersion}.</p>
    </div>
  );
}
