import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface BagItem {
  productId: string;
  size: string;
  quantity: number;
}

export interface AddResult {
  /** Units actually added (may be less than requested when capped by stock). */
  added: number;
  /** True when the request was reduced (or refused) because of the max. */
  capped: boolean;
  /** Units of this product + size now in the bag. */
  inBag: number;
}

interface BagContextValue {
  items: BagItem[];
  itemCount: number;
  bagOpen: boolean;
  setBagOpen: (open: boolean) => void;
  /** `max` = most units of this line allowed in the bag (tracked stock). Never exceeds it; never silently changes other lines. */
  addItem: (productId: string, size: string, quantity?: number, max?: number) => AddResult;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  removeItem: (productId: string, size: string) => void;
  clearBag: () => void;
}

const BagContext = createContext<BagContextValue | null>(null);

export function BagProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BagItem[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("talk-of-demo-bag");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(
            parsed.filter(
              (item): item is BagItem =>
                typeof item?.productId === "string" &&
                typeof item?.size === "string" &&
                Number.isInteger(item?.quantity) &&
                item.quantity > 0,
            ),
          );
        }
      }
    } catch {
      setItems([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem("talk-of-demo-bag", JSON.stringify(items));
  }, [items, loaded]);

  const value = useMemo<BagContextValue>(
    () => ({
      items,
      bagOpen,
      setBagOpen,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      addItem: (productId, size, quantity = 1, max) => {
        const existing = items.find((item) => item.productId === productId && item.size === size);
        const inBag = existing?.quantity ?? 0;
        const allowed = max === undefined ? quantity : Math.max(0, Math.min(quantity, max - inBag));
        if (allowed > 0) {
          setItems((current) => {
            const line = current.find((item) => item.productId === productId && item.size === size);
            if (line)
              return current.map((item) =>
                item === line ? { ...item, quantity: item.quantity + allowed } : item,
              );
            return [...current, { productId, size, quantity: allowed }];
          });
        }
        return { added: allowed, capped: allowed < quantity, inBag: inBag + allowed };
      },
      updateQuantity: (productId, size, quantity) =>
        setItems((current) =>
          current
            .map((item) =>
              item.productId === productId && item.size === size ? { ...item, quantity } : item,
            )
            .filter((item) => item.quantity > 0),
        ),
      clearBag: () => setItems([]),
      removeItem: (productId, size) =>
        setItems((current) =>
          current.filter((item) => item.productId !== productId || item.size !== size),
        ),
    }),
    [items, bagOpen],
  );

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>;
}

export function useBag() {
  const context = useContext(BagContext);
  if (!context) throw new Error("useBag must be used inside BagProvider");
  return context;
}
