import { HomeBelowFold, HomeMapHero } from "./HomeMapHero";

type Props = {
  initialCityId: string;
};

/** Public home: real map hero + below-fold (mesh gradient marketing shell). */
export function HomePage({ initialCityId }: Props) {
  return (
    <div className="marketing-mesh text-ink">
      <HomeMapHero initialCityId={initialCityId} />
      <HomeBelowFold />
    </div>
  );
}
