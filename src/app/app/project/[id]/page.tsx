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
  redirect(`/app/map?pin=${encodeURIComponent(id)}`);
}
