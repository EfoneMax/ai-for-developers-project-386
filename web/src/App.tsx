import { useEffect, useState } from "react";
import { getHealth } from "./client/sdk.gen";

type ConnectionState = "loading" | "ok" | "error";

interface Connection {
  state: ConnectionState;
  message: string;
}

export default function App() {
  const [connection, setConnection] = useState<Connection>({
    state: "loading",
    message: "Проверяем связь с API…",
  });

  useEffect(() => {
    let active = true;

    getHealth()
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          setConnection({ state: "error", message: "API вернул ошибку" });
          return;
        }

        setConnection(
          data?.status === "ok"
            ? { state: "ok", message: "API отвечает" }
            : { state: "error", message: "API вернул неожиданный ответ" },
        );
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setConnection({
          state: "error",
          message: caught instanceof Error ? caught.message : "Неизвестная ошибка",
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="page">
      <div className="card">
        <span className="eyebrow">Каркас приложения</span>
        <h1>Календарь звонков</h1>
        <p className="lead">
          Владелец публикует доступное время, а гость выбирает свободный слот и записывается на
          встречу.
        </p>

        <p className={`status status--${connection.state}`}>
          <span className="status__dot" aria-hidden="true" />
          {connection.message}
        </p>

        <footer>
          Фронтенд: React + Vite. Бэкенд: Fastify. Контракт: TypeSpec → OpenAPI → TypeScript SDK.
        </footer>
      </div>
    </main>
  );
}
