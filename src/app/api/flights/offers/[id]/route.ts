import { duffelErrorMessage, getFlightOffer } from "@/lib/duffel";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const offer = await getFlightOffer(id);
    if (!offer) {
      return Response.json(
        { error: "Duffel not configured or offer not found" },
        { status: 404 },
      );
    }
    return Response.json({ offer });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Failed to load offer") },
      { status: 500 },
    );
  }
}
