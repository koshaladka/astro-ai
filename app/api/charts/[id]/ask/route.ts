import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { askChartQuestion } from "@/lib/services/chart-pipeline";
import { withRouteLog } from "@/lib/utils/with-route-log";

const schema = z.object({
  question: z.string().min(3, "Вопрос слишком короткий").max(500),
});

// Отвечает на вопрос по сохранённой карте без повторного вызова Astrology API
export const POST = withRouteLog("charts.[id].ask.POST", async (request, context) => {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  try {
    const { id } = await context!.params!;
    const { question } = schema.parse(await request.json());
    const result = await askChartQuestion(id, session.userId, question);

    if (!result) {
      return NextResponse.json({ error: "Карта не найдена" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка ответа";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
