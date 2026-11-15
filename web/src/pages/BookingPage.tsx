import { Link } from "react-router-dom";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import ErrorBanner from "@/components/ErrorBanner";
import MeetingTypeCard from "@/features/meeting-types/MeetingTypeCard";
import MeetingTypeListSkeleton from "@/features/meeting-types/MeetingTypeListSkeleton";
import { useMeetingTypes } from "@/features/meeting-types/useMeetingTypes";

export default function BookingPage() {
  const { state, reload } = useMeetingTypes();

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <p className="eyebrow">Страница записи</p>
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#17231d] sm:text-4xl">
        Выберите тип встречи
      </h1>
      <p className="mt-4 max-w-[52ch] leading-relaxed text-[#4b5a51]">
        Владелец заранее задал название, описание и длительность. Свободные слоты появятся на
        следующем шаге.
      </p>

      <div className="mt-10">
        {state.status === "loading" ? <MeetingTypeListSkeleton /> : null}

        {state.status === "error" ? (
          <ErrorBanner title="Не удалось загрузить типы встреч" onRetry={reload} />
        ) : null}

        {state.status === "ready" && state.items.length === 0 ? (
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

        {state.status === "ready" && state.items.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {state.items.map((meetingType) => (
              <li key={meetingType.id}>
                <MeetingTypeCard meetingType={meetingType} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
