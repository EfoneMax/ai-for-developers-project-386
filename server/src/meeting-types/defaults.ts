import type { MeetingTypesStore } from "./store.js";

/** Стартовый тип встречи: обычная запись, которую владелец может изменить. */
interface DefaultMeetingType {
  name: string;
  description: string;
  durationMinutes: number;
}

/**
 * Типы, с которыми сервис открывается впервые. Названия и длительности
 * подобраны так, чтобы гостю было из чего выбрать сразу после запуска.
 */
const DEFAULT_MEETING_TYPES: readonly DefaultMeetingType[] = [
  {
    name: "Знакомство",
    description: "Короткий вводный звонок: обсудим задачу и решим, чем я могу помочь.",
    durationMinutes: 30,
  },
  {
    name: "Консультация",
    description: "Подробный разбор вопроса и план дальнейших шагов.",
    durationMinutes: 60,
  },
];

/**
 * Заводит стартовые типы только в пустом хранилище. Повторный вызов
 * ничего не добавляет, поэтому дублей не будет.
 */
export function seedDefaultMeetingTypes(store: MeetingTypesStore, createdAt: Date): void {
  const hasMeetingTypes =
    store.list({ page: 1, limit: 1, sort: "createdAt", order: "asc" }).total > 0;

  if (hasMeetingTypes) {
    return;
  }

  for (const meetingType of DEFAULT_MEETING_TYPES) {
    store.create(meetingType, createdAt);
  }
}
