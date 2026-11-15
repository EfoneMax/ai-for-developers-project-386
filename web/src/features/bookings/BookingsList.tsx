import { useState } from "react";
import { CalendarClock, MoreHorizontal } from "lucide-react";
import type { Booking } from "@/client/types.gen";
import ErrorBanner from "@/components/ErrorBanner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import CancelBookingDialog from "./CancelBookingDialog";
import { formatMoscowDay, formatMoscowInterval } from "./format";
import { useBookings } from "./useBookings";

/** Скелетоны строк, пока предстоящие встречи грузятся. */
function BookingsSkeleton() {
  return (
    <output aria-label="Загружаем предстоящие встречи" className="grid gap-3">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="rounded-2xl border border-white/60 bg-white/70 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-4 w-24" />
          <Skeleton className="mt-4 h-4 w-52" />
        </div>
      ))}
    </output>
  );
}

/** Строка предстоящей встречи: московское время, снимок типа, гость и действие. */
function BookingRow({ booking, onCancel }: { booking: Booking; onCancel: () => void }) {
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-white/60 bg-white/70 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="sm:w-52">
        <p className="font-medium text-[#17231d]">{formatMoscowDay(booking.start)}</p>
        <p className="mt-1 text-sm text-[#4b5a51]">
          {formatMoscowInterval(booking.start, booking.end)}
        </p>
      </div>

      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-[#17231d]">
            {booking.meetingType.name}
          </h2>
          <span className="inline-flex items-center rounded-full bg-[#e6efe8] px-3 py-1 text-xs font-medium text-[#2f6b4f]">
            {booking.meetingType.durationMinutes} мин
          </span>
        </div>
        <p className="mt-2 text-sm font-medium text-[#17231d]">{booking.guest.name}</p>
        <p className="text-sm text-[#4b5a51]">{booking.guest.email}</p>
        {booking.guest.comment === undefined ? null : (
          <p className="mt-2 text-sm leading-relaxed text-[#4b5a51]">{booking.guest.comment}</p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Действия: встреча с ${booking.guest.name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onSelect={onCancel}>
            Отменить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/**
 * Вкладка «Предстоящие встречи»: только подтверждённые брони, которые ещё
 * не закончились, по возрастанию начала. Фильтров, пагинации и polling нет.
 *
 * Отмена идёт из меню строки с подтверждением; после успеха список
 * перезагружается, поэтому отменённая встреча из него исчезает.
 */
export default function BookingsList() {
  const { state, reload } = useBookings();
  const [cancelling, setCancelling] = useState<Booking>();
  const [notice, setNotice] = useState<string | undefined>();

  function handleCancelled() {
    setCancelling(undefined);
    setNotice(undefined);
    reload();
  }

  function handleNotCancellable() {
    setCancelling(undefined);
    setNotice("Эту встречу уже нельзя отменить — список обновлён.");
    reload();
  }

  return (
    <div className="grid gap-4">
      {notice === undefined ? null : <ErrorBanner title={notice} />}

      {state.status === "loading" ? <BookingsSkeleton /> : null}

      {state.status === "error" ? (
        <ErrorBanner title="Не удалось загрузить предстоящие встречи" onRetry={reload} />
      ) : null}

      {state.status === "ready" && state.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#17231d]/20 bg-white/60 px-6 py-10 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#e6efe8] text-[#2f6b4f]">
            <CalendarClock className="size-6" />
          </span>
          <h2 className="mt-6 text-xl font-semibold tracking-[-0.02em] text-[#17231d]">
            Пока нет предстоящих встреч
          </h2>
          <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-[#4b5a51]">
            Когда гость запишется на свободный слот, встреча появится здесь с его контактами.
          </p>
        </div>
      ) : null}

      {state.status === "ready" && state.data.length > 0 ? (
        <>
          <p className="text-sm text-[#4b5a51]">
            Время указано в московском поясе. Отменить встречу можно из строки — слот снова станет
            доступен гостю.
          </p>
          <ul className="grid gap-3">
            {state.data.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                onCancel={() => setCancelling(booking)}
              />
            ))}
          </ul>
        </>
      ) : null}

      {cancelling === undefined ? null : (
        <CancelBookingDialog
          booking={cancelling}
          onCancelled={handleCancelled}
          onNotCancellable={handleNotCancellable}
          onClose={() => setCancelling(undefined)}
        />
      )}
    </div>
  );
}
