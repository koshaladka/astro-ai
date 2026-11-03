import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { OverlayError } from "./errors";
export async function overlayRoute(run: (userId: string) => Promise<unknown>) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    return NextResponse.json(await run(session.userId));
  } catch (error) {
    const status = error instanceof OverlayError ? error.status : error instanceof ZodError || error instanceof SyntaxError ? 400 : 500;
    const message = error instanceof ZodError ? error.issues.map(i => i.message).join("; ") : error instanceof Error ? error.message : "Ошибка операции";
    return NextResponse.json({ error: message }, { status });
  }
}
export async function readOverlayBody(request: Request) {
  const text = await request.text();
  if (text.length > 16_000) throw new OverlayError("Слишком большой запрос", 413);
  return JSON.parse(text) as unknown;
}
