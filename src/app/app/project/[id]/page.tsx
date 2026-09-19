import { redirect } from "next/navigation";

/**
 * Legacy full-page project detail removed — details open as the map overlay.
 * Keep a thin redirect so bookmarks / old links still land on the pin overlay.
 */
export default async function ProjectDetailRedirect({
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
