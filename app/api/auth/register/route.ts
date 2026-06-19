import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";

const schema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
  name: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    await connectDb();

    const exists = await User.findOne({ email: body.email.toLowerCase() });
    if (exists) {
      return NextResponse.json({ error: "Email уже зарегистрирован" }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await User.create({
      email: body.email.toLowerCase(),
      passwordHash,
      name: body.name,
    });

    const token = await createSessionToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name ?? undefined,
    });

    const response = NextResponse.json({
      user: { email: user.email, name: user.name },
    });
    response.cookies.set(sessionCookieOptions(token));
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка регистрации";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
