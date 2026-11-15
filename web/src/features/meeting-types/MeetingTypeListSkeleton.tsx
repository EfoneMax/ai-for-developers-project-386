import { Skeleton } from "@/components/ui/skeleton";

/** Скелетоны карточек, пока каталог типов встреч грузится. */
export default function MeetingTypeListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <output aria-label="Загружаем типы встреч" className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-2xl border border-white/60 bg-white/70 p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-4 h-6 w-16 rounded-full" />
        </div>
      ))}
    </output>
  );
}
