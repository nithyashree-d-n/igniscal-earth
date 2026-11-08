import React from 'react';
import { Flame, Compass, BarChart3, BookOpen, ShieldCheck, Download, Satellite, AlertCircle } from 'lucide-react';
import { DatasetInfo } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentDataset: DatasetInfo | null;
  firmsConfigured: boolean;
  onOpenLiveFetch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentDataset,
  firmsConfigured,
  onOpenLiveFetch
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Flame },
    { id: 'explore', label: 'Explore & Harmonize', icon: Compass },
    { id: 'analytics', label: 'Analytics & Anomalies', icon: BarChart3 },
    { id: 'methodology', label: 'Methodology', icon: BookOpen },
    { id: 'quality', label: 'Data Quality', icon: ShieldCheck },
    { id: 'export', label: 'Export', icon: Download },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="p-2 bg-gradient-to-tr from-amber-600 to-orange-500 rounded-lg shadow-md shadow-orange-500/20 text-white">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white">FireSignal</span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  MODIS–VIIRS
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                One view of fire activity. Across sensors. Across time.
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-500 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Active Dataset Status & NASA Live Fetch Button */}
          <div className="flex items-center space-x-3">
            {currentDataset && (
              <div className="hidden lg:flex flex-col items-end">
                <div className="flex items-center space-x-1.5">
                  <span className={`w-2 h-2 rounded-full ${currentDataset.is_demo ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <span className="text-xs font-semibold text-slate-200 truncate max-w-[180px]">
                    {currentDataset.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {currentDataset.total_records.toLocaleString()} records • {currentDataset.source_type}
                </span>
              </div>
            )}

            <button
              onClick={onOpenLiveFetch}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white shadow-sm transition-all"
            >
              <Satellite className="w-3.5 h-3.5" />
              <span>NASA FIRMS Live</span>
              {!firmsConfigured && (
                <span title="FIRMS MAP_KEY required (or enter custom key)" className="text-amber-200">
                  <AlertCircle className="w-3 h-3 inline ml-0.5" />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden flex overflow-x-auto border-t border-slate-800 px-2 py-1 space-x-1 bg-slate-950">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs whitespace-nowrap ${
                isActive ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
