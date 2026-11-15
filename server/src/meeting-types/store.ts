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

/**
 * Изменения типа встречи. `description: null` убирает описание, а
 * отсутствующее поле оставляет его как есть.
 */
interface MeetingTypeChanges {
  name?: string;
  description?: string | null;
  durationMinutes?: number;
}

/** Поле сортировки списка типов встреч из контракта. */
export type MeetingTypeSortField = "createdAt" | "name" | "durationMinutes";

/** Направление сортировки списка из контракта. */
export type SortOrder = "asc" | "desc";

/** Параметры страницы списка типов встреч. */
export interface MeetingTypeListParams {
  page: number;
  limit: number;
  sort: MeetingTypeSortField;
  order: SortOrder;
  search?: string;
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
  list(params: MeetingTypeListParams): MeetingTypePage;
  get(id: string): MeetingType | undefined;
  create(input: NewMeetingType, createdAt: Date): MeetingType;
  update(id: string, changes: MeetingTypeChanges): MeetingType | undefined;
  remove(id: string): boolean;
}

/**
 * Создаёт пустое хранилище типов встреч. Хранилище живёт ровно столько,
 * сколько живёт приложение, поэтому каждый тест начинает с чистой страницы.
 */
export function createMeetingTypesStore(): MeetingTypesStore {
  const meetingTypes: MeetingType[] = [];

  return {
    list({ page, limit, sort, order, search }) {
      const matches =
        search === undefined || search === ""
          ? meetingTypes
          : meetingTypes.filter((meetingType) => matchesSearch(meetingType, search));

      const direction = order === "asc" ? 1 : -1;
      const sorted = [...matches].sort((a, b) => direction * compareMeetingTypes(a, b, sort));
      const first = (page - 1) * limit;

      return {
        items: sorted.slice(first, first + limit),
        total: sorted.length,
        page,
        limit,
      };
    },

    get(id) {
      return meetingTypes.find((meetingType) => meetingType.id === id);
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

    update(id, changes) {
      const meetingType = meetingTypes.find((candidate) => candidate.id === id);

      if (meetingType === undefined) {
        return undefined;
      }

      if (changes.name !== undefined) {
        meetingType.name = changes.name;
      }

      if (changes.durationMinutes !== undefined) {
        meetingType.durationMinutes = changes.durationMinutes;
      }

      if (changes.description === null) {
        delete meetingType.description;
      } else if (changes.description !== undefined) {
        meetingType.description = changes.description;
      }

      return meetingType;
    },

    remove(id) {
      const index = meetingTypes.findIndex((candidate) => candidate.id === id);

      if (index === -1) {
        return false;
      }

      meetingTypes.splice(index, 1);
      return true;
    },
  };
}

/** Подстрока без учёта регистра по названию и описанию. */
function matchesSearch(meetingType: MeetingType, search: string): boolean {
  const needle = search.toLowerCase();
  const haystacks = [meetingType.name, meetingType.description ?? ""];

  return haystacks.some((value) => value.toLowerCase().includes(needle));
}

/** Сравнение двух типов по выбранному полю; названия — по алфавиту. */
function compareMeetingTypes(a: MeetingType, b: MeetingType, sort: MeetingTypeSortField): number {
  switch (sort) {
    case "name":
      return a.name.localeCompare(b.name, "ru");
    case "durationMinutes":
      return a.durationMinutes - b.durationMinutes;
    case "createdAt":
      return a.createdAt.localeCompare(b.createdAt);
  }
}
