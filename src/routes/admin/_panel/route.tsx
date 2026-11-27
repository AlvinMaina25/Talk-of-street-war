import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { LogOut, ShieldAlert } from "lucide-react";
import { useEffect } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { isAdminRole, primaryRole, type AdminRole } from "@/lib/admin-access";
import { db } from "@/lib/products-api";

// Client-only gate for every /admin page except login and password pages.
// The session lives in browser storage, so the server cannot check it during SSR.
export const Route = createFileRoute("/admin/_panel")({
  ssr: false,
  beforeLoad: async ({ location, context }) => {
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;
    if (error || !user) {
      throw redirect({ to: "/admin/login", search: { redirect: location.href } });
    }

    const roles = await context.queryClient.ensureQueryData({
      queryKey: ["admin-roles", user.id],
      staleTime: 60_000,
      queryFn: async (): Promise<AdminRole[]> => {
        // Grants the owner role to the designated owner email on first sign-in.
        await supabase.rpc("claim_owner_role");
        // Deactivated staff keep their row but is_active = false, so they get no admin access.
        // Falls back to the plain query if admin-staff-activity-setup.sql hasn't been run yet.
        let result = await db.from("user_roles").select("role, is_active").eq("user_id", user.id);
        if (result.error?.code === "42703") {
          result = await db.from("user_roles").select("role").eq("user_id", user.id);
        }
        if (result.error) throw result.error;
        return ((result.data ?? []) as { role: unknown; is_active?: boolean }[])
          .filter((r) => r.is_active !== false)
          .map((r) => r.role)
          .filter(isAdminRole);
      },
    });

    return { adminUser: { id: user.id, email: user.email ?? "" }, roles };
  },
  component: AdminLayout,
});

function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  };
}

function AdminLayout() {
  const { adminUser, roles } = Route.useRouteContext();
  const router = useRouter();
  const signOut = useSignOut();
  const role = primaryRole(roles);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "USER_UPDATED") router.invalidate();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  if (!role) {
    return (
      <div className="admin-theme flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ShieldAlert className="size-8 text-muted-foreground" />
            <p className="font-medium">No admin access</p>
            <p className="text-sm text-muted-foreground">
              {adminUser.email} is signed in but hasn't been given a role yet. Ask the store owner
              to add you.
            </p>
            <Button variant="outline" onClick={signOut} className="mt-2">
              <LogOut /> Log out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-theme">
      {/* One toaster for every admin page (dashboard, products, orders, site content, staff). */}
      <Toaster />
      <SidebarProvider>
        <AdminSidebar roles={roles} />
        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
            <div className="ml-auto flex items-center gap-3">
              <Badge variant="secondary" className="capitalize">
                {role}
              </Badge>
              <span className="text-sm text-muted-foreground">{adminUser.email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut /> Log out
              </Button>
            </div>
          </header>
          <div className="flex-1 bg-muted/30 p-6 lg:p-8">
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
