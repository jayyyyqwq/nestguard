import { NextRequest, NextResponse } from "next/server";

// Server-only. HONEYCHAIN_API_KEY has no NEXT_PUBLIC_ prefix, so it never
// reaches the browser bundle; the proxy routes attach it on the way through.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.HONEYCHAIN_API_KEY;

// localhost or a bare IPv4 address (a phone on the LAN opening http://192.168.x.x:3000).
// Domain names are refused, which also blocks DNS-rebinding tricks.
const LOCAL_HOST = /^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?$/;

/**
 * The proxy routes attach the API key, so they must only act for the
 * dashboard's own pages. Browsers always send Origin on POST and a foreign
 * site can't forge it, so a cross-site form or fetch is refused here.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host || !LOCAL_HOST.test(host)) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const crossSiteRefused = () =>
  NextResponse.json({ detail: "Refused: request did not come from the NestGuard dashboard." }, { status: 403 });

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
