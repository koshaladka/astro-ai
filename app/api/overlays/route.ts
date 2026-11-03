import { overlayRoute, readOverlayBody } from "@/lib/overlays/route";
import { createOverlay, listOverlays } from "@/lib/services/overlay-service";
export const dynamic = "force-dynamic";
export const maxDuration = 90;
export async function GET() {
  return overlayRoute(async userId => ({ overlays: await listOverlays(userId) }));
}
export async function POST(request: Request) {
  return overlayRoute(async userId => createOverlay(await readOverlayBody(request), userId));
}
