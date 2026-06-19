import { findPlanetHouse } from "@/lib/astrology/chart-format";

export type PlanetRow = {
  planet?: { ru?: string; en?: string };
  zodiac_sign?: { name?: { ru?: string } };
  isRetro?: string;
  fullDegree?: number;
  normDegree?: number;
};

export type HouseRow = {
  House?: number;
  degree?: number;
  normDegree?: number;
  zodiac_sign?: { name?: { ru?: string } };
};

type ChartTablesProps = {
  planets?: { output?: PlanetRow[] };
  houses?: { output?: { Houses?: HouseRow[] } };
};

// Показывает таблицы планет и домов натальной карты
export function ChartTables({ planets, houses }: ChartTablesProps) {
  const planetRows = planets?.output ?? [];
  const houseRows = houses?.output?.Houses ?? [];

  if (planetRows.length === 0 && houseRows.length === 0) return null;

  return (
    <>
      {planetRows.length > 0 && (
        <div className="chart-tables-block">
          <h3 className="section-title">Планеты</h3>
          <table>
            <thead>
              <tr>
                <th>Планета</th>
                <th>Знак</th>
                <th>Градус</th>
                <th>Дом</th>
              </tr>
            </thead>
            <tbody>
              {planetRows.map((p, i) => (
                <tr key={i}>
                  <td>
                    {p.planet?.ru || p.planet?.en}
                    {p.isRetro?.toLowerCase() === "true" ? " ℞" : ""}
                  </td>
                  <td>{p.zodiac_sign?.name?.ru}</td>
                  <td>{p.normDegree?.toFixed(1)}°</td>
                  <td>
                    {p.fullDegree != null
                      ? findPlanetHouse(p.fullDegree, houseRows) ?? "—"
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {houseRows.length > 0 && (
        <div className="chart-tables-block">
          <h3 className="section-title">Дома</h3>
          <table>
            <thead>
              <tr>
                <th>Дом</th>
                <th>Знак</th>
                <th>Градус</th>
              </tr>
            </thead>
            <tbody>
              {houseRows.map((h, i) => (
                <tr key={i}>
                  <td>{h.House}</td>
                  <td>{h.zodiac_sign?.name?.ru}</td>
                  <td>{h.normDegree?.toFixed(1)}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
