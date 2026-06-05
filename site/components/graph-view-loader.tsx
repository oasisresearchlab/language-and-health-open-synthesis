"use client";

import dynamic from "next/dynamic";

export const GraphViewClient = dynamic(
  () => import("./graph-view").then((m) => m.GraphView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[540px] items-center justify-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
        Loading graph…
      </div>
    ),
  },
);
