export interface GannAnalysisResult {
  section: string;
  stage: number;
  supportResistance: { label: string; value: number }[];
  volume: { signal: string; details: any };
  patterns: { patterns: string[]; signals: string[] };
  cycles: { cycles: string[]; signals: string[] };
  risk: { allowedRisk: number; stopLoss: number; lossStreak: number; pauseTrading: boolean };
  logs: { timestamp: string; type: string; message: string; data?: any }[];
}