"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CityPicker, type SelectedPlace } from "@/components/CityPicker";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [prefLoading, setPrefLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState<SelectedPlace | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        const prefs = d.profile?.birthPreferences;
        if (!prefs) return;
        if (prefs.date) setDate(prefs.date);
        if (prefs.time) setTime(prefs.time);
        if (
          prefs.placeName &&
          prefs.latitude != null &&
          prefs.longitude != null
        ) {
          setPlace({
            placeName: prefs.placeName,
            latitude: prefs.latitude,
            longitude: prefs.longitude,
            label: prefs.placeName,
          });
        }
      })
      .catch(() => {})
      .finally(() => setPrefLoading(false));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!place) {
      setError("Выберите город из списка");
      return;
    }

    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const body = {
      date: String(form.get("date")),
      time: String(form.get("time")),
      placeName: place.placeName,
      latitude: place.latitude,
      longitude: place.longitude,
    };

    try {
      const res = await fetch("/api/charts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка запроса");
      router.push(`/chart/${data.chartId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Натальная карта</h1>
      <p className="subtitle">
        Введите дату, время и место рождения — получите краткое описание
      </p>

      <form className="card" onSubmit={onSubmit}>
        <div className="field-row">
          <div>
            <label htmlFor="date">Дата рождения</label>
            <input
              id="date"
              name="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={prefLoading}
            />
          </div>
          <div>
            <label htmlFor="time">Время</label>
            <input
              id="time"
              name="time"
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={prefLoading}
            />
            <p className="hint">Местное время, как в документах</p>
          </div>
        </div>

        <CityPicker value={place} onChange={setPlace} />

        <button type="submit" disabled={loading || prefLoading || !place}>
          {loading ? "Анализируем данные…" : "Построить карту"}
        </button>

        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}
