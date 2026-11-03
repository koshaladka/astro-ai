import { overlayRoute, readOverlayBody } from "@/lib/overlays/route";
import { addEclipse, listEclipses } from "@/lib/services/overlay-service";
export const dynamic = "force-dynamic";
export async function GET() {
  return overlayRoute(async () => ({ eclipses: await listEclipses() }));
}
export async function POST(request: Request) {
  return overlayRoute(async userId => ({ id: await addEclipse(await readOverlayBody(request), userId) }));
}
