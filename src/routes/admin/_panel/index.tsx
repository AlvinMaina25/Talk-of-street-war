import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarDays,
  History,
  Inbox,
  Package,
  PackageX,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

import { AdminPageHeader, adminHead } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LOW_STOCK_THRESHOLD } from "@/data/products";
import { fetchActivity, fetchDashboardStats, fetchRecentOrders } from "@/lib/dashboard-api";
import type { OrderStatus } from "@/lib/orders-api";

export const Route = createFileRoute("/admin/_panel/")({
  head: () => adminHead("Dashboard", "Overview of the TALK OF store."),
  component: Dashboard,
});

const REFRESH_MS = 30_000;
const formatKes = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  confirmed: "secondary",
  delivered: "outline",
  cancelled: "destructive",
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

function Dashboard() {
  const { adminUser } = Route.useRouteContext();
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: REFRESH_MS,
  });
  const orders = useQuery({
    queryKey: ["dashboard-recent-orders"],
    queryFn: () => fetchRecentOrders(),
    refetchInterval: REFRESH_MS,
  });
  const activity = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () => fetchActivity(),
    refetchInterval: REFRESH_MS,
  });

  const s = stats.data;
  const cards: {
    label: string;
    value?: number;
    hint?: string;
    icon: LucideIcon;
    to: "/admin/products" | "/admin/orders";
    alert?: boolean;
  }[] = [
    {
      label: "Total products",
      value: s?.totalProducts,
      hint: s ? `${s.activeProducts} visible in the shop` : undefined,
      icon: Package,
      to: "/admin/products",
    },
    {
      label: "Sold out",
      value: s?.soldOut,
      hint: "Every size at 0",
      icon: PackageX,
      to: "/admin/products",
      alert: !!s?.soldOut,
    },
    {
      label: "Low stock",
      value: s?.lowStock,
      hint: `${LOW_STOCK_THRESHOLD} or fewer in a size`,
      icon: AlertTriangle,
      to: "/admin/products",
      alert: !!s?.lowStock,
    },
    {
      label: "New orders",
      value: s?.newOrders,
      hint: "Waiting to be confirmed",
      icon: Inbox,
      to: "/admin/orders",
      alert: !!s?.newOrders,
    },
    {
      label: "Orders this month",
      value: s?.ordersThisMonth,
      hint: "Excludes cancelled",
      icon: CalendarDays,
      to: "/admin/orders",
    },
  ];

  return (
    <>
      <AdminPageHeader title="Dashboard" description={`Welcome back, ${adminUser.email}.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Card className="h-full transition-colors hover:bg-accent/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.label}
                </CardTitle>
                <c.icon
                  className={`size-4 ${c.alert ? "text-destructive" : "text-muted-foreground"}`}
                />
              </CardHeader>
              <CardContent>
                {stats.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : stats.error ? (
                  <p className="text-2xl font-semibold text-muted-foreground">—</p>
                ) : (
                  <p className="text-2xl font-semibold">{c.value ?? 0}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{c.hint ?? "\u00a0"}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {stats.error && (
        <p className="mt-3 text-sm text-destructive">
          Couldn't load the summary: {(stats.error as Error).message}{" "}
          <button className="underline" onClick={() => stats.refetch()}>
            Try again
          </button>
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recent orders</CardTitle>
              <CardDescription>The latest orders placed in the shop.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {orders.isLoading ? (
              <ListSkeleton />
            ) : orders.error ? (
              <ErrorLine
                message={(orders.error as Error).message}
                onRetry={() => orders.refetch()}
              />
            ) : !orders.data?.length ? (
              <EmptyLine
                icon={ShoppingBag}
                text="No orders yet. They'll appear here as customers order."
              />
            ) : (
              <ul className="divide-y">
                {orders.data.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {o.order_no} · {o.customer_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatKes(o.total)} · {timeAgo(o.created_at)}
                      </p>
                    </div>
                    <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>Product, stock and order changes, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.isLoading ? (
              <ListSkeleton />
            ) : activity.error ? (
              <ErrorLine
                message={`${(activity.error as Error).message}. Has admin-staff-activity-setup.sql been run?`}
                onRetry={() => activity.refetch()}
              />
            ) : !activity.data?.length ? (
              <EmptyLine
                icon={History}
                text="No activity yet. Changes to products, stock and orders will show up here."
              />
            ) : (
              <ul className="divide-y">
                {activity.data.map((a) => (
                  <li key={a.id} className="py-3">
                    <p className="text-sm">{a.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.actor_email ?? (a.entity_type === "order" ? "Customer" : "System")} ·{" "}
                      {timeAgo(a.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function EmptyLine({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
      <Icon className="size-6" />
      <p className="max-w-xs">{text}</p>
    </div>
  );
}

function ErrorLine({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-2 py-6 text-center text-sm">
      <p className="text-destructive">Could not load: {message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
