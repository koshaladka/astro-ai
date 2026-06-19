import { find } from "geo-tz";
import { DateTime } from "luxon";

// Определяет UTC-смещение в часах по координатам и местному времени рождения
export function resolveTimezone(
  lat: number,
  lon: number,
  datetime: string
): number {
  const zones = find(lat, lon);
  const zone = zones[0];

  if (!zone) {
    return 0;
  }

  const dt = DateTime.fromISO(datetime, { zone });
  if (!dt.isValid) {
    return 0;
  }

  return dt.offset / 60;
}
