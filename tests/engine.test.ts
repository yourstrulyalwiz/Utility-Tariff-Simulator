import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculate, baseline, coveredDays, residentialBill, type Snapshot } from "../artifacts/api-server/src/lib/engine.ts";

const fixture=JSON.parse(readFileSync("data/tagbilaran.seed.json","utf8"));
const expected=JSON.parse(readFileSync("data/workbook.expected.json","utf8"));
const near=(a:number|null,b:number,tol=1e-6)=>{assert.notEqual(a,null);assert.ok(Math.abs(a!-b)<tol,`${a} != ${b}`);};
const base=():Snapshot=>({name:"Test",utility:"Test utility",startYear:2030,endYear:2039,currency:"PHP",version:1,inputs:{method:"reviewed",objective:"required_tariff",forecastConnections:100,consumption:10,connectionGrowth:0,targetNrw:20,futureOpex:120000,inflation:0,collectionFactor:100,workingCapitalMonths:0,openingCash:0,projects:[]}});
test("Tagbilaran operational benchmarks and collections cutoff",()=>{
  const b=baseline(fixture.inputs);
  assert.equal(b.days,181);near(b.billedMld,5.26074033149);near(b.productionMld,7.65718232044);
  near(b.nrw,31.2967,0.0001);near(b.consumption,952194/6/6084);
  assert.equal(b.collectionRatio,null);assert.equal(b.averageBilledTariff,null);
  near(fixture.inputs.collections+1907881.12,12036951.99,0.01);
});
test("Workbook reconstruction matches independent cached benchmarks without using them at runtime",()=>{
  const r=calculate({...fixture,version:1});
  near(r.summary.firstFiveYearMinimum,expected.firstFiveYearMinimum,0.000001);
  near(r.summary.secondFiveYearMinimum,expected.secondFiveYearMinimum,0.000001);
  r.annual.forEach((a,i)=>near(a.requiredTariff,expected.annualRates[i],0.000001));
  assert.equal(r.summary.endingCash,null);assert.equal(r.summary.affordability,null);
});
test("Workbook engine responds to inputs, not frozen expected outputs",()=>{
  const s=structuredClone(fixture);s.inputs.energyCost=20;
  assert.notEqual(calculate({...s,version:1}).summary.firstFiveYearMinimum,expected.firstFiveYearMinimum);
});
test("Calendar periods and leap days",()=>{
  assert.equal(coveredDays("2024-01-01","2024-12-31"),366);
  assert.equal(coveredDays("2025-02-29","2025-03-01"),null);
  assert.equal(coveredDays("2025-07-01","2025-06-30"),null);
});
test("Missing is distinct from real zero",()=>{
  assert.equal(baseline({production:null,billedVolume:0}).nrw,null);
  assert.equal(baseline({production:0,billedVolume:0}).nrw,null);
  assert.equal(baseline({production:100,billedVolume:0}).nrw,100);
  const s=base();s.inputs.futureOpex=null;
  assert.equal(calculate(s).annual[0]!.requiredTariff,null);
});
test("Unconfirmed investment program is unknown, not zero",()=>{
  const s=base();delete s.inputs.projects;
  const result=calculate(s),r=result.annual[0]!;
  assert.equal(r.capex,null);assert.equal(r.principal,null);assert.equal(r.requiredTariff,null);
  assert.equal(result.summary.totalInvestment,null);
});
test("Historical mismatched periods and providers withhold comparable NRW",()=>{
  const b=baseline({...fixture.inputs,observations:[{metric:"billedVolume",value:952194,unit:"m³",periodStart:"2025-01-01",periodEnd:"2025-07-31",quality:"Known",source:"Test",scope:"Utility only"}]});
  assert.equal(b.nrw,null);
});
test("Marginal residential bills and thresholds",()=>{
  assert.equal(residentialBill(0),62);assert.equal(residentialBill(0,false),0);
  assert.equal(residentialBill(10),62);assert.equal(residentialBill(10.5),65.5);
  assert.equal(residentialBill(11),69);assert.equal(residentialBill(20),132);assert.equal(residentialBill(21),140);
  assert.equal(residentialBill(30),212);assert.equal(residentialBill(70),832);assert.equal(residentialBill(71),855);
});
test("Reviewed utility scope does not use other providers",()=>{
  const s=base();s.inputs.observations=fixture.inputs.observations;
  const r=calculate(s).annual[0]!;assert.equal(r.billedVolume,12000);assert.equal(r.systemInput,15000);assert.equal(r.requiredTariff,10);
});
test("Supply limits produce real shortfalls, not unconstrained sales",()=>{
  const s=base();s.inputs.capacity=10000;
  const r=calculate(s).annual[0]!;assert.equal(r.billedVolume,8000);assert.equal(r.systemInput,10000);assert.equal(r.unmetDemand,4000);
});
test("Chosen tariff uses expected cash collection factor",()=>{
  const s=base();s.inputs.objective="chosen_tariff";s.inputs.chosenTariff=10;s.inputs.collectionFactor=80;
  const r=calculate(s).annual[0]!;near(r.requiredTariff,12.5);assert.equal(r.collectedRevenue,96000);assert.equal(r.cashGap,24000);assert.equal(r.closingCash,-24000);
});
test("Independent loan cohorts, zero interest, grace, and maturity",()=>{
  const s=base();s.inputs.projects=[
    {id:"a",name:"A",year:2030,amount:120000,grantPercent:0,equityPercent:0,interestRate:0,loanTerm:3,usefulLife:10},
    {id:"b",name:"B",year:2031,amount:60000,grantPercent:0,equityPercent:0,interestRate:10,loanTerm:2,usefulLife:10,graceYears:1},
  ];
  const r=calculate(s).annual;
  assert.equal(r[0]!.principal,40000);assert.equal(r[1]!.principal,40000);assert.equal(r[1]!.interest,6000);
  assert.equal(r[2]!.principal,70000);assert.equal(r[3]!.principal,30000);assert.equal(r[4]!.principal,0);assert.equal(r[4]!.interest,0);
  assert.equal(r[1]!.depreciation,18000);
});
test("Working capital is a reserve, not deducted twice from cash",()=>{
  const s=base();s.inputs.workingCapitalMonths=2;
  const r=calculate(s).annual;
  near(r[0]!.requiredTariff,140000/12000);near(r[0]!.closingCash,20000);near(r[1]!.requiredTariff,10);near(r[1]!.closingCash,20000);
});
test("Grant CAPEX does not double-count depreciation and cash uses",()=>{
  const s=base();s.inputs.projects=[{id:"a",name:"Grant",year:2030,amount:100000,grantPercent:100,equityPercent:0,interestRate:0,loanTerm:5,usefulLife:10}];
  const r=calculate(s).annual[0]!;assert.equal(r.capex,100000);assert.equal(r.grants,100000);assert.equal(r.depreciation,10000);assert.equal(r.requiredTariff,10);assert.equal(r.closingCash,0);
});
test("Frozen snapshot unchanged by later edits and duplicate isolation",()=>{
  const s=base(), copy=structuredClone(s), run=structuredClone(calculate(copy));
  const before=JSON.stringify(run);copy.inputs.futureOpex=999999;
  assert.equal(s.inputs.futureOpex,120000);assert.equal(JSON.stringify(run),before);
});
