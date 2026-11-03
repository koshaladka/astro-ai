import { overlayRoute } from "@/lib/overlays/route";
import { getOverlay } from "@/lib/services/overlay-service";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return overlayRoute(async userId => ({ overlay: await getOverlay(params.id, userId) }));
}
