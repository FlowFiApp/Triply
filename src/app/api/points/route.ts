import { getPoints } from "@/lib/db";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!key) return Response.json({ earned: 0, available: 0 });
  try {
    const points = await getPoints(key);
    return Response.json(points);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load points" },
      { status: 500 },
    );
  }
}