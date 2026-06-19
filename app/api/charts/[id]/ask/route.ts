import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { askChartQuestion } from "@/lib/services/chart-pipeline";

const schema = z.object({
  question: z.string().min(3, "Вопрос слишком короткий").max(500),
});

type Params = { params: Promise<{ id: string }> };

// Отвечает на вопрос по сохранённой карте без повторного вызова Astrology API
export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  try {
    const { id } = await params;
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
}
