import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "Выберите тип встречи",
    description: "Владелец заранее задал название, описание и длительность.",
  },
  {
    title: "Выберите свободный слот",
    description: "Календарь на 14 дней показывает только доступное время.",
  },
  {
    title: "Оставьте контакты",
    description: "Имя и email — и встреча появится у владельца в списке предстоящих.",
  },
];

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: UserRound,
    title: "Без регистрации",
    description: "Гостю не нужен аккаунт: только имя и email.",
  },
  {
    icon: CalendarDays,
    title: "Только свободное время",
    description: "Занятые и пересекающиеся слоты не показываются в календаре.",
  },
  {
    icon: Clock,
    title: "Шаг 30 минут",
    description: "Встречи начинаются каждые полчаса в рабочие часы владельца.",
  },
  {
    icon: ShieldCheck,
    title: "Без наложений",
    description: "Даже одновременные запросы на один слот не создадут две брони.",
  },
];

const cardClassName = cn("h-full rounded-2xl border-white/60 bg-white/70 shadow-none");

const rules = [
  { label: "Рабочие дни", value: "Понедельник–пятница" },
  { label: "Рабочие часы", value: "10:00–18:00" },
  { label: "Часовой пояс", value: "Europe/Moscow, UTC+3" },
  { label: "Окно записи", value: "14 календарных дней" },
];

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-6 pt-16 pb-14 text-center sm:pt-24">
        <span className="eyebrow">Запись на звонок</span>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-[-0.045em] text-[#17231d] sm:text-6xl">
          Запись на звонок без переписки
        </h1>
        <p className="mx-auto mt-5 max-w-[52ch] text-lg leading-relaxed text-[#4b5a51]">
          Владелец публикует свободное время, гость выбирает слот и подтверждает встречу. Без
          регистрации и лишних шагов.
        </p>

        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="px-5">
            <Link to="/book">
              Записаться
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <section id="how" aria-labelledby="how-title" className="mx-auto w-full max-w-5xl px-6 py-14">
        <h2 id="how-title" className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
          Как это работает
        </h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Card className={cardClassName}>
                <CardHeader>
                  <span className="text-xs font-semibold tracking-[0.14em] text-[#4f7a5f]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="features-title" className="mx-auto w-full max-w-5xl px-6 py-14">
        <h2 id="features-title" className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
          Что умеет сервис
        </h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature.title}>
              <Card className={cardClassName}>
                <CardHeader>
                  <span className="grid size-10 place-items-center rounded-full bg-[#e6efe8] text-[#2f6b4f]">
                    <feature.icon className="size-5" />
                  </span>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="rules-title" className="mx-auto w-full max-w-5xl px-6 py-14">
        <h2 id="rules-title" className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
          Правила записи
        </h2>
        <Card className={cn("mt-8", cardClassName)}>
          <CardContent className="py-2">
            <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {rules.map((rule) => (
                <div key={rule.label}>
                  <dt className="text-xs font-semibold tracking-[0.12em] text-[#6d7a72] uppercase">
                    {rule.label}
                  </dt>
                  <dd className="mt-1 text-base font-medium text-[#17231d]">{rule.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <p className="mt-4 text-sm text-[#6d7a72]">
          Длительность слота равна длительности выбранного типа встречи. Встречи встык разрешены,
          пересечения — нет.
        </p>
      </section>

      <section aria-labelledby="cta-title" className="mx-auto w-full max-w-5xl px-6 pt-6 pb-20">
        <div className="rounded-3xl bg-[#17231d] px-8 py-12 text-center text-[#f3f1e9] sm:px-12">
          <h2 id="cta-title" className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            Готовы выбрать время?
          </h2>
          <p className="mx-auto mt-3 max-w-[40ch] text-sm leading-relaxed text-[#c9d2cc] sm:text-base">
            Запись займёт пару минут: тип встречи, свободный слот и контакты.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-7 px-5">
            <Link to="/book">
              Выбрать время
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
