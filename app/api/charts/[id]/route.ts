import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { deleteChart, getChartById } from "@/lib/services/chart-pipeline";
import { withRouteLog } from "@/lib/utils/with-route-log";

type Params = { params: Promise<{ id: string }> };

export const GET = withRouteLog("charts.[id].GET", async (_request, context) => {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await context!.params!;
  const chart = await getChartById(id, session.userId);

  if (!chart) {
    return NextResponse.json({ error: "Карта не найдена" }, { status: 404 });
  }

  return NextResponse.json(chart);
});

export const DELETE = withRouteLog("charts.[id].DELETE", async (_request, context) => {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await context!.params!;
  const ok = await deleteChart(id, session.userId);

  if (!ok) {
    return NextResponse.json({ error: "Карта не найдена" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});
