// SIZE GUIDE: edit the numbers here. All measurements are in centimetres and are PLACEHOLDERS
// until the shop confirms real garment measurements.

export const SIZE_GUIDE_SIZES = ["S", "M", "L", "XL"] as const;

export interface SizeGuideTable {
  title: string;
  /** Column headings after the size column. */
  columns: string[];
  /** One row per size, values in the same order as `columns`. */
  rows: Record<(typeof SIZE_GUIDE_SIZES)[number], number[]>;
  howToMeasure: string[];
}

/** Tops, jackets, jerseys: measured flat, laid on a table. */
export const TOPS_GUIDE: SizeGuideTable = {
  title: "Tops, jackets & jerseys",
  columns: ["Chest width", "Body length", "Sleeve"],
  rows: {
    S: [58, 70, 24],
    M: [61, 72, 25],
    L: [64, 74, 26],
    XL: [67, 76, 27],
  },
  howToMeasure: [
    "Chest width: lay the piece flat and measure straight across, armpit to armpit.",
    "Body length: from the highest point of the shoulder down to the bottom hem.",
    "Sleeve: from the shoulder seam to the end of the sleeve. Jackets have longer sleeves, so ask us on WhatsApp if you want an exact number.",
  ],
};

/** Jeans, jorts, cargo. */
export const BOTTOMS_GUIDE: SizeGuideTable = {
  title: "Jeans, jorts & cargo",
  columns: ["Waist", "Length", "Leg opening"],
  rows: {
    S: [76, 104, 26],
    M: [82, 106, 27],
    L: [88, 108, 28],
    XL: [94, 110, 29],
  },
  howToMeasure: [
    "Waist: the waistband laid flat, measured across and doubled. This is the garment, not your body.",
    "Length: from the top of the waistband to the bottom of the leg. Jorts are shorter than the jeans values shown.",
    "Leg opening: the hem laid flat, measured across the bottom of one leg.",
  ],
};

export const FIT_NOTE =
  "Our pieces are cut oversized. If you want a closer fit, go down a size. Between sizes? Stay with the larger one.";

const BOTTOMS_PATTERN = /jean|jort|cargo|pant|short|trouser|denim/i;

/** Jeans/jorts/cargo categories get the bottoms table; everything else gets the tops table. */
export function guideForCategory(category: string): SizeGuideTable {
  return BOTTOMS_PATTERN.test(category) ? BOTTOMS_GUIDE : TOPS_GUIDE;
}
