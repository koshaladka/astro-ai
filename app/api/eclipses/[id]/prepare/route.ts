import { overlayRoute } from "@/lib/overlays/route";
import { prepareEclipse } from "@/lib/services/overlay-service";
export const maxDuration = 90;
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return overlayRoute(async () => { await prepareEclipse(params.id); return { ready: true }; });
}
