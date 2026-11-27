import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, UserPlus, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  STAFF_KEY,
  changeRole,
  fetchStaff,
  invite,
  setActive,
  type StaffMember,
} from "@/lib/staff-api";

type AssignableRole = "manager" | "staff";
const ROLE_LABEL: Record<string, string> = { owner: "Owner", manager: "Manager", staff: "Staff" };
const ROLE_HELP: Record<AssignableRole, string> = {
  manager: "Products, orders and site content.",
  staff: "Products (view), stock and orders. No site content.",
};

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
    : "Never";

export function StaffManager({ currentUserId }: { currentUserId: string }) {
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toToggle, setToToggle] = useState<StaffMember | null>(null);

  const {
    data: staff = [],
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: STAFF_KEY, queryFn: fetchStaff });
  const refresh = () => queryClient.invalidateQueries({ queryKey: STAFF_KEY });

  const roleMutation = useMutation({
    mutationFn: (v: { member: StaffMember; role: AssignableRole }) =>
      changeRole(v.member.user_id, v.role),
    onSuccess: (_d, v) => {
      toast.success(`${v.member.email} is now ${ROLE_LABEL[v.role].toLowerCase()}`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMutation = useMutation({
    mutationFn: (v: { member: StaffMember; active: boolean }) =>
      setActive(v.member.user_id, v.active),
    onSuccess: (_d, v) => {
      toast.success(v.active ? `${v.member.email} reactivated` : `${v.member.email} deactivated`);
      setToToggle(null);
      refresh();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setToToggle(null);
    },
  });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus /> Invite staff
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead className="w-44">Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Last sign-in</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 3 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {error && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm">
                    <p className="text-destructive">
                      Could not load staff: {(error as Error).message}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Has admin-staff-activity-setup.sql been run?
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                      Try again
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && staff.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    <Users className="mx-auto mb-2 size-6" />
                    No team members yet. Invite someone to get started.
                  </TableCell>
                </TableRow>
              )}
              {staff.map((m) => {
                const isOwner = m.role === "owner";
                const isSelf = m.user_id === currentUserId;
                const locked = isOwner || isSelf; // owner role and your own account can't be changed here
                return (
                  <TableRow key={m.user_id} className={m.is_active ? "" : "opacity-60"}>
                    <TableCell className="font-medium">
                      {m.email}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                    </TableCell>
                    <TableCell>
                      {locked ? (
                        <Badge variant={isOwner ? "default" : "secondary"}>
                          {ROLE_LABEL[m.role]}
                        </Badge>
                      ) : (
                        <Select
                          value={m.role}
                          disabled={roleMutation.isPending || !m.is_active}
                          onValueChange={(v) =>
                            v !== m.role &&
                            roleMutation.mutate({ member: m, role: v as AssignableRole })
                          }
                        >
                          <SelectTrigger className="h-8" aria-label={`Role for ${m.email}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {!m.is_active ? (
                        <Badge variant="destructive">Deactivated</Badge>
                      ) : m.accepted ? (
                        <Badge variant="outline">Active</Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Mail className="mr-1 size-3" /> Invited
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {formatDate(m.last_sign_in_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {locked ? (
                        <span className="text-xs text-muted-foreground">
                          {isOwner ? "Protected" : "—"}
                        </span>
                      ) : (
                        <Button
                          variant={m.is_active ? "ghost" : "outline"}
                          size="sm"
                          disabled={activeMutation.isPending}
                          onClick={() => setToToggle(m)}
                        >
                          {m.is_active ? "Deactivate" : "Reactivate"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onDone={refresh} />

      <AlertDialog open={!!toToggle} onOpenChange={(o) => !o && setToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toToggle?.is_active ? "Deactivate" : "Reactivate"} {toToggle?.email}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toToggle?.is_active
                ? "They will lose access to the admin straight away and can't sign in. Their role is kept, so you can reactivate them later."
                : "They will get their previous role back and can sign in again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (toToggle)
                  activeMutation.mutate({ member: toToggle, active: !toToggle.is_active });
              }}
            >
              {activeMutation.isPending && <Loader2 className="animate-spin" />}
              {toToggle?.is_active ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AssignableRole>("staff");

  const mutation = useMutation({
    mutationFn: () => invite(email.trim().toLowerCase(), role),
    onSuccess: (res) => {
      toast.success(
        res.status === "invited"
          ? `Invitation sent to ${email.trim()}`
          : `${email.trim()} was added to the team`,
      );
      setEmail("");
      setRole("staff");
      onOpenChange(false);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  function submit(e: FormEvent) {
    e.preventDefault();
    if (validEmail && !mutation.isPending) mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Invite staff</DialogTitle>
            <DialogDescription>
              They'll get an email with a link to set their password and sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AssignableRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{ROLE_HELP[role]}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!validEmail || mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" /> : <Mail />}
              {mutation.isPending ? "Sending…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
