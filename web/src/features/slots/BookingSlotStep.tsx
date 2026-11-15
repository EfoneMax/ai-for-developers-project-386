import { useState } from "react";
import { ArrowLeft, CalendarX } from "lucide-react";
import type { MeetingType } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import ErrorBanner from "@/components/ErrorBanner";
import type { MoscowDay } from "./moscow-days";
import SlotCalendar from "./SlotCalendar";
import SlotListSkeleton from "./SlotListSkeleton";
import { useGuestTimeZone } from "./time-zone";
import { useSlots } from "./useSlots";

interface BookingSlotStepProps {
  meetingType: MeetingType;
  days: MoscowDay[];
  onBack: () => void;
}

/**
 * Второй шаг страницы записи: выбор дня и свободного слота.
 *
 * Слот задан абсолютным моментом UTC, поэтому смена пояса только
 * перерисовывает время и не сбрасывает выбор.
 */
export default function BookingSlotStep({ meetingType, days, onBack }: BookingSlotStepProps) {
  const { state, reload } = useSlots(meetingType.id);
  const { timeZone, setTimeZone } = useGuestTimeZone();
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null);

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <Button type="button" variant="ghost" className="-ml-3" onClick={onBack}>
        <ArrowLeft />
        Назад к типам
      </Button>

      <p className="eyebrow mt-8">Шаг 2 из 3</p>
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#17231d] sm:text-4xl">
        Выберите день и время
      </h1>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="font-medium text-[#17231d]">{meetingType.name}</span>
        <span className="inline-flex items-center rounded-full bg-[#e6efe8] px-3 py-1 text-xs font-medium text-[#2f6b4f]">
          {meetingType.durationMinutes} мин
        </span>
      </div>

      {state.status === "loading" ? <SlotListSkeleton /> : null}

      {state.status === "error" ? (
        <div className="mt-8">
          <ErrorBanner title="Не удалось загрузить слоты" onRetry={reload} />
        </div>
      ) : null}

      {state.status === "ready" && state.slots.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-[0_30px_80px_rgba(40,55,46,0.12)] sm:p-12">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#e6efe8] text-[#2f6b4f]">
            <CalendarX className="size-6" />
          </span>
          <h2 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-[#17231d]">
            Свободных слотов нет
          </h2>
          <p className="mx-auto mt-3 max-w-[42ch] leading-relaxed text-[#4b5a51]">
            В ближайшие 14 дней свободного времени не осталось. Выберите другой тип встречи —
            возможно, для него слоты ещё есть.
          </p>
        </div>
      ) : null}

      {state.status === "ready" && state.slots.length > 0 ? (
        <SlotCalendar
          days={days}
          slots={state.slots}
          timeZone={timeZone}
          onTimeZoneChange={setTimeZone}
          selectedDayKey={selectedDayKey}
          onSelectDay={setSelectedDayKey}
          selectedSlotStart={selectedSlotStart}
          onSelectSlot={(slot) => {
            setSelectedSlotStart(slot.start);
          }}
        />
      ) : null}
    </section>
  );
}
