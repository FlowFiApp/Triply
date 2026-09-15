import { dbErrorMessage, getUserProfile, updateProfile } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    return Response.json(await getUserProfile(user.key));
  } catch (err) {
    return Response.json({ error: dbErrorMessage(err) }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const key = user.key;

    const patch: { username?: string; avatar?: string; onboarded?: boolean } = {};
    if (body.username !== undefined) {
      const username = String(body.username).trim().replace(/\s+/g, " ").slice(0, 30);
      if (username && username.length < 3) {
        return Response.json({ error: "Username must be at least 3 characters." }, { status: 400 });
      }
      patch.username = username;
    }
    if (body.avatar !== undefined) patch.avatar = String(body.avatar);
    if (body.onboarded !== undefined) patch.onboarded = Boolean(body.onboarded);

    const profile = await updateProfile(key, patch);
    return Response.json({ ok: true, profile });
  } catch (err) {
    return Response.json({ error: dbErrorMessage(err) }, { status: 502 });
  }
}