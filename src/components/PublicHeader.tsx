import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, Menu, ChevronDown, Search, Bookmark, Calculator, Banknote, MapPin, ClipboardCheck, Briefcase, Users, BookOpen, Info, Mail, Tag, LogOut, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Item = { to: string; label: string; desc?: string; icon: typeof Search };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  {
    label: "Buy & rent",
    items: [
      { to: "/marketplace", label: "Marketplace", desc: "Sales, lettings, HMO & commercial", icon: Search },
      { to: "/saved-searches", label: "Saved searches", desc: "Alerts when new homes match", icon: Bookmark },
      { to: "/area-guides", label: "Area guides", desc: "Schools, transport, prices", icon: MapPin },
      { to: "/blog", label: "Blog & insight", desc: "Market data, compliance, product news", icon: BookOpen },
    ],
  },
  {
    label: "Mortgages & money",
    items: [
      { to: "/valuation", label: "Instant valuation", desc: "What's your property worth?", icon: Calculator },
      { to: "/mortgage", label: "Mortgages", desc: "Compare rates & affordability", icon: Banknote },
      { to: "/referencing", label: "Tenant referencing", desc: "Pass faster, rent sooner", icon: ClipboardCheck },
    ],
  },
  {
    label: "For business",
    items: [
      { to: "/business", label: "For agents & landlords", desc: "All-in-one CRM, compliance & marketplace", icon: Briefcase },
      { to: "/agencies", label: "Agencies directory", desc: "Verified UK agents", icon: Users },
      { to: "/pricing", label: "Pricing", desc: "From £29.99 per branch — 30 days free", icon: Tag },
    ],
  },
  {
    label: "Company",
    items: [
      { to: "/about", label: "About Estately", desc: "Our story and team", icon: Info },
      { to: "/contact", label: "Contact us", desc: "Talk to sales or support", icon: Mail },
    ],
  },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(!!data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await qc.cancelQueries();
      qc.clear();
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      setOpen(false);
      navigate({ to: "/auth", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign out failed");
    }
  };
  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="brand-gradient inline-flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm">
            <Building2 className="h-4 w-4" />
          </span>
          <span className="tracking-tight">Estately</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <Link
            to="/marketplace"
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition"
            activeProps={{ className: "px-3 py-2 text-sm rounded-md font-medium text-foreground bg-muted" }}
          >
            Marketplace
          </Link>
          {groups.map((g) => (
            <DropdownMenu key={g.label}>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition">
                  {g.label}
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">{g.label}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {g.items.map((it) => (
                  <DropdownMenuItem key={it.to} asChild className="cursor-pointer py-2.5">
                    <Link to={it.to} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
                        <it.icon className="h-4 w-4 text-foreground" />
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="text-sm font-medium leading-tight">{it.label}</span>
                        {it.desc && <span className="text-xs text-muted-foreground leading-snug mt-0.5">{it.desc}</span>}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {signedIn ? (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/dashboard"><LayoutDashboard className="h-4 w-4 mr-1.5" />Dashboard</Link></Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}><LogOut className="h-4 w-4 mr-1.5" />Sign out</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
              <Button asChild size="sm"><Link to="/auth" search={{ mode: "signup" } as never}>Get started</Link></Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu"><Menu /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px] p-0 flex flex-col">
            <div className="flex-1 overflow-y-auto pt-12 pb-4">
              <div className="px-4 pb-3">
                <Link
                  to="/marketplace"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg border bg-card px-3 py-3"
                >
                  <span className="brand-gradient inline-flex h-9 w-9 items-center justify-center rounded-md text-white">
                    <Search className="h-4 w-4" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">Browse the marketplace</span>
                    <span className="text-xs text-muted-foreground">Sales · Lettings · HMO · Commercial</span>
                  </span>
                </Link>
              </div>
              {groups.map((g) => (
                <div key={g.label} className="px-4 mt-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold px-1 py-1.5">{g.label}</p>
                  <div className="flex flex-col">
                    {g.items.map((it) => (
                      <Link
                        key={it.to}
                        to={it.to}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-muted"
                      >
                        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
                          <it.icon className="h-4 w-4" />
                        </span>
                        <span className="flex flex-col min-w-0">
                          <span className="text-sm font-medium leading-tight">{it.label}</span>
                          {it.desc && <span className="text-xs text-muted-foreground leading-snug mt-0.5">{it.desc}</span>}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-3 flex flex-col gap-2 bg-background">
              <Button asChild variant="outline"><Link to="/auth" onClick={() => setOpen(false)}>Sign in</Link></Button>
              <Button asChild><Link to="/auth" search={{ mode: "signup" } as never} onClick={() => setOpen(false)}>Get started</Link></Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
