import { redirect } from "next/navigation";

export default async function OpportunityRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let pin = id;
  try {
    pin = decodeURIComponent(id);
  } catch {
    // keep raw
  }
  redirect(`/app/map?pin=${encodeURIComponent(pin)}`);
}
