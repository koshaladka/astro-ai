"use client";

import { useEffect, useRef, useState } from "react";

export type SelectedPlace = {
  placeName: string;
  latitude: number;
  longitude: number;
  label: string;
};

type PlaceItem = {
  id: string;
  label: string;
  placeName: string;
  latitude: number;
  longitude: number;
};

type Props = {
  value: SelectedPlace | null;
  onChange: (place: SelectedPlace | null) => void;
};

// Поле выбора города с автоподсказками и геокодированием
export function CityPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [items, setItems] = useState<PlaceItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(value.label);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) {
          setItems([]);
          return;
        }
        const data = await res.json();
        setItems(data.places ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectPlace(place: PlaceItem) {
    onChange({
      placeName: place.placeName,
      latitude: place.latitude,
      longitude: place.longitude,
      label: place.label,
    });
    setQuery(place.label);
    setOpen(false);
  }

  return (
    <div className="city-picker" ref={wrapRef}>
      <label htmlFor="city">Место рождения</label>
      <input
        id="city"
        type="text"
        value={query}
        autoComplete="off"
        placeholder="Начните вводить город…"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          onChange(null);
        }}
      />
      {value && (
        <p className="hint">
          Координаты: {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
        </p>
      )}
      {open && (
        <ul className="city-dropdown" role="listbox">
          {loading && <li className="city-item muted">Поиск…</li>}
          {!loading && items.length === 0 && (
            <li className="city-item muted">Ничего не найдено</li>
          )}
          {items.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                className="city-item"
                onClick={() => selectPlace(place)}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
