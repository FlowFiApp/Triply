import {
  addPassenger,
  dbErrorMessage,
  deletePassenger,
  listPassengers,
  updatePassenger,
} from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    return Response.json({ passengers: await listPassengers(user.key) });
  } catch (err) {
    return Response.json({ error: dbErrorMessage(err) }, { status: 502 });
  }
}

function clean(body: Record<string, unknown>) {
  return {
    first: String(body.first ?? "").trim(),
    last: String(body.last ?? "").trim(),
    dob: String(body.dob ?? "").trim(),
    gender: String(body.gender ?? "").trim(),
    email: String(body.email ?? "").trim(),
    phone: String(body.phone ?? "").trim(),
    dialCode: body.dialCode ? String(body.dialCode) : undefined,
    passport: body.passport ? String(body.passport) : undefined,
  };
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const data = clean(body);
    if (!data.first || !data.last) {
      return Response.json({ error: "First and last name are required." }, { status: 400 });
    }
    const passenger = await addPassenger(user.key, data);
    return Response.json({ ok: true, passenger });
  } catch (err) {
    return Response.json({ error: dbErrorMessage(err) }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) return Response.json({ error: "Missing passenger id." }, { status: 400 });
    await updatePassenger(user.key, id, clean(body));
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: dbErrorMessage(err) }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (!user) return unauthorized();
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return Response.json({ error: "Missing passenger id." }, { status: 400 });
  try {
    await deletePassenger(user.key, id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: dbErrorMessage(err) }, { status: 502 });
  }
}