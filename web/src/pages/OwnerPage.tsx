import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ErrorBanner from "@/components/ErrorBanner";
import BookingsList from "@/features/bookings/BookingsList";
import CreateMeetingTypeDialog from "@/features/meeting-types/CreateMeetingTypeDialog";
import MeetingTypeListSkeleton from "@/features/meeting-types/MeetingTypeListSkeleton";
import { useMeetingTypes } from "@/features/meeting-types/useMeetingTypes";

/** Кабинет владельца: каталог типов встреч и предстоящие записи гостей. */
export default function OwnerPage() {
  const { state, reload } = useMeetingTypes();

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-16">
      <p className="eyebrow">Кабинет владельца</p>

      <Tabs defaultValue="meeting-types">
        <TabsList className="mt-4">
          <TabsTrigger value="meeting-types">Типы встреч</TabsTrigger>
          <TabsTrigger value="upcoming">Предстоящие встречи</TabsTrigger>
        </TabsList>

        <TabsContent value="meeting-types" className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#17231d] sm:text-4xl">
              Типы встреч
            </h1>
            <CreateMeetingTypeDialog onCreated={reload} />
          </div>
          <p className="mt-4 max-w-[52ch] leading-relaxed text-[#4b5a51]">
            Созданный тип сразу виден гостю на странице записи.
          </p>

          <div className="mt-10">
            {state.status === "loading" ? <MeetingTypeListSkeleton count={2} /> : null}

            {state.status === "error" ? (
              <ErrorBanner title="Не удалось загрузить типы встреч" onRetry={reload} />
            ) : null}

            {state.status === "ready" && state.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#17231d]/20 bg-white/60 px-6 py-10 text-center">
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#17231d]">
                  Пока нет типов встреч
                </h2>
                <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-[#4b5a51]">
                  Гостю пока не на что записаться. Создайте первый тип — он сразу появится на
                  странице записи.
                </p>
              </div>
            ) : null}

            {state.status === "ready" && state.items.length > 0 ? (
              <ul className="grid gap-4">
                {state.items.map((meetingType) => (
                  <li key={meetingType.id}>
                    <Card className="rounded-2xl border-white/60 bg-white/70 shadow-none">
                      <CardHeader>
                        <CardTitle>
                          <h2 className="text-lg font-semibold tracking-[-0.01em]">
                            {meetingType.name}
                          </h2>
                        </CardTitle>
                        {meetingType.description === undefined ? null : (
                          <CardDescription>{meetingType.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <span className="inline-flex items-center rounded-full bg-[#e6efe8] px-3 py-1 text-xs font-medium text-[#2f6b4f]">
                          {meetingType.durationMinutes} мин
                        </span>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-8">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#17231d] sm:text-4xl">
            Предстоящие встречи
          </h1>
          <p className="mt-4 max-w-[52ch] leading-relaxed text-[#4b5a51]">
            Только подтверждённые брони, которые ещё не закончились, — ближайшая сверху.
          </p>

          <div className="mt-10">
            <BookingsList />
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/book">
            Открыть страницу записи
            <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/">На главную</Link>
        </Button>
      </div>
    </section>
  );
}
