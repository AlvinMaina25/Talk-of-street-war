// Owner-only staff management. These run on the server so the service-role key never
// reaches the browser. Each call: (1) verifies the caller's session via requireSupabaseAuth,
// (2) confirms the caller is an active owner, (3) only then uses the service-role client.
// Expected failures are returned as { ok: false, error } so the UI can show a clean toast.
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StaffResult<T extends object = object> =
  ({ ok: true } & T) | { ok: false; error: string };

const assignableRole = z.enum(["manager", "staff"]); // owner is never assignable from the app
const emailSchema = z.string().trim().toLowerCase().email().max(255);

type OwnerContext = {
  supabase: {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "owner" },
    ) => PromiseLike<{ data: boolean | null; error: unknown }>;
  };
  userId: string;
};

async function isOwner(context: OwnerContext): Promise<boolean> {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "owner",
  });
  return !error && data === true;
}

async function adminClient(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

const NOT_OWNER = { ok: false, error: "Only the store owner can manage staff." } as const;

/** Finds an auth user by email (small user base: staff only, public sign-up is off). */
async function findUserByEmail(admin: SupabaseClient, email: string) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ email: emailSchema, role: assignableRole }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StaffResult<{ status: "invited" | "granted" }>> => {
    if (!(await isOwner(context as unknown as OwnerContext))) return NOT_OWNER;
    const admin = await adminClient();

    // Existing account (e.g. an earlier invite or a removed team member).
    const existing = await findUserByEmail(admin, data.email);
    if (existing) {
      const { data: rows, error } = await admin
        .from("user_roles")
        .select("id")
        .eq("user_id", existing.id)
        .limit(1);
      if (error) return { ok: false, error: "Could not check the existing account." };
      if (rows?.length)
        return {
          ok: false,
          error: "That person is already on the team. Change their role or reactivate them below.",
        };
      const { error: insErr } = await admin
        .from("user_roles")
        .insert({ user_id: existing.id, role: data.role, is_active: true });
      if (insErr) return { ok: false, error: "Could not grant access." };
      return { ok: true, status: "granted" };
    }

    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const origin = request.headers.get("origin") ?? new URL(request.url).origin;

    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      data.email,
      {
        redirectTo: `${origin}/admin/reset-password`,
      },
    );
    if (inviteErr || !invited.user) {
      console.error("inviteStaff: invite failed", inviteErr?.message);
      return {
        ok: false,
        error:
          "Could not send the invitation. Check the email address and your email settings, then try again.",
      };
    }

    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: invited.user.id, role: data.role, is_active: true });
    if (roleErr) {
      console.error("inviteStaff: role insert failed", roleErr.message);
      await admin.auth.admin.deleteUser(invited.user.id); // don't leave an account with no role
      return {
        ok: false,
        error: "Could not save the role, so the invitation was cancelled. Please try again.",
      };
    }
    return { ok: true, status: "invited" };
  });

export const changeStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), role: assignableRole }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StaffResult> => {
    if (!(await isOwner(context as unknown as OwnerContext))) return NOT_OWNER;
    if (data.userId === context.userId)
      return { ok: false, error: "You can't change your own role." };
    const admin = await adminClient();

    const { data: rows, error } = await admin
      .from("user_roles")
      .select("id, role")
      .eq("user_id", data.userId);
    if (error) return { ok: false, error: "Could not load that team member." };
    if (!rows?.length) return { ok: false, error: "That person isn't on the team." };
    if (rows.some((r) => r.role === "owner"))
      return { ok: false, error: "The owner's role can't be changed." };

    const keep = rows.find((r) => r.role === data.role) ?? rows[0];
    if (keep.role !== data.role) {
      const { error: updErr } = await admin
        .from("user_roles")
        .update({ role: data.role })
        .eq("id", keep.id);
      if (updErr) return { ok: false, error: "Could not change the role." };
    }
    const extra = rows.filter((r) => r.id !== keep.id).map((r) => r.id);
    if (extra.length) await admin.from("user_roles").delete().in("id", extra);
    return { ok: true };
  });

export const setStaffActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<StaffResult> => {
    if (!(await isOwner(context as unknown as OwnerContext))) return NOT_OWNER;
    if (data.userId === context.userId)
      return { ok: false, error: "You can't deactivate your own account." };
    const admin = await adminClient();

    const { data: rows, error } = await admin
      .from("user_roles")
      .select("id, role")
      .eq("user_id", data.userId);
    if (error) return { ok: false, error: "Could not load that team member." };
    if (!rows?.length) return { ok: false, error: "That person isn't on the team." };
    if (rows.some((r) => r.role === "owner"))
      return { ok: false, error: "The owner can't be deactivated." };

    // Role rows first: has_role() stops counting them immediately, which blocks all data access.
    const { error: updErr } = await admin
      .from("user_roles")
      .update({ is_active: data.active })
      .eq("user_id", data.userId);
    if (updErr) return { ok: false, error: "Could not update this team member." };

    // Then stop them signing in (or allow it again). Their role is already blocked even if this fails.
    const { error: banErr } = await admin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.active ? "none" : "876000h",
    });
    if (banErr) console.error("setStaffActive: ban update failed", banErr.message);
    return { ok: true };
  });
