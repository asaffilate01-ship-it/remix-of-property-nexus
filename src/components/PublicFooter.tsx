import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/40 mt-16">
      <div className="container mx-auto px-4 py-12 grid gap-8 md:grid-cols-4 text-sm">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 font-bold text-base mb-2">
            <span className="brand-gradient inline-flex h-7 w-7 items-center justify-center rounded-md text-white"><Building2 className="h-3.5 w-3.5" /></span>
            Estately
          </div>
          <p className="text-muted-foreground">The complete property OS for modern estate and letting agencies.</p>
        </div>
        <div>
          <div className="font-medium mb-3">Marketplace</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/marketplace" className="hover:text-foreground">Browse listings</Link></li>
            <li><Link to="/agencies" className="hover:text-foreground">Find an agent</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">Platform</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/modules/sales" className="hover:text-foreground">Sales</Link></li>
            <li><Link to="/modules/lettings" className="hover:text-foreground">Lettings</Link></li>
            <li><Link to="/modules/hmo" className="hover:text-foreground">HMO</Link></li>
            <li><Link to="/modules/commercial" className="hover:text-foreground">Commercial</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">Account</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/for-agents" className="hover:text-foreground">For agents</Link></li>
            <li><Link to="/for-landlords" className="hover:text-foreground">For landlords</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Estately. All rights reserved.</div>
    </footer>
  );
}
