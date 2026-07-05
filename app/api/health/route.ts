import { NextResponse } from "next/server";
import { pingDb } from "@/lib/db/connect";
import { withRouteLog } from "@/lib/utils/with-route-log";

export const GET = withRouteLog("health.GET", async () => {
  try {
    await pingDb();
    return NextResponse.json({ ok: true, db: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "db error";
    return NextResponse.json({ ok: false, db: "error", message }, { status: 503 });
  }
});
