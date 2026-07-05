import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getChartById } from "@/lib/services/chart-pipeline";
import { withRouteLog } from "@/lib/utils/with-route-log";

export const GET = withRouteLog("charts.[id].status.GET", async (_request, context) => {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await context!.params!;
  const chart = await getChartById(id, session.userId);

  if (!chart) {
    return NextResponse.json({ error: "Карта не найдена" }, { status: 404 });
  }

  return NextResponse.json({
    chartId: chart.chartId,
    status: chart.status,
    error: chart.error,
    updatedAt: chart.updatedAt,
  });
});
