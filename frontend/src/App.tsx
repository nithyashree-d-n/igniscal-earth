import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { OverviewTab } from './pages/OverviewTab';
import { ExploreTab } from './pages/ExploreTab';
import { AnalyticsTab } from './pages/AnalyticsTab';
import { MethodologyTab } from './pages/MethodologyTab';
import { DataQualityTab } from './pages/DataQualityTab';
import { ExportTab } from './pages/ExportTab';
import { LiveFetchModal } from './components/LiveFetchModal';
import { ErrorBoundary } from './components/ErrorBoundary';

import {
  fetchHealth,
  fetchDatasets,
  uploadDatasetCSV,
  fetchFIRMSData,
  runHarmonizationAnalysis,
  fetchAnalysisTimeseries,
  fetchAnalysisAnomalies,
  fetchAnalysisSeasonality,
  fetchAnalysisMapData
} from './services/api';

import {
  HealthResponse,
  DatasetInfo,
  SummaryMetrics,
  TimeSeriesPoint,
  BaselineMonthComparison,
  SeasonalityAnalysis,
  GridCellFeature,
  ObservationPoint,
  HarmonizationConfig
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('karnataka');
  const [customBbox, setCustomBbox] = useState<[number, number, number, number] | null>(null);

  // Filter & Harmonization config
  const [startDate, setStartDate] = useState<string>('2021-01-01');
  const [endDate, setEndDate] = useState<string>('2024-12-31');
  const [selectedSensors, setSelectedSensors] = useState<string[]>(['MODIS', 'VIIRS']);
  const [harmonizationConfig, setHarmonizationConfig] = useState<HarmonizationConfig>({
    grid_size_km: 1.0,
    colocation_distance_meters: 1000.0,
    colocation_time_window_minutes: 60,
    time_aggregation: 'daily'
  });

  // Active analysis results
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SummaryMetrics | null>(null);
  const [timeseries, setTimeseries] = useState<TimeSeriesPoint[]>([]);
  const [anomalies, setAnomalies] = useState<BaselineMonthComparison[]>([]);
  const [seasonality, setSeasonality] = useState<SeasonalityAnalysis | null>(null);
  const [gridCells, setGridCells] = useState<GridCellFeature[]>([]);
  const [observations, setObservations] = useState<ObservationPoint[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [isLiveFetchOpen, setIsLiveFetchOpen] = useState<boolean>(false);

  // Initialize application data
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const healthData = await fetchHealth();
        setHealth(healthData);

        const datasetList = await fetchDatasets();
        setDatasets(datasetList);

        if (datasetList.length > 0) {
          const initialDs = datasetList[0];
          setSelectedDatasetId(initialDs.dataset_id);
          // Run initial harmonization on benchmark dataset
          await executeHarmonization(initialDs.dataset_id);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const executeHarmonization = async (datasetIdToRun?: string) => {
    const dsId = datasetIdToRun || selectedDatasetId;
    if (!dsId) return;

    try {
      setLoading(true);
      const res = await runHarmonizationAnalysis({
        datasetId: dsId,
        regionId: selectedRegionId !== 'custom' ? selectedRegionId : undefined,
        bbox: selectedRegionId === 'custom' && customBbox ? customBbox : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        selectedSensors: selectedSensors.length > 0 ? selectedSensors : undefined,
        config: harmonizationConfig
      });

      const anlId = res.analysis_id;
      setAnalysisId(anlId);
      setMetrics(res.summary);

      // Concurrently fetch analysis details
      const [tsData, anomData, seasData, mapData] = await Promise.all([
        fetchAnalysisTimeseries(anlId),
        fetchAnalysisAnomalies(anlId),
        fetchAnalysisSeasonality(anlId),
        fetchAnalysisMapData(anlId, 1500)
      ]);

      setTimeseries(tsData);
      setAnomalies(anomData);
      setSeasonality(seasData);
      setGridCells(mapData.grid_cells);
      setObservations(mapData.observations_sample);
    } catch (err) {
      console.error('Harmonization analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDataset = async (id: string) => {
    setSelectedDatasetId(id);
    await executeHarmonization(id);
  };

  const handleToggleSensor = (sensor: string) => {
    if (selectedSensors.includes(sensor)) {
      if (selectedSensors.length > 1) {
        setSelectedSensors(selectedSensors.filter(s => s !== sensor));
      }
    } else {
      setSelectedSensors([...selectedSensors, sensor]);
    }
  };

  const handleUpdateConfig = (cfg: Partial<HarmonizationConfig>) => {
    setHarmonizationConfig(prev => ({ ...prev, ...cfg }));
  };

  const handleUploadCSV = async (file: File) => {
    const newDs = await uploadDatasetCSV(file);
    setDatasets(prev => [newDs, ...prev]);
    setSelectedDatasetId(newDs.dataset_id);
    await executeHarmonization(newDs.dataset_id);
    setActiveTab('overview');
  };

  const handleLiveFetch = async (params: {
    regionId?: string;
    dayRange: number;
    sensors: string[];
    customKey?: string;
  }) => {
    const newDs = await fetchFIRMSData({
      regionId: params.regionId,
      dayRange: params.dayRange,
      sensors: params.sensors,
      customKey: params.customKey
    });
    setDatasets(prev => [newDs, ...prev]);
    setSelectedDatasetId(newDs.dataset_id);
    await executeHarmonization(newDs.dataset_id);
    setActiveTab('overview');
  };

  const currentDataset = datasets.find(d => d.dataset_id === selectedDatasetId) || null;
  const currentRegion = health?.predefined_regions.find(r => r.id === selectedRegionId);
  const activeBbox = selectedRegionId === 'custom' && customBbox ? customBbox : currentRegion?.bbox;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentDataset={currentDataset}
        firmsConfigured={health?.firms_configured || false}
        onOpenLiveFetch={() => setIsLiveFetchOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorBoundary fallbackTitle="Application View Interrupted">
          {activeTab === 'overview' && (
            <OverviewTab
              metrics={metrics}
              timeseries={timeseries}
              gridCells={gridCells}
              observations={observations}
              currentDataset={currentDataset}
              aoiBbox={activeBbox}
              loading={loading}
              onNavigateExplore={() => setActiveTab('explore')}
              onRefresh={() => executeHarmonization()}
            />
          )}

          {activeTab === 'explore' && (
            <ExploreTab
              datasets={datasets}
              selectedDatasetId={selectedDatasetId}
              onSelectDataset={handleSelectDataset}
              regions={health?.predefined_regions || []}
              selectedRegionId={selectedRegionId}
              onSelectRegion={(id) => { setSelectedRegionId(id); }}
              customBbox={customBbox}
              onSetCustomBbox={setCustomBbox}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              selectedSensors={selectedSensors}
              onToggleSensor={handleToggleSensor}
              harmonizationConfig={harmonizationConfig}
              onUpdateHarmonizationConfig={handleUpdateConfig}
              onRunHarmonization={() => { executeHarmonization(); setActiveTab('overview'); }}
              onUploadCSV={handleUploadCSV}
              loading={loading}
              onOpenLiveFetch={() => setIsLiveFetchOpen(true)}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              anomalies={anomalies}
              seasonality={seasonality}
              metrics={metrics}
            />
          )}

          {activeTab === 'methodology' && (
            <MethodologyTab />
          )}

          {activeTab === 'quality' && (
            <DataQualityTab currentDataset={currentDataset} />
          )}

          {activeTab === 'export' && (
            <ExportTab
              analysisId={analysisId}
              metrics={metrics}
              currentDataset={currentDataset}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FireSignal v1.0.0 — Unified MODIS–VIIRS Fire Activity Intelligence Platform</span>
          <span>NASA FIRMS Data Attribution (LANCE / EOSDIS / NASA / NOAA)</span>
        </div>
      </footer>

      {/* NASA FIRMS Live Fetch Modal */}
      <LiveFetchModal
        isOpen={isLiveFetchOpen}
        onClose={() => setIsLiveFetchOpen(false)}
        regions={health?.predefined_regions || []}
        firmsConfigured={health?.firms_configured || false}
        onFetch={handleLiveFetch}
      />
    </div>
  );
};

export default App;
