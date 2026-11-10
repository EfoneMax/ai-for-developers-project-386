import { Link } from "react-router-dom";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookingPage() {
  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-20">
      <div className="rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-[0_30px_80px_rgba(40,55,46,0.12)] sm:p-12">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#e6efe8] text-[#2f6b4f]">
          <CalendarClock className="size-6" />
        </span>
        <p className="eyebrow mt-6">Страница записи</p>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#17231d] sm:text-4xl">
          Страница записи скоро появится
        </h1>
        <p className="mx-auto mt-4 max-w-[44ch] leading-relaxed text-[#4b5a51]">
          Бронирование появится на следующем этапе: выбор типа встречи, свободного слота и
          контактных данных гостя.
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link to="/">
            <ArrowLeft />
            На главную
          </Link>
        </Button>
      </div>
    </section>
  );
}
