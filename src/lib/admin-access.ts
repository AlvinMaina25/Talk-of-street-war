// Admin role and section rules shared by the admin layout, route guards and tests.
// Database-side enforcement lives in RLS + public.has_role(); this module only decides
// what the admin UI shows and which admin routes a signed-in user may open.

export const ADMIN_ROLES = ["owner", "manager", "staff"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminSection = "dashboard" | "products" | "orders" | "content" | "staff";

export const SECTION_ACCESS: Record<AdminSection, readonly AdminRole[]> = {
  dashboard: ["owner", "manager", "staff"],
  products: ["owner", "manager", "staff"],
  orders: ["owner", "manager", "staff"],
  content: ["owner", "manager"],
  staff: ["owner"],
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && (ADMIN_ROLES as readonly string[]).includes(value);
}

export function canAccess(roles: readonly AdminRole[], section: AdminSection): boolean {
  return roles.some((role) => SECTION_ACCESS[section].includes(role));
}

/** Highest-ranked role, for display. */
export function primaryRole(roles: readonly AdminRole[]): AdminRole | null {
  return ADMIN_ROLES.find((role) => roles.includes(role)) ?? null;
}

/** Only allow post-login redirects back into the admin area on this site. */
export function safeAdminRedirect(value: unknown): string {
  if (typeof value !== "string") return "/admin";
  if (!value.startsWith("/admin") || value.startsWith("//") || value.includes("\\")) {
    return "/admin";
  }
  if (value.startsWith("/admin/login")) return "/admin";
  return value;
}
