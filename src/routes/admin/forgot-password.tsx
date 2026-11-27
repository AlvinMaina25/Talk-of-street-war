import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";

import { AdminAuthCard } from "@/components/admin/admin-auth-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { prepareOwnerAccount } from "@/lib/admin-auth.functions";

export const Route = createFileRoute("/admin/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set your password — TALK OF Admin" },
      { name: "description", content: "Get a link to set or reset your admin password." },
      { property: "og:title", content: "Set your password — TALK OF Admin" },
      { property: "og:description", content: "Get a link to set or reset your admin password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const prepare = useServerFn(prepareOwnerAccount);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await prepare({ data: { email: email.trim() } });
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch {
      setError("We couldn't send the email. Please try again in a minute.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminAuthCard
      title="Set or reset password"
      description="We'll email you a link to choose a new password."
    >
      {sent ? (
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              If that email belongs to an admin account, a link is on its way. Check your inbox and
              spam folder.
            </AlertDescription>
          </Alert>
          <Button asChild variant="outline" className="w-full">
            <Link to="/admin/login">Back to sign in</Link>
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending…" : "Send link"}
          </Button>
          <Link
            to="/admin/login"
            className="block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </AdminAuthCard>
  );
}
