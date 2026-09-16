import { MongoClient } from "mongodb";

const URI = process.env.MONGODB_URI;

export async function GET() {
  if (!URI) {
    return Response.json({ uniqueUsers: 0, error: "MONGODB_URI not configured" });
  }
  try {
    const client = new MongoClient(URI, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const db = client.db("triply");
    const uniqueUsers = await db.collection("users").countDocuments();
    await client.close();
    return Response.json({ uniqueUsers });
  } catch (err) {
    return Response.json(
      { uniqueUsers: 0, error: err instanceof Error ? err.message : "Failed to count users" },
      { status: 500 },
    );
  }
}
