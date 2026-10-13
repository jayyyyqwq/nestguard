import type { Alert, Device, Enclosure, SimulationStatus } from "@/lib/types";

// Falls back to the local backend so the app works out of the box with no
// .env file, matching `backend/.env.example`.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Server components only: reads go straight to the backend. Writes from the
// browser go through the Next.js proxy routes in app/api/ instead, which attach
// the API key server-side so it never ships to the browser bundle.
async function apiFetch<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
  } catch {
    throw new ApiError(
      `Could not reach the NestGuard API at ${API_BASE_URL}. Is the backend running? Start it with run.bat.`
    );
  }
  if (!res.ok) {
    throw new ApiError(`NestGuard API error on ${path}: ${res.status} ${res.statusText}`, res.status);
  }
  return res.json() as Promise<T>;
}

/** Returns null on 404 instead of throwing, for pages that call notFound(). */
async function apiFetchOrNull<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export const getEnclosures = () => apiFetch<Enclosure[]>("/enclosures");
export const getEnclosure = (id: string) => apiFetchOrNull<Enclosure>(`/enclosures/${encodeURIComponent(id)}`);
export const getEnclosureAlerts = (id: string) => apiFetch<Alert[]>(`/enclosures/${encodeURIComponent(id)}/alerts`);
export const getDevices = () => apiFetch<Device[]>("/devices");
export const getRecentAlerts = (limit = 12) => apiFetch<Alert[]>(`/alerts?limit=${limit}`);

// ---- Browser-side calls, via the local proxy routes ----

async function proxyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(typeof body.detail === "string" ? body.detail : `Request failed (${res.status})`, res.status);
  }
  return body as T;
}

export const createEnclosure = (payload: { id: string; name?: string }) =>
  proxyFetch<Enclosure>("/api/enclosures", { method: "POST", body: JSON.stringify(payload) });

export const getSimulationStatus = () => proxyFetch<SimulationStatus>("/api/simulation");

export const setSimulation = (action: "start" | "stop") =>
  proxyFetch<SimulationStatus>(`/api/simulation?action=${action}`, { method: "POST" });
