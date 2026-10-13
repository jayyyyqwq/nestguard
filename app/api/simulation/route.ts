import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyToBackend("/simulation", { method: "GET" });
}

// POST /api/simulation?action=start|stop
export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");
  if (action !== "start" && action !== "stop") {
    return NextResponse.json({ detail: "action must be start or stop" }, { status: 400 });
  }
  return proxyToBackend(`/simulation/${action}`, { method: "POST" });
}
