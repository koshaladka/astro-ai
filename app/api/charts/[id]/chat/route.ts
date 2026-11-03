import { overlayRoute } from "@/lib/overlays/route";
import { objectId } from "@/lib/services/overlay-service";
import { OverlayError } from "@/lib/overlays/errors";
import { clearChartChat } from "@/lib/services/chart-pipeline";
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return overlayRoute(async userId => {
    if (!await clearChartChat(objectId.parse(params.id), userId)) throw new OverlayError("Карта не найдена", 404);
    return { ok: true };
  });
}
