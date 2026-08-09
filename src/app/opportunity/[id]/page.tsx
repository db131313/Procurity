import { notFound } from "next/navigation";
import { OpportunityDetail } from "@/components/mobile/OpportunityDetail";
import { getTop20Sites } from "@/lib/intel";
import { toOpportunity } from "@/lib/opportunity";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OpportunityPage({ params }: Props) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  const intel = await getTop20Sites({ limit: 40 });
  const index = intel.sites.findIndex((s) => s.id === decoded);
  const site = index >= 0 ? intel.sites[index] : null;
  if (!site) notFound();
  return <OpportunityDetail site={toOpportunity(site, index)} />;
}
