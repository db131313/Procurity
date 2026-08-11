import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Brand logo.
 * Uses /public/brand/logo.png (full mark) and logo-icon.png (icon only).
 * // TODO: swap in light/dark variants when available
 */
export type LogoVariant = "gradient" | "dark" | "light" | "icon";

type LogoProps = {
  variant?: LogoVariant;
  className?: string;
  showWordmark?: boolean;
  size?: number;
};

export function Logo({
  variant = "gradient",
  className,
  showWordmark = true,
  size = 36,
}: LogoProps) {
  const iconOnly = variant === "icon" || !showWordmark;
  const wordmarkClass =
    variant === "light" || variant === "gradient"
      ? "text-white"
      : "text-ink";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local brand PNG */}
      <img
        src={iconOnly ? "/brand/logo-icon.png" : "/brand/logo.png"}
        alt="Procurity"
        width={size}
        height={size}
        className="shrink-0 object-contain"
      />
      {showWordmark && variant !== "icon" && (
        <span
          className={cn(
            "text-[15px] font-bold tracking-[0.22em] sm:text-[17px]",
            wordmarkClass,
          )}
        >
          PROCURITY
        </span>
      )}
    </div>
  );
}

/** Compact icon-only mark for favicons / app chrome. */
export function LogoIcon({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src="/brand/logo-icon.png"
      alt="Procurity"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      priority
    />
  );
}
