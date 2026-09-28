import type { Enclosure } from "@/lib/types";

// Falls back to the local backend so the app works out of the box with no
// .env file, matching `backend/.env.example`.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Server-only — undefined in the browser bundle, only ever attached when
// apiFetch runs in a server component.
const API_KEY = process.env.HONEYCHAIN_API_KEY;

class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      `Could not reach the NestGuard API at ${API_BASE_URL}. Is the backend running? ` +
        `(cd backend && uvicorn app.main:app --reload --port 8000)`
    );
  }

  if (!res.ok) {
    throw new ApiError(`NestGuard API error on ${path}: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

/** Returns null on 404 instead of throwing, for pages that call notFound(). */
async function apiFetchOrNull<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.message.includes("404")) return null;
    throw err;
  }
}

export function getEnclosures() {
  return apiFetch<Enclosure[]>("/enclosures");
}

export function getEnclosure(id: string) {
  return apiFetchOrNull<Enclosure>(`/enclosures/${id}`);
}

// Proxied through a local Next.js route (app/api/enclosures/route.ts) instead
// of apiFetch, since this is the only backend write called from a client
// component — the proxy attaches the API key server-side so it never ships
// to the browser bundle.
export async function createEnclosure(payload: { id: string; name: string }): Promise<Enclosure> {
  const res = await fetch("/api/enclosures", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new ApiError(`NestGuard API error on /enclosures: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<Enclosure>;
}
