import { useEffect, useState, type ReactNode } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { InteractiveYear } from "@workspace/api-client-react";
import { numberOrNull } from "@/lib/fields";

export const show = (n: number | null | undefined, d = 2) =>
  n === null || n === undefined || !Number.isFinite(n) ? "Unavailable" : new Intl.NumberFormat("en", { maximumFractionDigits: d }).format(n);

export const at = (rows: InteractiveYear[] | undefined, y: number) => rows?.find((r) => r.year === y);

/** Text-backed numeric input: blank means missing (null), never zero; partial typing is preserved. */
export function NumBox({ value, onChange, disabled, step, testId, label }: { value: number | null | undefined; onChange: (n: number | null) => void; disabled?: boolean; step?: number; testId: string; label: string }) {
  const [txt, setTxt] = useState(value === null || value === undefined ? "" : String(value));
  useEffect(() => {
    const cur = numberOrNull(txt);
    if ((value ?? null) !== cur) setTxt(value === null || value === undefined ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input type="number" inputMode="decimal" step={step ?? "any"} aria-label={label} className="fi num mt-1" disabled={disabled} value={txt} placeholder="Not provided"
      onChange={(e) => { setTxt(e.target.value); onChange(numberOrNull(e.target.value)); }} data-testid={testId} />
  );
}

export function EditCard({ label, unit, scope, value, onChange, disabled, step, slider, testId, note, children }: {
  label: string; unit: string; scope?: string; value: number | null | undefined; onChange: (n: number | null) => void; disabled?: boolean; step?: number;
  slider?: [number, number]; testId: string; note?: ReactNode; children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col" data-testid={`card-${testId}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        {scope && <span className="text-[10px] uppercase tracking-wide rounded bg-muted px-1.5 py-0.5 text-muted-foreground whitespace-nowrap">{scope}</span>}
      </div>
      <div className="num text-2xl text-primary mt-1">{value === null || value === undefined ? <span className="text-base text-muted-foreground font-sans">Not provided</span> : show(value, 4)}</div>
      <div className="text-xs text-muted-foreground">{unit}</div>
      <NumBox value={value} onChange={onChange} disabled={disabled} step={step} testId={`input-${testId}`} label={`${label} (${unit})`} />
      {slider && <input type="range" min={slider[0]} max={slider[1]} step={step ?? 1} disabled={disabled} value={value ?? slider[0]} aria-label={`${label} slider`}
        onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[hsl(var(--primary))]" data-testid={`slider-${testId}`} />}
      {note && <div className="text-xs text-muted-foreground mt-2">{note}</div>}
      {children}
    </div>
  );
}

export function Kpi({ label, value, unit, delta, updating, testId }: { label: string; value: string; unit: string; delta?: string; updating?: boolean; testId: string }) {
  return (
    <div className={`rounded-lg border bg-card p-4 transition-opacity ${updating ? "opacity-50" : ""}`} aria-busy={updating}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="num text-3xl text-primary mt-1" data-testid={`kpi-${testId}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{unit}</div>
      {delta && <div className="text-xs mt-1 num" data-testid={`kpi-delta-${testId}`}>{delta}</div>}
    </div>
  );
}

export interface SeriesDef { name: string; rows: InteractiveYear[] | undefined; field: keyof InteractiveYear; color: string; dashed?: boolean }

/** Annual line chart using actual yearly values. Straight segments, nulls left as gaps. */
export function AnnualChart({ years, series, unit, label, updating, selectedYear, digits = 2 }: { years: number[]; series: SeriesDef[]; unit: string; label: string; updating?: boolean; selectedYear?: number; digits?: number }) {
  const data = years.map((y) => {
    const row: Record<string, number | null> = { year: y };
    series.forEach((s, i) => { const v = at(s.rows, y)?.[s.field]; row[`s${i}`] = typeof v === "number" && Number.isFinite(v) ? v : null; });
    return row;
  });
  return (
    <div role="img" aria-label={`${label}. Series: ${series.map((s) => s.name).join(", ")}. Unit ${unit}.`} className={`h-72 transition-opacity ${updating ? "opacity-50" : ""}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(197 22% 82%)" />
          <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} allowDecimals={false} ticks={years} />
          <YAxis width={72} domain={[0, "auto"]} tickFormatter={(v: number) => show(v, v >= 1e6 ? 0 : digits)} />
          <Tooltip formatter={(v: number | string) => (typeof v === "number" ? `${show(v, digits)} ${unit}` : "Unavailable")} labelFormatter={(l) => `Year ${l}`} />
          <Legend />
          {series.map((s, i) => <Line key={s.name} type="linear" isAnimationActive={false} dataKey={`s${i}`} name={s.name} stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dashed ? "6 4" : undefined} dot={{ r: 2.5 }} connectNulls={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
