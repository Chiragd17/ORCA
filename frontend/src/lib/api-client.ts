import {
  Investigation,
  InvestigationCreateRequest,
  ExecutionEvent,
  EvidenceRecord,
  OceanResearchData,
} from '../types';

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const CANDIDATE_BASES = isLocal
  ? [
      import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
      'http://127.0.0.1:8000/api/v1',
      'http://localhost:8000/api/v1',
      '/api/v1',
    ]
  : [
      import.meta.env.VITE_API_BASE_URL || 'https://orca-backend-iqax.onrender.com/api/v1',
      'https://orca-backend-iqax.onrender.com/api/v1',
      '/api/v1',
    ];

class ApiClient {
  private activeBase: string = CANDIDATE_BASES[0];

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const bases = [this.activeBase, ...CANDIDATE_BASES.filter(b => b !== this.activeBase)];
    let lastError: any = null;

    for (const base of bases) {
      try {
        const url = `${base}${endpoint}`;
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
          },
          ...options,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error [${response.status}]: ${errorText}`);
        }

        this.activeBase = base;
        return await response.json();
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error(`Failed to request ${endpoint}`);
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async checkHealth(): Promise<{ status: string; database: string; version: string }> {
    const candidateUrls = isLocal
      ? [
          this.activeBase.replace('/api/v1', '/health'),
          'http://127.0.0.1:8000/health',
          'http://localhost:8000/health',
          'http://127.0.0.1:8000/api/v1/health',
          'http://localhost:8000/api/v1/health',
          '/health',
        ]
      : [
          this.activeBase.replace('/api/v1', '/health'),
          this.activeBase.replace('/api/v1', '/api/v1/health'),
          'https://orca-backend-iqax.onrender.com/health',
          '/health',
        ];

    for (const url of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = await resp.json();
          if (isLocal && url.includes(':8000')) {
            const hostMatch = url.match(/https?:\/\/[^/]+/);
            if (hostMatch) {
              this.activeBase = `${hostMatch[0]}/api/v1`;
            }
          } else if (!isLocal && url.includes('.onrender.com')) {
            const hostMatch = url.match(/https?:\/\/[^/]+/);
            if (hostMatch) {
              this.activeBase = `${hostMatch[0]}/api/v1`;
            }
          }
          return data;
        }
      } catch {
        // try next candidate
      }
    }

    throw new Error('All health check endpoints unreachable');
  }

  async listInvestigations(): Promise<Array<{
    investigation_id: string;
    status: string;
    workspace: string;
    created_at: string;
    planned_agents: string[];
  }>> {
    return this.request('/investigations');
  }

  async createInvestigation(data: InvestigationCreateRequest): Promise<{
    investigation_id: string;
    status: string;
    workspace: string;
    created_at: string;
    planned_agents: string[];
    final_answer?: string;
    findings_count?: number;
    evidence_count?: number;
    storage_tier?: string;
  }> {
    return this.request('/investigations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInvestigation(id: string): Promise<Investigation> {
    return this.request(`/investigations/${id}`);
  }

  async getInvestigationEvents(id: string): Promise<ExecutionEvent[]> {
    return this.request(`/investigations/${id}/events`);
  }

  async getInvestigationEvidence(id: string): Promise<EvidenceRecord[]> {
    return this.request(`/investigations/${id}/evidence`);
  }

  async getInvestigationReport(id: string): Promise<{ investigation_id: string; format: string; content: string }> {
    return this.request(`/investigations/${id}/report`);
  }

  async getMarineObservations(params: { lat: number; lon: number; start_time?: string; end_time?: string }): Promise<any> {
    const query = new URLSearchParams({
      lat: params.lat.toString(),
      lon: params.lon.toString(),
      ...(params.start_time && { start_time: params.start_time }),
      ...(params.end_time && { end_time: params.end_time }),
    });
    return this.request(`/marine/observations?${query.toString()}`);
  }

  async getMarineResearch(params: {
    lat: number;
    lon: number;
    radius_km?: number;
    time_horizon?: string;
  }): Promise<OceanResearchData> {
    const query = new URLSearchParams({
      lat: params.lat.toString(),
      lon: params.lon.toString(),
      ...(params.radius_km && { radius_km: params.radius_km.toString() }),
      ...(params.time_horizon && { time_horizon: params.time_horizon }),
    });
    return this.request(`/marine/research?${query.toString()}`);
  }

  async getHazards(params?: { status?: string; hazard_type?: string }): Promise<any> {
    const query = new URLSearchParams(params as any);
    return this.request(`/hazards?${query.toString()}`);
  }
}

export const apiClient = new ApiClient();
