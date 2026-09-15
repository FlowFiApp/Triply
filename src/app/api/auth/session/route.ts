import { readAuthToken, verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  const token = readAuthToken(request);
  const address = token ? await verifyToken(token) : null;
  return Response.json({ authenticated: Boolean(address), address: address ?? null });
}
