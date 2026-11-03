import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { withRouteLog } from "@/lib/utils/with-route-log";

export const GET = withRouteLog("auth.me.GET", async () => {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  await connectDb();
  const profile = await User.findById(user.userId).select("email name").lean();
  return NextResponse.json({ user: profile ? { userId: user.userId, email: profile.email, name: profile.name } : null });
});
