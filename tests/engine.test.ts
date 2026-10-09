import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculate, baseline, coveredDays, residentialBill, type Snapshot } from "../artifacts/api-server/src/lib/engine.ts";
import { calculateInteractive, prepareInteractive, workbookYear } from "../artifacts/api-server/src/lib/interactive.ts";
import { snapshotKey } from "../artifacts/utility-tariff/src/lib/snapshot-key.ts";

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

const poc=():Snapshot=>({...structuredClone(fixture),version:1,inputs:prepareInteractive(fixture.inputs,true)});
const money=(a:number|null,b:number)=>near(a,b,0.01);
test("POC reproduces every annual OPEX and reference rate, without repeating 2030 costs",()=>{
  const s=poc(),r=calculateInteractive(s);
  const costs=[266854479.77779043,233682598.69501808,241784175.07980686,250331635.14579704,259353024.03425560,309865209.97551996,320071546.11759865,330830569.57471687,342176824.95468605,354147169.76447517];
  r.baseline.forEach((y,n)=>{money(y.opex,costs[n]!);near(y.workbookTariff,expected.annualRates[n]);});
  const y=r.baseline[0]!;
  near(y.workbookVolume,15247187.847318565);money(y.depreciation,23169711.95995772);
  money(y.workingCapital,44475746.629631735);money(y.requiredRevenue,334499938.3673799);
  assert.deepEqual(r.baseline,r.improved);
});
test("POC O&M-only benchmark reduces remaining OPEX, preserves volume and depreciation",()=>{
  const s=poc();s.inputs.interactive!.omEnabled=true;s.inputs.interactive!.omSavingPercent=10;
  const r=calculateInteractive(s),y=r.improved[0]!,b=r.baseline[0]!;
  money(y.opex,240169031.8000114);money(y.requiredRevenue,303366915.7266377);near(y.workbookTariff,19.89658150502744);
  assert.equal(y.depreciation,b.depreciation);assert.equal(y.utilityBilledVolume,b.utilityBilledVolume);assert.equal(y.grossBillings,b.grossBillings);
});
test("POC calibration and collection improvement keep inferred facts separate",()=>{
  const s=poc();s.inputs.interactive!.collectEnabled=true;s.inputs.interactive!.collectionTarget=95;
  const r=calculateInteractive(s),b=r.baseline[0]!,y=r.improved[0]!;
  money(r.calibration.impliedHistoricalBillings,12661338.5875);near(r.calibration.inferredAverageTariff,13.297015721061042);
  money(b.collections,20258141.74);money(y.collections,24056543.31625);money(y.collections!-b.collections!,3798401.57625);
  near(b.targetCollectionTariff,219.5586839232472);near(y.targetCollectionTariff,184.89152330378715);
  assert.equal(y.opex,b.opex);assert.equal(y.grossBillings,b.grossBillings);assert.equal(y.workbookTariff,b.workbookTariff);
  assert.equal(s.inputs.billings,null);assert.equal(s.inputs.currentTariff,null);
});
test("POC NRW-only benchmark saves variable costs without awarding sales or reducing staff",()=>{
  const s=poc();s.inputs.interactive!.nrwEnabled=true;s.inputs.interactive!.nrwTarget=25;
  const r=calculateInteractive(s),b=r.baseline[0]!,y=r.improved[0]!;
  money(b.fixedOpex,12030700.8822);money(b.variableOpex,254823778.89559045);
  money(y.opex,245460645.03286234);near(y.workbookTariff,20.30147903980433);
  assert.equal(y.fixedOpex,b.fixedOpex);assert.equal(y.utilityBilledVolume,b.utilityBilledVolume);assert.equal(y.grossBillings,b.grossBillings);
});
test("POC combined case matches benchmark and is not the sum of standalone savings",()=>{
  const s=poc();Object.assign(s.inputs.interactive!,{nrwEnabled:true,nrwTarget:25,omEnabled:true,omSavingPercent:10,collectEnabled:true,collectionTarget:95});
  const r=calculateInteractive(s),y=r.improved[0]!;
  money(y.opex,220914580.5295761);money(y.requiredRevenue,280903389.2444632);near(y.workbookTariff,18.423291695318362);
  money(y.collections,24056543.31625);near(y.cashOmCoverage,10.889522664634307);
});
test("POC toggles are order independent and evaluation never mutates base inputs",()=>{
  const a=poc(),b=poc();
  Object.assign(a.inputs.interactive!,{nrwEnabled:true,nrwTarget:25,omEnabled:true,omSavingPercent:10,collectEnabled:true,collectionTarget:95});
  Object.assign(b.inputs.interactive!,{collectionTarget:95,collectEnabled:true,omSavingPercent:10,omEnabled:true,nrwTarget:25,nrwEnabled:true});
  const before=JSON.stringify(a);
  assert.deepEqual(calculateInteractive(a),calculateInteractive(b));calculateInteractive(a);assert.equal(JSON.stringify(a),before);
});
test("POC applied tariff override persists while inferred rate recalibrates independently",()=>{
  const s=poc(),before=calculateInteractive(s);
  s.inputs.chosenTariff=20;s.inputs.interactive!.appliedTariffSource="manual";
  let r=calculateInteractive(s);assert.equal(r.calibration.appliedTariff,20);
  assert.equal(r.baseline[0]!.opex,before.baseline[0]!.opex);assert.equal(r.baseline[0]!.workbookTariff,before.baseline[0]!.workbookTariff);
  s.inputs.interactive!.baselineCollectionPercent=90;
  r=calculateInteractive(s);assert.equal(r.calibration.appliedTariff,20);
  assert.notEqual(r.calibration.inferredAverageTariff,before.calibration.inferredAverageTariff);
  s.inputs.interactive!.appliedTariffSource="inferred";r=calculateInteractive(s);
  assert.equal(r.calibration.appliedTariff,r.calibration.inferredAverageTariff);
});
test("POC selected-year observation changes stay in that year; global salary affects the horizon",()=>{
  const s=poc(),before=calculateInteractive(s);
  s.inputs.observations!.find(o=>o.metric==="legacy_bulk_price"&&o.periodStart==="2031-01-01")!.value=25;
  let r=calculateInteractive(s);assert.equal(r.baseline[0]!.opex,before.baseline[0]!.opex);assert.notEqual(r.baseline[1]!.opex,before.baseline[1]!.opex);
  s.inputs.interactive!.monthlySalary=20000;r=calculateInteractive(s);
  r.baseline.forEach((y,n)=>assert.notEqual(y.opex,before.baseline[n]!.opex));
});
test("POC utility growth changes revenue, not workbook city/provider cost or denominator",()=>{
  const s=poc(),before=calculateInteractive(s);s.inputs.connectionGrowth=5;
  const r=calculateInteractive(s);
  near(r.baseline[1]!.utilityBilledVolume,1904388*1.05);
  assert.equal(r.baseline[1]!.opex,before.baseline[1]!.opex);assert.equal(r.baseline[1]!.workbookVolume,before.baseline[1]!.workbookVolume);
});
test("POC programme cost applies only while an intervention is enabled",()=>{
  const s=poc(),before=calculateInteractive(s);s.inputs.interactive!.programmeCost=1000000;
  assert.deepEqual(calculateInteractive(s).baseline,calculateInteractive(s).improved);
  s.inputs.interactive!.collectEnabled=true;
  const r=calculateInteractive(s);money(r.improved[0]!.opex,before.baseline[0]!.opex!+1000000);
});
test("POC missing and zero inputs never produce NaN or Infinity",()=>{
  const s=poc();s.inputs.interactive!.collectEnabled=true;s.inputs.interactive!.collectionTarget=0;
  let r=calculateInteractive(s);assert.equal(r.improved[0]!.collections,0);assert.equal(r.improved[0]!.targetCollectionTariff,null);
  s.inputs.consumption=0;s.inputs.interactive!.nrwEnabled=true;s.inputs.interactive!.nrwTarget=25;
  r=calculateInteractive(s);assert.equal(r.improved[0]!.utilityBilledVolume,0);assert.equal(r.improved[0]!.targetCollectionTariff,null);money(r.improved[0]!.opex,245460645.03286234);
  s.inputs.interactive!.omEnabled=true;s.inputs.interactive!.omSavingPercent=100;
  r=calculateInteractive(s);assert.equal(r.improved[0]!.opex,0);assert.equal(r.improved[0]!.cashOmCoverage,null);
  s.inputs.interactive!.monthlySalary=null;r=calculateInteractive(s);assert.equal(r.baseline[0]!.opex,null);
  for(const y of [...r.baseline,...r.improved])for(const val of Object.values(y))assert.ok(val===null||Number.isFinite(val));
});
test("POC years outside reference driver range remain missing, never carry forward observations",()=>{
  const s=poc();s.startYear=2029;s.endYear=2040;
  const r=calculateInteractive(s);assert.equal(r.baseline[0]!.workbookTariff,null);assert.equal(r.baseline.at(-1)!.workbookTariff,null);
});
test("POC save-roundtrip and frozen result use the same pure calculation as preview",()=>{
  const s=poc();Object.assign(s.inputs.interactive!,{nrwEnabled:true,nrwTarget:25,omEnabled:true,omSavingPercent:10,collectEnabled:true,collectionTarget:95});
  const reloaded=JSON.parse(JSON.stringify(s));
  assert.deepEqual(calculate(reloaded).interactive,calculateInteractive(s));
  assert.deepEqual(prepareInteractive(reloaded.inputs,true),reloaded.inputs);
});
test("POC blank unrelated scenarios receive no Tagbilaran facts or overwrite of deliberate missing values",()=>{
  const blank=prepareInteractive({},false);
  assert.equal(blank.forecastConnections,undefined);assert.equal(blank.consumption,undefined);assert.equal(blank.collections,undefined);
  assert.equal(blank.interactive!.monthlySalary,undefined);assert.equal(blank.interactive!.baselineCollectionPercent,undefined);
  const s=poc();s.inputs.consumption=null;assert.equal(prepareInteractive(s.inputs,true).consumption,null);
  const zeroHistory=prepareInteractive({...fixture.inputs,billedVolume:0},true);
  assert.equal(zeroHistory.interactive!.nrwTarget,null);
});
test("POC unsupported financing remains unavailable and reviewed engine stays unchanged",()=>{
  const s=poc();s.inputs.projects![0]!.grantPercent=90;
  assert.equal(calculateInteractive(s).baseline[0]!.workbookTariff,null);
  const reviewed=base(),before=calculate(reviewed);reviewed.inputs.interactive={nrwEnabled:true,nrwTarget:25};
  assert.deepEqual(calculate(reviewed),before);
});
test("POC save status ignores server field ordering but detects changed and missing values",()=>{
  assert.equal(snapshotKey({inputs:{method:"workbook_reference",interactive:{nrwTarget:25,omEnabled:true}}}),
    snapshotKey({inputs:{interactive:{omEnabled:true,nrwTarget:25},method:"workbook_reference"}}));
  assert.notEqual(snapshotKey({value:null}),snapshotKey({value:0}));
  assert.notEqual(snapshotKey({target:95}),snapshotKey({target:94}));
  assert.notEqual(snapshotKey({years:[2030,2031]}),snapshotKey({years:[2031,2030]}));
});
