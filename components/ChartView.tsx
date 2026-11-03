"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChartTables } from "@/components/ChartTables";
import { MarkdownContent } from "@/components/MarkdownContent";
import type { HouseDisplayRow, PlanetDisplayRow } from "@/lib/astrology/chart-format";
import {
  buildChartMarkdown,
  downloadMarkdownFile,
} from "@/lib/astrology/chart-markdown-export";

export type ChartViewData = {
  chartId: string;
  status: string;
  isPrimary?: boolean;
  summary?: string;
  highlights?: string[];
  planetsDisplay?: PlanetDisplayRow[];
  housesDisplay?: HouseDisplayRow[];
  messages?: Array<{ role: string; content: string; createdAt?: string }>;
  error?: string;
  birthInput?: { date?: string; time?: string; placeName?: string };
};

type Props = {
  chartId: string;
  /** Если передан — не грузим заново при маунте (можно обновить через reloadKey) */
  initialChart?: ChartViewData | null;
  showTitle?: boolean;
  backHref?: string;
  backLabel?: string;
  onDeleted?: () => void;
};

export function ChartView({
  chartId,
  initialChart = null,
  showTitle = true,
  backHref,
  backLabel = "← Назад",
  onDeleted,
}: Props) {
  const router = useRouter();
  const [chart, setChart] = useState<ChartViewData | null>(initialChart);
  const [loading, setLoading] = useState(!initialChart);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (initialChart && initialChart.chartId === chartId) {
      setChart(initialChart);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/charts/${chartId}`);
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
  }, [chartId, initialChart]);

  async function askQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setAsking(true);
    setAskError("");

    try {
      const res = await fetch(`/api/charts/${chartId}/ask`, {
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

  function downloadDescription() {
    if (!chart?.summary) return;

    const markdown = buildChartMarkdown({
      summary: chart.summary,
      highlights: chart.highlights,
      birthInput: chart.birthInput,
      planetsDisplay: chart.planetsDisplay,
      housesDisplay: chart.housesDisplay,
    });

    downloadMarkdownFile(markdown, `natal-chart-${chartId}.md`);
  }

  async function refreshDescription() {
    setRefreshing(true);
    setRefreshError("");

    try {
      const res = await fetch(`/api/charts/${chartId}/reinterpret`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");

      setChart((prev) =>
        prev
          ? {
              ...prev,
              summary: data.summary,
              highlights: data.highlights,
            }
          : prev
      );
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setRefreshing(false);
    }
  }

  async function removeChart() {
    if (!confirm("Удалить эту карту?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/charts/${chartId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка удаления");
      if (onDeleted) onDeleted();
      else router.push("/charts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className="loading">Загружаем карту…</p>;
  }

  if (error || !chart) {
    return (
      <div>
        {backHref && (
          <Link href={backHref} className="back-link">
            {backLabel}
          </Link>
        )}
        <p className="error">{error || "Карта не найдена"}</p>
      </div>
    );
  }

  const hasTables =
    (chart.planetsDisplay?.length ?? 0) > 0 ||
    (chart.housesDisplay?.length ?? 0) > 0;

  return (
    <div className="chart-view">
      {backHref && (
        <Link href={backHref} className="back-link">
          {backLabel}
        </Link>
      )}

      {showTitle && (
        <>
          <div className="section-header">
            <h1>{chart.isPrimary ? "Основная карта" : "Натальная карта"}</h1>
            {!chart.isPrimary && <button type="button" onClick={removeChart} disabled={deleting}>
              {deleting ? "Удаляем…" : "Удалить"}
            </button>}
          </div>
          {chart.birthInput && (
            <p className="subtitle">
              {chart.birthInput.date} · {chart.birthInput.time} ·{" "}
              {chart.birthInput.placeName}
            </p>
          )}
        </>
      )}

      {!showTitle && (
        <div className="section-header">
          <h2 className="section-title">Основная карта</h2>
        </div>
      )}

      {chart.error && <p className="error">{chart.error}</p>}

      {hasTables && (
        <section className="card">
          <ChartTables
            planetsDisplay={chart.planetsDisplay}
            housesDisplay={chart.housesDisplay}
          />
        </section>
      )}

      {chart.status === "complete" && (
        <section className="card">
          <div className="section-header">
            <h2 className="section-title">Описание</h2>
            <div className="section-header-actions">
              <button
                type="button"
                onClick={downloadDescription}
                disabled={!chart.summary}
              >
                Скачать
              </button>
              <button type="button" onClick={refreshDescription} disabled={refreshing}>
                {refreshing ? "Обновляем…" : "Обновить описание"}
              </button>
            </div>
          </div>
          {refreshError && <p className="error">{refreshError}</p>}
          {chart.summary ? (
            <MarkdownContent className="summary">{chart.summary}</MarkdownContent>
          ) : (
            <p className="hint">Описание пока не сгенерировано.</p>
          )}
          {chart.highlights && chart.highlights.length > 0 && (
            <ul className="highlights">
              {chart.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
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
              <label htmlFor={`question-${chartId}`}>Задайте вопрос по сохранённой карте</label>
              <input
                id={`question-${chartId}`}
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
    </div>
  );
}
