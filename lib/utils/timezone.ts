// Таблица UTC-смещений для РФ (упрощённо, без DST после 2014)
const RF_OFFSETS: Array<{ from: string; offset: number }> = [
  { from: "2014-10-26", offset: 3 },
  { from: "2011-03-27", offset: 4 },
  { from: "2010-03-28", offset: 4 },
  { from: "1985-04-01", offset: 4 },
  { from: "1984-04-01", offset: 4 },
  { from: "1983-04-01", offset: 4 },
  { from: "1981-04-01", offset: 4 },
  { from: "1900-01-01", offset: 3 },
];

// Определяет числовое смещение UTC для даты в России
export function resolveTimezone(
  _lat: number,
  _lon: number,
  datetime: string
): number {
  const date = datetime.slice(0, 10);
  for (const row of RF_OFFSETS) {
    if (date >= row.from) return row.offset;
  }
  return 3;
}
