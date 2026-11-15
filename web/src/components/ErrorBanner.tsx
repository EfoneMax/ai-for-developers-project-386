import { Button } from "@/components/ui/button";

/** Баннер ошибки с повтором запроса; объявляется скринридером. */
export default function ErrorBanner({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-2xl border border-[#c25b4a]/30 bg-[#fbe9e5] px-5 py-4 text-[#7a2f22] sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm font-medium">{title}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        Повторить
      </Button>
    </div>
  );
}
