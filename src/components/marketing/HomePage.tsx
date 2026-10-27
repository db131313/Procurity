import { HomeExperience } from "./HomeExperience";

type Props = {
  initialCityId: string;
};

/** Public home: black/white swarm hero + real map panel + below-fold. */
export function HomePage({ initialCityId }: Props) {
  return <HomeExperience initialCityId={initialCityId} />;
}
