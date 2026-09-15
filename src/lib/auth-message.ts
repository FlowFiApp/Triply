export function authMessage(nonce: string): string {
  return `Sign in to Triply\n\nNonce: ${nonce}`;
}
