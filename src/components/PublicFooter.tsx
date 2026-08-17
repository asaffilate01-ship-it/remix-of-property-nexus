import gableyLogo from "@/assets/gabley-logo.png.asset.json";
import { Link } from "@tanstack/react-router";
import { Twitter, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";

const SOCIALS = [
  { href: "https://x.com/gabley", label: "X (Twitter)", Icon: Twitter },
  { href: "https://facebook.com/gabley", label: "Facebook", Icon: Facebook },
  { href: "https://instagram.com/gabley", label: "Instagram", Icon: Instagram },
  { href: "https://youtube.com/@gabley", label: "YouTube", Icon: Youtube },
  { href: "https://linkedin.com/company/gabley", label: "LinkedIn", Icon: Linkedin },
];

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/40 mt-16">
      <div className="container mx-auto px-4 py-12 grid gap-8 md:grid-cols-5 text-sm">
        <div className="md:col-span-2">
          <img src={gableyLogo.url} alt="Gabley" className="h-8 w-auto mb-3" />
          <p className="text-muted-foreground max-w-sm">Where property comes together. Sales, lettings, HMO and commercial in one workspace.</p>
          <div className="mt-4 flex items-center gap-2">
            {SOCIALS.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <div className="font-medium mb-3">Marketplace</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/marketplace" className="hover:text-foreground">Browse listings</Link></li>
            <li><Link to="/property-for-sale" className="hover:text-foreground">Property for sale</Link></li>
            <li><Link to="/property-to-rent" className="hover:text-foreground">Property to rent</Link></li>
            <li><Link to="/area-guides" className="hover:text-foreground">UK area guides</Link></li>
            <li><Link to="/agencies" className="hover:text-foreground">Find an agent</Link></li>

          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">Platform</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/modules/$slug" params={{ slug: "sales" }} className="hover:text-foreground">Sales</Link></li>
            <li><Link to="/modules/$slug" params={{ slug: "lettings" }} className="hover:text-foreground">Lettings</Link></li>
            <li><Link to="/modules/$slug" params={{ slug: "hmo" }} className="hover:text-foreground">HMO</Link></li>
            <li><Link to="/modules/$slug" params={{ slug: "commercial" }} className="hover:text-foreground">Commercial</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-medium mb-3">Legal</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/terms" className="hover:text-foreground">Terms of service</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy policy</Link></li>
            <li><Link to="/cookies" className="hover:text-foreground">Cookie policy</Link></li>
            <li><Link to="/complaints" className="hover:text-foreground">Complaints</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-6 text-center text-xs text-muted-foreground px-4">
        © {new Date().getFullYear()} Gabley Ltd. All rights reserved. Regulated by Property Ombudsman & ICO registered.
      </div>
    </footer>
  );
}
