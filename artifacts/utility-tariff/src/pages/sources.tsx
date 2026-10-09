import { useAuth } from "@workspace/replit-auth-web";
import { useListSources } from "@workspace/api-client-react";
import { Download, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorRetry, Notice, PageTitle, Shell } from "@/components/shell";
import { errMsg } from "@/lib/format";

export default function Sources() {
  const { isAuthenticated, login } = useAuth();
  const q = useListSources();
  return (
    <Shell>
      <PageTitle title="Source register" desc="The documents behind the reference example and its assumptions. Every number should trace back to a line here." />
      {!isAuthenticated && <div className="mb-4"><Notice>You can see what each source is and where to find the figure. <button className="underline font-semibold" onClick={login}>Log in</button> to download original files.</Notice></div>}
      {q.isError && <ErrorRetry message={errMsg(q.error)} onRetry={() => q.refetch()} />}
      {q.isLoading && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>}
      {q.data?.length === 0 && <p className="text-muted-foreground">No sources registered yet.</p>}
      <ul className="space-y-3">
        {q.data?.map((s) => (
          <li key={s.id} data-testid={`row-source-${s.id}`} className="rounded-lg border bg-card p-4 flex flex-wrap gap-4 items-start">
            <FileText className="h-6 w-6 text-primary mt-1" aria-hidden />
            <div className="flex-1 min-w-60"><h2 className="font-semibold">{s.name}</h2><p className="text-sm text-muted-foreground">{s.role}</p>
              <p className="text-sm mt-1"><span className="text-muted-foreground">Where to look: </span>{s.locator || "Not specified"}</p></div>
            {!s.available ? <span className="text-sm text-muted-foreground">Original not available</span> : isAuthenticated ? (
              <a href={s.url} className="inline-flex items-center gap-1 text-sm font-medium text-primary underline" data-testid={`link-download-${s.id}`}><Download className="h-4 w-4" />Download original</a>
            ) : <button onClick={login} className="text-sm underline" data-testid={`button-login-download-${s.id}`}>Log in to download</button>}
          </li>))}
      </ul>
    </Shell>
  );
}
