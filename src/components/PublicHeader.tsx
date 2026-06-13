import { Link } from "@tanstack/react-router";
import { Home, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const nav = [
  { to: "/marketplace", label: "Marketplace" },
  { to: "/agencies", label: "Agencies" },
  { to: "/for-agents", label: "For Agents" },
  { to: "/for-landlords", label: "For Landlords" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="brand-gradient inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-foreground">
            <Home className="h-4 w-4" />
          </span>
          HMOFlow
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition"
              activeProps={{ className: "px-3 py-2 text-sm rounded-md font-medium text-foreground bg-muted" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
          <Button asChild size="sm"><Link to="/auth" search={{ mode: "signup" } as never}>Get started</Link></Button>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon"><Menu /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px]">
            <div className="mt-8 flex flex-col gap-1">
              {nav.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="px-3 py-3 rounded-md hover:bg-muted">{n.label}</Link>
              ))}
              <div className="mt-4 flex flex-col gap-2">
                <Button asChild variant="outline"><Link to="/auth" onClick={() => setOpen(false)}>Sign in</Link></Button>
                <Button asChild><Link to="/auth" onClick={() => setOpen(false)}>Get started</Link></Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
