import { CalendarCheck } from "lucide-react";
import type { Booking } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import { formatDayInZone, formatIntervalInZone } from "./format";

interface BookingConfirmationProps {
  booking: Booking;
  timeZone: string;
  onRestart: () => void;
}

/**
 * Экран подтверждения: что и когда забронировано, в поясе гостя.
 *
 * Идентификатор брони не показывается: вернуться к ней нельзя, а отменить
 * встречу может только владелец.
 */
export default function BookingConfirmation({
  booking,
  timeZone,
  onRestart,
}: BookingConfirmationProps) {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <span className="grid size-12 place-items-center rounded-full bg-[#e6efe8] text-[#2f6b4f]">
        <CalendarCheck className="size-6" />
      </span>
      <p className="eyebrow mt-8">Готово</p>
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#17231d] sm:text-4xl">
        Вы записаны
      </h1>
      <p className="mt-4 max-w-[52ch] leading-relaxed text-[#4b5a51]">
        Встреча забронирована. Письмо с подтверждением не отправляется — сохраните детали ниже.
      </p>

      <dl className="mt-10 grid gap-4 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_30px_80px_rgba(40,55,46,0.12)] sm:p-8">
        <div>
          <dt className="text-xs font-medium tracking-[0.14em] text-[#4b5a51] uppercase">Когда</dt>
          <dd className="mt-1 text-lg font-medium text-[#17231d]">
            <span data-testid="confirmation-date">{formatDayInZone(booking.start, timeZone)}</span>,{" "}
            {formatIntervalInZone(booking.start, booking.end, timeZone)}{" "}
            <span data-testid="confirmation-time-zone" className="text-sm text-[#4b5a51]">
              {timeZone}
            </span>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium tracking-[0.14em] text-[#4b5a51] uppercase">
            Тип встречи
          </dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2 text-[#17231d]">
            <span className="font-medium">{booking.meetingType.name}</span>
            <span className="inline-flex items-center rounded-full bg-[#e6efe8] px-3 py-1 text-xs font-medium text-[#2f6b4f]">
              {booking.meetingType.durationMinutes} мин
            </span>
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium tracking-[0.14em] text-[#4b5a51] uppercase">Гость</dt>
          <dd className="mt-1 text-[#17231d]">{booking.guest.name}</dd>
          <dd className="text-[#4b5a51]">{booking.guest.email}</dd>
        </div>

        {booking.guest.comment === undefined ? null : (
          <div>
            <dt className="text-xs font-medium tracking-[0.14em] text-[#4b5a51] uppercase">
              Комментарий
            </dt>
            <dd className="mt-1 text-[#17231d]">{booking.guest.comment}</dd>
          </div>
        )}
      </dl>

      <p className="mt-6 max-w-[52ch] text-sm leading-relaxed text-[#4b5a51]">
        Отменить бронь может только владелец: напишите ему, если планы изменились. Самостоятельно
        управлять встречей на этой странице нельзя.
      </p>

      <Button type="button" variant="outline" className="mt-8" onClick={onRestart}>
        Записаться ещё
      </Button>
    </section>
  );
}
