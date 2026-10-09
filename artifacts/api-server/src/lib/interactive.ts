import type { InteractiveSettings, InteractiveYear, InteractiveResult } from "@workspace/api-zod";
import type { Snapshot, Values } from "./engine";

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clean = (v: number): number | null => finite(v) ? v : null;
const times = (...v: (number | null | undefined)[]) => v.every(finite) ? clean(v.reduce((a,b)=>a*b,1)) : null;
const plus = (...v: (number | null | undefined)[]) => v.every(finite) ? clean(v.reduce((a,b)=>a+b,0)) : null;
const ratio = (a: unknown,b: unknown) => finite(a)&&finite(b)&&b>0 ? clean(a/b) : null;
const subtract = (a: unknown,b: unknown) => finite(a)&&finite(b) ? clean(a-b) : null;
export const REFERENCE_COST_DEFAULTS = {
  staffPer1000:4,monthlySalary:19090,payMonths:13,chemicalUnitCost:0.5,
  miscellaneousPercent:5,serviceFeePercent:10,
};
export function historicalMonths(v:Values):number|null {
  if(!v.historicalStart || !v.historicalEnd)return null;
  const s=new Date(v.historicalStart+"T00:00:00Z"),e=new Date(v.historicalEnd+"T00:00:00Z");
  if(!finite(s.getTime())||!finite(e.getTime())||e<s)return null;
  if(s.toISOString().slice(0,10)!==v.historicalStart || e.toISOString().slice(0,10)!==v.historicalEnd)return null;
  const last=new Date(Date.UTC(e.getUTCFullYear(),e.getUTCMonth()+1,0)).getUTCDate();
  return s.getUTCDate()===1&&e.getUTCDate()===last
    ? (e.getUTCFullYear()-s.getUTCFullYear())*12+e.getUTCMonth()-s.getUTCMonth()+1
    : ((e.getTime()-s.getTime())/86400000+1)/(365.2425/12);
}
export function historicalNrw(v:Values) {
  const billedShare=ratio(v.billedVolume,v.production);
  return billedShare!==null && billedShare>0 && billedShare<=1 ? (1-billedShare)*100 : null;
}
/** Initial demo defaults only. Once interactive exists, null means deliberately missing. */
export function prepareInteractive(input:Values,demo:boolean):Values {
  const v=structuredClone(input);
  if(v.interactive!==undefined)return v;
  const nrw=historicalNrw(v);
  v.interactive={
    ...(demo?REFERENCE_COST_DEFAULTS:{}),
    ...(demo?{baselineCollectionPercent:80}:{}),
    appliedTariffSource:finite(v.chosenTariff)?"manual":"inferred",
    collectEnabled:false,collectionTarget:demo?80:null,
    nrwEnabled:false,nrwTarget:nrw,omEnabled:false,omSavingPercent:0,programmeCost:0,
  };
  if(demo) {
    if(v.forecastConnections==null)v.forecastConnections=v.connections??null;
    if(v.connectionGrowth==null)v.connectionGrowth=0;
    if(v.consumption==null)v.consumption=ratio(v.billedVolume,times(v.connections,historicalMonths(v)));
  }
  return v;
}
export function workbookYear(v:Values,year:number) {
  // Absent interactive object preserves pre-POC engine behaviour.
  const p:InteractiveSettings=v.interactive??REFERENCE_COST_DEFAULTS;
  const driver=(metric:string)=>v.observations?.find(o=>o.metric===metric&&Number(o.periodStart.slice(0,4))===year&&["Known","Estimated"].includes(o.quality))?.value??null;
  const connections=driver("legacy_connections"),dw=driver("legacy_deep_well"),pwsp=driver("legacy_pwsp"),bbwsp=driver("legacy_bbwsp"),price=driver("legacy_bulk_price");
  const factor=finite(v.inflation)?clean((1+v.inflation/100)**(year-2030)):null;
  const salary=times(connections,ratio(p.staffPer1000,1000),p.monthlySalary,p.payMonths,factor);
  const power=times(bbwsp,v.energyCost,factor),chemicals=times(dw,p.chemicalUnitCost,factor),bulk=times(bbwsp,price);
  const markup=finite(p.miscellaneousPercent)&&finite(p.serviceFeePercent)?(1+p.miscellaneousPercent/100)*(1+p.serviceFeePercent/100):null;
  const fixedOpex=times(salary,markup),variableOpex=times(plus(power,chemicals,bulk),markup);
  const opex=plus(fixedOpex,variableOpex),workbookVolume=plus(dw,pwsp,bbwsp);
  const supported=(v.projects??[]).every(p=>p.grantPercent===100&&p.equityPercent===0);
  const depreciation=supported&&!(v.interactive&&v.projects===undefined)?clean((v.projects??[]).filter(p=>p.year<=year&&year<p.year+p.usefulLife).reduce((n,p)=>n+p.amount/p.usefulLife,0)):null;
  const workingCapital=times(opex,ratio(v.workingCapitalMonths,12));
  const requiredRevenue=plus(opex,depreciation,workingCapital);
  return {year,connections,fixedOpex,variableOpex,opex,depreciation,workingCapital,requiredRevenue,workbookVolume,workbookTariff:ratio(requiredRevenue,workbookVolume)};
}
export function calculateInteractive(s:Snapshot):InteractiveResult {
  const v=s.inputs,i=v.interactive??{},warnings:string[]=[];
  const c0=i.baselineCollectionPercent??null;
  const impliedHistoricalBillings=ratio(v.collections,ratio(c0,100));
  const inferredAverageTariff=ratio(impliedHistoricalBillings,v.billedVolume);
  const appliedTariff=i.appliedTariffSource==="manual"?v.chosenTariff??null:inferredAverageTariff;
  const r0=historicalNrw(v),months=historicalMonths(v);
  const calibration={baselineCollectionPercent:c0,impliedHistoricalBillings,inferredAverageTariff,appliedTariff,baselineNrw:r0,historicalMonths:months};
  if(s.inputs.method!=="workbook_reference")return {baseline:[],improved:[],calibration,warnings:["This scenario uses the reviewed method. Its existing calculation and saved results are unchanged."]};
  if(!finite(c0)||c0<=0)warnings.push("Enter an assumed baseline collection efficiency to calibrate the illustrative billing base. Observed billings remain unchanged.");
  if(months===null)warnings.push("Historical reporting dates are missing or invalid; confirm the calibration period.");
  if(inferredAverageTariff===null)warnings.push("The inferred tariff is unavailable: calibration needs reported collections, positive utility billed volume and positive baseline collection efficiency.");
  const supported=(v.projects??[]).every(p=>p.grantPercent===100&&p.equityPercent===0);
  if(!supported)warnings.push("This workbook POC supports 100%-grant, zero-equity, zero-debt projects only. Use the existing reviewed method for other financing.");
  if(v.projects===undefined)warnings.push("Investment assumptions are missing; confirm the project list before interpreting the revenue requirement.");
  const make=(year:number,interventions:boolean):InteractiveYear=>{
    const wb=workbookYear(v,year);
    const hasNrw=interventions&&i.nrwEnabled,hasOm=interventions&&i.omEnabled,hasCollect=interventions&&i.collectEnabled;
    const nrw=hasNrw?i.nrwTarget??null:r0;
    // No 0/0 for zero demand. No extra sales are awarded for recovered water.
    const variableFactor=hasNrw?(finite(r0)&&finite(nrw)&&nrw>=0&&nrw<100?(1-r0/100)/(1-nrw/100):null):1;
    const savingFactor=hasOm?finite(i.omSavingPercent)?1-i.omSavingPercent/100:null:1;
    const fixedOpex=times(wb.fixedOpex,savingFactor),variableOpex=times(wb.variableOpex,variableFactor,savingFactor);
    const programme=hasNrw||hasOm||hasCollect?i.programmeCost??null:0;
    const opex=plus(fixedOpex,variableOpex,programme);
    const workingCapital=times(opex,ratio(v.workingCapitalMonths,12));
    const requiredRevenue=plus(opex,workingCapital,wb.depreciation);
    const growth=finite(v.connectionGrowth)?clean((1+v.connectionGrowth/100)**(year-s.startYear)):null;
    const utilityConnections=times(v.forecastConnections,growth);
    const utilityBilledVolume=times(utilityConnections,v.consumption,12);
    const collectionPercent=hasCollect?i.collectionTarget??null:c0;
    const grossBillings=times(appliedTariff,utilityBilledVolume);
    const collections=times(grossBillings,ratio(collectionPercent,100));
    return {year,fixedOpex,variableOpex,opex,depreciation:wb.depreciation,workingCapital,requiredRevenue,workbookVolume:wb.workbookVolume,
      workbookTariff:ratio(requiredRevenue,wb.workbookVolume),utilityConnections,utilityBilledVolume,
      systemInput:ratio(utilityBilledVolume,finite(nrw)&&nrw>=0&&nrw<100?1-nrw/100:null),
      appliedTariff,collectionPercent,grossBillings,collections,cashOmCoverage:times(ratio(collections,opex),100),
      operatingBalance:subtract(collections,opex),targetBalance:subtract(collections,requiredRevenue),
      targetCollectionTariff:ratio(requiredRevenue,times(utilityBilledVolume,ratio(collectionPercent,100)))};
  };
  const baseline:InteractiveYear[]=[],improved:InteractiveYear[]=[];
  for(let year=s.startYear;year<=s.endYear;year++){baseline.push(make(year,false));improved.push(make(year,true));}
  if(baseline.some(y=>y.workbookTariff===null))warnings.push("Required tariff unavailable for some years: check annual workbook observations, cost assumptions and positive workbook volume.");
  if(baseline.some(y=>y.utilityBilledVolume===null))warnings.push("Enter first-year average utility connections, connection growth and monthly consumption for revenue estimates.");
  if(improved.some(y=>y.opex===0))warnings.push("O&M coverage is unavailable when operating costs are zero.");
  if(improved.some(y=>y.collectionPercent===0))warnings.push("Zero collection efficiency produces zero receipts; the tariff to collect the target is unavailable.");
  if(improved.some(y=>y.utilityBilledVolume===0))warnings.push("With zero utility billed volume, revenue-target tariffs are unavailable.");
  if(i.nrwEnabled&&r0===null)warnings.push("NRW savings need valid baseline system input and billed volume for the same utility boundary.");
  warnings.push("Illustrative forecast: workbook projected costs and utility billed-volume estimates. Unconstrained demand is not proof of supply adequacy.");
  return {baseline,improved,calibration,warnings};
}
