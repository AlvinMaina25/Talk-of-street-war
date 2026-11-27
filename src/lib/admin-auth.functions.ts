import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// The store owner's login email. Public sign-up is disabled, so this is the one
// account the app may create on its own; the person still has to open the
// password link sent to this mailbox before they can sign in.
const OWNER_EMAIL = "alvinmaina2505@gmail.com";

/**
 * Called before sending a "set your password" email. For the owner email only,
 * makes sure an account exists so the email can be delivered. Every other email
 * is a no-op here (staff accounts are added by the owner).
 */
export const prepareOwnerAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(255) }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.email !== OWNER_EMAIL) return { ok: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: OWNER_EMAIL,
      email_confirm: true,
    });
    if (error && !/already|exists|registered/i.test(error.message)) {
      console.error("prepareOwnerAccount failed", error.message);
    }
    return { ok: true };
  });
