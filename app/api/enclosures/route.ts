import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy";

// Registration form → backend, with the API key attached server-side.
export async function POST(req: NextRequest) {
  return proxyToBackend("/enclosures", { method: "POST", body: await req.text() });
}
