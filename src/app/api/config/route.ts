import { serverConfig, serverReady } from "@/lib/config";

export async function GET() {
  return Response.json({ statuses: serverConfig(), ready: serverReady() });
}