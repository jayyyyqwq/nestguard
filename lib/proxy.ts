import { NextResponse } from "next/server";

// Server-only. HONEYCHAIN_API_KEY has no NEXT_PUBLIC_ prefix, so it never
// reaches the browser bundle; the proxy routes attach it on the way through.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.HONEYCHAIN_API_KEY;

export async function proxyToBackend(path: string, init: { method: "GET" | "POST"; body?: string }) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method,
      body: init.body,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      },
    });
  } catch {
    return NextResponse.json({ detail: `Could not reach the NestGuard API at ${API_BASE_URL}.` }, { status: 502 });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
