/** Сообщение об ошибке поля формы; объявляется скринридером. */
export default function FieldError({ id, message }: { id: string; message?: string }) {
  if (message === undefined) {
    return null;
  }

  return (
    <p id={id} aria-live="polite" className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}
