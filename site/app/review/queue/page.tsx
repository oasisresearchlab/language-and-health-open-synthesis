import { queueNodeMeta } from "@/lib/review-queue";
import { QueueDashboard } from "@/components/review/queue-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Review queue",
  description: "Maintainer view: every accuracy judgment, with disagreement + export.",
};

export default async function QueuePage() {
  const meta = await queueNodeMeta();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
        Maintainer · review the reviews
      </p>
      <h1 className="mt-3 font-heading text-3xl font-semibold tracking-tight">
        Review queue
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Every accuracy judgment across reviewers. Filter, spot where reviewers
        disagree or flagged edits, and export for analysis.
      </p>
      <QueueDashboard meta={meta} />
    </div>
  );
}
