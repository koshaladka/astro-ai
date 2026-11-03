"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ECLIPSE_TYPES, ECLIPSE_CATALOG, type EclipseType } from "@/lib/overlays/catalog";
import { overlayApi, utcLabel } from "@/lib/overlays/browser-api";
import type { OverlayView } from "@/lib/overlays/types";

type Chart = { chartId: string; isPrimary?: boolean; status: string; birthInput?: { date?: string; time?: string; placeName?: string } };
type Eclipse = { id: string; type: EclipseType; maximumAt: string; fetchStatus: string; error?: string; busy: boolean; sourceUrl: string; timeNote: string };
type Saved = { id: string; label: string; eclipseType: EclipseType; maximumAt: string; aspectCount: number; interpretationStatus: string };
export default function OverlaysPage() {
  const router = useRouter();
  const [charts, setCharts] = useState<Chart[]>([]);
  const [eclipses, setEclipses] = useState<Eclipse[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [chartId, setChartId] = useState("");
  const [eclipseId, setEclipseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<EclipseType>("solar-total");
  const [newTime, setNewTime] = useState("");
  const [source, setSource] = useState("");
  async function load() {
    const [c, e, s] = await Promise.all([
      overlayApi<{ charts: Chart[] }>("/api/charts"),
      overlayApi<{ eclipses: Eclipse[] }>("/api/eclipses"),
      overlayApi<{ overlays: Saved[] }>("/api/overlays"),
    ]);
    const available = c.charts.filter(x => x.status === "complete" || x.status === "fetched");
    setCharts(available); setEclipses(e.eclipses); setSaved(s.overlays);
    setChartId(old => old || available.find(x => x.isPrimary)?.chartId || available[0]?.chartId || "");
    setEclipseId(old => old || e.eclipses[0]?.id || "");
  }
  useEffect(() => { load().catch(e => setError(String(e.message))).finally(() => setLoading(false)); }, []);
  async function action(key: string, run: () => Promise<void>) {
    setBusy(key); setError(""); setNotice("");
    try { await run(); } catch (e) { setError(e instanceof Error ? e.message : "Ошибка"); }
    finally { setBusy(""); }
  }
  async function create(event: FormEvent) {
    event.preventDefault();
    await action("create", async () => {
      const result = await overlayApi<{ overlay: OverlayView; created: boolean }>("/api/overlays", { natalChartId: chartId, eclipseId });
      // Расчёт уже сохранён до запроса ИИ; повторная пара открывается без новых вызовов.
      router.push(`/overlays/${result.overlay.id}${result.created && result.overlay.aspects.length ? "?interpret=1" : ""}`);
    });
  }
  async function add(event: FormEvent) {
    event.preventDefault();
    await action("add", async () => {
      const result = await overlayApi<{ id: string }>("/api/eclipses", { type: newType, maximumAt: `${newTime.length === 16 ? newTime + ":00" : newTime}Z`, sourceUrl: source });
      await load(); setEclipseId(result.id); setShowAdd(false); setNewTime(""); setSource(""); setNotice("Затмение добавлено.");
    });
  }
  if (loading) return <main><p className="loading">Загружаем наложения…</p></main>;
  return <main>
    <div className="section-header"><h1>Наложения</h1><button type="button" onClick={() => setShowForm(x => !x)}>{showForm ? "Скрыть форму" : "Новое наложение"}</button></div>
    <p className="subtitle">Натальная карта и затмение: аспекты, расшифровка и обсуждение.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {showForm && <form className="card overlay-form" onSubmit={create}>
      <h2>Новое наложение</h2>
      {charts.length ? <><label htmlFor="natal-chart">Натальная карта</label><select id="natal-chart" value={chartId} onChange={e => setChartId(e.target.value)} required>
        {charts.map(c => <option key={c.chartId} value={c.chartId}>{c.isPrimary ? "★ Основная · " : ""}{c.birthInput?.date} {c.birthInput?.time} · {c.birthInput?.placeName}</option>)}
      </select></> : <p>Сначала <Link href="/charts/new">добавьте натальную карту</Link>.</p>}
      <label htmlFor="eclipse">Затмение</label><select id="eclipse" value={eclipseId} onChange={e => setEclipseId(e.target.value)} required disabled={!eclipses.length}>
        {!eclipses.length && <option value="">Загрузите каталог ниже</option>}
        {eclipses.map(e => <option key={e.id} value={e.id}>{utcLabel(e.maximumAt)} · {ECLIPSE_TYPES[e.type]}</option>)}
      </select>
      <button disabled={!!busy || !chartId || !eclipseId}>{busy === "create" ? "Рассчитываем…" : "Рассчитать наложение"}</button>
    </form>}
    <h2 className="section-title">Сохранённые наложения</h2>
    {!saved.length ? <p className="hint">Результатов пока нет. Создайте первое наложение.</p> : <ul className="chart-list">{saved.map(s => <li key={s.id} className="card chart-list-item">
      <Link href={`/overlays/${s.id}`}>{s.label} × {ECLIPSE_TYPES[s.eclipseType]}</Link>
      <p>{utcLabel(s.maximumAt)} · Аспектов: {s.aspectCount}</p>
      <p className="hint">{s.interpretationStatus === "complete" ? "Расшифровка сохранена" : s.interpretationStatus === "empty" ? "Аспектов в пределах 5° нет" : "Открыть расчёт и чат"}</p>
    </li>)}</ul>}
    <section className="overlay-catalog">
      <div className="section-header"><h2 className="section-title">Каталог затмений</h2><button type="button" className="btn-ghost" onClick={() => setShowAdd(x => !x)}>Добавить затмение</button></div>
      <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => action("import", async () => {
        await overlayApi("/api/eclipses/import", {}); await load(); setNotice("Каталог 2026–2027 сохранён. Положения рассчитываются при подготовке карты или первом наложении.");
      })}>{busy === "import" ? "Загружаем…" : "Загрузить каталог 2026–2027"}</button>
      {showAdd && <form className="card overlay-form" onSubmit={add}>
        <h3>Добавить новое затмение</h3><p className="hint">Укажите момент максимума в UTC. После сохранения редактирование недоступно.</p>
        <label htmlFor="new-type">Тип</label><select id="new-type" value={newType} onChange={e => setNewType(e.target.value as EclipseType)}>{Object.entries(ECLIPSE_TYPES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
        <label htmlFor="new-time">Максимум, UTC</label><input id="new-time" type="datetime-local" step="1" min="1900-01-01T00:00" max="2100-12-31T23:59:59" value={newTime} onChange={e => setNewTime(e.target.value)} required />
        <label htmlFor="new-source">Источник даты и времени</label><input id="new-source" type="url" placeholder="https://…" value={source} onChange={e => setSource(e.target.value)} required />
        <button disabled={!!busy}>Сохранить затмение</button>
      </form>}
      {eclipses.some(e => e.fetchStatus !== "ready") && <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => action("prepare-all", async () => {
        const pending = eclipses.filter(e => e.fetchStatus !== "ready" && !e.busy);
        const failures: string[] = [];
        for (let i = 0; i < pending.length; i++) {
          setNotice(`Подготавливаем карты: ${i + 1} из ${pending.length}…`);
          try { await overlayApi(`/api/eclipses/${pending[i].id}/prepare`, {}); }
          catch (e) { failures.push(e instanceof Error ? e.message : "Ошибка расчёта"); }
        }
        await load(); setNotice(failures.length ? `Сохранено карт: ${pending.length - failures.length}. Ошибок: ${failures.length}.` : "Все карты каталога подготовлены и сохранены.");
        if (failures.length) throw new Error(failures[0]);
      })}>Подготовить все карты</button>}
      <ul className="chart-list overlay-catalog-list">{eclipses.map(e => <li key={e.id} className="card">
        <strong>{ECLIPSE_TYPES[e.type]}</strong><p>{utcLabel(e.maximumAt)}</p>
        <p className="hint"><a href={e.sourceUrl} target="_blank" rel="noreferrer">Источник времени</a></p>
        <details><summary>Точность времени</summary><p className="hint">{e.timeNote}</p></details>
        {e.fetchStatus === "ready" ? <p className="hint">Положения сохранены</p> : <button className="btn-ghost" type="button" disabled={!!busy || e.busy} onClick={() => action(e.id, async () => {
          await overlayApi(`/api/eclipses/${e.id}/prepare`, {}); await load();
        })}>{busy === e.id || e.busy ? "Рассчитывается…" : "Подготовить карту"}</button>}
        {e.error && <p className="error">{e.error}</p>}
      </li>)}</ul>
      {!eclipses.length && <p className="hint">В поставку включено {ECLIPSE_CATALOG.length} затмений 2026–2027. Нажмите «Загрузить каталог», чтобы сохранить их.</p>}
    </section>
  </main>;
}
