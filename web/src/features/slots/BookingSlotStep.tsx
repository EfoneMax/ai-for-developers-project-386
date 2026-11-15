import { useEffect, useState } from "react";
import { ArrowLeft, CalendarX } from "lucide-react";
import type { MeetingType, Slot } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import ErrorBanner from "@/components/ErrorBanner";
import { moscowDateKey, moscowDaysFromKeys } from "./moscow-days";
import SlotCalendar from "./SlotCalendar";
import SlotListSkeleton from "./SlotListSkeleton";
import { useSlots } from "./useSlots";

interface BookingSlotStepProps {
  meetingType: MeetingType;
  timeZone: string;
  onTimeZoneChange: (timeZone: string) => void;
  /** Сообщение над календарём: например, слот только что заняли. */
  notice?: string;
  /** Ранее выбранный слот, чтобы возврат с шага контактов не сбрасывал выбор. */
  initialSlotStart?: string | null;
  onBack: () => void;
  onContinue: (slot: Slot) => void;
  /** Тип встречи исчез: гость возвращается к списку типов. */
  onMeetingTypeGone: () => void;
}

/**
 * Второй шаг страницы записи: выбор дня и свободного слота.
 *
 * Слот задан абсолютным моментом UTC, поэтому смена пояса только
 * перерисовывает время и не сбрасывает выбор. Список слотов загружается
 * заново при монтировании шага, в том числе после конфликта бронирования.
 * Даты окна приходят с сервером: клиент не строит их по своим часам.
 */
export default function BookingSlotStep({
  meetingType,
  timeZone,
  onTimeZoneChange,
  notice,
  initialSlotStart,
  onBack,
  onContinue,
  onMeetingTypeGone,
}: BookingSlotStepProps) {
  const { state, reload } = useSlots(meetingType.id);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(
    initialSlotStart === undefined || initialSlotStart === null
      ? null
      : moscowDateKey(initialSlotStart),
  );
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(
    initialSlotStart ?? null,
  );

  // Даты окна и слоты приходят одним ответом: «сегодня» считает сервер,
  // а не часы браузера.
  const days = state.status === "ready" ? moscowDaysFromKeys(state.data.windowDays) : [];
  const slots = state.status === "ready" ? state.data.slots : [];

  const missingType = state.status === "error" && state.code === "MEETING_TYPE_NOT_FOUND";

  useEffect(() => {
    if (missingType) {
      onMeetingTypeGone();
    }
  }, [missingType, onMeetingTypeGone]);

  const selectedSlot =
    state.status === "ready"
      ? state.data.slots.find((slot) => slot.start === selectedSlotStart)
      : undefined;

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

      {notice === undefined ? null : (
        <div className="mt-6">
          <ErrorBanner title={notice} />
        </div>
      )}

      {state.status === "loading" ? <SlotListSkeleton /> : null}

      {state.status === "error" && !missingType ? (
        <div className="mt-8">
          <ErrorBanner title="Не удалось загрузить слоты" onRetry={reload} />
        </div>
      ) : null}

      {state.status === "ready" && slots.length === 0 ? (
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

      {state.status === "ready" && slots.length > 0 ? (
        <>
          <SlotCalendar
            days={days}
            slots={slots}
            timeZone={timeZone}
            onTimeZoneChange={onTimeZoneChange}
            selectedDayKey={selectedDayKey}
            onSelectDay={setSelectedDayKey}
            selectedSlotStart={selectedSlotStart}
            onSelectSlot={(slot) => {
              setSelectedSlotStart(slot.start);
            }}
          />

          <div className="mt-8 flex justify-end">
            <Button
              type="button"
              disabled={selectedSlot === undefined}
              onClick={() => {
                if (selectedSlot !== undefined) {
                  onContinue(selectedSlot);
                }
              }}
            >
              Продолжить
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
