export type Severity = "ต่ำ" | "เฝ้าระวัง" | "ระบาด";

export type TrapReading = {
  id: string;
  trapId: string;
  trapName: string;
  location: string;
  recordedAt: string;
  count: number;
  temperature?: number;
  humidity?: number;
  battery?: number;
  imagePath?: string;
  imageUrl?: string;
  confidence?: number;
  severity: Severity;
  source: "demo" | "api" | "pi-agent" | "esp32-cam" | "manual";
};

export type CreateTrapReading = Omit<TrapReading, "id" | "severity" | "recordedAt" | "source"> & {
  recordedAt?: string;
  source?: TrapReading["source"];
};

export function classifySeverity(count: number): Severity {
  if (count >= 25) return "ระบาด";
  if (count >= 10) return "เฝ้าระวัง";
  return "ต่ำ";
}
