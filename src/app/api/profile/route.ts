import { dbErrorMessage, getUserProfile, updateProfile } from "@/lib/db";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!key) return Response.json({ username: "", avatar: "" });
  try {
    return Response.json(await getUserProfile(key));
  } catch (err) {
    return Response.json({ error: dbErrorMessage(err) }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const key = String(body.key ?? "");
    if (!key) return Response.json({ error: "Missing identity." }, { status: 400 });

    const patch: { username?: string; avatar?: string } = {};
    if (body.username !== undefined) {
      const username = String(body.username).trim().replace(/\s+/g, " ").slice(0, 30);
      if (username && username.length < 3) {
        return Response.json({ error: "Username must be at least 3 characters." }, { status: 400 });
      }
      patch.username = username;
    }
    if (body.avatar !== undefined) patch.avatar = String(body.avatar);

    const profile = await updateProfile(key, patch);
    return Response.json({ ok: true, profile });
  } catch (err) {
    return Response.json({ error: dbErrorMessage(err) }, { status: 502 });
  }
}