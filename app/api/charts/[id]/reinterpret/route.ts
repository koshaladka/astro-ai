import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { regenerateChartInterpretation } from "@/lib/services/chart-pipeline";
import { withRouteLog } from "@/lib/utils/with-route-log";

// Перегенерирует описание карты через ИИ без повторного вызова Astrology API
export const POST = withRouteLog(
  "charts.[id].reinterpret.POST",
  async (_request, context) => {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    }

    try {
      const { id } = await context!.params!;
      const result = await regenerateChartInterpretation(id, session.userId);

      if (!result) {
        return NextResponse.json({ error: "Карта не найдена" }, { status: 404 });
      }

      return NextResponse.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ошибка обновления описания";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
);
