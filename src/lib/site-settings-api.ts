// Editable storefront content (hero, announcement bar, WhatsApp number).
// The storefront reads the single site_settings row and falls back to the bundled
// defaults if the request fails (e.g. table not created yet), so the site never breaks.
import { useQuery } from "@tanstack/react-query";
import { useLoaderData } from "@tanstack/react-router";

import { db } from "@/lib/products-api";

export interface SiteSettings {
  hero_image: string;
  hero_title: string;
  hero_subtitle: string;
  announcement_text: string;
  announcement_active: boolean;
  whatsapp_number: string;
}

export const SITE_IMAGES_BUCKET = "site-images";
export const SITE_SETTINGS_KEY = ["site-settings"] as const;

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  hero_image: "/images/talk-of-store-rack.webp",
  hero_title: "NOT MADE\nTO BLEND IN.",
  hero_subtitle: "STREETWEAR THAT SPEAKS BEFORE YOU DO.",
  announcement_text: "YOUR NEXT FIT IS WAITING — SHOP THE LATEST DROPS",
  announcement_active: true,
  whatsapp_number: "254725647479",
};

function fromRow(row: Partial<SiteSettings> | null): SiteSettings {
  const d = DEFAULT_SITE_SETTINGS;
  if (!row) return d;
  return {
    hero_image: row.hero_image || d.hero_image,
    hero_title: row.hero_title || d.hero_title,
    hero_subtitle: row.hero_subtitle ?? d.hero_subtitle,
    announcement_text: row.announcement_text ?? d.announcement_text,
    announcement_active: row.announcement_active ?? d.announcement_active,
    whatsapp_number: row.whatsapp_number || d.whatsapp_number,
  };
}

/** Strict read for the admin form: throws on failure so errors are visible. */
export async function fetchSiteSettingsStrict(): Promise<SiteSettings> {
  const { data, error } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return fromRow(data as Partial<SiteSettings> | null);
}

/** Storefront read: never throws, falls back to defaults. */
export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    return await fetchSiteSettingsStrict();
  } catch (error) {
    console.error("fetchSiteSettings failed, using defaults", (error as Error).message);
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function saveSiteSettings(values: SiteSettings): Promise<SiteSettings> {
  const { data, error } = await db
    .from("site_settings")
    .upsert({ id: 1, ...values, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data as Partial<SiteSettings>);
}

/** Current settings for storefront components. Seeded from the root route loader (SSR-safe). */
export function useSiteSettings(): SiteSettings {
  const initial = useLoaderData({ from: "__root__" }) as SiteSettings | undefined;
  const { data } = useQuery({
    queryKey: SITE_SETTINGS_KEY,
    queryFn: fetchSiteSettings,
    staleTime: 60_000,
    initialData: initial,
  });
  return data ?? DEFAULT_SITE_SETTINGS;
}

/**
 * Normalises a Kenyan mobile number to digits-only international format (254XXXXXXXXX).
 * Accepts "0725 647 479", "+254 725 647 479", "254725647479", "725647479". Returns null if invalid.
 */
export function normalizeWhatsappNumber(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith("0") && digits.length === 10) digits = `254${digits.slice(1)}`;
  else if (digits.length === 9 && /^[17]/.test(digits)) digits = `254${digits}`;
  return /^254[17]\d{8}$/.test(digits) ? digits : null;
}

export function whatsappLink(number: string, text?: string): string {
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
