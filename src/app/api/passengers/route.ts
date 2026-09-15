import {
  addPassenger,
  dbErrorMessage,
  deletePassenger,
  listPassengers,
  updatePassenger,
} from "@/lib/db";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!key) return Response.json({ passengers: [] });
  try {
    return Response.json({ passengers: await listPassengers(key) });
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
  try {
    const body = await request.json();
    const key = String(body.key ?? "");
    if (!key) return Response.json({ error: "Missing identity." }, { status: 400 });
    const data = clean(body);
    if (!data.first || !data.last) {
      return Response.json({ error: "First and last name are required." }, { status: 400 });
    }
    const passenger = await addPassenger(key, data);
    return Response.json({ ok: true, passenger });
  } catch (err) {
    return Response.json({ error: dbErrorMessage(err) }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const key = String(body.key ?? "");
    const id = String(body.id ?? "");
    if (!key || !id) return Response.json({ error: "Missing identity." }, { status: 400 });
    await updatePassenger(key, id, clean(body));
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: dbErrorMessage(err) }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const id = url.searchParams.get("id") ?? "";
  if (!key || !id) return Response.json({ error: "Missing identity." }, { status: 400 });
  try {
    await deletePassenger(key, id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: dbErrorMessage(err) }, { status: 502 });
  }
}