import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { birthInputSchema } from "@/lib/schemas/birth-payload.zod";
import { getUserCharts, runChartPipeline } from "@/lib/services/chart-pipeline";

// Возвращает список карт текущего пользователя
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const charts = await getUserCharts(session.userId);
  return NextResponse.json({ charts });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const birthInput = birthInputSchema.parse(body);
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined;
    const result = await runChartPipeline(birthInput, session.userId, name);

    return NextResponse.json({
      chartId: result.chartId,
      status: result.status,
      summary: result.summary,
      highlights: result.highlights,
      preview: {
        planetsCount: Array.isArray(result.planets?.output)
          ? result.planets.output.length
          : 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка создания карты";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
