import { QueueSkeleton } from "@/components/queue-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <QueueSkeleton />
    </div>
  );
}
