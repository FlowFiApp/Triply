import { authCookieHeader, consumeNonce, issueToken } from "@/lib/auth";
import { authMessage } from "@/lib/auth-message";
import {
  normalizeNqAddr,
  verifySignedMessageDeriveAddress,
} from "@/lib/nimiq-verify";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const address = normalizeNqAddr(String(body.address ?? ""));
    const nonce = String(body.nonce ?? "");
    const publicKey = String(body.publicKey ?? "");
    const signature = String(body.signature ?? "");

    if (!address || !nonce || !publicKey || !signature) {
      return Response.json({ error: "Missing credentials." }, { status: 400 });
    }
    if (!consumeNonce(address, nonce)) {
      return Response.json(
        { error: "Invalid or expired sign-in request." },
        { status: 400 },
      );
    }

    const derived = await verifySignedMessageDeriveAddress(
      authMessage(nonce),
      publicKey,
      signature,
    );
    if (!derived || normalizeNqAddr(derived) !== address) {
      return Response.json(
        { error: "Signature verification failed." },
        { status: 401 },
      );
    }

    const token = await issueToken(address);
    return Response.json(
      { ok: true, address, token },
      { headers: { "Set-Cookie": authCookieHeader(token) } },
    );
  } catch {
    return Response.json({ error: "Sign-in failed." }, { status: 500 });
  }
}
