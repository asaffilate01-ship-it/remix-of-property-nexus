import { Phone, Mail, MessageCircle } from "lucide-react";

type Props = {
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  message?: string;
  size?: "sm" | "md";
};

function digits(s: string) { return s.replace(/[^0-9+]/g, ""); }

/**
 * One-tap WhatsApp / call / email buttons.
 * Renders icon-only buttons for tight card layouts.
 */
export function QuickContactActions({ phone, email, whatsapp, message, size = "sm" }: Props) {
  const wa = whatsapp ?? phone;
  const text = encodeURIComponent(message ?? "Hi, I'd like to get in touch.");
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (!phone && !email && !wa) return null;

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {wa && (
        <a
          href={`https://wa.me/${digits(wa).replace(/^\+/, "")}?text=${text}`}
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className={`${dim} rounded-md inline-flex items-center justify-center bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] transition-colors`}
        >
          <MessageCircle className={icon} />
        </a>
      )}
      {phone && (
        <a
          href={`tel:${digits(phone)}`}
          aria-label="Call"
          className={`${dim} rounded-md inline-flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary transition-colors`}
        >
          <Phone className={icon} />
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          aria-label="Email"
          className={`${dim} rounded-md inline-flex items-center justify-center bg-muted hover:bg-muted/80 text-foreground transition-colors`}
        >
          <Mail className={icon} />
        </a>
      )}
    </div>
  );
}
