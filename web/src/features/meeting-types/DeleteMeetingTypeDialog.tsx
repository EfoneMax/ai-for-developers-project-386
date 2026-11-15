import { useState, type MouseEvent } from "react";
import type { MeetingType } from "@/client/types.gen";
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
import { deleteMeetingType } from "./api";

interface DeleteMeetingTypeDialogProps {
  meetingType: MeetingType;
  /** Вызывается после успешного удаления — каталог перезагружается. */
  onDeleted: () => void;
  /** Вызывается, когда тип уже исчез: подтверждение закрывается, каталог обновляется. */
  onNotFound: () => void;
  /** Закрывает подтверждение без удаления. */
  onClose: () => void;
}

/**
 * Подтверждение удаления типа встречи.
 *
 * Удаление разрешено всегда, поэтому текст честно говорит, что брони
 * сохранятся и продолжат занимать своё время (ADR-0006).
 */
export default function DeleteMeetingTypeDialog({
  meetingType,
  onDeleted,
  onNotFound,
  onClose,
}: DeleteMeetingTypeDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);

    try {
      await deleteMeetingType(meetingType.id);
      onDeleted();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "MEETING_TYPE_NOT_FOUND") {
        onNotFound();
        return;
      }

      setError(caught instanceof ApiError ? caught.message : "Не удалось удалить тип встречи");
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
          <AlertDialogTitle>Удалить тип «{meetingType.name}»?</AlertDialogTitle>
          <AlertDialogDescription>
            Тип исчезнет с публичной страницы, и гость больше не сможет на него записаться. Уже
            созданные брони сохранятся и сохранят прежние название и длительность — занятое ими
            время останется за гостем.
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
            {pending ? "Удаляем…" : "Удалить"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
