import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db/connect";

export async function GET() {
  try {
    await pingDb();
    return NextResponse.json({ ok: true, db: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "db error";
    return NextResponse.json({ ok: false, db: "error", message }, { status: 503 });
  }
}
