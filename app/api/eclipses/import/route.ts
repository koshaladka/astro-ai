import { overlayRoute } from "@/lib/overlays/route";
import { importEclipseCatalog } from "@/lib/services/overlay-service";
export async function POST() {
  return overlayRoute(async userId => ({ eclipses: await importEclipseCatalog(userId) }));
}
