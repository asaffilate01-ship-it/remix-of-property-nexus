import { Link } from "@tanstack/react-router";

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/40 mt-16">
      <div className="container mx-auto px-4 py-12 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <div className="font-bold text-base mb-2">HMOFlow</div>
          <p className="text-muted-foreground">The all-in-one HMO compliance, marketplace and agency CRM platform.</p>
        </div>
        <div>
          <div className="font-medium mb-3">Marketplace</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/marketplace" className="hover:text-foreground">Browse listings</Link></li>
            <li><Link to="/agencies" className="hover:text-foreground">Find an agent</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">For pros</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/for-agents" className="hover:text-foreground">For agents</Link></li>
            <li><Link to="/for-landlords" className="hover:text-foreground">For landlords</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">Account</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/auth" className="hover:text-foreground">Sign in</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Create account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} HMOFlow. Built on Lovable Cloud.</div>
    </footer>
  );
}
