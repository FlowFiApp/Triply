import { getFiatUsdtRate } from "@/lib/duffel";

export async function GET(request: Request) {
  const fiat = new URL(request.url).searchParams.get("fiat") ?? "NGN";
  const rate = await getFiatUsdtRate(fiat);
  return Response.json(rate);
}