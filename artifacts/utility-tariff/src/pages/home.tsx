import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { getGetWorkspaceSummaryQueryKey, getListSimulationsQueryKey, useCreateSimulation, useDuplicateSimulation, useGetWorkspaceSummary, useListSimulations, type Simulation } from "@workspace/api-client-react";
import { Copy, Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorRetry, Notice, PageTitle, Shell } from "@/components/shell";
import { errMsg, spanOk, when } from "@/lib/format";

function NewDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const create = useCreateSimulation();
  const [f, setF] = useState({ name: "", utility: "", startYear: "2026", endYear: "2035", currency: "" });
  const s = Number(f.startYear), e = Number(f.endYear);
  const err = !f.name.trim() || !f.utility.trim() ? "Enter a name and utility." : s < 2020 || e > 2100 ? "Years must be between 2020 and 2100." : !spanOk(s, e) ? "The forecast must run from the start year to an end year no more than 30 years long." : "";
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Start a new simulation</DialogTitle><DialogDescription>You can change all of this later. Everything else starts blank.</DialogDescription></DialogHeader>
        <form className="space-y-3" onSubmit={(ev) => { ev.preventDefault(); if (err) return;
          create.mutate({ data: { name: f.name.trim(), utility: f.utility.trim(), startYear: s, endYear: e, ...(f.currency.trim() ? { currency: f.currency.trim() } : {}) } }, {
            onSuccess: (sim) => { qc.invalidateQueries({ queryKey: getListSimulationsQueryKey() }); qc.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey() }); nav(`/simulations/${sim.id}`); } }); }}>
          <label className="block text-sm">Simulation name<input className="fi" value={f.name} onChange={(x) => set("name", x.target.value)} data-testid="input-new-name" maxLength={160} /></label>
          <label className="block text-sm">Utility<input className="fi" value={f.utility} onChange={(x) => set("utility", x.target.value)} data-testid="input-new-utility" maxLength={160} /></label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm">First year<input type="number" className="fi" value={f.startYear} onChange={(x) => set("startYear", x.target.value)} data-testid="input-new-start" /></label>
            <label className="block text-sm">Last year<input type="number" className="fi" value={f.endYear} onChange={(x) => set("endYear", x.target.value)} data-testid="input-new-end" /></label>
            <label className="block text-sm">Currency<input className="fi" placeholder="optional" value={f.currency} onChange={(x) => set("currency", x.target.value)} data-testid="input-new-currency" /></label>
          </div>
          {err && f.name && <p className="text-sm text-destructive">{err}</p>}
          {create.isError && <p className="text-sm text-destructive">{errMsg(create.error)}</p>}
          <Button type="submit" disabled={!!err || create.isPending} data-testid="button-create-simulation">{create.isPending ? "Creating" : "Create and start"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const { isAuthenticated, login } = useAuth();
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const list = useListSimulations();
  const sum = useGetWorkspaceSummary({ query: { enabled: isAuthenticated, queryKey: getGetWorkspaceSummaryQueryKey() } });
  const dup = useDuplicateSimulation();
  const [dupErr, setDupErr] = useState("");
  const duplicate = (sim: Simulation) => {
    if (!isAuthenticated) return login();
    setDupErr("");
    dup.mutate({ id: sim.id }, {
      onSuccess: (n) => { qc.invalidateQueries({ queryKey: getListSimulationsQueryKey() }); qc.invalidateQueries({ queryKey: getGetWorkspaceSummaryQueryKey() }); nav(`/simulations/${n.id}`); },
      onError: (e) => setDupErr(errMsg(e)),
    });
  };
  return (
    <Shell>
      <PageTitle title="My simulations" desc="Plan water service and investment step by step. Each simulation turns your assumptions into a tariff you can explain." />
      {!isAuthenticated && <div className="mb-6"><Notice>You are browsing as a visitor. You can open the reference example read-only. Sign in to save your own simulations.</Notice></div>}
      {isAuthenticated && sum.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {([["Simulations", sum.data.simulations], ["Drafts", sum.data.drafts], ["Calculation runs", sum.data.runs], ["Reports", sum.data.reports]] as const).map(([l, v]) => (
            <div key={l} className="rounded-lg border bg-card p-3"><div className="text-xs uppercase text-muted-foreground">{l}</div><div className="num text-2xl text-primary">{v}</div></div>))}
        </div>
      )}
      {dupErr && <div className="mb-4"><Notice tone="error">{dupErr}</Notice></div>}
      {list.isError ? <ErrorRetry message={errMsg(list.error)} onRetry={() => list.refetch()} /> : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <button onClick={() => (isAuthenticated ? setOpen(true) : login())} data-testid="card-start-new"
            className="rise text-left rounded-xl border-2 border-dashed border-primary/50 bg-card/60 p-6 min-h-52 flex flex-col justify-between hover:bg-card hover:border-primary transition-colors">
            <Plus className="h-8 w-8 text-accent" aria-hidden />
            <div><h2 className="font-display text-2xl text-primary">Start a new simulation</h2>
              <p className="text-sm text-muted-foreground mt-1">{isAuthenticated ? "Begin with a blank guided workflow in eight sections." : "Sign in to save your own simulation."}</p></div>
          </button>
          {list.isLoading && [0, 1].map((i) => <Skeleton key={i} className="min-h-52 rounded-xl" />)}
          {list.data?.map((sim, i) => (
            <article key={sim.id} data-testid={`card-simulation-${sim.id}`} style={{ animationDelay: `${(i + 1) * 70}ms` }} className="rise rounded-xl border bg-card p-6 min-h-52 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <Badge variant={sim.readOnly ? "secondary" : "outline"} data-testid={`status-${sim.id}`}>{sim.readOnly ? "Workbook reference example" : sim.status}</Badge>
                {sim.readOnly && <span className="text-xs flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" />Read-only</span>}
              </div>
              <div><h2 className="font-display text-2xl leading-tight">{sim.name}</h2><p className="text-sm text-muted-foreground">{sim.utility}</p></div>
              <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Forecast</dt><dd className="num">{sim.startYear}{"\u2013"}{sim.endYear}</dd>
                <dt className="text-muted-foreground">Updated</dt><dd>{when(sim.updatedAt)}</dd>
                {!sim.readOnly && <><dt className="text-muted-foreground">Progress</dt><dd>{sim.completedSections} of 8 sections</dd></>}
              </dl>
              {sim.resultsOutdated && <p className="text-xs text-accent-foreground bg-accent/20 rounded px-2 py-1">Results are out of date</p>}
              <div className="mt-auto flex gap-2">
                <Button asChild size="sm" data-testid={`button-open-${sim.id}`}><Link href={`/simulations/${sim.id}`}>{sim.readOnly ? "Open" : "Continue"}</Link></Button>
                <Button size="sm" variant="outline" onClick={() => duplicate(sim)} disabled={dup.isPending} data-testid={`button-duplicate-${sim.id}`}><Copy className="h-4 w-4 mr-1" />{sim.readOnly ? "Duplicate to edit" : "Duplicate"}</Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {list.data && list.data.length === 0 && <p className="mt-6 text-muted-foreground">Nothing here yet. Start a simulation above.</p>}
      {isAuthenticated && sum.data && sum.data.recentActivity.length > 0 && (
        <section className="mt-10"><h2 className="font-display text-xl mb-2">Recent activity</h2>
          <ul className="text-sm divide-y rounded-lg border bg-card">{sum.data.recentActivity.map((a, i) => <li key={i} className="px-4 py-2 flex justify-between gap-4"><span>{a.label}</span><span className="text-muted-foreground">{when(a.createdAt)}</span></li>)}</ul></section>
      )}
      <NewDialog open={open} onClose={() => setOpen(false)} />
    </Shell>
  );
}
