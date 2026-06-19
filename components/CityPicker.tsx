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
  label?: string;
  inputId?: string;
  placeholder?: string;
};

// Поле выбора города с автоподсказками и геокодированием
export function CityPicker({
  value,
  onChange,
  label = "Место рождения",
  inputId = "city",
  placeholder = "Начните вводить город…",
}: Props) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [items, setItems] = useState<PlaceItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(value.label);
  }, [value]);

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/places/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setItems([]);
          return;
        }
        const data = await res.json();
        setItems(data.places ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setItems([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
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
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="text"
        value={query}
        autoComplete="off"
        placeholder={placeholder}
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
