import { getHomeMediaAvailability } from "@/lib/marketing/home-media";
import { HomeBelowFold, HomeMapHero } from "./HomeMapHero";

type Props = {
  initialCityId: string;
};

/** Public home: real map hero + sunrise marketing shell. */
export function HomePage({ initialCityId }: Props) {
  const media = getHomeMediaAvailability();
  return (
    <div className="marketing-sunrise text-ink">
      <HomeMapHero initialCityId={initialCityId} />
      <HomeBelowFold media={media} />
    </div>
  );
}
