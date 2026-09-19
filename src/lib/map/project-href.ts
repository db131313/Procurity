/** Build map deep-link that opens the project slide-up overlay. */
export function mapProjectHref(
  projectId: string,
  city?: string | null,
): string {
  const qs = new URLSearchParams();
  qs.set("pin", projectId);
  if (city) qs.set("city", city);
  return `/app/map?${qs.toString()}`;
}
