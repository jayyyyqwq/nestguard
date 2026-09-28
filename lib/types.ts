export type EnclosureStatus = "healthy" | "attention" | "critical";

export interface TrendPoint {
  time: string;
  temp: number;
  humidity: number;
}

export interface Enclosure {
  id: string;
  name: string;
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
  trend: TrendPoint[];
}
