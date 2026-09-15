import { getPoints } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const points = await getPoints(user.key);
    return Response.json(points);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to load points" },
      { status: 500 },
    );
  }
}