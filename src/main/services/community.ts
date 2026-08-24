import type { CompressionAlgorithm } from '../../renderer/src/types';

export interface CommunityGameEstimate {
  gameId: string;
  gameName: string;
  appId?: string;
  totalSubmissions: number;
  avgSavedBytes: number;
  avgRatio: number;
  bestAlgorithm: CompressionAlgorithm;
  savingsPercent: number;
}

export interface CommunityReportPayload {
  gameId: string;
  gameName: string;
  appId?: string;
  platform?: string;
  uncompressedBytes: number;
  compressedBytes: number;
  savedBytes: number;
  ratio: number;
  algorithm: string;
  os: string;
}

const DEFAULT_SERVER_URL = 'http://hw.falsetrue.net:8090';

export class CommunityService {
  private serverUrl: string = DEFAULT_SERVER_URL;

  public setServerUrl(url: string) {
    if (url && url.trim()) {
      this.serverUrl = url.trim().replace(/\/+$/, '');
    }
  }

  public async fetchEstimates(
    games: Array<{ gameId: string; name: string; appId?: string }>
  ): Promise<Record<string, CommunityGameEstimate>> {
    try {
      const response = await fetch(`${this.serverUrl}/api/v1/estimates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games }),
        signal: AbortSignal.timeout(4000), // 4s timeout
      });

      if (!response.ok) return {};
      const data = await response.json() as { estimates: Record<string, CommunityGameEstimate> };
      return data.estimates || {};
    } catch {
      // Offline fallback: returns empty mapping without interrupting local scanning
      return {};
    }
  }

  public async submitReport(report: CommunityReportPayload): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/api/v1/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  public async fetchOverview(): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/api/v1/overview`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }
}

export const communityService = new CommunityService();
