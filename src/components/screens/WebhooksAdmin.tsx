"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { MobileShell } from "@/components/shell";
import { EmptyState, SkeletonRows } from "@/components/ui/feedback";
import { useToast } from "@/lib/toast";

type Delivery = {
  id: string;
  http_status: number | null;
  status: string;
  event_id: string;
  created_at: string;
};

type Group = {
  webhook: { id: string; url: string; events: string[]; active: boolean };
  deliveries: Delivery[];
};

export default function WebhooksAdmin() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [redelivering, setRedelivering] = useState<string | null>(null);
  const { toast } = useToast();

  const load = () => {
    fetch("/api/webhooks/admin")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setGroups(d.deliveries ?? []);
      })
      .catch(() => setError("Failed to load webhooks."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const redeliver = async (eventId: string) => {
    setRedelivering(eventId);
    try {
      const res = await fetch("/api/webhooks/admin/redeliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "Redelivery failed");
      toast("success", "Webhook event redelivered.");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Redelivery failed");
    } finally {
      setRedelivering(null);
    }
  };

  return (
    <MobileShell>
      <div className="flex min-h-screen flex-col">
        <div className="sticky top-0 z-30 flex h-[60px] items-center justify-between bg-background px-5">
          <h1 className="text-[18px] font-extrabold text-foreground">
            Webhooks
          </h1>
          <button
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="flex items-center gap-1 text-[12px] font-bold text-accent-2"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 pb-6 pt-4">
          {loading ? <SkeletonRows rows={3} height={120} /> : null}

          {!loading && error ? (
            <EmptyState
              title="Webhooks unavailable"
              message={error}
              icon={<RefreshCw size={24} />}
            />
          ) : null}

          {!loading && !error && groups.length === 0 ? (
            <EmptyState
              title="No webhooks"
              message="Create a webhook in the Duffel dashboard to receive order events here."
              icon={<RefreshCw size={24} />}
            />
          ) : null}

          {!loading &&
            !error &&
            groups.map((g) => (
              <div key={g.webhook.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                  <span className="flex-1 truncate text-[13px] font-semibold text-foreground">
                    {g.webhook.url}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      g.webhook.active
                        ? "bg-accent-2 text-accent"
                        : "bg-card-3 text-muted"
                    }`}
                  >
                    {g.webhook.active ? "active" : "inactive"}
                  </span>
                </div>
                {g.deliveries.length ? (
                  <div className="flex flex-col gap-1.5">
                    {g.deliveries.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2"
                      >
                        <span className="flex flex-col">
                          <span
                            className={`text-[12px] font-semibold ${
                              d.status === "delivered"
                                ? "text-accent-2"
                                : "text-red-500"
                            }`}
                          >
                            {d.status} {d.http_status ? `· HTTP ${d.http_status}` : ""}
                          </span>
                          <span className="text-[10px] text-muted">
                            {d.event_id} · {d.created_at?.slice(0, 10)}
                          </span>
                        </span>
                        <button
                          onClick={() => redeliver(d.event_id)}
                          disabled={redelivering === d.event_id}
                          className="flex h-8 items-center gap-1 rounded-full border border-border bg-card-2 px-3 text-[11px] font-bold text-foreground disabled:opacity-50"
                        >
                          <RefreshCw size={12} /> Retry
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-2 text-[11px] text-muted">
                    No deliveries yet for this webhook.
                  </p>
                )}
              </div>
            ))}
        </div>
      </div>
    </MobileShell>
  );
}