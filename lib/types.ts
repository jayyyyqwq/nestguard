export type EnclosureStatus = "waiting" | "healthy" | "attention" | "critical";
export type EnclosureKind = "beehive" | "coop" | "shelter";

export interface TrendPoint {
  time: string; // ISO, local time
  temp: number;
  humidity: number;
  airQuality: number;
}

export interface Limits {
  attention: number;
  critical: number;
}

export interface Enclosure {
  id: string;
  name: string;
  kind: EnclosureKind;
  label: string;
  temperature: number;
  humidity: number;
  airQuality: number;
  light: number;
  sound: number;
  activity: "Low" | "Normal" | "High";
  status: EnclosureStatus;
  aiReason: string;
  aiAction: string;
  lastSynced: string;
  isOffline: boolean;
  limits: { temperature: Limits; airQuality: Limits };
  trend: TrendPoint[];
}

export interface Device {
  id: string;
  kind: EnclosureKind;
  label: string;
  registered: boolean;
}

export interface Alert {
  enclosureId: string;
  kind: "attention" | "critical";
  message: string;
  createdAt: string;
  resolved: boolean;
}

export interface SimulationStatus {
  running: boolean;
  progress: number;
  elapsedSeconds: number;
  durationSeconds: number;
  phase: string;
}
