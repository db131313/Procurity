import { HomeBelowFold, HomeMapHero } from "./HomeMapHero";

type Props = {
  initialCityId: string;
};

/** Public home: full-viewport real map, then a short pricing strip. */
export function HomePage({ initialCityId }: Props) {
  return (
    <div className="bg-white text-ink">
      <HomeMapHero initialCityId={initialCityId} />
      <HomeBelowFold />
    </div>
  );
}
