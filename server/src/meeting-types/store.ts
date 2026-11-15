import { randomUUID } from "node:crypto";

/** Тип встречи в хранилище. */
interface MeetingType {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  createdAt: string;
}

/** Поля, которые клиент передаёт при создании типа встречи. */
interface NewMeetingType {
  name: string;
  description?: string;
  durationMinutes: number;
}

/** Страница списка типов встреч. */
interface MeetingTypePage {
  items: MeetingType[];
  total: number;
  page: number;
  limit: number;
}

/** Хранилище типов встреч в памяти процесса. */
export interface MeetingTypesStore {
  list(params: { page: number; limit: number }): MeetingTypePage;
  create(input: NewMeetingType, createdAt: Date): MeetingType;
}

/**
 * Создаёт пустое хранилище типов встреч. Хранилище живёт ровно столько,
 * сколько живёт приложение, поэтому каждый тест начинает с чистой страницы.
 */
export function createMeetingTypesStore(): MeetingTypesStore {
  const meetingTypes: MeetingType[] = [];

  return {
    list({ page, limit }) {
      const first = (page - 1) * limit;

      return {
        items: meetingTypes.slice(first, first + limit),
        total: meetingTypes.length,
        page,
        limit,
      };
    },

    create(input, createdAt) {
      const meetingType: MeetingType = {
        id: randomUUID(),
        name: input.name,
        ...(input.description === undefined ? {} : { description: input.description }),
        durationMinutes: input.durationMinutes,
        createdAt: createdAt.toISOString(),
      };

      meetingTypes.push(meetingType);
      return meetingType;
    },
  };
}
