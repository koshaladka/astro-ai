import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { recalculatePrimaryChart } from "@/lib/services/chart-pipeline";
import { withRouteLog } from "@/lib/utils/with-route-log";

// Новая основная карта по ДР профиля; прежняя primary остаётся в списке
export const POST = withRouteLog("charts.recalculate-primary.POST", async () => {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  try {
    const result = await recalculatePrimaryChart(session.userId);
    return NextResponse.json({
      chartId: result.chartId,
      status: result.status,
      summary: result.summary,
      highlights: result.highlights,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка пересчёта основной карты";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
