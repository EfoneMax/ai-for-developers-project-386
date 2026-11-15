import type { Slot } from "@/client/types.gen";
import { cn } from "@/lib/utils";
import { formatTimeInZone } from "./format";
import type { MoscowDay } from "./moscow-days";
import { groupSlotsByMoscowDay } from "./moscow-days";
import TimezoneSelect from "./TimezoneSelect";

interface SlotCalendarProps {
  days: MoscowDay[];
  slots: Slot[];
  timeZone: string;
  onTimeZoneChange: (timeZone: string) => void;
  selectedDayKey: string | null;
  onSelectDay: (dayKey: string) => void;
  selectedSlotStart: string | null;
  onSelectSlot: (slot: Slot) => void;
}

/**
 * Календарь записи: все 14 московских дат, свободные слоты выбранного дня
 * и переключатель пояса гостя. Дни без слотов остаются видимыми, но неактивны.
 */
export default function SlotCalendar({
  days,
  slots,
  timeZone,
  onTimeZoneChange,
  selectedDayKey,
  onSelectDay,
  selectedSlotStart,
  onSelectSlot,
}: SlotCalendarProps) {
  const slotsByDay = groupSlotsByMoscowDay(slots);
  const daySlots = selectedDayKey === null ? [] : (slotsByDay.get(selectedDayKey) ?? []);

  return (
    <div className="mt-8 grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#4b5a51]">
          Время в поясе{" "}
          <span data-testid="guest-time-zone" className="font-medium text-[#17231d]">
            {timeZone}
          </span>
        </p>
        <TimezoneSelect timeZone={timeZone} onChange={onTimeZoneChange} />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-[#17231d]">День</legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {days.map((day) => {
            const daySlotCount = slotsByDay.get(day.key)?.length ?? 0;
            const hasSlots = daySlotCount > 0;

            return (
              <button
                key={day.key}
                type="button"
                disabled={!hasSlots}
                aria-pressed={selectedDayKey === day.key}
                onClick={() => {
                  onSelectDay(day.key);
                }}
                className={cn(
                  "min-h-16 rounded-2xl border px-3 py-2 text-left transition-colors",
                  "border-[#17231d]/10 bg-white/70 text-[#17231d] hover:border-[#2f6b4f]/50",
                  "aria-pressed:border-[#2f6b4f] aria-pressed:bg-[#e6efe8]",
                  "disabled:cursor-not-allowed disabled:border-[#17231d]/5 disabled:bg-white/40 disabled:text-[#17231d]/40",
                )}
              >
                <span className="block text-sm font-medium">
                  {day.weekday}, {day.dateLabel}
                </span>
                <span className="mt-1 block text-xs">
                  {hasSlots ? `Слотов: ${daySlotCount}` : "Нет слотов"}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {selectedDayKey === null ? (
        <p className="text-sm text-[#4b5a51]">Выберите день, чтобы увидеть свободное время.</p>
      ) : (
        <fieldset>
          <legend className="text-sm font-semibold text-[#17231d]">Время</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {daySlots.map((slot) => (
              <button
                key={slot.start}
                type="button"
                aria-pressed={selectedSlotStart === slot.start}
                onClick={() => {
                  onSelectSlot(slot);
                }}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                  "border-[#17231d]/10 bg-white/70 text-[#17231d] hover:border-[#2f6b4f]/50",
                  "aria-pressed:border-[#2f6b4f] aria-pressed:bg-[#2f6b4f] aria-pressed:text-white",
                )}
              >
                {formatTimeInZone(slot.start, timeZone)}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
