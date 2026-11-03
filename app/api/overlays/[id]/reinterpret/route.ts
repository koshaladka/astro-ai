import { overlayRoute } from "@/lib/overlays/route";
import { reinterpretOverlay } from "@/lib/services/overlay-service";
export const maxDuration = 150;
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return overlayRoute(async userId => ({ overlay: await reinterpretOverlay(params.id, userId) }));
}
