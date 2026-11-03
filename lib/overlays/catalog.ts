// Eclipse Predictions by Fred Espenak (NASA's GSFC).
// Исходные максимумы NASA в TD/TT, точность таблицы — секунда.
// TT = TAI + 32.184 s; UTC = TAI - 37 s (принято для каталога 2026–2027).
// Это не прогнозируемый UT1 из столбца Delta T. Будущая leap second потребует проверки каталога.
export const CATALOG_TIME_NOTE = "NASA TD → UTC: TT−UTC=69.184 с (TAI−UTC=37 с). Исходная точность 1 с; для будущих дат предполагается отсутствие новых високосных секунд.";
export const ECLIPSE_TYPES = {
  "solar-annular": "Кольцеобразное солнечное",
  "solar-total": "Полное солнечное",
  "solar-partial": "Частное солнечное",
  "solar-hybrid": "Гибридное солнечное",
  "lunar-total": "Полное лунное",
  "lunar-partial": "Частное лунное",
  "lunar-penumbral": "Полутеневое лунное",
} as const;
export type EclipseType = keyof typeof ECLIPSE_TYPES;
export function tdToUtc(td: string) {
  const ms = Date.parse(td);
  if (!Number.isFinite(ms)) throw new Error("Некорректное время TD");
  // API принимает целые секунды; округляем единожды после преобразования.
  return new Date(Math.round((ms - 69_184) / 1000) * 1000).toISOString();
}
const EVENTS: [string, EclipseType, string][] = [
  ["2026-02-17", "solar-annular", "12:13:06"],
  ["2026-03-03", "lunar-total", "11:34:52"],
  ["2026-08-12", "solar-total", "17:47:06"],
  ["2026-08-28", "lunar-partial", "04:14:04"],
  ["2027-02-06", "solar-annular", "16:00:48"],
  ["2027-02-20", "lunar-penumbral", "23:14:06"],
  ["2027-07-18", "lunar-penumbral", "16:04:09"],
  ["2027-08-02", "solar-total", "10:07:50"],
  ["2027-08-17", "lunar-penumbral", "07:14:59"],
];
export const ECLIPSE_CATALOG = EVENTS.map(([date, type, time]) => ({
  type, maximumAt: tdToUtc(`${date}T${time}Z`),
  sourceTime: `${date}T${time} TD`, sourceScale: "TD", precisionSeconds: 1,
  sourceUrl: `https://eclipse.gsfc.nasa.gov/OH/OH${date.slice(0, 4)}.html`,
  timeNote: CATALOG_TIME_NOTE,
}));
