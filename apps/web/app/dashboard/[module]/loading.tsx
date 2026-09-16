import { QueueSkeleton } from "@/components/queue-skeleton";

export default function Loading() {
  return (
    // The layout supplies the page frame; repeating it here would double the padding.
    <QueueSkeleton />
  );
}
