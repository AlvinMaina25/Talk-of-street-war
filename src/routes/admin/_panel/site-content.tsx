import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminPageHeader, adminHead } from "@/components/admin/admin-page";
import { SiteContentManager } from "@/components/admin/site-content-manager";
import { canAccess } from "@/lib/admin-access";

export const Route = createFileRoute("/admin/_panel/site-content")({
  beforeLoad: ({ context }) => {
    if (!canAccess(context.roles, "content")) throw redirect({ to: "/admin" });
  },
  head: () => adminHead("Site Content", "Edit text and images shown on the storefront."),
  component: SiteContentPage,
});

function SiteContentPage() {
  return (
    <>
      <AdminPageHeader
        title="Site Content"
        description="Edit text and images shown on the storefront."
      />
      <SiteContentManager />
    </>
  );
}
