import { createFileRoute, redirect } from "@tanstack/react-router";

// Second shortcut: /dashboard opens the admin too.
export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/admin", replace: true });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
});
