/**
 * Deterministic engines. No expected-result fixtures are imported at runtime.
 * Workbook-reference is explicitly NOT the reviewed utility cash method.
 */
import { workbookYear, calculateInteractive } from "./interactive.ts";
import type { InteractiveSettings } from "@workspace/api-zod";
export type NumberOrMissing = number | null | undefined;
export interface Observation {
  metric: string; value: number | null; unit: string; periodStart: string;
  periodEnd: string; quality: string; source: string; scope: string;
}
export interface Project {
  id: string; name: string; year: number; amount: number; grantPercent: number;
  equityPercent: number; interestRate: number; loanTerm: number; usefulLife: number;
  graceYears?: number; source?: string;
}
export interface Values {
  interactive?: InteractiveSettings;
  historicalStart?: string; historicalEnd?: string;
  connections?: NumberOrMissing; households?: NumberOrMissing; servedHouseholds?: NumberOrMissing;
  production?: NumberOrMissing; billedVolume?: NumberOrMissing; billings?: NumberOrMissing;
  collections?: NumberOrMissing; historicalOpex?: NumberOrMissing; currentTariff?: NumberOrMissing;
  connectionGrowth?: NumberOrMissing; forecastConnections?: NumberOrMissing; consumption?: NumberOrMissing; targetNrw?: NumberOrMissing;
  capacity?: NumberOrMissing; futureOpex?: NumberOrMissing; inflation?: NumberOrMissing;
  energyCost?: NumberOrMissing; bulkWaterCost?: NumberOrMissing; bulkWaterShare?: NumberOrMissing;
  openingCash?: NumberOrMissing; collectionFactor?: NumberOrMissing; chosenTariff?: NumberOrMissing;
  workingCapitalMonths?: NumberOrMissing; householdIncome?: NumberOrMissing;
  objective?: string; method?: string; notes?: string; sourceNotes?: string; actions?: string;
  projects?: Project[]; observations?: Observation[];
}
export interface Snapshot {
  name: string; utility: string; startYear: number; endYear: number;
  currency: string; version: number; inputs: Values;
}
export interface Annual {
  year: number; connections: number | null; billedVolume: number | null; systemInput: number | null;
  unmetDemand: number | null; opex: number | null; depreciation: number | null;
  interest: number | null; principal: number | null; capex: number | null; grants: number | null;
  loanDraw: number | null; equity: number | null; requiredTariff: number | null;
  revenue: number | null; collectedRevenue: number | null; cashGap: number | null; closingCash: number | null;
}
export const ENGINE_VERSION = "utility-cash-1.0.1+workbook-reference-2.0.0+poc-1.0.0";
export const known = (n: NumberOrMissing): n is number => typeof n === "number" && Number.isFinite(n);
const divide = (a: NumberOrMissing, b: NumberOrMissing, scale = 1) => known(a) && known(b) && b > 0 ? a / b * scale : null;
export function coveredDays(start?: string, end?: string): number | null {
  if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return null;
  const s = Date.parse(start + "T00:00:00Z"), e = Date.parse(end + "T00:00:00Z");
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return null;
  if (new Date(s).toISOString().slice(0, 10) !== start || new Date(e).toISOString().slice(0, 10) !== end) return null;
  return (e - s) / 86400000 + 1;
}
export function baseline(v: Values) {
  const days = coveredDays(v.historicalStart, v.historicalEnd);
  const months = days ? days / (365.2425 / 12) : null;
  // Full calendar months use exact count for the snapshot approximation.
  let coveredMonths = months;
  if (v.historicalStart && v.historicalEnd && days) {
    const s = new Date(v.historicalStart + "T00:00:00Z"), e = new Date(v.historicalEnd + "T00:00:00Z");
    const last = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth() + 1, 0)).getUTCDate();
    if (s.getUTCDate() === 1 && e.getUTCDate() === last) coveredMonths = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + e.getUTCMonth() - s.getUTCMonth() + 1;
  }
  const obs = v.observations ?? [];
  const aligned = (metric: string) => !obs.some(o => o.metric === metric && (o.periodStart !== v.historicalStart || o.periodEnd !== v.historicalEnd || o.scope !== "Utility only" || !["Known","Estimated"].includes(o.quality)));
  const waterAligned = aligned("production") && aligned("billedVolume");
  return {
    days, billedMld: divide(v.billedVolume, days, 0.001), productionMld: divide(v.production, days, 0.001),
    nrw: waterAligned && known(v.production) && known(v.billedVolume) ? divide(v.production - v.billedVolume, v.production, 100) : null,
    consumption: known(v.connections) && known(coveredMonths) ? divide(v.billedVolume, v.connections * coveredMonths) : null,
    collectionRatio: aligned("collections") && aligned("billings") ? divide(v.collections, v.billings, 100) : null,
    averageBilledTariff: aligned("billings") && aligned("billedVolume") ? divide(v.billings, v.billedVolume) : null,
    cashPerM3: aligned("collections") && aligned("billedVolume") ? divide(v.collections, v.billedVolume) : null,
    coverage: divide(v.servedHouseholds, v.households, 100),
  };
}
export function residentialBill(q: number, billAtZero = true): number {
  if (!Number.isFinite(q) || q < 0) throw new Error("Consumption must be nonnegative");
  if (q === 0 && !billAtZero) return 0;
  const bands = [[10,20,7],[20,30,8],[30,40,11],[40,50,14],[50,60,17],[60,70,20],[70,Infinity,23]];
  return Math.round((62 + bands.reduce((s, [l,u,r]) => s + Math.max(0,Math.min(q,u!)-l!)*r!,0)) * 100) / 100;
}
function sumComplete(rows: Annual[], key: keyof Annual): number | null {
  const values = rows.map(r => r[key]);
  return values.every(known) ? values.reduce((s, n) => s + n, 0) : null;
}
function emptyYear(year: number): Annual {
  return {year,connections:null,billedVolume:null,systemInput:null,unmetDemand:null,opex:null,depreciation:null,interest:null,principal:null,capex:null,grants:null,loanDraw:null,equity:null,requiredTariff:null,revenue:null,collectedRevenue:null,cashGap:null,closingCash:null};
}
export function calculate(snapshot: Snapshot) {
  const v = snapshot.inputs, b = baseline(v);
  const warnings: string[] = [], explanations: string[] = [];
  if (!b.days) warnings.push("Historical period is missing or invalid. Period-based indicators are unavailable.");
  if (!known(v.billings)) warnings.push("Water billings are missing. Collection efficiency and average billed tariff are not assessed; cash collections are not billings.");
  if (!known(v.householdIncome)) warnings.push("Affordability: not assessed. Household income and a representative household bill are required.");
  if (known(b.consumption)) warnings.push("Historical consumption uses one connection snapshot multiplied by calendar months; it is an estimate, not measured connection-months.");
  if (known(b.nrw) && (b.nrw < 0 || b.nrw > 100)) warnings.push("Historical NRW is outside 0–100%; reconcile boundary, dates and volumes.");
  if (known(b.coverage) && b.coverage > 100) warnings.push("Coverage exceeds 100%; reconcile geography, household counts and overlapping providers.");
  if ((v.observations ?? []).some(o => ["production", "billedVolume", "collections", "billings"].includes(o.metric) && (o.periodStart !== v.historicalStart || o.periodEnd !== v.historicalEnd || o.scope !== "Utility only"))) warnings.push("Historical source observations have differing periods or scope. Affected comparable-period ratios are unavailable.");
  const annual = v.method === "workbook_reference" ? workbookReference(snapshot, warnings, explanations) : reviewed(snapshot, warnings, explanations);
  const volume = sumComplete(annual, "billedVolume");
  const required = annual.every(r => known(r.requiredTariff) && known(r.billedVolume)) ? annual.reduce((s,r) => s + r.requiredTariff! * r.billedVolume!,0) : null;
  const first = annual.slice(0,5), second = annual.slice(5,10);
  return {
    engineVersion: ENGINE_VERSION, method: v.method ?? "reviewed", baseline: b, annual,
    ...(v.interactive && v.method==="workbook_reference"?{interactive:calculateInteractive(snapshot)}:{}),
    warnings: [...new Set(warnings)], explanations,
    summary: {
      equivalentTariff: divide(required, volume),
      totalInvestment: v.projects===undefined?null:v.projects.reduce((s,p) => s + p.amount,0),
      totalFundingGap: sumComplete(annual,"cashGap"),
      endingCash: annual.at(-1)?.closingCash ?? null,
      // Average rate is not a representative household bill.
      affordability: null,
      firstFiveYearMinimum: v.method === "workbook_reference" && first.length === 5 && first.every(r=>known(r.requiredTariff)) ? first.reduce((s,r)=>s+r.requiredTariff!,0)/5*10 : null,
      secondFiveYearMinimum: v.method === "workbook_reference" && second.length === 5 && second.every(r=>known(r.requiredTariff)) ? second.reduce((s,r)=>s+r.requiredTariff!,0)/5*10 : null,
    },
  };
}
function reviewed(s: Snapshot, warnings: string[], explanations: string[]): Annual[] {
  const v = s.inputs, rows: Annual[] = [], projects = v.projects ?? [];
  if(v.projects===undefined) warnings.push("Investment program not confirmed. Financing and required tariffs remain unavailable until projects are entered or no investment is explicitly confirmed.");
  const missing = ["forecastConnections","consumption","connectionGrowth","targetNrw","futureOpex","inflation","collectionFactor","workingCapitalMonths"].filter(k=>!known(v[k as keyof Values] as NumberOrMissing));
  if (missing.length) warnings.push("Required forecast assumptions missing: " + missing.join(", ") + ". Dependent results are unavailable, not zero.");
  if (v.objective === "chosen_tariff" && !known(v.chosenTariff)) warnings.push("Enter the chosen equivalent average tariff to calculate receipts and funding gaps.");
  if (!known(v.openingCash)) warnings.push("Opening cash is missing; closing cash balances are unavailable.");
  if (!known(v.capacity)) warnings.push("Supply capacity is not provided. Demand is unconstrained and supply feasibility has not been established.");
  if (known(v.targetNrw) && v.targetNrw >= 100) throw new Error("NRW must be below 100%");
  explanations.push(
    "Reviewed method: indicative average-rate cash recovery, not a regulator-approved block tariff.",
    "Annual billed demand = average active connections × m³ per connection-month × 12. Enter first-forecast-year connections; historical snapshots are not automatically extrapolated.",
    "Required system input = billed demand ÷ (1 − NRW). Capacity limits delivered sales; shortfall is shown in billed m³.",
    "Direct annual OPEX is a fixed base cost, escalated once from the first forecast year. Optional own-pumped energy and bulk-water drivers are additional; do not include them again in the base.",
    "Projects are spent and commissioned in the entered year. Grant and equity receipts occur in that year; remaining cost is loan-funded. Project spending does not automatically change NRW or connections.",
    "Debt uses equal-principal annual repayment, first payment in the drawdown year after the specified grace; interest is on opening outstanding principal. All cohorts remain independent.",
    "Tariff cash requirement = cash OPEX + principal + interest + unfunded CAPEX + change in working-capital reserve. Divide by billed m³ × collection factor. Depreciation is reported separately, not charged again.",
    "Working capital is a minimum closing-cash reserve, not an extra cash expenditure. The tariff diagnostic funds its first requirement and subsequent changes; closing cash subtracts actual cash uses only.",
    "Financial viability and affordability are not validated. An equivalent average tariff is not an actual household bill."
  );
  const balances = new Map<string,number>();
  let cash: number | null = known(v.openingCash) ? v.openingCash : null;
  let previousReserve = 0;
  for (let year = s.startYear; year <= s.endYear; year++) {
    const r = emptyYear(year), t = year-s.startYear;
    r.connections = known(v.forecastConnections) && known(v.connectionGrowth) ? v.forecastConnections * (1 + v.connectionGrowth/100)**t : null;
    const demand = known(r.connections) && known(v.consumption) ? r.connections*v.consumption*12 : null;
    const requiredInput = known(demand) && known(v.targetNrw) ? demand/(1-v.targetNrw/100) : null;
    r.systemInput = known(requiredInput) ? known(v.capacity) ? Math.min(requiredInput,v.capacity) : requiredInput : null;
    r.billedVolume = known(r.systemInput) && known(v.targetNrw) ? r.systemInput*(1-v.targetNrw/100) : null;
    r.unmetDemand = known(demand) && known(r.billedVolume) ? Math.max(0,demand-r.billedVolume) : null;
    if (r.unmetDemand && r.unmetDemand > 0) warnings.push("Supply capacity constrains sales; unmet demand is shown explicitly.");
    const factor = known(v.inflation) ? (1+v.inflation/100)**t : null;
    r.opex = known(v.futureOpex) && known(factor) ? v.futureOpex*factor : null;
    if (known(v.energyCost) || known(v.bulkWaterCost)) {
      if (!known(r.systemInput) || !known(v.bulkWaterShare) || !known(factor)) {
        r.opex = null; warnings.push("Volume-driven cost requires system input, bulk-water share and inflation.");
      } else if (known(r.opex)) {
        const bulk = r.systemInput*v.bulkWaterShare/100, own = r.systemInput-bulk;
        if (known(v.energyCost)) r.opex += own*v.energyCost*factor;
        if (known(v.bulkWaterCost)) r.opex += bulk*v.bulkWaterCost*factor;
      }
    }
    r.capex=0; r.grants=0; r.equity=0; r.loanDraw=0; r.interest=0; r.principal=0; r.depreciation=0;
    for (const p of projects) {
      if (p.grantPercent+p.equityPercent>100) throw new Error("Project grant and equity shares cannot exceed 100%");
      const loan = p.amount*(1-(p.grantPercent+p.equityPercent)/100);
      if (p.year === year) {
        r.capex += p.amount; r.grants += p.amount*p.grantPercent/100; r.equity += p.amount*p.equityPercent/100; r.loanDraw += loan;
        balances.set(p.id,loan);
      } else if (p.year < s.startYear && year===s.startYear) {
        const alreadyPaid = Math.min(p.loanTerm,Math.max(0,s.startYear-p.year-(p.graceYears??0)));
        balances.set(p.id,Math.max(0,loan-loan/p.loanTerm*alreadyPaid));
      }
      if (year>=p.year && year<p.year+p.usefulLife) r.depreciation += p.amount/p.usefulLife;
      const outstanding = balances.get(p.id)??0;
      if (outstanding>0) {
        r.interest += outstanding*p.interestRate/100;
        const principal = year>=p.year+(p.graceYears??0) ? Math.min(outstanding,loan/p.loanTerm) : 0;
        r.principal += principal; balances.set(p.id,outstanding-principal);
      }
    }
    const reserve = known(r.opex) && known(v.workingCapitalMonths) ? r.opex*v.workingCapitalMonths/12 : null;
    const change = known(reserve) ? reserve-previousReserve : null;
    if (known(reserve)) previousReserve=reserve;
    const use = v.projects!==undefined && known(r.opex) ? r.opex+r.principal+r.interest+r.capex-r.grants-r.loanDraw-r.equity : null;
    if(v.projects===undefined) {
      r.capex=null;r.grants=null;r.loanDraw=null;r.equity=null;
      r.depreciation=null;r.principal=null;r.interest=null;
    }
    const needed = known(use) && known(change) ? Math.max(0,use+change) : null;
    const collectedDenom = known(r.billedVolume) && known(v.collectionFactor) ? r.billedVolume*v.collectionFactor/100 : null;
    r.requiredTariff = divide(needed,collectedDenom);
    const tariff = v.objective==="chosen_tariff" ? v.chosenTariff : r.requiredTariff;
    r.revenue = known(tariff) && known(r.billedVolume) ? tariff*r.billedVolume : null;
    r.collectedRevenue = known(r.revenue) && known(v.collectionFactor) ? r.revenue*v.collectionFactor/100 : null;
    r.cashGap = known(needed) && known(r.collectedRevenue) ? Math.max(0,needed-r.collectedRevenue) : null;
    cash = known(cash) && known(r.collectedRevenue) && known(use) ? cash+r.collectedRevenue-use : null;
    r.closingCash=cash;
    rows.push(r);
  }
  return rows;
}
function workbookReference(s: Snapshot, warnings: string[], explanations: string[]): Annual[] {
  const v=s.inputs, rows: Annual[]=[], observations=v.observations??[];
  warnings.push("Workbook reference only — NOT a validated utility tariff. The denominator includes other providers and NRW-bearing volumes; full working capital and grant-funded depreciation are added each year.");
  warnings.push("External workbook links and commissioning dates are unresolved. Reference uses accepted cached input drivers from the supplied workbook, not a complete Excel recalculation.");
  explanations.push(
    "Workbook reference recreates the supplied zero-debt, zero-equity example from primitive driver observations; expected outputs are never used as runtime values.",
    "Salary = workbook connections × staff per 1,000 ÷ 1,000 × monthly salary × paid months × inflation factor. Booster power = BBWSP m³ × power cost × inflation factor. Editable POC cost assumptions override the original defaults.",
    "Bulk cost = BBWSP m³ × observed annual bulk price without additional inflation. Miscellaneous is a percentage of direct costs; the service fee is a percentage of direct costs plus miscellaneous.",
    "Required rate = (OPEX + full annual working capital + depreciation) ÷ (deep-well + PWSP + BBWSP volumes). This disputed boundary is deliberately preserved for traceability only.",
    "Five-year minimum = arithmetic mean of the five annual reference rates × 10 m³, not a demonstrated revenue-recovering household bill."
  );
  const driver = (metric:string,year:number) => observations.find(o=>o.metric===metric && Number(o.periodStart.slice(0,4))===year && ["Known","Estimated"].includes(o.quality))?.value??null;
  if ((v.projects??[]).some(p=>p.grantPercent!==100 || p.equityPercent!==0)) warnings.push("Workbook reconstruction supports only the supplied 100%-grant, zero-equity case; use reviewed method for nonzero debt/equity.");
  for (let year=s.startYear;year<=s.endYear;year++) {
    const r=emptyYear(year), wb=workbookYear(v,year);
    r.connections=wb.connections;
    r.billedVolume=wb.workbookVolume;
    r.systemInput=null;
    r.opex=wb.opex;
    r.depreciation=wb.depreciation;
    const invalidFunding=(v.projects??[]).some(p=>p.grantPercent!==100||p.equityPercent!==0);
    if(invalidFunding) r.depreciation=null;
    r.capex=(v.projects??[]).filter(p=>p.year===year).reduce((n,p)=>n+p.amount,0);
    r.grants=r.capex; r.loanDraw=0;r.equity=0;r.interest=0;r.principal=0;
    const arr=known(r.opex)&&known(v.workingCapitalMonths)&&known(r.depreciation)?r.opex*(1+v.workingCapitalMonths/12)+r.depreciation:null;
    r.requiredTariff=divide(arr,r.billedVolume);
    // No unsupported cash schedule is inferred from legacy rates.
    rows.push(r);
  }
  if(rows.some(r=>!known(r.requiredTariff))) warnings.push("Reference driver observations missing for one or more selected years. No cached result has been substituted.");
  return rows;
}
