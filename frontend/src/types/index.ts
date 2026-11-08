export interface PredefinedRegion {
  id: string;
  name: string;
  bbox: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]
  center: [number, number];
  zoom: number;
  crs_epsg: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  firms_configured: boolean;
  environment: string;
  supported_sensors: string[];
  predefined_regions: PredefinedRegion[];
}

export interface DataQualitySummary {
  dataset_id: string;
  source_name: string;
  product_name: string;
  ingestion_time: string;
  total_raw_records: number;
  valid_records: number;
  invalid_records: number;
  duplicate_records: number;
  out_of_aoi_records: number;
  modis_count: number;
  viirs_count: number;
  date_range_start?: string;
  date_range_end?: string;
  spatial_extent?: [number, number, number, number];
  missing_frp_count: number;
  missing_confidence_count: number;
  rejection_reasons: Record<string, number>;
  warning_messages: string[];
}

export interface DatasetInfo {
  dataset_id: string;
  name: string;
  source_type: 'SAMPLE' | 'UPLOAD' | 'NASA_FIRMS_NRT';
  total_records: number;
  modis_count: number;
  viirs_count: number;
  date_start?: string;
  date_end?: string;
  spatial_extent?: [number, number, number, number];
  created_at: string;
  is_demo: boolean;
  quality_summary?: DataQualitySummary;
}

export interface SummaryMetrics {
  total_combined_detections: number;
  total_modis_detections: number;
  total_viirs_detections: number;
  modis_share_percent: number;
  viirs_share_percent: number;
  active_days_count: number;
  active_grid_cells_count: number;
  daily_average_detections: number;
  peak_activity_date?: string;
  peak_activity_count: number;
  total_frp_mw?: number;
  mean_frp_mw?: number;
  max_frp_mw?: number;
  day_detections_count: number;
  night_detections_count: number;
  colocated_detections_count: number;
  colocated_percentage: number;
  anomaly_status: string;
  anomaly_score: number;
  anomaly_explanation: string;
}

export interface TimeSeriesPoint {
  period: string;
  modis_count: number;
  viirs_count: number;
  combined_count: number;
  active_cells: number;
  mean_frp?: number;
  max_frp?: number;
  day_count: number;
  night_count: number;
}

export interface BaselineMonthComparison {
  month: number;
  month_name: string;
  current_count: number;
  historical_median: number;
  historical_mean: number;
  historical_std: number;
  historical_iqr: number;
  historical_mad: number;
  historical_years_count: number;
  anomaly_score: number;
  status: string;
  explanation: string;
}

export interface SeasonalityAnalysis {
  monthly_climatology: {
    month: number;
    month_name: string;
    detections: number;
    percentage: number;
  }[];
  peak_months: string[];
  lowest_months: string[];
  interannual_comparison: Record<string, Record<string, number>>;
}

export interface GridCellFeature {
  grid_cell_id: string;
  center_lat: number;
  center_lon: number;
  bounds: [number, number][]; // 5 coordinates for closed polygon
  total_detections: number;
  modis_detections: number;
  viirs_detections: number;
  total_frp?: number;
  mean_frp?: number;
  dominant_sensor: string;
}

export interface ObservationPoint {
  observation_id: string;
  lat: number;
  lon: number;
  sensor: string;
  satellite: string;
  date: string;
  time: string;
  confidence: string;
  frp?: number;
  brightness?: number;
  is_colocated: boolean;
  grid_cell_id?: string;
}

export interface MapDataResponse {
  aoi_geojson?: any;
  grid_cells: GridCellFeature[];
  observations_sample: ObservationPoint[];
  total_observations_count: number;
  colocation_groups_count: number;
}

export interface HarmonizationConfig {
  grid_size_km: number;
  colocation_distance_meters: number;
  colocation_time_window_minutes: number;
  confidence_filter_modis?: string[];
  confidence_filter_viirs?: string[];
  time_aggregation: 'daily' | 'weekly' | 'monthly' | 'yearly';
}
