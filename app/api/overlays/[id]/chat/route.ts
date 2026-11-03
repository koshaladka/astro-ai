import { overlayRoute } from "@/lib/overlays/route";
import { clearOverlayChat } from "@/lib/services/overlay-service";
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return overlayRoute(async userId => ({ overlay: await clearOverlayChat(params.id, userId) }));
}
