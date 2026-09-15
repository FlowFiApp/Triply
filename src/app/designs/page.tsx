import Link from "next/link";
import { MobileShell } from "@/components/shell";
import { DESIGNS, DESIGN_GROUPS } from "@/lib/designs";

export const metadata = {
  title: "Triply — 43 Designs",
};

export default function DesignsPage() {
  return (
    <MobileShell>
      <div className="px-5 py-3">
        <h1 className="text-[22px] font-extrabold text-foreground">
          Triply Designs
        </h1>
        <p className="mt-1 text-[12px] text-muted">
          {DESIGNS.length} screens implemented from Figma · dark &amp; light
          themes
        </p>
      </div>

      {DESIGN_GROUPS.map((group) => (
        <section key={group.key} className="px-5 py-3">
          <h2 className="mb-2 text-[14px] font-bold text-accent-fg">
            {group.label}
          </h2>
          <div className="flex flex-col gap-2">
            {DESIGNS.filter((d) => d.kind === group.key).map((d) => (
              <Link
                key={d.id}
                href={d.href}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-semibold text-foreground">
                    {d.name}
                  </span>
                  <span className="text-[11px] text-muted">node {d.id}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    d.theme === "dark"
                      ? "bg-card-3 text-foreground"
                      : "bg-accent-2 text-accent"
                  }`}
                >
                  {d.theme}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </MobileShell>
  );
}
