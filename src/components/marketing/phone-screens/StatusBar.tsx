import { cn } from "@/lib/cn";
import styles from "../FeatureCarousel.module.css";

export function StatusBar({ light }: { light?: boolean }) {
  return (
    <div className={cn(styles.sbar, light && styles.sbarLight)}>
      <b>9:41</b>
      <span />
    </div>
  );
}
