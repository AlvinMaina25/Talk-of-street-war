import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import { AdminAuthCard } from "@/components/admin/admin-auth-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose a new password — TALK OF Admin" },
      { name: "description", content: "Choose a new password for your admin account." },
      { property: "og:title", content: "Choose a new password — TALK OF Admin" },
      { property: "og:description", content: "Choose a new password for your admin account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Read the hash before the auth client consumes it.
    // Password-reset emails use type=recovery; staff invitations use type=invite.
    const isRecovery = /type=(recovery|invite)/.test(window.location.hash);
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (isRecovery && session)) setStatus("ready");
    });
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setStatus((s) => (s === "ready" ? s : isRecovery && data.session ? "ready" : "invalid"));
    }, 1500);
    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The passwords don't match.");
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(
        /weak|pwned|leaked/i.test(updateError.message)
          ? "That password is too common. Please choose another."
          : "We couldn't update your password. Please request a new link.",
      );
      return;
    }
    navigate({ to: "/admin", replace: true });
  }

  return (
    <AdminAuthCard title="Choose a new password">
      {status === "checking" ? (
        <p className="text-sm text-muted-foreground">Checking your link…</p>
      ) : status === "invalid" ? (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>This link is invalid or has expired.</AlertDescription>
          </Alert>
          <Button asChild variant="outline" className="w-full">
            <Link to="/admin/forgot-password">Request a new link</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving…" : "Save password"}
          </Button>
        </form>
      )}
    </AdminAuthCard>
  );
}
