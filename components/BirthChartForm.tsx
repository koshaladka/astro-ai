"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CityPicker, type SelectedPlace } from "@/components/CityPicker";

type BirthPrefs = {
  date?: string;
  time?: string;
  placeName?: string;
  latitude?: number;
  longitude?: number;
};

type Props = {
  asPrimary?: boolean;
  /** Префилл только для основной (из профиля) */
  initial?: BirthPrefs | null;
  submitLabel?: string;
  onSuccess?: (chartId: string) => void;
};

export function BirthChartForm({
  asPrimary = false,
  initial = null,
  submitLabel,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [place, setPlace] = useState<SelectedPlace | null>(() => {
    if (
      initial?.placeName &&
      initial.latitude != null &&
      initial.longitude != null
    ) {
      return {
        placeName: initial.placeName,
        latitude: initial.latitude,
        longitude: initial.longitude,
        label: initial.placeName,
      };
    }
    return null;
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!place) {
      setError("Выберите город из списка");
      return;
    }

    setLoading(true);
    setError("");

    const body = {
      date,
      time,
      placeName: place.placeName,
      latitude: place.latitude,
      longitude: place.longitude,
      asPrimary,
    };

    try {
      const res = await fetch("/api/charts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка запроса");
      if (onSuccess) {
        onSuccess(data.chartId);
        setLoading(false);
      } else {
        router.push(asPrimary ? `/` : `/chart/${data.chartId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <div className="field-row">
        <div>
          <label htmlFor="birth-date">Дата рождения</label>
          <input
            id="birth-date"
            name="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="birth-time">Время</label>
          <input
            id="birth-time"
            name="time"
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <p className="hint">Например: 11:30</p>
        </div>
      </div>

      <CityPicker value={place} onChange={setPlace} />

      <button type="submit" disabled={loading || !place}>
        {loading
          ? "Анализируем данные…"
          : submitLabel ?? (asPrimary ? "Построить карту" : "Добавить карту")}
      </button>

      {error && <p className="error">{error}</p>}
    </form>
  );
}
