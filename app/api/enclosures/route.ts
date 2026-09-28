import { NextRequest, NextResponse } from "next/server";

// Server-side proxy for the one backend write called from a client component
// (the enclosure-registration form). HONEYCHAIN_API_KEY is already safe to
// use here — this route exists purely so it never reaches the browser bundle.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.HONEYCHAIN_API_KEY;

export async function POST(req: NextRequest) {
  const body = await req.text();

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/enclosures`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      },
      body,
    });
  } catch {
    return NextResponse.json({ detail: `Could not reach the NestGuard API at ${API_BASE_URL}.` }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
