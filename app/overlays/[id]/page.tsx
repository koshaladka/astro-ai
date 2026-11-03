"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { MarkdownContent } from "@/components/MarkdownContent";
import { ECLIPSE_TYPES } from "@/lib/overlays/catalog";
import { formatLongitude } from "@/lib/overlays/aspects";
import { overlayApi, utcLabel } from "@/lib/overlays/browser-api";
import type { OverlayView } from "@/lib/overlays/types";

export default function OverlayPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const autoInterpret = searchParams.get("interpret") === "1";
  const [overlay, setOverlay] = useState<OverlayView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [question, setQuestion] = useState("");
  const [selected, setSelected] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const started = useRef(false);
  const api = `/api/overlays/${params.id}`;
  async function load() {
    const data = await overlayApi<{ overlay: OverlayView }>(api);
    setOverlay(data.overlay); return data.overlay;
  }
  async function interpret() {
    setBusy("interpret"); setError("");
    try { const d = await overlayApi<{ overlay: OverlayView }>(`${api}/reinterpret`, {}); setOverlay(d.overlay); }
    catch (e) { setError(e instanceof Error ? e.message : "Ошибка ИИ"); await load().catch(() => {}); }
    finally { setBusy(""); }
  }
  useEffect(() => {
    let active = true;
    load().then(data => {
      if (active && autoInterpret && !started.current && data.interpretationStatus === "idle" && !data.busy) {
        started.current = true; void interpret();
      }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // Запрос ИИ только после явного создания нового наложения, никогда при обычном открытии.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, autoInterpret]);
  useEffect(() => {
    if (!overlay?.busy) return;
    const timer = setInterval(() => { load().catch(() => {}); }, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay?.busy, params.id]);
  async function ask(event: FormEvent) {
    event.preventDefault(); setBusy("ask"); setError("");
    try {
      const d = await overlayApi<{ overlay: OverlayView }>(`${api}/ask`, { question, ...(selected ? { aspectId: selected } : {}) });
      setOverlay(d.overlay); setQuestion("");
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка ИИ"); await load().catch(() => {}); }
    finally { setBusy(""); }
  }
  if (loading) return <main><p className="loading">Загружаем сохранённый расчёт…</p></main>;
  if (!overlay) return <main><Link href="/overlays">← Наложения</Link><p className="error" role="alert">{error || "Наложение не найдено"}</p></main>;
  const aspect = overlay.aspects.find(a => a.id === selected);
  const disabled = !!busy || overlay.busy;
  return <main className="overlay-detail">
    <Link className="back-link" href="/overlays">← Наложения</Link>
    <h1>{ECLIPSE_TYPES[overlay.eclipse.type]} затмение</h1>
    <p>{utcLabel(overlay.eclipse.maximumAt)}</p><p>{overlay.natal.label}</p>
    <p className="hint">Пять типов аспектов · орбис до 5° · сортировка по точности</p>
    {error && <p className="error" role="alert">{error}</p>}
    <h2 className="section-title">Аспекты · {overlay.aspects.length}</h2>
    {!overlay.aspects.length ? <p className="card">Аспектов в пределах 5° не найдено. Расшифровка автоматически не запрашивалась.</p> : <div className="overlay-table-wrap"><table>
      <thead><tr><th>Натальная карта</th><th>Аспект</th><th>Карта затмения</th><th>Орбис</th><th><span className="sr-only">Обсуждение</span></th></tr></thead>
      <tbody>{overlay.aspects.map(a => <tr key={a.id} className={selected === a.id ? "overlay-selected" : ""}>
        <td>{a.natal.name}<small>{formatLongitude(a.natal.longitude)}</small></td>
        <td>{a.name}</td><td>{a.eclipse.name}<small>{formatLongitude(a.eclipse.longitude)}</small></td>
        <td>{a.orb.toFixed(2)}°</td><td><button type="button" className="btn-ghost" onClick={() => { setSelected(a.id); inputRef.current?.focus(); inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>Обсудить</button></td>
      </tr>)}</tbody>
    </table></div>}
    <section className="overlay-interpretation">
      <div className="section-header"><h2 className="section-title">Расшифровка</h2>{overlay.aspects.length > 0 && <button type="button" className="btn-ghost" disabled={disabled} onClick={interpret}>{busy === "interpret" ? "ИИ готовит ответ…" : overlay.interpretation ? "Обновить расшифровку" : "Получить расшифровку"}</button>}</div>
      {overlay.interpretation && <MarkdownContent>{overlay.interpretation}</MarkdownContent>}
      {(overlay.busy || busy) && <p className="hint" role="status">ИИ обрабатывает запрос…</p>}
      {overlay.interpretationError && <p className="error">{overlay.interpretationError}</p>}
    </section>
    <section><h2 className="section-title">Обсудить с ИИ</h2>
      {!overlay.messages.length && <p className="hint">Задайте вопрос по наложению или выберите аспект в таблице.</p>}
      <ul className="qa-list">{overlay.messages.map((m, i) => <li key={`${m.createdAt}-${i}`} className={m.role === "assistant" ? "qa-item qa-assistant" : "qa-item"}>
        <div className="qa-role">{m.role === "user" ? "Вы" : "ИИ"}</div>
        {m.role === "assistant" ? <MarkdownContent>{m.content}</MarkdownContent> : <p>{m.content}</p>}
        {m.aspectId && <small>Аспект: {overlay.aspects.find(a => a.id === m.aspectId)?.natal.name} — {overlay.aspects.find(a => a.id === m.aspectId)?.eclipse.name}</small>}
      </li>)}</ul>
      <form onSubmit={ask} className="qa-form">
        {aspect && <p className="overlay-selected-aspect">{aspect.natal.name} (натальная) · {aspect.name} · {aspect.eclipse.name} (затмение), орбис {aspect.orb.toFixed(2)}° <button type="button" className="btn-ghost" onClick={() => setSelected("")}>Снять выбор</button></p>}
        <label htmlFor="question">Ваш вопрос</label><textarea id="question" ref={inputRef} value={question} onChange={e => setQuestion(e.target.value)} maxLength={4000} rows={4} required />
        <button disabled={disabled || !question.trim()}>{busy === "ask" ? "ИИ отвечает…" : "Отправить"}</button>
      </form>
    </section>
  </main>;
}
