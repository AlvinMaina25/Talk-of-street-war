import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FIT_NOTE, SIZE_GUIDE_SIZES, guideForCategory } from "@/data/size-guide";

export function SizeGuideDialog({ category }: { category: string }) {
  const guide = guideForCategory(category);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" className="size-guide-trigger">
          SIZE GUIDE <ArrowUpRight size={12} />
        </Button>
      </DialogTrigger>
      {/* Capped to the viewport so it scrolls inside itself on small phones. */}
      <DialogContent className="size-guide-dialog max-h-[88dvh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-xl font-bold uppercase tracking-wide">
            Size guide
          </DialogTitle>
          <DialogDescription>{FIT_NOTE}</DialogDescription>
        </DialogHeader>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
            {guide.title} <span className="font-normal text-muted-foreground">· cm</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  <th scope="col" className="py-2 pr-2 text-left font-semibold">
                    Size
                  </th>
                  {guide.columns.map((column) => (
                    <th key={column} scope="col" className="px-1 py-2 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SIZE_GUIDE_SIZES.map((size) => (
                  <tr key={size} className="border-b border-border/60">
                    <th scope="row" className="py-2.5 pr-2 text-left font-semibold">
                      {size}
                    </th>
                    {guide.rows[size].map((value, index) => (
                      <td key={guide.columns[index]} className="px-1 py-2.5">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
            How to measure
          </p>
          <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            {guide.howToMeasure.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Measurements are approximate and may vary by 1–2 cm.
        </p>
      </DialogContent>
    </Dialog>
  );
}
