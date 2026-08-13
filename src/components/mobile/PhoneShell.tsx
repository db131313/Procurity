import { BottomNav } from "./BottomNav";

export function PhoneShell({
  children,
  showNav = true,
  className = "",
  wide = false,
}: {
  children: React.ReactNode;
  showNav?: boolean;
  className?: string;
  /** Allow a wider responsive canvas on tablet/desktop */
  wide?: boolean;
}) {
  return (
    <div
      className={`pc-phone-shell ${wide ? "pc-phone-shell--wide" : ""} ${className}`}
    >
      <div
        className={
          showNav ? "pc-bottom-pad relative min-h-full" : "relative min-h-full"
        }
      >
        {children}
      </div>
      {showNav ? <BottomNav /> : null}
    </div>
  );
}
