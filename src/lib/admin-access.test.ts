import { describe, expect, it } from "vitest";

import { canAccess, primaryRole, safeAdminRedirect } from "@/lib/admin-access";

describe("admin section access", () => {
  it("owner can open every section", () => {
    for (const s of ["dashboard", "products", "orders", "content", "staff"] as const) {
      expect(canAccess(["owner"], s)).toBe(true);
    }
  });

  it("manager can open everything except Staff", () => {
    expect(canAccess(["manager"], "content")).toBe(true);
    expect(canAccess(["manager"], "products")).toBe(true);
    expect(canAccess(["manager"], "staff")).toBe(false);
  });

  it("staff can open Dashboard, Products and Orders only", () => {
    expect(canAccess(["staff"], "dashboard")).toBe(true);
    expect(canAccess(["staff"], "products")).toBe(true);
    expect(canAccess(["staff"], "orders")).toBe(true);
    expect(canAccess(["staff"], "content")).toBe(false);
    expect(canAccess(["staff"], "staff")).toBe(false);
  });

  it("a user with no role can open nothing", () => {
    expect(canAccess([], "dashboard")).toBe(false);
  });

  it("shows the highest role", () => {
    expect(primaryRole(["staff", "owner"])).toBe("owner");
  });
});

describe("post-login redirect", () => {
  it("keeps admin paths and rejects anything outside the admin area", () => {
    expect(safeAdminRedirect("/admin/orders")).toBe("/admin/orders");
    expect(safeAdminRedirect("https://evil.example/admin")).toBe("/admin");
    expect(safeAdminRedirect("//evil.example")).toBe("/admin");
    expect(safeAdminRedirect("/shop")).toBe("/admin");
    expect(safeAdminRedirect(undefined)).toBe("/admin");
  });
});
