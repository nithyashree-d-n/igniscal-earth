import {
  HealthResponse,
  DatasetInfo,
  SummaryMetrics,
  TimeSeriesPoint,
  BaselineMonthComparison,
  SeasonalityAnalysis,
  MapDataResponse,
  HarmonizationConfig
} from '../types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to retrieve system health');
  return res.json();
}

export async function fetchSources(): Promise<any> {
  const res = await fetch(`${API_BASE}/data/sources`);
  if (!res.ok) throw new Error('Failed to retrieve supported sources');
  return res.json();
}

export async function fetchDatasets(): Promise<DatasetInfo[]> {
  const res = await fetch(`${API_BASE}/data/datasets`);
  if (!res.ok) throw new Error('Failed to list datasets');
  return res.json();
}

export async function uploadDatasetCSV(file: File, aoiBbox?: [number, number, number, number]): Promise<DatasetInfo> {
  const formData = new FormData();
  formData.append('file', file);
  if (aoiBbox) {
    formData.append('aoi_min_lon', aoiBbox[0].toString());
    formData.append('aoi_min_lat', aoiBbox[1].toString());
    formData.append('aoi_max_lon', aoiBbox[2].toString());
    formData.append('aoi_max_lat', aoiBbox[3].toString());
  }
  const res = await fetch(`${API_BASE}/data/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function fetchFIRMSData(params: {
  bbox?: [number, number, number, number];
  regionId?: string;
  dayRange: number;
  sensors: string[];
  customKey?: string;
}): Promise<DatasetInfo> {
  const payload = {
    aoi: {
      region_id: params.regionId,
      bbox: params.bbox
    },
    date_range_days: params.dayRange,
    sensors: params.sensors,
    custom_map_key: params.customKey
  };
  const res = await fetch(`${API_BASE}/data/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'NASA FIRMS fetch failed' }));
    throw new Error(err.detail || 'NASA FIRMS fetch failed');
  }
  return res.json();
}

export async function runHarmonizationAnalysis(params: {
  datasetId: string;
  bbox?: [number, number, number, number];
  regionId?: string;
  startDate?: string;
  endDate?: string;
  selectedSensors?: string[];
  config: HarmonizationConfig;
}): Promise<{ analysis_id: string; summary: SummaryMetrics }> {
  const payload = {
    dataset_id: params.datasetId,
    aoi: params.bbox || params.regionId ? {
      region_id: params.regionId,
      bbox: params.bbox
    } : undefined,
    start_date: params.startDate,
    end_date: params.endDate,
    selected_sensors: params.selectedSensors,
    harmonization_config: params.config
  };

  const res = await fetch(`${API_BASE}/analysis/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Analysis execution failed');
  }
  return res.json();
}

export async function fetchAnalysisSummary(analysisId: string): Promise<SummaryMetrics> {
  const res = await fetch(`${API_BASE}/analysis/${analysisId}/summary`);
  if (!res.ok) throw new Error('Failed to retrieve summary metrics');
  return res.json();
}

export async function fetchAnalysisTimeseries(analysisId: string): Promise<TimeSeriesPoint[]> {
  const res = await fetch(`${API_BASE}/analysis/${analysisId}/timeseries`);
  if (!res.ok) throw new Error('Failed to retrieve timeseries data');
  return res.json();
}

export async function fetchAnalysisSeasonality(analysisId: string): Promise<SeasonalityAnalysis> {
  const res = await fetch(`${API_BASE}/analysis/${analysisId}/seasonality`);
  if (!res.ok) throw new Error('Failed to retrieve seasonality analysis');
  return res.json();
}

export async function fetchAnalysisAnomalies(analysisId: string): Promise<BaselineMonthComparison[]> {
  const res = await fetch(`${API_BASE}/analysis/${analysisId}/anomalies`);
  if (!res.ok) throw new Error('Failed to retrieve anomaly analysis');
  return res.json();
}

export async function fetchAnalysisMapData(analysisId: string, sampleLimit = 1500): Promise<MapDataResponse> {
  const res = await fetch(`${API_BASE}/analysis/${analysisId}/map?sample_limit=${sampleLimit}`);
  if (!res.ok) throw new Error('Failed to retrieve spatial map data');
  return res.json();
}

export async function fetchAnalysisObservations(analysisId: string, page = 1, pageSize = 50): Promise<any> {
  const res = await fetch(`${API_BASE}/analysis/${analysisId}/observations?page=${page}&page_size=${pageSize}`);
  if (!res.ok) throw new Error('Failed to retrieve paginated observations');
  return res.json();
}

export function getExportDownloadUrl(analysisId: string, formatType: string): string {
  return `${API_BASE}/analysis/${analysisId}/export?format_type=${formatType}`;
}
