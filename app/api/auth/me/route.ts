import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { withRouteLog } from "@/lib/utils/with-route-log";

export const GET = withRouteLog("auth.me.GET", async () => {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user });
});
