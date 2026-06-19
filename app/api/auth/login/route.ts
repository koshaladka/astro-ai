import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    await connectDb();

    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
    }

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
    const message = error instanceof Error ? error.message : "Ошибка входа";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
