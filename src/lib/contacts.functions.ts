import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Explicitly link a contact record to a real user account.
 *
 * Portal access for contractors/conveyancers is granted by this link only —
 * never by an unverified email match. The caller must be able to see (and
 * therefore administer) the contact under RLS.
 */
export const linkContactToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { contactId: string; email: string | null }) => {
    if (!input.contactId) throw new Error("contactId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // RLS check: caller must have write access to this contact.
    const { data: contact, error: readError } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", data.contactId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!contact) throw new Error("Contact not found or not yours to manage");

    // Unlink
    if (!data.email) {
      const { error } = await supabase
        .from("contacts")
        .update({ user_id: null, linked_at: null })
        .eq("id", data.contactId);
      if (error) throw new Error(error.message);
      return { linked: false as const };
    }

    const email = data.email.trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find the account by email. Only an existing, registered account can be linked.
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) throw new Error(listError.message);
    const match = list.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (!match) {
      throw new Error("No Estately account uses that email yet — ask them to sign up first.");
    }

    const { error } = await supabase
      .from("contacts")
      .update({ user_id: match.id, linked_at: new Date().toISOString() })
      .eq("id", data.contactId);
    if (error) throw new Error(error.message);

    return { linked: true as const, userId: match.id };
  });
