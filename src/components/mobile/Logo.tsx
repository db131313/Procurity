import { cn } from "@/lib/cn";

/** Mobile mark — uses the brand PNG. */
export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local brand PNG
    <img
      src="/brand/logo-icon.png"
      alt=""
      aria-hidden
      className={cn("object-contain", className)}
    />
  );
}

export function LogoWordmark({
  light = false,
  className = "",
}: {
  light?: boolean;
  className?: string;
}) {
  if (light) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- local brand PNG
      <img
        src="/brand/logo-wordmark-dark.png"
        alt="Procurity"
        className={cn("h-9 w-auto object-contain object-left", className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-9" />
      <span className="text-[17px] font-bold tracking-[0.14em] text-ink">
        PROCURITY
      </span>
    </div>
  );
}
