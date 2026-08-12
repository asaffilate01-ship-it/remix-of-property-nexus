const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  // Payments are optional: when no checkout token is configured we simply hide
  // card payments instead of alarming tenants with an error banner.
  if (!clientToken) return null;

  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-sm text-orange-800">
        Payments are in test mode — use card 4242 4242 4242 4242 with any future expiry and CVC.
      </div>
    );
  }
  return null;
}
