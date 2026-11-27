import { createFileRoute, redirect } from "@tanstack/react-router";

// /admin/dashboard is an alias: the dashboard itself lives at /admin (the panel's index route).
export const Route = createFileRoute("/admin/_panel/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/admin", replace: true });
  },
});
