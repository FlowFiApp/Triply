import { authCookieHeader, verifyToken } from "@/lib/auth";

// Re-establishes the HttpOnly session cookie from a JWT the client persisted
// in localStorage (used for auto-reconnect when cookies are cleared, e.g. in
// embedded webviews).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token ?? "");
    const address = await verifyToken(token);
    if (!address) {
      return Response.json(
        { ok: false, error: "Invalid or expired session." },
        { status: 401 },
      );
    }
    return Response.json(
      { ok: true, address },
      { headers: { "Set-Cookie": authCookieHeader(token) } },
    );
  } catch {
    return Response.json({ ok: false, error: "Restore failed." }, { status: 500 });
  }
}