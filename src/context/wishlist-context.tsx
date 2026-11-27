import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "talk-of-wishlist";

interface WishlistContextValue {
  /** Product ids (slugs), most recently saved first. */
  ids: string[];
  count: number;
  has: (productId: string) => boolean;
  /** Adds or removes the product. Returns true when it is now saved. */
  toggle: (productId: string) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setIds([
            ...new Set(
              parsed.filter((id): id is string => typeof id === "string" && id.length > 0),
            ),
          ]);
        }
      }
    } catch {
      setIds([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Storage full or blocked: the wishlist still works for this visit.
    }
  }, [ids, loaded]);

  // Keep several open tabs in sync.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      try {
        const parsed: unknown = event.newValue ? JSON.parse(event.newValue) : [];
        if (Array.isArray(parsed))
          setIds(parsed.filter((id): id is string => typeof id === "string"));
      } catch {
        /* ignore malformed data */
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const has = useCallback((productId: string) => ids.includes(productId), [ids]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      ids,
      count: ids.length,
      has,
      toggle: (productId) => {
        const saved = !ids.includes(productId);
        setIds((current) =>
          current.includes(productId)
            ? current.filter((id) => id !== productId)
            : [productId, ...current],
        );
        return saved;
      },
      remove: (productId) => setIds((current) => current.filter((id) => id !== productId)),
      clear: () => setIds([]),
    }),
    [ids, has],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider");
  return context;
}
