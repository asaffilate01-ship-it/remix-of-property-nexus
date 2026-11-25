import { createFileRoute } from "@tanstack/react-router";
import { useUserRole } from "@/hooks/useUserRole";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { AgentDashboard } from "@/components/dashboards/AgentDashboard";
import { LandlordDashboard } from "@/components/dashboards/LandlordDashboard";
import { TenantDashboard } from "@/components/dashboards/TenantDashboard";
import { ContractorDashboard } from "@/components/dashboards/ContractorDashboard";
import { ConveyancerDashboard } from "@/components/dashboards/ConveyancerDashboard";
import { BuyerDashboard } from "@/components/dashboards/BuyerDashboard";
import { SimpleRoleDashboard } from "@/components/dashboards/SimpleRoleDashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Gabley" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { role, name, userId, loading, error } = useUserRole();

  if (loading) {
    return (
      <div role="status" aria-label="Loading dashboard" className="space-y-6 motion-safe:animate-pulse">
        <div className="h-40 rounded-2xl bg-muted" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}
        </div>
      </div>
    );
  }

  switch (role) {
    case "admin": return <AdminDashboard name={name} />;
    case "agent": return <AgentDashboard name={name} />;
    case "tenant": return <TenantDashboard name={name} userId={userId} />;
    case "contractor": return <ContractorDashboard key={userId} name={name} />;
    case "conveyancer": return <ConveyancerDashboard key={userId} name={name} />;
    case "buyer": return <BuyerDashboard key={userId} name={name} />;
    case "inventory_clerk":
    case "utility_provider":
      return <SimpleRoleDashboard role={role} name={name} />;
    case "landlord": return <LandlordDashboard name={name} />;
    default:
      return (
        <section role="alert" className="rounded-xl border bg-card p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Workspace unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error ?? "No authorised dashboard is assigned to this account."}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 min-h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Retry</button>
        </section>
      );
  }
}

