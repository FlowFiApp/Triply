import { duffelErrorMessage, listLoyaltyProgrammes } from "@/lib/duffel";
import { requireUser, unauthorized } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const programmes = await listLoyaltyProgrammes();
    return Response.json({
      programmes,
      live: programmes.length > 0,
    });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Failed to load loyalty programmes"), programmes: [], live: false },
      { status: 502 },
    );
  }
}