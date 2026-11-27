import { Link, useRouterState } from "@tanstack/react-router";
import {
  FileText,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { canAccess, type AdminRole, type AdminSection } from "@/lib/admin-access";

type NavItem = {
  title: string;
  to: "/admin" | "/admin/products" | "/admin/orders" | "/admin/site-content" | "/admin/staff";
  section: AdminSection;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", to: "/admin", section: "dashboard", icon: LayoutDashboard },
  { title: "Products", to: "/admin/products", section: "products", icon: Package },
  { title: "Orders", to: "/admin/orders", section: "orders", icon: ShoppingBag },
  { title: "Site Content", to: "/admin/site-content", section: "content", icon: FileText },
  { title: "Staff", to: "/admin/staff", section: "staff", icon: Users },
];

export function AdminSidebar({ roles }: { roles: AdminRole[] }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV_ITEMS.filter((item) => canAccess(roles, item.section));
  const isActive = (to: string) =>
    to === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(to);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
        <Link to="/admin" className="flex items-center gap-2 px-2 text-sm font-semibold">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
            TO
          </span>
          <span className="truncate group-data-[collapsible=icon]:hidden">TALK OF Admin</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.title}>
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
