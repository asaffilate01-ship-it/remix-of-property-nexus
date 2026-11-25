import { Button } from "@/components/ui/button";

export function DashboardLoadState({ loading, retry }: { loading: boolean; retry: () => void }) {
  if (loading) {
    return (
      <div role="status" aria-live="polite" className="rounded-xl border bg-card p-6 sm:p-8 text-sm text-muted-foreground">
        Loading your workspace…
      </div>
    );
  }
  return (
    <section role="alert" className="space-y-3 rounded-xl border bg-card p-6 sm:p-8">
      <h1 className="text-lg font-semibold">Dashboard information unavailable</h1>
      <p className="text-sm text-muted-foreground">We could not verify the latest data. No figures are shown until the information loads.</p>
      <Button type="button" className="min-h-11" onClick={retry}>Try again</Button>
    </section>
  );
}
