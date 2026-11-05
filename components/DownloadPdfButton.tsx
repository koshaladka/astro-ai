"use client";

import { useState } from "react";

type Props = { markdown: string; filename: string; className?: string };

export function DownloadPdfButton({ markdown, filename, className }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setBusy(true); setError("");
    try {
      const { downloadInterpretationPdf } = await import("@/lib/export/interpretation-pdf");
      await downloadInterpretationPdf(markdown, filename);
    } catch {
      setError("Не удалось создать PDF. Проверьте соединение и повторите скачивание.");
    } finally { setBusy(false); }
  }
  return <div>
    <button type="button" className={className} onClick={download} disabled={busy || !markdown.trim()} aria-busy={busy}>
      {busy ? "Готовим PDF…" : "Скачать PDF"}
    </button>
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
