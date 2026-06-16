import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createRentCheckoutSession } from "@/lib/payments.functions";

interface Props {
  rentScheduleId: string | null;
  onClose: () => void;
}

export function RentCheckoutDialog({ rentScheduleId, onClose }: Props) {
  const open = !!rentScheduleId;

  const fetchClientSecret = async (): Promise<string> => {
    const returnUrl = `${window.location.origin}/portal/tenant?paid={CHECKOUT_SESSION_ID}`;
    const result = await createRentCheckoutSession({
      data: { rentScheduleId: rentScheduleId!, returnUrl, environment: getStripeEnvironment() },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("No client secret returned");
    return result.clientSecret;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Pay rent</DialogTitle></DialogHeader>
        {open && (
          <div id="checkout">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
