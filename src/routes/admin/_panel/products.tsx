import { createFileRoute, redirect } from "@tanstack/react-router";

import { adminHead } from "@/components/admin/admin-page";
import { ProductsManager } from "@/components/admin/products-manager";
import { canAccess } from "@/lib/admin-access";

export const Route = createFileRoute("/admin/_panel/products")({
  beforeLoad: ({ context }) => {
    if (!canAccess(context.roles, "products")) throw redirect({ to: "/admin" });
  },
  head: () => adminHead("Products", "Manage the items listed in your store."),
  component: ProductsPage,
});

function ProductsPage() {
  const { roles } = Route.useRouteContext();
  return <ProductsManager roles={roles} />;
}
