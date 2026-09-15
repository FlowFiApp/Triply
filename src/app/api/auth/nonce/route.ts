import { createNonce } from "@/lib/auth";
import { normalizeNqAddr } from "@/lib/nimiq-verify";

export async function GET(request: Request) {
  const address = normalizeNqAddr(
    new URL(request.url).searchParams.get("address") ?? "",
  );
  if (!address) {
    return Response.json({ error: "Missing address." }, { status: 400 });
  }
  return Response.json({ address, nonce: createNonce(address) });
}
