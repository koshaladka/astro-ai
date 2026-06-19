import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { getUserCharts } from "@/lib/services/chart-pipeline";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  birthPreferences: z
    .object({
      date: z.string().optional(),
      time: z.string().optional(),
      placeName: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
    .optional(),
});

// Возвращает профиль текущего пользователя и список его карт
export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.userId).select("-passwordHash").lean();
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const charts = await getUserCharts(session.userId);

  return NextResponse.json({
    profile: {
      email: user.email,
      name: user.name,
      birthPreferences: user.birthPreferences,
      createdAt: user.createdAt,
    },
    charts,
  });
}

// Обновляет имя и предпочтения рождения пользователя
export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  try {
    const body = patchSchema.parse(await request.json());
    await connectDb();

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.birthPreferences !== undefined) update.birthPreferences = body.birthPreferences;

    const user = await User.findByIdAndUpdate(session.userId, update, { new: true })
      .select("-passwordHash")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        email: user.email,
        name: user.name,
        birthPreferences: user.birthPreferences,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка обновления профиля";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
