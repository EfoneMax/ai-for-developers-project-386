import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getHealth } from "./client/sdk.gen";

type ConnectionState = "loading" | "ok" | "error";

interface Connection {
  state: ConnectionState;
  message: string;
}

const initialConnection: Connection = {
  state: "loading",
  message: "Проверяем связь с API…",
};

export default function App() {
  const [connection, setConnection] = useState<Connection>(initialConnection);
  const requestId = useRef(0);

  const runHealthCheck = useCallback(async () => {
    const currentRequest = ++requestId.current;

    try {
      const { data, error } = await getHealth();

      if (currentRequest !== requestId.current) return;

      if (error) {
        setConnection({ state: "error", message: "API вернул ошибку" });
        return;
      }

      setConnection(
        data?.status === "ok"
          ? { state: "ok", message: "API отвечает" }
          : { state: "error", message: "API вернул неожиданный ответ" },
      );
    } catch (caught: unknown) {
      if (currentRequest !== requestId.current) return;

      setConnection({
        state: "error",
        message: caught instanceof Error ? caught.message : "Неизвестная ошибка",
      });
    }
  }, []);

  const refresh = useCallback(() => {
    setConnection(initialConnection);
    void runHealthCheck();
  }, [runHealthCheck]);

  useEffect(() => {
    // The initial health check is an external sync; the request result is the only source of state.
    // oxlint-disable-next-line react/set-state-in-effect
    void runHealthCheck();
  }, [runHealthCheck]);

  return (
    <main className="page">
      <Card className="w-full max-w-2xl gap-0 rounded-[28px] border border-white/60 bg-white/80 py-0 shadow-[0_30px_80px_rgba(40,55,46,0.14)] backdrop-blur-xl">
        <CardHeader className="px-8 pt-10 sm:px-12 sm:pt-14">
          <span className="eyebrow">Каркас приложения</span>
          <CardTitle className="text-4xl font-semibold tracking-[-0.045em] text-[#17231d] sm:text-6xl">
            Календарь звонков
          </CardTitle>
          <CardDescription className="max-w-[44ch] text-base leading-relaxed text-[#4b5a51] sm:text-lg">
            Владелец публикует доступное время, а гость выбирает свободный слот и записывается на
            встречу.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pt-8 sm:px-12">
          <output
            aria-live="polite"
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold",
              connection.state === "ok" && "bg-emerald-50 text-emerald-700",
              connection.state === "error" && "bg-red-50 text-red-700",
              connection.state === "loading" && "bg-slate-100 text-slate-600",
            )}
          >
            {connection.state === "ok" ? (
              <CheckCircle2 className="size-4" />
            ) : connection.state === "error" ? (
              <AlertCircle className="size-4" />
            ) : (
              <RefreshCw className="size-4 animate-spin" />
            )}
            {connection.message}
          </output>
        </CardContent>

        <CardFooter className="mt-8 flex flex-col items-start gap-4 border-t border-[#17231d]/10 bg-transparent px-8 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-12">
          <p className="text-xs leading-relaxed text-[#6d7a72]">
            React + Vite · Fastify · TypeSpec → OpenAPI → TypeScript SDK
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={connection.state === "loading"}
            onClick={refresh}
          >
            <RefreshCw />
            Проверить снова
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
