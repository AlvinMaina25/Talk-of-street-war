// Browser-side image optimisation for admin uploads. No dependencies: createImageBitmap + canvas.
// Longest edge capped (never upscaled), re-encoded as WebP. Any failure falls back to the original file.

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
/** Limit applies to the file the admin selects, before compression. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 1600;
export const WEBP_QUALITY = 0.82;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Returns an error message for the toast, or null when the file may be uploaded. */
export function validateImageFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name} is not a supported image (use JPEG, PNG, WebP or AVIF)`;
  }
  if (file.size > MAX_IMAGE_BYTES) return `${file.name} is over 5 MB`;
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export interface PreparedImage {
  /** File to upload: the WebP, or the untouched original when compression was skipped. */
  file: File;
  /** File extension without the dot, matching `contentType`. */
  ext: string;
  contentType: string;
  originalBytes: number;
  finalBytes: number;
  /** True when `file` is the new WebP. */
  compressed: boolean;
}

/** Longest-edge scale factor. Never above 1, so small images are not upscaled. */
export function scaleFor(width: number, height: number, maxEdge = MAX_IMAGE_EDGE): number {
  const longest = Math.max(width, height);
  return longest > maxEdge ? maxEdge / longest : 1;
}

async function decode(
  file: File,
): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  // "from-image" applies the EXIF orientation, so phone photos are not saved sideways.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      /* fall through to <img> decoding */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode(); // browsers apply EXIF orientation to <img> by default
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

interface Surface {
  ctx: (CanvasDrawImage & CanvasImageSmoothing) | null;
  encode: () => Promise<Blob | null>;
}

/** A drawing surface plus its WebP encoder. OffscreenCanvas when available, otherwise a detached <canvas>. */
function makeSurface(width: number, height: number): Surface {
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(width, height);
    return {
      ctx: canvas.getContext("2d"),
      encode: () => canvas.convertToBlob({ type: "image/webp", quality: WEBP_QUALITY }),
    };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return {
    ctx: canvas.getContext("2d"),
    encode: () => new Promise((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY)),
  };
}

function original(file: File): PreparedImage {
  return {
    file,
    ext: EXTENSIONS[file.type] ?? "jpg",
    contentType: file.type,
    originalBytes: file.size,
    finalBytes: file.size,
    compressed: false,
  };
}

/** Resizes + converts to WebP. Never throws: on any problem the original file is returned. */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  try {
    const { source, width, height, release } = await decode(file);
    try {
      if (!width || !height) return original(file);
      const scale = scaleFor(width, height);
      const targetW = Math.max(1, Math.round(width * scale));
      const targetH = Math.max(1, Math.round(height * scale));

      const { ctx, encode } = makeSurface(targetW, targetH);
      if (!ctx) return original(file);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, 0, 0, targetW, targetH);

      const blob = await encode();
      // Browsers that cannot encode WebP silently return PNG: not what we want, keep the original.
      if (!blob || blob.type !== "image/webp") return original(file);
      // Already-small images can grow when re-encoded: only keep the result if it helps or we had to resize.
      if (blob.size >= file.size && scale === 1) return original(file);

      const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
      const webp = new File([blob], `${baseName}.webp`, { type: "image/webp" });
      return {
        file: webp,
        ext: "webp",
        contentType: "image/webp",
        originalBytes: file.size,
        finalBytes: webp.size,
        compressed: true,
      };
    } finally {
      release();
    }
  } catch (error) {
    console.warn("Image compression skipped, uploading the original", error);
    return original(file);
  }
}

/** Turns a Supabase storage error into something an admin can act on. */
export function describeUploadError(message: string): string {
  if (/row-level security|violates|unauthori[sz]ed|not allowed|permission/i.test(message)) {
    return "You don't have permission to upload images. Only the owner and managers can; ask the owner to check your role.";
  }
  if (/bucket not found|not found/i.test(message)) {
    return "The image storage bucket doesn't exist yet. Run storage-uploads-fix.sql in the Supabase SQL editor.";
  }
  if (/mime|type/i.test(message))
    return "That file type isn't allowed. Use JPEG, PNG, WebP or AVIF.";
  if (/size|exceed|too large|payload/i.test(message)) return "That image is too large (max 5 MB).";
  return message;
}
