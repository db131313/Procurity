import Image from "next/image";
import { cn } from "@/lib/cn";

const LOGO_SRC = {
  gradient: "/brand/logo-gradient.svg",
  dark: "/brand/logo-dark.svg",
  light: "/brand/logo-light.svg",
  icon: "/brand/logo-icon.svg",
} as const;

export type LogoVariant = keyof typeof LOGO_SRC;

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
  const wordmarkClass =
    variant === "light" || variant === "gradient"
      ? "text-white"
      : "text-ink";

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src={LOGO_SRC[variant === "icon" ? "icon" : variant]}
        alt="Procurity"
        width={size}
        height={size}
        className="shrink-0"
        priority
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
