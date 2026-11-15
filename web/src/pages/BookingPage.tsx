import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarClock } from "lucide-react";
import type { Booking, MeetingType, Slot } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import ErrorBanner from "@/components/ErrorBanner";
import BookingConfirmation from "@/features/bookings/BookingConfirmation";
import BookingContactsStep, { type GuestDraft } from "@/features/bookings/BookingContactsStep";
import MeetingTypeCard from "@/features/meeting-types/MeetingTypeCard";
import MeetingTypeListSkeleton from "@/features/meeting-types/MeetingTypeListSkeleton";
import { useMeetingTypes } from "@/features/meeting-types/useMeetingTypes";
import BookingSlotStep from "@/features/slots/BookingSlotStep";
import { useGuestTimeZone } from "@/features/slots/time-zone";

const SLOT_TAKEN_NOTICE = "Это время только что заняли. Выберите другой слот — контакты сохранены.";
const MEETING_TYPE_GONE_NOTICE = "Этот тип встречи больше недоступен. Выберите другой.";

const EMPTY_GUEST: GuestDraft = { name: "", email: "", comment: "" };

/** Шаг потока записи; контакты живут отдельно и переживают конфликт слотов. */
type Step =
  | { kind: "type" }
  | {
      kind: "slot";
      meetingType: MeetingType;
      attempt: number;
      notice?: string;
      initialSlotStart?: string | null;
    }
  | { kind: "contacts"; meetingType: MeetingType; slot: Slot; attempt: number }
  | { kind: "confirmed"; booking: Booking };

export default function BookingPage() {
  const { state, reload } = useMeetingTypes();
  const { timeZone, setTimeZone } = useGuestTimeZone();
  const [step, setStep] = useState<Step>({ kind: "type" });
  const [guest, setGuest] = useState<GuestDraft>(EMPTY_GUEST);
  const [typeNotice, setTypeNotice] = useState<string | undefined>();

  function restart() {
    setGuest(EMPTY_GUEST);
    setTypeNotice(undefined);
    setStep({ kind: "type" });
    reload();
  }

  if (step.kind === "confirmed") {
    return <BookingConfirmation booking={step.booking} timeZone={timeZone} onRestart={restart} />;
  }

  if (step.kind === "contacts") {
    const { meetingType, slot, attempt } = step;

    return (
      <BookingContactsStep
        meetingType={meetingType}
        slot={slot}
        timeZone={timeZone}
        guest={guest}
        onGuestChange={setGuest}
        onBack={() => {
          setStep({
            kind: "slot",
            meetingType,
            attempt,
            initialSlotStart: slot.start,
          });
        }}
        onBooked={(booking) => {
          setStep({ kind: "confirmed", booking });
        }}
        onSlotTaken={() => {
          setStep({
            kind: "slot",
            meetingType,
            attempt: attempt + 1,
            notice: SLOT_TAKEN_NOTICE,
          });
        }}
        onMeetingTypeGone={() => {
          setTypeNotice(MEETING_TYPE_GONE_NOTICE);
          setStep({ kind: "type" });
          reload();
        }}
      />
    );
  }

  if (step.kind === "slot") {
    const { meetingType, attempt, notice, initialSlotStart } = step;

    return (
      <BookingSlotStep
        key={`${meetingType.id}:${attempt}`}
        meetingType={meetingType}
        timeZone={timeZone}
        onTimeZoneChange={setTimeZone}
        notice={notice}
        initialSlotStart={initialSlotStart}
        onBack={() => {
          setStep({ kind: "type" });
        }}
        onContinue={(slot) => {
          setStep({ kind: "contacts", meetingType, slot, attempt });
        }}
        onMeetingTypeGone={() => {
          setTypeNotice(MEETING_TYPE_GONE_NOTICE);
          setStep({ kind: "type" });
          reload();
        }}
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <p className="eyebrow">Страница записи</p>
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#17231d] sm:text-4xl">
        Выберите тип встречи
      </h1>
      <p className="mt-4 max-w-[52ch] leading-relaxed text-[#4b5a51]">
        Владелец заранее задал название, описание и длительность. На следующем шаге вы увидите
        свободные слоты в своём часовом поясе.
      </p>

      {typeNotice === undefined ? null : (
        <div className="mt-6">
          <ErrorBanner title={typeNotice} />
        </div>
      )}

      <div className="mt-10">
        {state.status === "loading" ? <MeetingTypeListSkeleton /> : null}

        {state.status === "error" ? (
          <ErrorBanner title="Не удалось загрузить типы встреч" onRetry={reload} />
        ) : null}

        {state.status === "ready" && state.data.length === 0 ? (
          <div className="rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-[0_30px_80px_rgba(40,55,46,0.12)] sm:p-12">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#e6efe8] text-[#2f6b4f]">
              <CalendarClock className="size-6" />
            </span>
            <h2 className="mt-6 text-2xl font-semibold tracking-[-0.02em] text-[#17231d]">
              Владелец ещё не создал ни одного типа встречи
            </h2>
            <p className="mx-auto mt-3 max-w-[42ch] leading-relaxed text-[#4b5a51]">
              Записываться пока не на что. Загляните позже или вернитесь на главную.
            </p>
            <Button asChild variant="outline" className="mt-8">
              <Link to="/">
                <ArrowLeft />
                На главную
              </Link>
            </Button>
          </div>
        ) : null}

        {state.status === "ready" && state.data.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {state.data.map((meetingType) => (
              <li key={meetingType.id}>
                <MeetingTypeCard
                  meetingType={meetingType}
                  onSelect={(selected) => {
                    setStep({ kind: "slot", meetingType: selected, attempt: 0 });
                  }}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
