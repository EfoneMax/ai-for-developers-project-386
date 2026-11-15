import { Clock } from "lucide-react";
import type { MeetingType } from "@/client/types.gen";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Карточка типа встречи для страницы записи. */
export default function MeetingTypeCard({ meetingType }: { meetingType: MeetingType }) {
  return (
    <Card className="h-full rounded-2xl border-white/60 bg-white/70 shadow-none">
      <CardHeader>
        <CardTitle>
          <h3 className="text-lg font-semibold tracking-[-0.01em]">{meetingType.name}</h3>
        </CardTitle>
        {meetingType.description === undefined ? null : (
          <CardDescription>{meetingType.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6efe8] px-3 py-1 text-xs font-medium text-[#2f6b4f]">
          <Clock className="size-3.5" />
          {meetingType.durationMinutes} мин
        </span>
      </CardContent>
    </Card>
  );
}
