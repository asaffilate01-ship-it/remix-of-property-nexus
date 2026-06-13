import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { ListingCard } from "@/components/ListingCard";
import { fetchAgency } from "@/lib/public.functions";

export const Route = createFileRoute("/agencies/$slug")({
  loader: async ({ params }) => {
    try { return await fetchAgency({ data: { slug: params.slug } }); }
    catch { return { agency: null, listings: [] }; }
  },
  head: ({ params, loaderData }) => {
    const a = (loaderData as { agency?: { name?: string; description?: string; logo_url?: string } } | undefined)?.agency;
    const url = `https://proptest.313test.co.uk/agencies/${params.slug}`;
    const title = a?.name ? `${a.name} — Estately` : "Agency — Estately";
    const desc = a?.description?.slice(0, 155) ?? `Browse listings from ${a?.name ?? "this agency"} on Estately.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:type", content: "profile" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        ...(a?.logo_url ? [{ property: "og:image", content: a.logo_url }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: AgencyPage,
});

function AgencyPage() {
  const { slug } = useParams({ from: "/agencies/$slug" });
  const fn = useServerFn(fetchAgency);
  const { data, isLoading } = useQuery({ queryKey: ["agency", slug], queryFn: () => fn({ data: { slug } }) });

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        {isLoading ? <div className="container mx-auto p-8">Loading…</div> : !data?.agency ? <div className="container mx-auto p-8">Agency not found.</div> : (
          <>
            <section className="brand-gradient text-white">
              <div className="container mx-auto px-4 py-12 flex items-center gap-6">
                <div className="h-20 w-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold overflow-hidden">
                  {data.agency.logo_url ? <img src={data.agency.logo_url} alt="" className="h-full w-full object-cover" /> : data.agency.name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{data.agency.name}</h1>
                  {data.agency.city && <div className="text-white/80">{data.agency.city}</div>}
                </div>
              </div>
            </section>
            <section className="container mx-auto px-4 py-10">
              {data.agency.description && <p className="max-w-3xl mb-10 text-muted-foreground">{data.agency.description}</p>}
              <h2 className="text-xl font-semibold mb-4">Listings ({data.listings.length})</h2>
              {data.listings.length ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.listings.map((l) => <ListingCard key={l.id} l={l as never} />)}
                </div>
              ) : <div className="text-muted-foreground">No active listings.</div>}
            </section>
          </>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
