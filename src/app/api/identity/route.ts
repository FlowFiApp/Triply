import { cookies } from "next/headers";

const COOKIE = "triply-id";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function GET() {
  const store = await cookies();
  let id = store.get(COOKIE)?.value;
  if (!id) {
    id = crypto.randomUUID();
    store.set(COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE,
    });
  }
  return Response.json({ deviceId: id });
}