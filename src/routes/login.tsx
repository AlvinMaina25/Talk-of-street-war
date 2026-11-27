import { createFileRoute, redirect } from "@tanstack/react-router";

// Short, easy-to-remember way into the admin: just visit /login.
// /admin already sends signed-out visitors to the sign-in page and signed-in staff to the dashboard.
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({ to: "/admin", replace: true });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
});
