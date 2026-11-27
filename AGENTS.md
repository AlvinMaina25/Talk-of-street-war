<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.

<!-- LOVABLE:END -->

## Project rules

- Admin lives under `src/routes/admin/`: public auth pages (`login`, `forgot-password`, `reset-password`) sit beside the pathless `_panel` layout, whose client-only `beforeLoad` gates every other admin page. Why: the session is in browser storage, so the server cannot gate during SSR.
- Admin section visibility comes from `SECTION_ACCESS` in `src/lib/admin-access.ts`; each `_panel` child re-checks it in `beforeLoad`. Why: one source for sidebar and route guards.
- Roles live only in `public.user_roles` and are checked with `public.has_role()`; owner bootstrap is `public.claim_owner_role()` reading the verified email from `auth.users`. Why: never trust profile or client-supplied role data.
- `__root.tsx` skips the storefront header/footer/WhatsApp button on `/admin*`. Why: admin has its own layout and must not alter the storefront.
- Staff management is owner-only and runs through server functions in `src/lib/staff.functions.ts` (service role stays server-side; they verify the caller with `requireSupabaseAuth` + `has_role(owner)` first). The UI lists staff via the owner-only `list_staff()` RPC. Why: auth emails and role writes must never be reachable from the browser.
- Deactivating staff sets `user_roles.is_active = false` (and bans the auth user); `has_role()` ignores inactive rows, so every RLS policy blocks them at once. The owner role can't be changed, removed or deactivated (server functions + `protect_owner_role` trigger). Why: the owner must never be lockable out.
- `activity_log` is written only by triggers (products, stock, orders) and is read-only for staff. Why: an audit trail nobody can edit through the API.
- One `<Toaster />` lives in `src/routes/admin/_panel/route.tsx`; don't mount another in admin pages.
- SQL run order: products, stock, orders, site-settings, admin-staff-activity setup files; then `rls-check.sql` to verify every role.
