export type PlacesProvider = "nominatim" | "dadata";

// Возвращает провайдера поиска городов из env
export function getPlacesProvider(): PlacesProvider {
  const value = process.env.PLACES_PROVIDER?.trim().toLowerCase();
  return value === "dadata" ? "dadata" : "nominatim";
}

// Проверяет, что для DaData заданы ключи
export function getDaDataCredentials() {
  const apiKey = process.env.DADATA_API_KEY?.trim();
  const secret = process.env.DADATA_SECRET_KEY?.trim();

  if (!apiKey || !secret) {
    return null;
  }

  return { apiKey, secret };
}
