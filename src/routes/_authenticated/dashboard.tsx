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
  head: () => ({ meta: [{ title: "Dashboard — Estately" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { role, name, userId, loading } = useUserRole();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 rounded-2xl bg-muted" />
        <div className="grid sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}
        </div>
      </div>
    );
  }

  switch (role) {
    case "admin": return <AdminDashboard name={name} />;
    case "agent": return <AgentDashboard name={name} />;
    case "tenant": return <TenantDashboard name={name} userId={userId} />;
    case "contractor": return <ContractorDashboard name={name} />;
    case "conveyancer": return <ConveyancerDashboard name={name} />;
    case "buyer": return <BuyerDashboard name={name} />;
    case "inventory_clerk":
    case "utility_provider":
      return <SimpleRoleDashboard role={role} name={name} />;
    case "landlord":
    default:
      return <LandlordDashboard name={name} />;
  }
}

