import { MapScreen } from "@/components/mobile/MapScreen";
import { getTop20Sites } from "@/lib/intel";

export default async function MapPage() {
  const intel = await getTop20Sites();
  return <MapScreen initial={intel} />;
}
