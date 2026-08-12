import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Brand logo.
 * Uses /public/brand/logo.png + logo-wordmark-dark.png.
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

  if (iconOnly) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- local brand PNG
      <img
        src="/brand/logo-icon.png"
        alt="Procurity"
        width={size}
        height={size}
        className={cn("shrink-0 object-contain", className)}
      />
    );
  }

  // Dark backgrounds: crisp wordmark lockup (icon + white PROCURITY)
  if (variant === "gradient" || variant === "light") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- local brand PNG
      <img
        src="/brand/logo-wordmark-dark.png"
        alt="Procurity"
        height={size}
        width={Math.round(size * (1400 / 320))}
        className={cn("w-auto object-contain object-left", className)}
        style={{ height: size, width: "auto" }}
      />
    );
  }

  // Light backgrounds: icon + dark wordmark text
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- local brand PNG */}
      <img
        src="/brand/logo-icon.png"
        alt=""
        width={size}
        height={size}
        className="shrink-0 object-contain"
        aria-hidden
      />
      <span className="text-[15px] font-bold tracking-[0.22em] text-ink sm:text-[17px]">
        PROCURITY
      </span>
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
