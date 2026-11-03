"use client";

import { useCallback, useEffect, useState } from "react";
import { BirthChartForm } from "@/components/BirthChartForm";
import { ChartView } from "@/components/ChartView";
import { CityPicker, type SelectedPlace } from "@/components/CityPicker";

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
  isPrimary?: boolean;
  birthInput?: { date?: string; time?: string; placeName?: string };
};

function birthMatches(
  prefs?: BirthPreferences | null,
  birth?: ChartItem["birthInput"] | null
) {
  if (!prefs?.date || !prefs?.time || !prefs?.placeName || !birth) return true;
  return (
    prefs.date === birth.date &&
    prefs.time === birth.time &&
    prefs.placeName === birth.placeName
  );
}

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [primary, setPrimary] = useState<ChartItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [prefs, setPrefs] = useState<BirthPreferences>({});
  const [place, setPlace] = useState<SelectedPlace | null>(null);
  const [chartKey, setChartKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    return fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setProfile(d.profile);
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
        } else {
          setPlace(null);
        }
        const charts = (d.charts ?? []) as ChartItem[];
        setPrimary(charts.find((c) => c.isPrimary) ?? null);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const birthPreferences = {
      date: prefs.date,
      time: prefs.time,
      placeName: place?.placeName ?? prefs.placeName,
      latitude: place?.latitude ?? prefs.latitude,
      longitude: place?.longitude ?? prefs.longitude,
    };

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, birthPreferences }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сохранения");
      setProfile(data.profile);
      setPrefs(data.profile.birthPreferences ?? {});
      setEditing(false);
      setMessage("Сохранено");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function recalculate() {
    setRecalculating(true);
    setError("");
    try {
      const res = await fetch("/api/charts/recalculate-primary", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка пересчёта");
      await load();
      setChartKey((k) => k + 1);
      setMessage("Основная карта пересчитана");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setRecalculating(false);
    }
  }

  if (loading) {
    return (
      <main>
        <p className="loading">Загружаем карту…</p>
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

  const needsRecalc = Boolean(primary && !birthMatches(prefs, primary.birthInput));
  const birthLabel =
    prefs.date && prefs.time && prefs.placeName
      ? `${prefs.date} · ${prefs.time} · ${prefs.placeName}`
      : "Дата рождения не указана";

  return (
    <main>
      <div className="section-header">
        <h1>Моя карта</h1>
      </div>

      <section className="card">
        <p className="hint profile-email">{profile?.email}</p>
        {!editing ? (
          <>
            <p>
              <strong>{profile?.name || "Без имени"}</strong>
            </p>
            <p className="hint">{birthLabel}</p>
            <div className="section-header-actions">
              <button type="button" onClick={() => setEditing(true)}>
                Редактировать
              </button>
              {needsRecalc && (
                <button type="button" onClick={recalculate} disabled={recalculating}>
                  {recalculating ? "Считаем…" : "Пересчитать"}
                </button>
              )}
            </div>
            {message && <p className="hint">{message}</p>}
            {error && <p className="error">{error}</p>}
          </>
        ) : (
          <form onSubmit={saveProfile}>
            <label htmlFor="name">Имя</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как к вам обращаться"
            />

            <div className="field-row">
              <div>
                <label htmlFor="date">Дата рождения</label>
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
              label="Место рождения"
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

            <div className="section-header-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Сохраняем…" : "Сохранить"}
              </button>
              <button type="button" onClick={() => setEditing(false)}>
                Отмена
              </button>
            </div>
            {error && <p className="error">{error}</p>}
          </form>
        )}
      </section>

      {!primary ? (
        <section>
          <h2 className="section-title">Построить основную карту</h2>
          <p className="subtitle">Введите дату, время и место рождения</p>
          <BirthChartForm
            asPrimary
            initial={prefs}
            onSuccess={() => {
              load().then(() => setChartKey((k) => k + 1));
            }}
          />
        </section>
      ) : (
        <section key={chartKey}>
          <ChartView
            chartId={primary.chartId}
            showTitle={false}
          />
        </section>
      )}
    </main>
  );
}
