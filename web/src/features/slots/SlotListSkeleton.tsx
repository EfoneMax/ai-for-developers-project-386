import { Skeleton } from "@/components/ui/skeleton";

/** Скелетоны календаря, пока свободные слоты грузятся. */
export default function SlotListSkeleton() {
  return (
    <output aria-label="Загружаем слоты" className="mt-8 grid gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-16 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-4 w-40" />
    </output>
  );
}
