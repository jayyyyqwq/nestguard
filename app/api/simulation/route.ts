import { NextRequest, NextResponse } from "next/server";
import { crossSiteRefused, isSameOrigin, proxyToBackend } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyToBackend("/simulation", { method: "GET" });
}

// POST /api/simulation?action=start|stop. Starting or stopping wipes stored
// readings, so only the dashboard's own pages may call it.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return crossSiteRefused();
  const action = req.nextUrl.searchParams.get("action");
  if (action !== "start" && action !== "stop") {
    return NextResponse.json({ detail: "action must be start or stop" }, { status: 400 });
  }
  return proxyToBackend(`/simulation/${action}`, { method: "POST" });
}
