import { NextRequest } from "next/server";
import { crossSiteRefused, isSameOrigin, proxyToBackend } from "@/lib/proxy";

// Registration form → backend, with the API key attached server-side.
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return crossSiteRefused();
  return proxyToBackend("/enclosures", { method: "POST", body: await req.text() });
}
