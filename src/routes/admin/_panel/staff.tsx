import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminPageHeader, adminHead } from "@/components/admin/admin-page";
import { StaffManager } from "@/components/admin/staff-manager";
import { canAccess } from "@/lib/admin-access";

export const Route = createFileRoute("/admin/_panel/staff")({
  beforeLoad: ({ context }) => {
    if (!canAccess(context.roles, "staff")) throw redirect({ to: "/admin" });
  },
  head: () => adminHead("Staff", "Manage who can access the admin and their roles."),
  component: StaffPage,
});

function StaffPage() {
  const { adminUser } = Route.useRouteContext();
  return (
    <>
      <AdminPageHeader
        title="Staff"
        description="Manage who can access the admin and their roles."
      />
      <StaffManager currentUserId={adminUser.id} />
    </>
  );
}
