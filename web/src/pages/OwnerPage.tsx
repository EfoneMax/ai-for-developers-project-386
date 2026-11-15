import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookingsList from "@/features/bookings/BookingsList";
import MeetingTypesPanel from "@/features/meeting-types/MeetingTypesPanel";

/** Кабинет владельца: каталог типов встреч и предстоящие записи гостей. */
export default function OwnerPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-16">
      <p className="eyebrow">Кабинет владельца</p>

      <Tabs defaultValue="meeting-types">
        <TabsList className="mt-4">
          <TabsTrigger value="meeting-types">Типы встреч</TabsTrigger>
          <TabsTrigger value="upcoming">Предстоящие встречи</TabsTrigger>
        </TabsList>

        <TabsContent value="meeting-types" className="mt-8">
          <MeetingTypesPanel />
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
