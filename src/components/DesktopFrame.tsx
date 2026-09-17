import type { ReactNode } from "react";

/**
 * On desktop/large screens the app is framed inside a phone device; on small
 * screens it fills the viewport as a normal mobile app. The frame establishes a
 * containing block (`will-change: transform`) so the app's fixed overlays
 * (tab bar, sheets, toasts) stay inside the phone.
 */
export default function DesktopFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full justify-center bg-background md:items-center md:bg-[#0a0f1c] md:bg-[radial-gradient(ellipse_at_top,#1e293b,#0a0f1c)]">
      <div className="relative w-full overflow-hidden bg-background md:will-change-transform md:h-[100dvh] md:w-[400px] md:max-w-[94vw] md:rounded-[3rem] md:shadow-[0_0_0_10px_#1e293b,0_0_0_11px_#0b1220,0_30px_80px_rgba(0,0,0,0.6)]">
        {/* Dynamic island (desktop frame only) */}
        <div className="pointer-events-none absolute left-1/2 top-2 z-[95] hidden h-[26px] w-28 -translate-x-1/2 items-center justify-end rounded-full bg-black px-3 md:flex">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
        </div>

        {children}
      </div>
    </div>
  );
}