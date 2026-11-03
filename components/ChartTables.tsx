import type { HouseDisplayRow, PlanetDisplayRow } from "@/lib/astrology/chart-format";

type ChartTablesProps = {
  planetsDisplay?: PlanetDisplayRow[];
  housesDisplay?: HouseDisplayRow[];
};

// Показывает таблицы планет и домов натальной карты
export function ChartTables({ planetsDisplay, housesDisplay }: ChartTablesProps) {
  const planetRows = planetsDisplay ?? [];
  const houseRows = housesDisplay ?? [];

  if (planetRows.length === 0 && houseRows.length === 0) return null;

  return (
    <>
      {planetRows.length > 0 && (
        <details className="chart-tables-block">
          <summary className="section-title">Планеты</summary>
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
                    {p.name}
                    {p.isRetro ? " ℞" : ""}
                  </td>
                  <td>{p.sign}</td>
                  <td>{p.degree.toFixed(1)}°</td>
                  <td>{p.house ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {houseRows.length > 0 && (
        <details className="chart-tables-block">
          <summary className="section-title">Дома</summary>
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
                  <td>{h.house}</td>
                  <td>{h.sign}</td>
                  <td>{h.degree.toFixed(1)}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </>
  );
}
