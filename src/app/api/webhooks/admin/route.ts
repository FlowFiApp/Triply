/* eslint-disable @typescript-eslint/no-explicit-any */
import { duffelErrorMessage, listWebhookDeliveries, listWebhooks } from "@/lib/duffel";

export async function GET() {
  try {
    const webhooks = await listWebhooks();
    const deliveries = await Promise.all(
      (webhooks ?? []).map(async (w: any) => {
        try {
          return {
            webhook: { id: w.id, url: w.url, events: w.events ?? [], active: w.active ?? true },
            deliveries: await listWebhookDeliveries(w.id),
          };
        } catch {
          return { webhook: { id: w.id, url: w.url, events: w.events ?? [], active: w.active ?? true }, deliveries: [] };
        }
      }),
    );
    return Response.json({ webhooks, deliveries, live: (webhooks ?? []).length > 0 });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Webhooks fetch failed"), webhooks: [], deliveries: [], live: false },
      { status: 502 },
    );
  }
}