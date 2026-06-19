"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChartTables } from "@/components/ChartTables";

type ChartData = {
  chartId: string;
  status: string;
  summary?: string;
  highlights?: string[];
  planets?: { output?: unknown[] };
  houses?: { output?: { Houses?: unknown[] } };
  messages?: Array<{ role: string; content: string; createdAt?: string }>;
  error?: string;
  birthInput?: { date?: string; time?: string; placeName?: string };
};

export default function ChartPage() {
  const params = useParams();
  const id = params.id as string;
  const [chart, setChart] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/charts/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Не найдено");
        if (!cancelled) {
          setChart(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ошибка");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function askQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setAsking(true);
    setAskError("");

    try {
      const res = await fetch(`/api/charts/${id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");

      setChart((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...(prev.messages ?? []),
                { role: "user", content: data.question },
                { role: "assistant", content: data.answer },
              ],
            }
          : prev
      );
      setQuestion("");
    } catch (err) {
      setAskError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setAsking(false);
    }
  }

  if (loading) {
    return (
      <main>
        <p className="loading">Загружаем карту…</p>
      </main>
    );
  }

  if (error || !chart) {
    return (
      <main>
        <Link href="/" className="back-link">
          ← Назад
        </Link>
        <p className="error">{error || "Карта не найдена"}</p>
      </main>
    );
  }

  const hasTables =
    (chart.planets?.output?.length ?? 0) > 0 ||
    (chart.houses?.output?.Houses?.length ?? 0) > 0;

  return (
    <main>
      <Link href="/" className="back-link">
        ← Новая карта
      </Link>

      <h1>Ваша натальная карта</h1>
      {chart.birthInput && (
        <p className="subtitle">
          {chart.birthInput.date} · {chart.birthInput.time} ·{" "}
          {chart.birthInput.placeName}
        </p>
      )}

      {chart.error && <p className="error">{chart.error}</p>}

      {chart.summary && (
        <section className="card">
          <h2 className="section-title">Описание</h2>
          <div className="summary">{chart.summary}</div>
          {chart.highlights && chart.highlights.length > 0 && (
            <ul className="highlights">
              {chart.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {hasTables && (
        <section className="card">
          <ChartTables planets={chart.planets} houses={chart.houses} />
        </section>
      )}

      {chart.status === "complete" && (
        <section>
          <h2 className="section-title">Вопросы по карте</h2>
          <div className="card">
            {(chart.messages ?? []).length > 0 && (
              <ul className="qa-list">
                {chart.messages!.map((m, i) => (
                  <li key={i} className={`qa-item qa-${m.role}`}>
                    <span className="qa-role">{m.role === "user" ? "Вы" : "Астролог"}</span>
                    <p>{m.content}</p>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={askQuestion} className="qa-form">
              <label htmlFor="question">Задайте вопрос по сохранённой карте</label>
              <input
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Например: что говорит карта о карьере?"
                disabled={asking}
              />
              <button type="submit" disabled={asking || !question.trim()}>
                {asking ? "Думаем…" : "Спросить"}
              </button>
              {askError && <p className="error">{askError}</p>}
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
