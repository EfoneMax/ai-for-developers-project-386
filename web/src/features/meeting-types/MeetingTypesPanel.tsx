import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { MeetingType } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ErrorBanner from "@/components/ErrorBanner";
import DeleteMeetingTypeDialog from "./DeleteMeetingTypeDialog";
import MeetingTypeDialog from "./MeetingTypeDialog";
import MeetingTypeListSkeleton from "./MeetingTypeListSkeleton";
import { useMeetingTypes } from "./useMeetingTypes";

/** Открытый диалог каталога: создание, правка или ничего. */
type CatalogDialog = { kind: "create" } | { kind: "edit"; meetingType: MeetingType } | undefined;

/**
 * Вкладка «Типы встреч»: каталог с поиском, созданием и действиями строки.
 *
 * Пагинации и сортировки в интерфейсе нет — запрашивается весь каталог,
 * а фильтр отправляется в API как `search`.
 */
export default function MeetingTypesPanel() {
  const [search, setSearch] = useState("");
  const { state, reload } = useMeetingTypes({ search });
  const [dialog, setDialog] = useState<CatalogDialog>();
  const [deleting, setDeleting] = useState<MeetingType>();
  const [catalogNotice, setCatalogNotice] = useState<string | undefined>();

  const searching = search.trim() !== "";

  function handleSaved() {
    setDialog(undefined);
    reload();
  }

  function handleGone() {
    setDialog(undefined);
    setDeleting(undefined);
    setCatalogNotice("Этот тип встречи уже удалён — каталог обновлён.");
    reload();
  }

  function handleDeleted() {
    setDeleting(undefined);
    reload();
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#17231d] sm:text-4xl">
          Типы встреч
        </h1>
        <Button type="button" onClick={() => setDialog({ kind: "create" })}>
          Создать
        </Button>
      </div>
      <p className="mt-4 max-w-[52ch] leading-relaxed text-[#4b5a51]">
        Созданный тип сразу виден гостю на странице записи.
      </p>

      <div className="mt-8 grid max-w-sm gap-1.5">
        <Label htmlFor="meeting-type-search">Поиск</Label>
        <Input
          id="meeting-type-search"
          type="search"
          placeholder="Название или описание"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="mt-8 grid gap-4">
        {catalogNotice === undefined ? null : <ErrorBanner title={catalogNotice} />}

        {state.status === "loading" ? <MeetingTypeListSkeleton count={2} /> : null}

        {state.status === "error" ? (
          <ErrorBanner title="Не удалось загрузить типы встреч" onRetry={reload} />
        ) : null}

        {state.status === "ready" && state.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#17231d]/20 bg-white/60 px-6 py-10 text-center">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#17231d]">
              {searching ? "Ничего не найдено" : "Пока нет типов встреч"}
            </h2>
            <p className="mx-auto mt-2 max-w-[42ch] text-sm leading-relaxed text-[#4b5a51]">
              {searching
                ? "Попробуйте изменить запрос — поиск идёт по названию и описанию."
                : "Гостю пока не на что записаться. Создайте первый тип — он сразу появится на странице записи."}
            </p>
          </div>
        ) : null}

        {state.status === "ready" && state.data.length > 0 ? (
          <ul className="grid gap-4">
            {state.data.map((meetingType) => (
              <li key={meetingType.id}>
                <Card className="rounded-2xl border-white/60 bg-white/70 shadow-none">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid gap-1.5">
                        <CardTitle>
                          <h2 className="text-lg font-semibold tracking-[-0.01em]">
                            {meetingType.name}
                          </h2>
                        </CardTitle>
                        {meetingType.description === undefined ? null : (
                          <CardDescription>{meetingType.description}</CardDescription>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Действия: ${meetingType.name}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => setDialog({ kind: "edit", meetingType })}
                          >
                            Изменить
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleting(meetingType)}
                          >
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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

      {dialog === undefined ? null : (
        <MeetingTypeDialog
          key={dialog.kind === "edit" ? dialog.meetingType.id : "create"}
          meetingType={dialog.kind === "edit" ? dialog.meetingType : undefined}
          onSaved={handleSaved}
          onNotFound={handleGone}
          onClose={() => setDialog(undefined)}
        />
      )}

      {deleting === undefined ? null : (
        <DeleteMeetingTypeDialog
          meetingType={deleting}
          onDeleted={handleDeleted}
          onNotFound={handleGone}
          onClose={() => setDeleting(undefined)}
        />
      )}
    </>
  );
}
