import {
  GDACSStatusResponse,
  GDACSSyncResponse,
  HazardEvent,
  HazardFilterState,
  HazardListResponse,
  HazardStatsResponse,
  HazardTrackResponse,
  MarineForecastResponse,
  MarineForecastItem,
  MarineForecastSyncRequest,
  MarineForecastSyncResponse,
  MarineProviderStatusResponse,
  CycloneForecastRunListResponse,
  CycloneForecastPositionItem,
  CycloneProviderStatusResponse,
  CycloneForecastSyncResponse,
  HazardAgentAnalysisRequest,
  HazardAgentAnalysisResponse,
  HazardAgentChatRequest,
  HazardAgentChatResponse,
} from "./types";

const CANDIDATE_BASES = [
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
  'http://127.0.0.1:8000/api/v1',
  'http://localhost:8000/api/v1',
  '/api/v1',
];

class HazardApiClient {
  private activeBase: string = CANDIDATE_BASES[0];

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const bases = [this.activeBase, ...CANDIDATE_BASES.filter((b) => b !== this.activeBase)];
    let lastError: any = null;

    for (const base of bases) {
      try {
        const url = `${base}${endpoint}`;
        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...(options?.headers || {}),
          },
          ...options,
        });

        if (!response.ok) {
          let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
          try {
            const errorJson = await response.json();
            errorMessage = errorJson.detail || errorMessage;
          } catch {
            // fallback
          }
          throw new Error(errorMessage);
        }

        this.activeBase = base;
        return await response.json();
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error(`Failed to request ${endpoint}`);
  }

  async fetchHazardList(filters: HazardFilterState): Promise<HazardListResponse> {
    const params = new URLSearchParams();
    if (filters.search?.trim()) params.append("search", filters.search.trim());
    if (filters.basin && filters.basin !== "all") params.append("basin", filters.basin);
    if (filters.category && filters.category !== "all") params.append("category", filters.category);
    if (filters.sortBy) params.append("sort_by", filters.sortBy);
    if (filters.sortOrder) params.append("sort_order", filters.sortOrder);
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.limit) params.append("limit", filters.limit.toString());
    params.append("status", "historical");
    params.append("include_tracks", "false");

    const qs = params.toString();
    return this.request<HazardListResponse>(`/hazards${qs ? `?${qs}` : ""}`);
  }

  async fetchActiveLiveAlerts(): Promise<HazardEvent[]> {
    const response = await this.request<HazardListResponse>(
      "/hazards?status=active&include_tracks=true&limit=50&sort_by=last_observed&sort_order=desc"
    );
    return response.items;
  }

  async syncGdacsLiveAlerts(): Promise<GDACSSyncResponse> {
    return this.request<GDACSSyncResponse>("/hazards/sync/gdacs", {
      method: "POST",
    });
  }

  async fetchGdacsStatus(): Promise<GDACSStatusResponse> {
    return this.request<GDACSStatusResponse>("/hazards/sync/gdacs/status");
  }

  async fetchHazardDetail(hazardId: string): Promise<HazardEvent> {
    return this.request<HazardEvent>(`/hazards/${encodeURIComponent(hazardId)}`);
  }

  async fetchHazardTrack(hazardId: string): Promise<HazardTrackResponse> {
    return this.request<HazardTrackResponse>(`/hazards/${encodeURIComponent(hazardId)}/track`);
  }

  async fetchHazardStats(hazardId: string): Promise<HazardStatsResponse> {
    return this.request<HazardStatsResponse>(`/hazards/${encodeURIComponent(hazardId)}/stats`);
  }

  async fetchMarineForecasts(
    latitude: number,
    longitude: number,
    radiusDeg: number = 0.5,
    limit: number = 72
  ): Promise<MarineForecastResponse> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius_deg: radiusDeg.toString(),
      limit: limit.toString(),
    });
    return this.request<MarineForecastResponse>(`/forecasts/marine?${params.toString()}`);
  }

  async fetchLatestMarineForecast(
    latitude: number,
    longitude: number
  ): Promise<MarineForecastItem> {
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    });
    return this.request<MarineForecastItem>(`/forecasts/marine/latest?${params.toString()}`);
  }

  async syncMarineForecasts(
    payload: MarineForecastSyncRequest
  ): Promise<MarineForecastSyncResponse> {
    return this.request<MarineForecastSyncResponse>("/forecasts/marine/sync", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async fetchMarineProviderStatus(
    latitude?: number,
    longitude?: number
  ): Promise<MarineProviderStatusResponse> {
    const params = new URLSearchParams();
    if (latitude !== undefined) params.append("latitude", latitude.toString());
    if (longitude !== undefined) params.append("longitude", longitude.toString());
    const qs = params.toString();
    return this.request<MarineProviderStatusResponse>(
      `/forecasts/marine/status${qs ? `?${qs}` : ""}`
    );
  }

  async fetchCycloneForecastRuns(
    stormId?: string
  ): Promise<CycloneForecastRunListResponse> {
    const qs = stormId ? `?storm_id=${encodeURIComponent(stormId)}` : "";
    return this.request<CycloneForecastRunListResponse>(`/forecasts/cyclones/runs${qs}`);
  }

  async fetchCycloneForecastPositions(
    runId: string
  ): Promise<CycloneForecastPositionItem[]> {
    return this.request<CycloneForecastPositionItem[]>(
      `/forecasts/cyclones/runs/${encodeURIComponent(runId)}/positions`
    );
  }

  async fetchCycloneProviderStatus(): Promise<CycloneProviderStatusResponse> {
    return this.request<CycloneProviderStatusResponse>("/forecasts/cyclones/status");
  }

  async syncCycloneForecasts(): Promise<CycloneForecastSyncResponse> {
    return this.request<CycloneForecastSyncResponse>("/forecasts/cyclones/sync", {
      method: "POST",
    });
  }

  async analyzeHazardAgent(
    request: HazardAgentAnalysisRequest
  ): Promise<HazardAgentAnalysisResponse> {
    return this.request<HazardAgentAnalysisResponse>("/hazards/agent/analyze", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async chatWithHazardAgent(
    request: HazardAgentChatRequest
  ): Promise<HazardAgentChatResponse> {
    return this.request<HazardAgentChatResponse>("/hazards/agent/chat", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }
}

export const hazardApi = new HazardApiClient();
