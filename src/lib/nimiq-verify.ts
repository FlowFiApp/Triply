/**
 * Verifies Nimiq Pay / Hub signed messages (Keyguard prefix + Ed25519).
 * Same approach as production Nimiq Pay mini apps.
 */
const NIMIQ_MSG_PREFIX = "\x16Nimiq Signed Message:\n";

export function normalizeNqAddr(v: string): string {
  return String(v || "").replace(/\s+/g, "").toUpperCase();
}

/** Accept base64 or hex encodings from Host / Mini App SDK. */
export function decodeKeyMaterial(raw: string): Uint8Array {
  const t = String(raw || "").trim();
  if (!t) throw new Error("empty_key_material");
  if (/^[0-9a-fA-F]+$/.test(t) && t.length % 2 === 0) {
    return Uint8Array.from(Buffer.from(t, "hex"));
  }
  return Uint8Array.from(Buffer.from(t, "base64"));
}

export async function verifySignedMessageDeriveAddress(
  message: string,
  signerPublicKeyEncoded: string,
  signatureEncoded: string,
): Promise<string | null> {
  try {
    const { Hash, PublicKey, Signature } = await import("@nimiq/core");

    const pubBytes = decodeKeyMaterial(signerPublicKeyEncoded);
    const sigBytes = decodeKeyMaterial(signatureEncoded);

    const data = NIMIQ_MSG_PREFIX + String(message.length) + message;
    const dataBytes = new TextEncoder().encode(data);
    const hash = Hash.computeSha256(dataBytes);

    const publicKey = new PublicKey(pubBytes);
    const signature = Signature.deserialize(sigBytes);

    if (!publicKey.verify(signature, hash)) return null;

    return publicKey.toAddress().toUserFriendlyAddress();
  } catch (err) {
    console.error("[verifyNimiq]", err);
    return null;
  }
}
