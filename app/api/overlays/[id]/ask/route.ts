import { overlayRoute, readOverlayBody } from "@/lib/overlays/route";
import { askOverlay } from "@/lib/services/overlay-service";
export const maxDuration = 150;
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return overlayRoute(async userId => ({ overlay: await askOverlay(params.id, userId, await readOverlayBody(request)) }));
}
