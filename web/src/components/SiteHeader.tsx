import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SiteHeader() {
  return (
    <header className="border-b border-[#17231d]/10 bg-[#f3f1e9]/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[#17231d]"
        >
          <span className="grid size-8 place-items-center rounded-full bg-[#17231d] text-[#f3f1e9]">
            <CalendarDays className="size-4" />
          </span>
          Календарь звонков
        </Link>

        <Button asChild>
          <Link to="/book">Записаться</Link>
        </Button>
      </div>
    </header>
  );
}
