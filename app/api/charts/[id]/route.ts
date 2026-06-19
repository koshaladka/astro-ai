import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getChartById } from "@/lib/services/chart-pipeline";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const { id } = await params;
  const chart = await getChartById(id, session.userId);

  if (!chart) {
    return NextResponse.json({ error: "Карта не найдена" }, { status: 404 });
  }

  return NextResponse.json(chart);
}
