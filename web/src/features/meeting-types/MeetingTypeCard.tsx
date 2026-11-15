import { ArrowRight, Clock } from "lucide-react";
import type { MeetingType } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Карточка типа встречи для страницы записи. */
export default function MeetingTypeCard({
  meetingType,
  onSelect,
}: {
  meetingType: MeetingType;
  onSelect: (meetingType: MeetingType) => void;
}) {
  return (
    <Card className="flex h-full flex-col rounded-2xl border-white/60 bg-white/70 shadow-none">
      <CardHeader>
        <CardTitle>
          <h3 className="text-lg font-semibold tracking-[-0.01em]">{meetingType.name}</h3>
        </CardTitle>
        {meetingType.description === undefined ? null : (
          <CardDescription>{meetingType.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-4">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#e6efe8] px-3 py-1 text-xs font-medium text-[#2f6b4f]">
          <Clock className="size-3.5" />
          {meetingType.durationMinutes} мин
        </span>
        <Button
          type="button"
          variant="outline"
          aria-label={`Выбрать время: ${meetingType.name}`}
          onClick={() => {
            onSelect(meetingType);
          }}
        >
          Выбрать время
          <ArrowRight />
        </Button>
      </CardContent>
    </Card>
  );
}
