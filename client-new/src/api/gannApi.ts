import axios from 'axios';
import { GannAnalysisResult } from '../types/gannTypes';

export async function fetchGannAnalysis(): Promise<GannAnalysisResult> {
  const res = await axios.get<GannAnalysisResult>('http://localhost:3001/api/gann/analysis');
  return res.data;
}