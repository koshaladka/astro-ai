import { NextResponse } from "next/server";
import { clearSessionCookieOptions } from "@/lib/auth/session";
import { withRouteLog } from "@/lib/utils/with-route-log";

export const POST = withRouteLog("auth.logout.POST", async () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearSessionCookieOptions());
  return response;
});
