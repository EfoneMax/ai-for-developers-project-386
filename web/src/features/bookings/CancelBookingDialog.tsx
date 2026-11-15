import { useState, type MouseEvent } from "react";
import type { Booking } from "@/client/types.gen";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApiError } from "@/lib/api-error";
import { cancelBooking } from "./api";
import { formatMoscowDay, formatMoscowInterval } from "./format";

interface CancelBookingDialogProps {
  booking: Booking;
  /** Вызывается после успешной отмены — строка исчезает и список перезагружается. */
  onCancelled: () => void;
  /** Вызывается, когда бронь уже нельзя отменить: баннер и перезагрузка списка. */
  onNotCancellable: () => void;
  /** Закрывает подтверждение без отмены. */
  onClose: () => void;
}

/**
 * Подтверждение отмены предстоящей встречи.
 *
 * Отмена освобождает слот, но не удаляет бронь: запись остаётся в статусе
 * `cancelled` со снимком типа и прежним временем.
 */
export default function CancelBookingDialog({
  booking,
  onCancelled,
  onNotCancellable,
  onClose,
}: CancelBookingDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);

    try {
      await cancelBooking(booking.id);
      onCancelled();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "BOOKING_NOT_CANCELLABLE") {
        onNotCancellable();
        return;
      }

      setError(caught instanceof ApiError ? caught.message : "Не удалось отменить встречу");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) {
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Отменить встречу с {booking.guest.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Слот {formatMoscowDay(booking.start)},{" "}
            {formatMoscowInterval(booking.start, booking.end)} снова появится на странице записи —
            на это время сможет записаться другой гость. Бронь сохранится в статусе «отменена» —
            вернуть встречу нельзя.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error === undefined ? null : (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Отмена</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => void handleConfirm(event)}
          >
            {pending ? "Отменяем…" : "Отменить"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
