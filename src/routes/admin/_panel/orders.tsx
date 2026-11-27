import { createFileRoute, redirect } from "@tanstack/react-router";

import { adminHead } from "@/components/admin/admin-page";
import { OrdersManager } from "@/components/admin/orders-manager";
import { canAccess } from "@/lib/admin-access";

export const Route = createFileRoute("/admin/_panel/orders")({
  beforeLoad: ({ context }) => {
    if (!canAccess(context.roles, "orders")) throw redirect({ to: "/admin" });
  },
  head: () => adminHead("Orders", "Track and fulfil customer orders."),
  component: OrdersPage,
});

function OrdersPage() {
  const { roles } = Route.useRouteContext();
  return <OrdersManager roles={roles} />;
}
