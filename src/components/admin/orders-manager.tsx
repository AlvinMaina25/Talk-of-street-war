import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { AdminRole } from "@/lib/admin-access";
import { ORDER_STATUSES, type OrderRow, type OrderStatus } from "@/lib/orders-api";
import { db } from "@/lib/products-api";

const formatKes = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

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

export function OrdersManager({ roles }: { roles: readonly AdminRole[] }) {
  const canDelete = roles.includes("owner") || roles.includes("manager");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await db
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrderRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      return !q || `${o.order_no} ${o.customer_name} ${o.phone}`.toLowerCase().includes(q);
    });
  }, [orders, search, statusFilter]);

  const selected = orders.find((o) => o.id === openId) ?? null;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    // Status changes can move stock.
    queryClient.invalidateQueries({ queryKey: ["admin-stock"] });
    queryClient.invalidateQueries({ queryKey: ["store-products"] });
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bag enquiries placed from the storefront.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order no, name or phone"
                className="pl-9"
                aria-label="Search orders"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as "all" | OrderStatus)}
            >
              <SelectTrigger className="w-44" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading orders…
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-destructive">
                    Could not load orders: {(error as Error).message}. Has orders-setup.sql been
                    run?
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {orders.length === 0 ? "No orders yet." : "No orders match your filters."}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() => setOpenId(o.id)}
                  onKeyDown={(e) => e.key === "Enter" && setOpenId(o.id)}
                >
                  <TableCell className="font-medium">{o.order_no}</TableCell>
                  <TableCell>
                    <div>{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{o.phone}</div>
                  </TableCell>
                  <TableCell>{o.items.reduce((n, i) => n + i.qty, 0)}</TableCell>
                  <TableCell>{formatKes(o.total)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(o.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <OrderDetail
              key={selected.id}
              order={selected}
              canDelete={canDelete}
              onChanged={refresh}
              onDeleted={() => {
                setOpenId(null);
                refresh();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function OrderDetail({
  order,
  canDelete,
  onChanged,
  onDeleted,
}: {
  order: OrderRow;
  canDelete: boolean;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [notes, setNotes] = useState(order.order_notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setNotes(order.order_notes ?? ""), [order.order_notes]);

  const setStatus = useMutation({
    mutationFn: async (status: OrderStatus) => {
      const { error } = await db.from("orders").update({ status }).eq("id", order.id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(
        status === "confirmed" || status === "delivered"
          ? `Marked ${status}. Stock was reduced for tracked sizes.`
          : status === "cancelled"
            ? "Order cancelled. Any reduced stock was put back."
            : "Status updated",
      );
      onChanged();
    },
    onError: (e: Error) => toast.error(`Could not update status: ${e.message}`),
  });

  const saveNotes = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from("orders")
        .update({ order_notes: notes.trim() || null })
        .eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notes saved");
      onChanged();
    },
    onError: (e: Error) => toast.error(`Could not save notes: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("orders").delete().eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order deleted");
      onDeleted();
    },
    onError: (e: Error) => toast.error(`Could not delete: ${e.message}`),
  });

  const waNumber = order.phone.replace(/[^\d]/g, "").replace(/^0/, "254");

  return (
    <div className="flex flex-col gap-5">
      <SheetHeader>
        <SheetTitle>{order.order_no}</SheetTitle>
        <SheetDescription>Placed {formatDate(order.created_at)}</SheetDescription>
      </SheetHeader>

      <div className="grid gap-2">
        <Label>Status</Label>
        <Select
          value={order.status}
          onValueChange={(v) => setStatus.mutate(v as OrderStatus)}
          disabled={setStatus.isPending}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Confirmed or delivered takes the items out of stock. Cancelling puts them back.
        </p>
      </div>

      <div className="rounded-md border p-4 text-sm">
        <p className="font-medium">{order.customer_name}</p>
        <p className="text-muted-foreground">
          <a href={`tel:${order.phone}`} className="underline">
            {order.phone}
          </a>
          {" · "}
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            WhatsApp
          </a>
        </p>
        {order.notes && (
          <p className="mt-3">
            <span className="text-muted-foreground">Customer note: </span>
            {order.notes}
          </p>
        )}
      </div>

      <div className="rounded-md border">
        <ul className="divide-y">
          {order.items.map((i, idx) => (
            <li
              key={`${i.product_id}-${i.size}-${idx}`}
              className="flex items-start justify-between gap-3 p-3 text-sm"
            >
              <div>
                <p className="font-medium">{i.name}</p>
                <p className="text-xs text-muted-foreground">
                  Size {i.size} · {i.qty} × {formatKes(i.price)}
                </p>
              </div>
              <p>{formatKes(i.qty * i.price)}</p>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t p-3 text-sm font-semibold">
          <span>Total</span>
          <span>{formatKes(order.total)}</span>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="order-notes">Internal notes (customers never see these)</Label>
        <Textarea
          id="order-notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => saveNotes.mutate()}
            disabled={saveNotes.isPending || notes === (order.order_notes ?? "")}
          >
            {saveNotes.isPending ? "Saving…" : "Save notes"}
          </Button>
        </div>
      </div>

      {canDelete && (
        <div className="border-t pt-4">
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 /> Delete order
          </Button>
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {order.order_no}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the order. It does not change stock. To keep a record, set it
              to Cancelled instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove.mutate();
              }}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
