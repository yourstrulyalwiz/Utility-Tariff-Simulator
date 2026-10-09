export function fmt(n: number | null | undefined, d = 2): string {
  if (n === null || n === undefined) return "Not provided";
  return new Intl.NumberFormat("en", { maximumFractionDigits: d, minimumFractionDigits: 0 }).format(n);
}
export function when(s?: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}
export function errMsg(e: unknown): string {
  const x = e as { status?: number; data?: { error?: string; message?: string }; message?: string } | null;
  if (x?.status === 401) return "Please sign in to do this.";
  if (x?.status === 409) return "Someone saved a newer version. Reload the page to see the latest, then reapply your edits.";
  return x?.data?.error || x?.data?.message || x?.message || "Something went wrong. Please try again.";
}
export const spanOk = (s: number, e: number) => e >= s && e - s + 1 <= 30;
