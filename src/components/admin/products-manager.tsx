import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Boxes, Loader2, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { LOW_STOCK_THRESHOLD, productCategories } from "@/data/products";
import type { AdminRole } from "@/lib/admin-access";
import { describeUploadError, formatBytes, prepareImageForUpload, validateImageFile } from "@/lib/image-compress";
import { db, type ProductRow, type StockRow } from "@/lib/products-api";

const BUCKET = "product-images";
const KNOWN_CATEGORIES = productCategories.filter((c) => c !== "All" && c !== "New Arrivals");
const NEW_CATEGORY = "__new__";

const formatKes = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

type StockMap = Record<string, Record<string, number>>; // product id -> size -> quantity

function stockStatus(p: ProductRow, stock: StockMap): { soldOut: boolean; low: boolean } {
  const tracked = stock[p.id] ?? {};
  const soldOut = p.sizes.length > 0 && p.sizes.every((s) => tracked[s] === 0);
  const low = p.sizes.some((s) => tracked[s] !== undefined && tracked[s] <= LOW_STOCK_THRESHOLD);
  return { soldOut, low };
}

/** Storage object path for an image URL that lives in our bucket, else null (e.g. /images/... seed paths). */
function storagePath(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}

interface FormState {
  id: string | null;
  name: string;
  slug: string;
  slugTouched: boolean;
  price: string;
  category: string;
  description: string;
  alt: string;
  sizes: string;
  is_new: boolean;
  is_limited: boolean;
  allow_preorder: boolean;
  preorder_lead_time: string;
  is_active: boolean;
  images: string[];
}

const emptyForm: FormState = {
  id: null,
  name: "",
  slug: "",
  slugTouched: false,
  price: "",
  category: "",
  description: "",
  alt: "",
  sizes: "S, M, L, XL",
  is_new: false,
  is_limited: false,
  allow_preorder: false,
  preorder_lead_time: "",
  is_active: true,
  images: [],
};

function toForm(p: ProductRow): FormState {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    slugTouched: true,
    price: String(p.price),
    category: p.category,
    description: p.description,
    alt: p.alt,
    sizes: p.sizes.join(", "),
    is_new: p.is_new,
    is_limited: p.is_limited,
    allow_preorder: p.allow_preorder === true,
    preorder_lead_time: p.preorder_lead_time ?? "",
    is_active: p.is_active,
    images: p.images,
  };
}

export function ProductsManager({ roles }: { roles: readonly AdminRole[] }) {
  const canEdit = roles.includes("owner") || roles.includes("manager");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [toDelete, setToDelete] = useState<ProductRow | null>(null);
  const [lowOnly, setLowOnly] = useState(false);
  const [stockFor, setStockFor] = useState<ProductRow | null>(null);

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async (): Promise<ProductRow[]> => {
      const { data, error } = await db.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductRow[];
    },
  });

  const { data: stock = {} } = useQuery({
    queryKey: ["admin-stock"],
    queryFn: async (): Promise<StockMap> => {
      const { data, error } = await db.from("product_stock").select("product_id, size, quantity");
      if (error) throw error;
      const map: StockMap = {};
      for (const r of data as StockRow[]) (map[r.product_id] ??= {})[r.size] = r.quantity;
      return map;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (lowOnly && !stockStatus(p, stock).low) return false;
      return !q || `${p.name} ${p.category} ${p.slug}`.toLowerCase().includes(q);
    });
  }, [products, search, lowOnly, stock]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stock"] });
    queryClient.invalidateQueries({ queryKey: ["store-products"] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (product: ProductRow) => {
      const { error } = await db.from("products").delete().eq("id", product.id);
      if (error) throw error;
      const paths = product.images.map(storagePath).filter((p): p is string => !!p);
      if (paths.length) await db.storage.from(BUCKET).remove(paths); // best effort
    },
    onSuccess: () => {
      toast.success("Product deleted");
      setToDelete(null);
      refresh();
    },
    onError: (e: Error) => toast.error(`Could not delete: ${e.message}`),
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage the items listed in your store.</p>
        </div>
        {canEdit && (
          <Button onClick={() => setForm({ ...emptyForm })}>
            <Plus /> Add product
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, category or slug"
                className="pl-9"
                aria-label="Search products"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="low-only" checked={lowOnly} onCheckedChange={setLowOnly} />
              <Label htmlFor="low-only">Low stock (≤ {LOW_STOCK_THRESHOLD} in any size)</Label>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-36 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading products…
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-destructive">
                    Could not load products: {(error as Error).message}. Has the products table been created?
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {products.length === 0 ? "No products yet." : "No products match your search."}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.images[0] ? (
                      <img src={p.images[0]} alt={p.alt || p.name} className="h-12 w-10 rounded object-cover" />
                    ) : (
                      <div className="h-12 w-10 rounded bg-muted" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>{formatKes(p.price)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={p.is_active ? "secondary" : "outline"}>{p.is_active ? "Active" : "Hidden"}</Badge>
                      {stockStatus(p, stock).soldOut ? (
                        <Badge variant="destructive">Sold out</Badge>
                      ) : (
                        stockStatus(p, stock).low && <Badge variant="destructive">Low stock</Badge>
                      )}
                      {p.is_new && <Badge variant="outline">New</Badge>}
                      {p.is_limited && <Badge variant="outline">Limited</Badge>}
                      {p.allow_preorder && <Badge variant="outline">Pre-order</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" aria-label={`Edit stock for ${p.name}`} title="Stock" onClick={() => setStockFor(p)}>
                      <Boxes />
                    </Button>
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="icon" aria-label={`Edit ${p.name}`} onClick={() => setForm(toForm(p))}>
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Delete ${p.name}`} onClick={() => setToDelete(p)}>
                          <Trash2 />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {!canEdit && (
        <p className="mt-3 text-sm text-muted-foreground">You can update stock. Only owners and managers can add, edit or delete products.</p>
      )}

      <StockDialog
        product={stockFor}
        current={stockFor ? stock[stockFor.id] ?? {} : {}}
        onClose={() => setStockFor(null)}
        onSaved={() => {
          setStockFor(null);
          refresh();
        }}
      />

      <ProductSheet
        extraCategories={products.map((p) => p.category)}
        form={form}
        onClose={() => setForm(null)}
        onSaved={() => {
          setForm(null);
          refresh();
        }}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.name}” and its uploaded images will be permanently removed from the store. This cannot be undone.
              To hide it without deleting, edit it and switch off “Active”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (toDelete) deleteMutation.mutate(toDelete);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ProductSheet({
  form: initial,
  extraCategories,
  onClose,
  onSaved,
}: {
  form: FormState | null;
  extraCategories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // Re-mount the inner form whenever a different product (or "new") is opened.
  return (
    <Sheet open={!!initial} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {initial && <ProductForm key={initial.id ?? "new"} initial={initial} extraCategories={extraCategories} onSaved={onSaved} onCancel={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function ProductForm({
  initial,
  extraCategories,
  onSaved,
  onCancel,
}: {
  initial: FormState;
  extraCategories: string[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<FormState>(initial);
  const [stage, setStage] = useState<"idle" | "optimising" | "uploading">("idle");
  const uploading = stage !== "idle";
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!initial.id;
  // Pick from known categories plus any already used by products (so custom ones stay selectable).
  const categoryOptions = [...new Set([...KNOWN_CATEGORIES, ...extraCategories.filter(Boolean), ...(initial.category ? [initial.category] : [])])];
  const [addingCategory, setAddingCategory] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setF((s) => ({ ...s, [key]: value }));

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const added: string[] = [];
    let before = 0;
    let after = 0;
    let optimised = 0;
    for (const file of Array.from(files)) {
      const problem = validateImageFile(file); // type and the 5 MB limit apply to the original selection
      if (problem) {
        toast.error(problem);
        continue;
      }
      setStage("optimising");
      const prepared = await prepareImageForUpload(file); // falls back to the original if compression fails
      setStage("uploading");
      const path = `${crypto.randomUUID()}.${prepared.ext}`;
      const { error } = await db.storage.from(BUCKET).upload(path, prepared.file, { contentType: prepared.contentType, upsert: false });
      if (error) {
        toast.error(`Upload failed for ${file.name}: ${describeUploadError(error.message)}`);
        continue;
      }
      added.push(db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
      if (prepared.compressed) {
        optimised += 1;
        before += prepared.originalBytes;
        after += prepared.finalBytes;
      }
    }
    if (added.length) setF((s) => ({ ...s, images: [...s.images, ...added] }));
    if (optimised) toast.success(optimised > 1 ? `${optimised} images optimised: ${formatBytes(before)} → ${formatBytes(after)}` : `Image optimised: ${formatBytes(before)} → ${formatBytes(after)}`);
    if (fileRef.current) fileRef.current.value = "";
    setStage("idle");
  }

  function moveImage(index: number, dir: -1 | 1) {
    setF((s) => {
      const next = [...s.images];
      const target = index + dir;
      if (target < 0 || target >= next.length) return s;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...s, images: next };
    });
  }

  function removeImage(index: number) {
    const url = f.images[index];
    setF((s) => ({ ...s, images: s.images.filter((_, i) => i !== index) }));
    // Only clean up files we uploaded this session or that live in the bucket; seed paths aren't in storage.
    const path = storagePath(url);
    if (path && !initial.images.includes(url)) void db.storage.from(BUCKET).remove([path]);
  }

  const save = useMutation({
    mutationFn: async () => {
      const name = f.name.trim();
      const slug = f.slug.trim();
      const price = Number(f.price);
      if (!name) throw new Error("Name is required");
      if (!slug || slug !== slugify(slug)) throw new Error("Slug can only contain lowercase letters, numbers and dashes");
      if (!Number.isInteger(price) || price < 0) throw new Error("Price must be a whole number in KES");
      if (!f.category.trim()) throw new Error("Category is required");

      const payload = {
        slug,
        name,
        price,
        category: f.category.trim(),
        description: f.description.trim(),
        alt: f.alt.trim(),
        sizes: f.sizes.split(",").map((s) => s.trim()).filter(Boolean),
        is_new: f.is_new,
        is_limited: f.is_limited,
        allow_preorder: f.allow_preorder,
        preorder_lead_time: f.preorder_lead_time.trim(),
        is_active: f.is_active,
        images: f.images,
      };
      const { error } = f.id
        ? await db.from("products").update(payload).eq("id", f.id)
        : await db.from("products").insert(payload);
      if (error) {
        if (/allow_preorder|preorder_lead_time/i.test(error.message)) {
          throw new Error("Pre-orders aren't set up in the database yet. Run preorder-setup.sql in the Supabase SQL editor, then save again.");
        }
        throw new Error(error.code === "23505" ? "Another product already uses that slug" : error.message);
      }

      // Remove storage files that were dropped from an existing product.
      if (f.id) {
        const removed = initial.images.filter((u) => !f.images.includes(u)).map(storagePath).filter((p): p is string => !!p);
        if (removed.length) await db.storage.from(BUCKET).remove(removed);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Product updated" : "Product added");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="flex flex-col gap-5"
    >
      <SheetHeader>
        <SheetTitle>{isEdit ? "Edit product" : "Add product"}</SheetTitle>
        <SheetDescription>
          {isEdit ? "Changes go live on the storefront once saved." : "New products appear on the storefront once saved and active."}
        </SheetDescription>
      </SheetHeader>

      <div className="grid gap-2">
        <Label htmlFor="p-name">Name</Label>
        <Input
          id="p-name"
          value={f.name}
          onChange={(e) =>
            setF((s) => ({ ...s, name: e.target.value, slug: s.slugTouched ? s.slug : slugify(e.target.value) }))
          }
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="p-slug">Slug (used in the product URL)</Label>
        <Input
          id="p-slug"
          value={f.slug}
          onChange={(e) => setF((s) => ({ ...s, slug: e.target.value, slugTouched: true }))}
          required
        />
        {isEdit && <p className="text-xs text-muted-foreground">Changing the slug breaks existing links to this product.</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="p-price">Price (KES)</Label>
          <Input id="p-price" type="number" min={0} step={1} value={f.price} onChange={(e) => set("price", e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p-category">Category</Label>
          <Select
            value={addingCategory ? NEW_CATEGORY : f.category}
            onValueChange={(v) => {
              if (v === NEW_CATEGORY) {
                setAddingCategory(true);
                set("category", "");
              } else {
                setAddingCategory(false);
                set("category", v);
              }
            }}
          >
            <SelectTrigger id="p-category" className="h-11">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value={NEW_CATEGORY}>+ Add new category…</SelectItem>
            </SelectContent>
          </Select>
          {addingCategory && (
            <Input
              autoFocus
              placeholder="New category name"
              value={f.category}
              onChange={(e) => set("category", e.target.value)}
            />
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="p-sizes">Sizes (comma separated)</Label>
        <Input id="p-sizes" value={f.sizes} onChange={(e) => set("sizes", e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="p-desc">Description</Label>
        <Textarea id="p-desc" rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="p-alt">Image description (alt text)</Label>
        <Input id="p-alt" value={f.alt} onChange={(e) => set("alt", e.target.value)} />
      </div>

      <div className="grid gap-3 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="p-active">Active (visible in the store)</Label>
          <Switch id="p-active" checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="p-new">New arrival</Label>
          <Switch id="p-new" checked={f.is_new} onCheckedChange={(v) => set("is_new", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="p-limited">Limited</Label>
          <Switch id="p-limited" checked={f.is_limited} onCheckedChange={(v) => set("is_limited", v)} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="grid gap-1">
            <Label htmlFor="p-preorder">Pre-order item</Label>
            <p className="text-xs text-muted-foreground">
              Off by default. Turn on for pieces you don't keep in stock. Customers see a "Pre-order" button on
              WhatsApp instead of "Sold out". If you don't track stock for this piece, it is always pre-order. If
              you do track stock, it becomes pre-order when a size reaches 0.
            </p>
          </div>
          <Switch id="p-preorder" checked={f.allow_preorder} onCheckedChange={(v) => set("allow_preorder", v)} />
        </div>
        {f.allow_preorder && (
          <div className="grid gap-2">
            <Label htmlFor="p-lead">Ready in (shown to customers)</Label>
            <Input
              id="p-lead"
              placeholder="e.g. 5–7 days"
              value={f.preorder_lead_time}
              onChange={(e) => set("preorder_lead_time", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Be realistic: customers will expect their order in this time. Leave empty to show no timing.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <Label>Images</Label>
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />} {stage === "optimising" ? "Optimising…" : stage === "uploading" ? "Uploading…" : "Upload images"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="hidden"
            onChange={(e) => uploadFiles(e.target.files)}
          />
        </div>
        <p className="text-xs text-muted-foreground">The first image is the main one. Use the arrows to reorder. Max 5 MB each; images are resized and converted to WebP automatically.</p>
        {f.images.length === 0 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">No images yet.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-3">
            {f.images.map((url, i) => (
              <li key={url} className="overflow-hidden rounded-md border">
                <div className="relative">
                  <img src={url} alt={`Product image ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                  {i === 0 && <Badge className="absolute left-1.5 top-1.5">Main</Badge>}
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-1.5 top-1.5 size-7"
                    aria-label={`Remove image ${i + 1}`}
                    onClick={() => removeImage(i)}
                  >
                    <X />
                  </Button>
                </div>
                <div className="flex justify-between p-1">
                  <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Move earlier" disabled={i === 0} onClick={() => moveImage(i, -1)}>
                    <ArrowLeft />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Move later" disabled={i === f.images.length - 1} onClick={() => moveImage(i, 1)}>
                    <ArrowRight />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending || uploading}>
          {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Add product"}
        </Button>
      </div>
    </form>
  );
}

function StockDialog({
  product,
  current,
  onClose,
  onSaved,
}: {
  product: ProductRow | null;
  current: Record<string, number>;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {product && <StockForm key={product.id} product={product} current={current} onSaved={onSaved} onCancel={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function StockForm({
  product,
  current,
  onSaved,
  onCancel,
}: {
  product: ProductRow;
  current: Record<string, number>;
  onSaved: () => void;
  onCancel: () => void;
}) {
  // Empty input = size not tracked (always available).
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.sizes.map((s) => [s, current[s] === undefined ? "" : String(current[s])])),
  );

  const save = useMutation({
    mutationFn: async () => {
      const rows: { product_id: string; size: string; quantity: number; updated_at: string }[] = [];
      const untracked: string[] = [];
      for (const size of product.sizes) {
        const raw = values[size]?.trim() ?? "";
        if (raw === "") {
          untracked.push(size);
          continue;
        }
        const qty = Number(raw);
        if (!Number.isInteger(qty) || qty < 0) throw new Error(`Size ${size}: enter a whole number, 0 or more`);
        rows.push({ product_id: product.id, size, quantity: qty, updated_at: new Date().toISOString() });
      }
      if (rows.length) {
        const { error } = await db.from("product_stock").upsert(rows, { onConflict: "product_id,size" });
        if (error) throw error;
      }
      if (untracked.length) {
        const { error } = await db.from("product_stock").delete().eq("product_id", product.id).in("size", untracked);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Stock updated");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle>Stock — {product.name}</DialogTitle>
        <DialogDescription>
          Quantity per size. 0 means sold out. Leave a size empty if you don't track it (it stays available). Low stock is
          {" "}{LOW_STOCK_THRESHOLD} or fewer.
        </DialogDescription>
      </DialogHeader>
      {product.sizes.length === 0 ? (
        <p className="text-sm text-muted-foreground">This product has no sizes. Add sizes by editing the product first.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {product.sizes.map((size) => {
            const n = values[size] === "" ? null : Number(values[size]);
            return (
              <div key={size} className="grid gap-1.5">
                <Label htmlFor={`stock-${size}`} className="flex items-center gap-2">
                  {size}
                  {n === 0 && <Badge variant="destructive">Sold out</Badge>}
                  {n !== null && n > 0 && n <= LOW_STOCK_THRESHOLD && <Badge variant="destructive">Low</Badge>}
                </Label>
                <Input
                  id={`stock-${size}`}
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Not tracked"
                  value={values[size] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [size]: e.target.value }))}
                />
              </div>
            );
          })}
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.isPending || product.sizes.length === 0}>
          {save.isPending ? "Saving…" : "Save stock"}
        </Button>
      </DialogFooter>
    </form>
  );
}