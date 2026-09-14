import { duffelErrorMessage, searchAccommodationSuggestions } from "@/lib/duffel";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("query") ?? "";
  if (q.trim().length < 2) return Response.json({ suggestions: [], live: false });
  try {
    const suggestions = await searchAccommodationSuggestions(q);
    return Response.json({ suggestions, live: suggestions.length > 0 });
  } catch (err) {
    return Response.json(
      { error: duffelErrorMessage(err, "Suggestion search failed"), suggestions: [], live: false },
      { status: 502 },
    );
  }
}