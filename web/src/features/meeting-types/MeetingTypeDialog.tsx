import { useState, type FormEvent } from "react";
import type { MeetingType } from "@/client/types.gen";
import FieldError from "@/components/FieldError";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-error";
import { createMeetingType, updateMeetingType } from "./api";

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;
const DURATION_MIN = 5;
const DURATION_MAX = 240;
const DURATION_MESSAGE = `Длительность — целое число от ${DURATION_MIN} до ${DURATION_MAX} минут`;

interface FieldErrors {
  name?: string;
  description?: string;
  durationMinutes?: string;
}

function validate(name: string, description: string, duration: string): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    errors.name = "Укажите название";
  } else if (trimmedName.length > NAME_MAX_LENGTH) {
    errors.name = `Название — не больше ${NAME_MAX_LENGTH} символов`;
  }

  if (description.trim().length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Описание — не больше ${DESCRIPTION_MAX_LENGTH} символов`;
  }

  const minutes = Number(duration.trim());
  if (!Number.isInteger(minutes) || minutes < DURATION_MIN || minutes > DURATION_MAX) {
    errors.durationMinutes = DURATION_MESSAGE;
  }

  return errors;
}

interface MeetingTypeDialogProps {
  /** Тип для правки; при создании не передаётся. */
  meetingType?: MeetingType;
  /** Вызывается после успешного сохранения — каталог перезагружается. */
  onSaved: () => void;
  /** Вызывается, когда тип исчез: диалог закрывается, каталог обновляется. */
  onNotFound: () => void;
  /** Закрывает диалог без сохранения. */
  onClose: () => void;
}

/**
 * Один диалог для создания и правки типа встречи.
 *
 * Проверяет поля на клиенте, раскладывает серверные `details` по полям,
 * блокирует кнопку на время запроса и сообщает об успехе вызывающему экрану.
 */
export default function MeetingTypeDialog({
  meetingType,
  onSaved,
  onNotFound,
  onClose,
}: MeetingTypeDialogProps) {
  const [name, setName] = useState(meetingType?.name ?? "");
  const [description, setDescription] = useState(meetingType?.description ?? "");
  const [duration, setDuration] = useState(String(meetingType?.durationMinutes ?? 30));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next && !pending) {
      onClose();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const issues = validate(name, description, duration);
    setErrors(issues);
    setGeneralError(undefined);

    if (Object.keys(issues).length > 0) {
      return;
    }

    setPending(true);

    try {
      const trimmedName = name.trim();
      const trimmedDescription = description.trim();
      const durationMinutes = Number(duration.trim());

      if (meetingType === undefined) {
        await createMeetingType({
          name: trimmedName,
          ...(trimmedDescription === "" ? {} : { description: trimmedDescription }),
          durationMinutes,
        });
      } else {
        await updateMeetingType(meetingType.id, {
          name: trimmedName,
          description: trimmedDescription,
          durationMinutes,
        });
      }

      onSaved();
    } catch (error) {
      if (error instanceof ApiError && error.code === "MEETING_TYPE_NOT_FOUND") {
        onNotFound();
        return;
      }

      if (error instanceof ApiError && error.code === "VALIDATION_ERROR") {
        setErrors({
          name: error.fieldError("name"),
          description: error.fieldError("description"),
          durationMinutes: error.fieldError("durationMinutes"),
        });
      } else {
        setGeneralError(
          error instanceof ApiError ? error.message : "Не удалось сохранить тип встречи",
        );
      }
    } finally {
      setPending(false);
    }
  }

  const editing = meetingType !== undefined;

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void handleSubmit(event)} noValidate>
          <DialogHeader>
            <DialogTitle>{editing ? "Изменить тип встречи" : "Новый тип встречи"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Правка не меняет уже созданные брони: они сохраняют прежние название и длительность."
                : "Созданный тип сразу появится на странице записи."}
            </DialogDescription>
          </DialogHeader>

          {generalError === undefined ? null : (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {generalError}
            </p>
          )}

          <div className="mt-5 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="meeting-type-name">Название</Label>
              <Input
                id="meeting-type-name"
                value={name}
                maxLength={NAME_MAX_LENGTH}
                aria-invalid={errors.name !== undefined}
                aria-describedby={errors.name === undefined ? undefined : "meeting-type-name-error"}
                onChange={(event) => setName(event.target.value)}
              />
              <FieldError id="meeting-type-name-error" message={errors.name} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="meeting-type-description">Описание</Label>
              <Textarea
                id="meeting-type-description"
                value={description}
                maxLength={DESCRIPTION_MAX_LENGTH}
                aria-invalid={errors.description !== undefined}
                aria-describedby={
                  errors.description === undefined ? undefined : "meeting-type-description-error"
                }
                onChange={(event) => setDescription(event.target.value)}
              />
              <FieldError id="meeting-type-description-error" message={errors.description} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="meeting-type-duration">Длительность, мин</Label>
              <Input
                id="meeting-type-duration"
                type="number"
                inputMode="numeric"
                min={DURATION_MIN}
                max={DURATION_MAX}
                value={duration}
                aria-invalid={errors.durationMinutes !== undefined}
                aria-describedby={
                  errors.durationMinutes === undefined ? undefined : "meeting-type-duration-error"
                }
                onChange={(event) => setDuration(event.target.value)}
              />
              <FieldError id="meeting-type-duration-error" message={errors.durationMinutes} />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending ? "Сохраняем…" : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
