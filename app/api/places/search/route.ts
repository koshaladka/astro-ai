import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/utils/places";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const places = await searchPlaces(q, { signal: request.signal });
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ places: [] });
  }
}
