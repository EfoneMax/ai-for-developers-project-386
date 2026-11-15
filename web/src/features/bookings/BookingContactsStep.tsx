import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import type { Booking, MeetingType, Slot } from "@/client/types.gen";
import FieldError from "@/components/FieldError";
import { Button } from "@/components/ui/button";
import ErrorBanner from "@/components/ErrorBanner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-error";
import { createBooking } from "./api";
import { formatIntervalInZone } from "./format";

/** Контакты гостя в локальном состоянии потока записи. */
export interface GuestDraft {
  name: string;
  email: string;
  comment: string;
}

interface BookingContactsStepProps {
  meetingType: MeetingType;
  slot: Slot;
  timeZone: string;
  guest: GuestDraft;
  onGuestChange: (guest: GuestDraft) => void;
  onBack: () => void;
  onBooked: (booking: Booking) => void;
  onSlotTaken: () => void;
  onMeetingTypeGone: () => void;
}

interface FieldErrors {
  name?: string;
  email?: string;
  comment?: string;
}

const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;
const COMMENT_MAX_LENGTH = 1000;

/** Базовая проверка формата email; сервер проверяет то же правило сам. */
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(guest: GuestDraft): FieldErrors {
  const errors: FieldErrors = {};
  const name = guest.name.trim();
  const email = guest.email.trim();

  if (name.length === 0) {
    errors.name = "Укажите имя";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Имя — не больше ${NAME_MAX_LENGTH} символов`;
  }

  if (email.length === 0) {
    errors.email = "Укажите email";
  } else if (email.length > EMAIL_MAX_LENGTH || !EMAIL_FORMAT.test(email)) {
    errors.email = "Укажите email вида name@example.com";
  }

  if (guest.comment.trim().length > COMMENT_MAX_LENGTH) {
    errors.comment = `Комментарий — не больше ${COMMENT_MAX_LENGTH} символов`;
  }

  return errors;
}

/**
 * Третий шаг страницы записи: контакты гостя и отправка брони.
 *
 * Контакты живут в состоянии страницы, поэтому после конфликта слотов
 * гость возвращается к выбору времени без повторного ввода. Автоматических
 * повторов нет: сетевую ошибку гость повторяет кнопкой.
 */
export default function BookingContactsStep({
  meetingType,
  slot,
  timeZone,
  guest,
  onGuestChange,
  onBack,
  onBooked,
  onSlotTaken,
  onMeetingTypeGone,
}: BookingContactsStepProps) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  function update(field: keyof GuestDraft, value: string) {
    onGuestChange({ ...guest, [field]: value });
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (pending) {
      return;
    }

    const issues = validate(guest);
    setErrors(issues);
    setFailure(undefined);

    if (Object.keys(issues).length > 0) {
      return;
    }

    setPending(true);

    try {
      const comment = guest.comment.trim();
      const booking = await createBooking({
        meetingTypeId: meetingType.id,
        start: slot.start,
        guest: {
          name: guest.name.trim(),
          email: guest.email.trim(),
          ...(comment === "" ? {} : { comment }),
        },
      });

      onBooked(booking);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "SLOT_TAKEN") {
          onSlotTaken();
          return;
        }

        if (error.code === "MEETING_TYPE_NOT_FOUND") {
          onMeetingTypeGone();
          return;
        }

        if (error.code === "VALIDATION_ERROR") {
          if (error.fieldError("start") !== undefined) {
            onSlotTaken();
            return;
          }

          setErrors({
            name: error.fieldError("name"),
            email: error.fieldError("email"),
            comment: error.fieldError("comment"),
          });
          return;
        }

        setFailure(error.message);
        return;
      }

      setFailure("Не удалось связаться с сервером");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <Button type="button" variant="ghost" className="-ml-3" onClick={onBack} disabled={pending}>
        <ArrowLeft />
        Назад к слотам
      </Button>

      <p className="eyebrow mt-8">Шаг 3 из 3</p>
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#17231d] sm:text-4xl">
        Оставьте контакты
      </h1>
      <p className="mt-4 leading-relaxed text-[#4b5a51]">
        <span className="font-medium text-[#17231d]">{meetingType.name}</span>,{" "}
        {formatIntervalInZone(slot.start, slot.end, timeZone)}{" "}
        <span className="text-[#4b5a51]">({timeZone})</span>. Владелец увидит ваши контакты в
        кабинете.
      </p>

      {failure === undefined ? null : (
        <div className="mt-6">
          <ErrorBanner
            title={failure}
            onRetry={() => {
              void handleSubmit();
            }}
          />
        </div>
      )}

      <form
        className="mt-8 grid gap-4 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_30px_80px_rgba(40,55,46,0.12)] sm:p-8"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        <div className="grid gap-1.5">
          <Label htmlFor="guest-name">Имя</Label>
          <Input
            id="guest-name"
            value={guest.name}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="name"
            aria-invalid={errors.name !== undefined}
            aria-describedby={errors.name === undefined ? undefined : "guest-name-error"}
            onChange={(event) => update("name", event.target.value)}
          />
          <FieldError id="guest-name-error" message={errors.name} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="guest-email">Email</Label>
          <Input
            id="guest-email"
            type="email"
            value={guest.email}
            maxLength={EMAIL_MAX_LENGTH}
            autoComplete="email"
            aria-invalid={errors.email !== undefined}
            aria-describedby={errors.email === undefined ? undefined : "guest-email-error"}
            onChange={(event) => update("email", event.target.value)}
          />
          <FieldError id="guest-email-error" message={errors.email} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="guest-comment">Комментарий</Label>
          <Textarea
            id="guest-comment"
            value={guest.comment}
            maxLength={COMMENT_MAX_LENGTH}
            placeholder="Необязательно: о чём поговорить"
            aria-invalid={errors.comment !== undefined}
            aria-describedby={errors.comment === undefined ? undefined : "guest-comment-error"}
            onChange={(event) => update("comment", event.target.value)}
          />
          <FieldError id="guest-comment-error" message={errors.comment} />
        </div>

        <Button type="submit" className="mt-2 justify-self-start" disabled={pending}>
          {pending ? "Записываем…" : "Подтвердить запись"}
        </Button>
      </form>
    </section>
  );
}
