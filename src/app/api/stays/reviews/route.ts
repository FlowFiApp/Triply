import { duffelErrorMessage, getAccommodationReviews } from "@/lib/duffel";

export async function GET(request: Request) {
  const accommodationId = new URL(request.url).searchParams.get("accommodationId");
  if (!accommodationId) {
    return Response.json({ error: "accommodationId is required", reviews: [] }, { status: 400 });
  }
  try {
    const reviews = await getAccommodationReviews(accommodationId);
    return Response.json({ reviews, live: reviews.length > 0 });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Reviews fetch failed"), reviews: [] },
      { status: 502 },
    );
  }
}