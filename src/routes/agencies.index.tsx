import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { fetchAgencies } from "@/lib/public.functions";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/agencies/")({
  head: () => ({ meta: [{ title: "Agencies — Estately" }, { name: "description", content: "Find letting and sales agents on Estately." }] }),
  component: AgenciesPage,
});

function AgenciesPage() {
  const fn = useServerFn(fetchAgencies);
  const { data, isLoading } = useQuery({ queryKey: ["agencies"], queryFn: () => fn() });
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Agencies on Estately</h1>
        <p className="text-muted-foreground mb-8">Browse letting and sales agents.</p>
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-32 bg-muted rounded" />
                    <div className="h-4 w-24 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !data?.agencies.length ? (
          <div className="text-muted-foreground">No agencies yet — be the first.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.agencies.map((a) => (
              <Link key={a.id} to="/agencies/$slug" params={{ slug: a.slug }}>
                <Card className="border-0 shadow-card hover:shadow-lg transition h-full">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-muted overflow-hidden brand-gradient flex items-center justify-center text-white font-bold">
                      {a.logo_url ? <img src={a.logo_url} alt="" className="h-full w-full object-cover" /> : a.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{a.name}</div>
                      {a.city && <div className="text-sm text-muted-foreground">{a.city}</div>}
                      {a.description && <div className="text-xs text-muted-foreground line-clamp-1 mt-1">{a.description}</div>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
