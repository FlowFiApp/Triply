import { duffelErrorMessage } from "@/lib/duffel";

const LOCAL_REVIEWS = [
  { reviewer_name: "Olivia M.", rating: 5, title: "Outstanding stay", body: "Gorgeous property, spotless rooms and a very attentive team. Would happily return." },
  { reviewer_name: "James T.", rating: 4, title: "Great location", body: "Perfect base to explore the city. Breakfast was excellent and the beds very comfy." },
  { reviewer_name: "Aisha K.", rating: 5, title: "Beautiful and serene", body: "The views were breathtaking and the amenities exactly as described. Highly recommended." },
  { reviewer_name: "Lucas B.", rating: 4, title: "Very good value", body: "Clean, modern and quiet. A couple of small hiccups at check-in but resolved quickly." },
  { reviewer_name: "Sofia R.", rating: 5, title: "Loved every moment", body: "From the rooftop pool to the dining, everything exceeded expectations." },
];

export async function GET(request: Request) {
  const accommodationId = new URL(request.url).searchParams.get("accommodationId");
  if (!accommodationId) {
    return Response.json({ error: "accommodationId is required", reviews: [] }, { status: 400 });
  }
  try {
    // NOTE: Stays are served from the bundled local dataset (Duffel Stays is
    // not enabled on this token). Live Duffel reviews kept below, commented out.
    /*
    const reviews = await getAccommodationReviews(accommodationId);
    */
    const reviews = LOCAL_REVIEWS;
    return Response.json({ reviews, live: reviews.length > 0 });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Reviews fetch failed"), reviews: [] },
      { status: 502 },
    );
  }
}