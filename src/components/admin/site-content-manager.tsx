import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { ImageIcon, Loader2, RotateCcw, Save, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { HeroTitleLines, Lines } from "@/components/hero-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  describeUploadError,
  formatBytes,
  prepareImageForUpload,
  validateImageFile,
} from "@/lib/image-compress";
import { db } from "@/lib/products-api";
import {
  DEFAULT_SITE_SETTINGS,
  SITE_IMAGES_BUCKET as BUCKET,
  SITE_SETTINGS_KEY,
  fetchSiteSettingsStrict,
  normalizeWhatsappNumber,
  saveSiteSettings,
  whatsappLink,
  type SiteSettings,
} from "@/lib/site-settings-api";

const ADMIN_KEY = ["admin-site-settings"] as const;

/** Storage object path for an image URL that lives in our bucket, else null (e.g. /images/... defaults). */
function storagePath(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}

function removeFromBucket(paths: string[]) {
  if (paths.length) void db.storage.from(BUCKET).remove(paths); // best effort
}

function validate(f: SiteSettings): Partial<Record<keyof SiteSettings, string>> {
  const errors: Partial<Record<keyof SiteSettings, string>> = {};
  if (!f.hero_image) errors.hero_image = "Choose a hero image.";
  if (!f.hero_title.trim()) errors.hero_title = "Hero title is required.";
  else if (f.hero_title.length > 80) errors.hero_title = "Keep the title under 80 characters.";
  if (f.hero_subtitle.length > 160)
    errors.hero_subtitle = "Keep the subtitle under 160 characters.";
  if (f.announcement_text.length > 140)
    errors.announcement_text = "Keep the announcement under 140 characters.";
  if (f.announcement_active && !f.announcement_text.trim()) {
    errors.announcement_text = "Add announcement text or switch the bar off.";
  }
  if (!normalizeWhatsappNumber(f.whatsapp_number)) {
    errors.whatsapp_number = "Enter a valid Kenyan number, e.g. 0725 647 479 or +254 725 647 479.";
  }
  return errors;
}

export function SiteContentManager() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ADMIN_KEY,
    queryFn: fetchSiteSettingsStrict,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[560px] w-full" />
        <Skeleton className="h-[560px] w-full" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="font-medium">Couldn't load site content</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {(error as Error | null)?.message ?? "Unknown error."} If the site_settings table
            doesn't exist yet, run site-settings-setup.sql in the Supabase SQL Editor.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }
  return <SiteContentForm saved={data} />;
}

function SiteContentForm({ saved }: { saved: SiteSettings }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [f, setF] = useState<SiteSettings>(saved);
  const [stage, setStage] = useState<"idle" | "optimising" | "uploading">("idle");
  const uploading = stage !== "idle";
  // Files uploaded this session that aren't saved yet; cleaned up if replaced or discarded.
  const [pending, setPending] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setF((s) => ({ ...s, [key]: value }));

  const errors = validate(f);
  const valid = Object.keys(errors).length === 0;
  const dirty = (Object.keys(saved) as (keyof SiteSettings)[]).some((k) => f[k] !== saved[k]);
  const normalizedNumber = normalizeWhatsappNumber(f.whatsapp_number);

  function dropPendingFile(url: string) {
    const path = storagePath(url);
    if (path && pending.includes(path)) {
      removeFromBucket([path]);
      setPending((p) => p.filter((x) => x !== path));
    }
  }

  async function uploadHero(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const problem = validateImageFile(file); // type and the 5 MB limit apply to the original selection
    if (problem) {
      if (fileRef.current) fileRef.current.value = "";
      return void toast.error(problem);
    }
    setStage("optimising");
    const prepared = await prepareImageForUpload(file); // falls back to the original if compression fails
    setStage("uploading");
    const path = `hero-${crypto.randomUUID()}.${prepared.ext}`;
    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(path, prepared.file, { contentType: prepared.contentType, upsert: false });
    if (fileRef.current) fileRef.current.value = "";
    setStage("idle");
    if (upErr) return void toast.error(`Upload failed: ${describeUploadError(upErr.message)}`);
    if (prepared.compressed)
      toast.success(
        `Image optimised: ${formatBytes(prepared.originalBytes)} → ${formatBytes(prepared.finalBytes)}`,
      );
    dropPendingFile(f.hero_image); // an earlier unsaved upload is now replaced
    setPending((p) => [...p, path]);
    set("hero_image", db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }

  function resetHeroImage() {
    dropPendingFile(f.hero_image);
    set("hero_image", DEFAULT_SITE_SETTINGS.hero_image);
  }

  function discard() {
    removeFromBucket(pending);
    setPending([]);
    setF(saved);
  }

  const save = useMutation({
    mutationFn: async () => {
      const number = normalizeWhatsappNumber(f.whatsapp_number);
      if (!number) throw new Error("Invalid WhatsApp number");
      return saveSiteSettings({
        ...f,
        hero_title: f.hero_title.trim(),
        hero_subtitle: f.hero_subtitle.trim(),
        announcement_text: f.announcement_text.trim(),
        whatsapp_number: number,
      });
    },
    onSuccess: async (next) => {
      // Remove the previous bucket image if it was replaced, plus any unused uploads.
      const keep = storagePath(next.hero_image);
      const stale = [storagePath(saved.hero_image), ...pending].filter(
        (p): p is string => !!p && p !== keep,
      );
      removeFromBucket([...new Set(stale)]);
      setPending([]);
      queryClient.setQueryData(SITE_SETTINGS_KEY, next);
      queryClient.setQueryData(ADMIN_KEY, next);
      setF(next);
      await router.invalidate(); // refresh the storefront's root loader data
      toast.success("Site content saved");
    },
    onError: (e: Error) => toast.error(`Could not save: ${e.message}`),
  });

  const isDefaultImage = f.hero_image === DEFAULT_SITE_SETTINGS.hero_image;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit content</CardTitle>
          <CardDescription>Changes appear on the live site after you save.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Hero image */}
          <div className="space-y-2">
            <Label>Hero image</Label>
            <div className="flex items-center gap-3">
              <div className="size-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                {f.hero_image ? (
                  <img src={f.hero_image} alt="Hero preview" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="m-6 size-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={(e) => uploadHero(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                  {stage === "optimising"
                    ? "Optimising…"
                    : stage === "uploading"
                      ? "Uploading…"
                      : "Upload image"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading || isDefaultImage}
                  onClick={resetHeroImage}
                >
                  <RotateCcw /> Reset to default
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP or AVIF, up to 5 MB (resized and converted to WebP automatically).
              Wide, landscape-friendly photos work best.
            </p>
            {errors.hero_image && <p className="text-sm text-destructive">{errors.hero_image}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero_title">Hero title</Label>
            <Textarea
              id="hero_title"
              rows={2}
              value={f.hero_title}
              onChange={(e) => set("hero_title", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Press Enter for a new line. The last word is highlighted.
            </p>
            {errors.hero_title && <p className="text-sm text-destructive">{errors.hero_title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero_subtitle">Hero subtitle</Label>
            <Textarea
              id="hero_subtitle"
              rows={2}
              value={f.hero_subtitle}
              onChange={(e) => set("hero_subtitle", e.target.value)}
            />
            {errors.hero_subtitle && (
              <p className="text-sm text-destructive">{errors.hero_subtitle}</p>
            )}
          </div>

          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="announcement_active">Announcement bar</Label>
                <p className="text-xs text-muted-foreground">
                  Shown at the top of every page. Visitors can dismiss it.
                </p>
              </div>
              <Switch
                id="announcement_active"
                checked={f.announcement_active}
                onCheckedChange={(v) => set("announcement_active", v)}
              />
            </div>
            <Input
              aria-label="Announcement text"
              value={f.announcement_text}
              onChange={(e) => set("announcement_text", e.target.value)}
              placeholder="e.g. FREE DELIVERY IN NAIROBI THIS WEEKEND"
            />
            {errors.announcement_text && (
              <p className="text-sm text-destructive">{errors.announcement_text}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp_number">WhatsApp number</Label>
            <Input
              id="whatsapp_number"
              inputMode="tel"
              value={f.whatsapp_number}
              onChange={(e) => set("whatsapp_number", e.target.value)}
              placeholder="0725 647 479"
            />
            {errors.whatsapp_number ? (
              <p className="text-sm text-destructive">{errors.whatsapp_number}</p>
            ) : (
              <p className="break-all text-xs text-muted-foreground">
                Used by the WhatsApp button, product enquiries and bag orders →{" "}
                {whatsappLink(normalizedNumber ?? "")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button
              onClick={() => save.mutate()}
              disabled={!dirty || !valid || save.isPending || uploading}
            >
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="ghost" onClick={discard} disabled={!dirty || save.isPending}>
              Discard changes
            </Button>
            {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
          </div>
        </CardContent>
      </Card>

      {/* Live preview */}
      <div className="space-y-4 lg:sticky lg:top-20">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live preview</CardTitle>
            <CardDescription>Updates as you type. Not saved until you press Save.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-md border">
              {f.announcement_active && f.announcement_text.trim() ? (
                <div className="announcement-bar relative flex h-8 items-center justify-center px-8 text-center text-[10px] font-semibold uppercase tracking-[0.13em]">
                  <span className="truncate">{f.announcement_text}</span>
                  <X size={12} className="absolute right-2 opacity-70" aria-hidden="true" />
                </div>
              ) : (
                <div className="flex h-8 items-center justify-center bg-muted text-[11px] text-muted-foreground">
                  Announcement bar is off
                </div>
              )}
              <div className="relative flex aspect-[16/10] items-end overflow-hidden bg-black text-white">
                {f.hero_image && (
                  <img
                    src={f.hero_image}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                <div className="relative p-5">
                  <h2 className="hero-title" style={{ fontSize: "clamp(30px, 5vw, 52px)" }}>
                    <HeroTitleLines text={f.hero_title || " "} />
                  </h2>
                  <p className="hero-subtitle" style={{ marginTop: 10, fontSize: 9 }}>
                    <Lines text={f.hero_subtitle} />
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.18 2.095 3.195 5.076 4.483.709.3 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347" />
                </svg>
              </span>
              <span className="text-muted-foreground">
                {normalizedNumber
                  ? `Chats open with +${normalizedNumber}`
                  : "Enter a valid number to preview"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
