"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { BottomTabBar, MobileShell } from "@/components/shell";
import { SkeletonRows } from "@/components/ui/feedback";
import { useLoyaltyProgrammes } from "@/lib/api/hooks";

export default function LoyaltyProgrammes() {
  const router = useRouter();
  const { data: programmes = [], isLoading, error } = useLoyaltyProgrammes();
  const errorMessage = error instanceof Error ? error.message : "";

  return (
    <MobileShell header={<><div className="flex h-[60px] items-center gap-3 bg-background px-4 py-3">
          <button
            onClick={() => router.push("/feed")}
            aria-label="Back to feeds"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <h1 className="text-[18px] font-extrabold text-foreground">
            Loyalty Programmes
          </h1>
        </div></>}>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
          <div className="px-4 pt-2">
            <p className="text-[13px] text-muted">
              Earn and spend with airline frequent-flyer programmes available
              through Duffel.
            </p>
          </div>

          <div className="flex flex-col gap-3 px-4 py-4">
            {isLoading ? (
              <SkeletonRows rows={6} height={72} />
            ) : errorMessage ? (
              <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-[13px] text-muted">
                {errorMessage}
              </p>
            ) : programmes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-4 py-10 text-center">
                <p className="text-[15px] font-bold text-foreground">
                  No loyalty programmes
                </p>
                <p className="text-[13px] text-muted">
                  Programmes will appear here when they&apos;re available.
                </p>
              </div>
            ) : (
              programmes.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.logoUrl}
                      alt={p.name}
                      className="h-10 w-10 shrink-0 rounded-lg bg-card-2 object-contain p-1"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#5b7cfa] text-[12px] font-extrabold text-accent-2">
                      {p.name.slice(0, 1)}
                    </span>
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[14px] font-bold text-foreground">
                      {p.name}
                    </span>
                    <span className="text-[12px] text-muted">
                      {p.alliance || "Independent programme"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {programmes.length > 0 ? (
            <p className="flex items-center justify-center gap-1.5 px-4 pb-2 text-[11px] text-muted">
              <Loader2 size={12} className="animate-spin" />
              Synced with Duffel
            </p>
          ) : null}
        </div>

        <BottomTabBar active="Feed" />
      </div>
    </MobileShell>
  );
}