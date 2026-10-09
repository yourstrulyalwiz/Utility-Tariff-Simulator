import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Droplets, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "My simulations" },
  { href: "/compare", label: "Compare" },
  { href: "/sources", label: "Sources" },
  { href: "/guide", label: "Guide" },
];

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  return (
    <div className="min-h-[100dvh] ripple-bg">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center gap-x-8 gap-y-2">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <Droplets className="h-6 w-6 text-accent" aria-hidden />
            <span className="font-display text-xl font-semibold">Tariff Simulator</span>
          </Link>
          <nav className="flex gap-1 flex-1" aria-label="Main">
            {NAV.map((n) => {
              const on = n.href === "/" ? loc === "/" || loc.startsWith("/simulations") : loc.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} data-testid={`link-nav-${n.label.toLowerCase().replace(/\s/g, "-")}`}
                  className={`px-3 py-1.5 rounded-md text-sm ${on ? "bg-sidebar-accent text-white border-b-2 border-accent" : "hover:bg-sidebar-accent/60"}`}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
          {!isLoading && (isAuthenticated ? (
            <div className="flex items-center gap-3 text-sm">
              <span data-testid="text-user" className="opacity-80">{user?.firstName || user?.email || "Signed in"}</span>
              <Button size="sm" variant="secondary" onClick={logout} data-testid="button-logout"><LogOut className="h-4 w-4 mr-1" />Log out</Button>
            </div>
          ) : (
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={login} data-testid="button-login"><LogIn className="h-4 w-4 mr-1" />Log in to save</Button>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}

export function PageTitle({ title, desc }: { title: string; desc?: string }) {
  document.title = `${title} | Utility Tariff Simulator`;
  return (
    <div className="mb-6 rise">
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-primary">{title}</h1>
      {desc && <p className="mt-2 max-w-3xl text-muted-foreground">{desc}</p>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error"; children: ReactNode }) {
  const c = tone === "error" ? "border-destructive/50 bg-destructive/10" : tone === "warn" ? "border-accent/60 bg-accent/10" : "border-primary/30 bg-primary/5";
  return <div role={tone === "info" ? "status" : "alert"} className={`rounded-md border-l-4 px-4 py-3 text-sm ${c}`}>{children}</div>;
}

export function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Notice tone="error">
      <div className="flex flex-wrap items-center gap-3">
        <span>{message}</span>
        <Button size="sm" variant="outline" onClick={onRetry} data-testid="button-retry">Try again</Button>
      </div>
    </Notice>
  );
}
