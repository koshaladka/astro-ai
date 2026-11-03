"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ChartItem = {
  chartId: string;
  status: string;
  isPrimary?: boolean;
  summaryPreview?: string;
  birthInput?: { date?: string; time?: string; placeName?: string };
};

export default function ChartsPage() {
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    return fetch("/api/charts")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setCharts(d.charts ?? []);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function removeChart(chartId: string) {
    if (!confirm("Удалить эту карту?")) return;
    setDeletingId(chartId);
    try {
      const res = await fetch(`/api/charts/${chartId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка удаления");
      setCharts((prev) => prev.filter((c) => c.chartId !== chartId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main>
        <p className="loading">Загружаем карты…</p>
      </main>
    );
  }

  return (
    <main>
      <div className="section-header">
        <h1>Мои карты</h1>
        <Link href="/charts/new" className="btn-ghost">
          Добавить карту
        </Link>
      </div>

      {error && <p className="error">{error}</p>}

      {charts.length === 0 ? (
        <p className="hint">
          Карт пока нет. <Link href="/charts/new">Добавить</Link> или{" "}
          <Link href="/">построить основную</Link>.
        </p>
      ) : (
        <ul className="chart-list">
          {charts.map((c) => (
            <li key={c.chartId} className="card chart-list-item">
              <div className="section-header">
                <Link href={`/chart/${c.chartId}`}>
                  {c.isPrimary ? "★ " : ""}
                  {c.birthInput?.date} · {c.birthInput?.time} · {c.birthInput?.placeName}
                </Link>
                <button
                  type="button"
                  onClick={() => removeChart(c.chartId)}
                  disabled={deletingId === c.chartId}
                >
                  {deletingId === c.chartId ? "…" : "Удалить"}
                </button>
              </div>
              {c.isPrimary && <p className="hint">Основная</p>}
              {c.summaryPreview && <p className="hint">{c.summaryPreview}…</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
