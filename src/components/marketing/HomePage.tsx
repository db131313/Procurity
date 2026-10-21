import { HomeBelowFold, HomeMapHero } from "./HomeMapHero";

type Props = {
  initialCityId: string;
};

/** Public home: real map hero + sunrise marketing shell. */
export function HomePage({ initialCityId }: Props) {
  return (
    <div className="marketing-sunrise text-ink">
      <HomeMapHero initialCityId={initialCityId} />
      <HomeBelowFold />
    </div>
  );
}
