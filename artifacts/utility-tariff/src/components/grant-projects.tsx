import type { InvestmentProject as Project } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/editors";
import { NumBox } from "@/components/interactive";

/** A grant-only POC editor. Existing finance fields stay untouched, not discarded. */
export function GrantProjectsEditor({projects,onChange,startYear,currency,disabled}:{
  projects:Project[]|undefined;onChange:(p:Project[])=>void;startYear:number;currency:string;disabled?:boolean;
}) {
  const rows=projects??[];
  const patch=(id:string,change:Partial<Project>)=>onChange(rows.map(p=>p.id===id?{...p,...change}:p));
  return <div className="space-y-4 mt-3">
    <p className="text-sm text-muted-foreground">100% grant-funded assets. Straight-line depreciation uses each asset's investment amount and useful life.</p>
    {rows.map((p,n)=><fieldset key={p.id} disabled={disabled} className="border rounded-lg p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid={`project-${n}`}>
      <legend className="text-xs px-2">Investment {n+1}</legend>
      <Field label="Investment name"><input className="fi" value={p.name} onChange={e=>patch(p.id,{name:e.target.value})} /></Field>
      {([
        ["year","Investment year","year"],["amount","Investment amount",currency],["usefulLife","Asset life","years"]
      ] as const).map(([key,label,unit])=><Field key={key} label={label} unit={unit}>
        <NumBox label={`${label} (${unit})`} testId={`input-project-${n}-${key}`} value={Number.isFinite(p[key])?p[key]:null} disabled={disabled}
          onChange={v=>patch(p.id,{[key]:v??Number.NaN})} />
      </Field>)}
      {p.grantPercent!==100||p.equityPercent!==0?<p className="text-sm text-destructive sm:col-span-2 lg:col-span-4">Existing financing is not 100% grant funding. It has been preserved, but this asset is not supported in the POC.</p>:null}
      {!disabled&&<Button size="sm" variant="ghost" onClick={()=>onChange(rows.filter(x=>x.id!==p.id))}>Remove investment</Button>}
    </fieldset>)}
    {rows.length===0&&<p className="text-sm">{projects===undefined?"Investment assumptions not provided.":"Confirmed: no investment in this scenario."}</p>}
    {!disabled&&<div className="flex gap-3">
      <Button size="sm" variant="outline" data-testid="button-add-project" onClick={()=>onChange([...rows,{id:crypto.randomUUID(),name:"",year:startYear,amount:Number.NaN,usefulLife:Number.NaN,grantPercent:100,equityPercent:0,interestRate:0,loanTerm:20,graceYears:0,source:"User scenario assumption"}])}>Add investment</Button>
      {projects===undefined&&<Button size="sm" variant="ghost" onClick={()=>onChange([])}>Confirm no investments</Button>}
    </div>}
  </div>;
}
