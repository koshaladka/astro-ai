"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CityPicker, type SelectedPlace } from "@/components/CityPicker";
import { ChartTables } from "@/components/ChartTables";

type BirthPreferences = {
  date?: string;
  time?: string;
  placeName?: string;
  latitude?: number;
  longitude?: number;
};

type Profile = {
  email: string;
  name?: string;
  birthPreferences?: BirthPreferences;
};

type ChartItem = {
  chartId: string;
  status: string;
  summaryPreview?: string;
  birthInput?: { date?: string; time?: string; placeName?: string };
  planets?: { output?: unknown[] };
  houses?: { output?: { Houses?: unknown[] } };
  createdAt: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [name, setName] = useState("");
  const [prefs, setPrefs] = useState<BirthPreferences>({});
  const [place, setPlace] = useState<SelectedPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setProfile(d.profile);
        setCharts(d.charts ?? []);
        setName(d.profile.name ?? "");
        const birthPrefs = d.profile.birthPreferences ?? {};
        setPrefs(birthPrefs);
        if (
          birthPrefs.placeName &&
          birthPrefs.latitude != null &&
          birthPrefs.longitude != null
        ) {
          setPlace({
            placeName: birthPrefs.placeName,
            latitude: birthPrefs.latitude,
            longitude: birthPrefs.longitude,
            label: birthPrefs.placeName,
          });
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, birthPreferences: prefs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сохранения");
      setProfile(data.profile);
      setMessage("Профиль сохранён");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main>
        <p className="loading">Загружаем профиль…</p>
      </main>
    );
  }

  if (error && !profile) {
    return (
      <main>
        <p className="error">{error}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Профиль</h1>
      <p className="subtitle">{profile?.email}</p>

      <section className="card">
        <h2 className="section-title">Данные</h2>
        <form onSubmit={saveProfile}>
          <label htmlFor="name">Имя</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Как к вам обращаться"
          />

          <p className="hint">Предпочитаемые данные рождения (опционально)</p>
          <div className="field-row">
            <div>
              <label htmlFor="date">Дата</label>
              <input
                id="date"
                type="date"
                value={prefs.date ?? ""}
                onChange={(e) => setPrefs({ ...prefs, date: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="time">Время</label>
              <input
                id="time"
                type="time"
                value={prefs.time ?? ""}
                onChange={(e) => setPrefs({ ...prefs, time: e.target.value })}
              />
            </div>
          </div>

          <CityPicker
            inputId="place"
            label="Место"
            placeholder="Город"
            value={place}
            onChange={(selected) => {
              setPlace(selected);
              setPrefs((prev) =>
                selected
                  ? {
                      ...prev,
                      placeName: selected.placeName,
                      latitude: selected.latitude,
                      longitude: selected.longitude,
                    }
                  : {
                      ...prev,
                      placeName: undefined,
                      latitude: undefined,
                      longitude: undefined,
                    }
              );
            }}
          />

          <button type="submit" disabled={saving}>
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
          {message && <p className="hint">{message}</p>}
          {error && <p className="error">{error}</p>}
        </form>
      </section>

      <section>
        <h2 className="section-title">Мои карты</h2>
        {charts.length === 0 ? (
          <p className="hint">
            Карт пока нет. <Link href="/">Построить первую</Link>
          </p>
        ) : (
          <ul className="chart-list">
            {charts.map((c) => (
              <li key={c.chartId} className="card chart-list-item">
                <Link href={`/chart/${c.chartId}`}>
                  {c.birthInput?.date} · {c.birthInput?.time} · {c.birthInput?.placeName}
                </Link>
                {c.summaryPreview && <p className="hint">{c.summaryPreview}…</p>}
                {c.status === "complete" && (
                  <ChartTables planets={c.planets} houses={c.houses} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
