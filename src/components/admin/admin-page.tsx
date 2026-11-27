import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function AdminPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function AdminPlaceholder({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <>
      <AdminPageHeader title={title} description={description} />
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </div>
          <p className="font-medium">Coming soon</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            This section is a placeholder. Tools for managing {title.toLowerCase()} will appear
            here.
          </p>
          {children}
        </CardContent>
      </Card>
    </>
  );
}

export const adminHead = (title: string, description: string) => ({
  meta: [
    { title: `${title} — TALK OF Admin` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — TALK OF Admin` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ],
});
