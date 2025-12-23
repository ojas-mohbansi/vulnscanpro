
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import ScanPage from './app/ScanPage';
import ResultsPage from './app/ResultsPage';
import HistoryPage from './app/HistoryPage';
import DiffPage from './app/DiffPage';
import SettingsPage from './app/SettingsPage';
import MarketplacePage from './app/MarketplacePage';
import BatchScanPage from './app/BatchScanPage';
import ThreatsPage from './app/ThreatsPage';
import DependencyScanPage from './app/DependencyScanPage';
import BenchmarkPage from './app/BenchmarkPage';
import MapPage from './app/MapPage';
import EducationPage from './app/EducationPage';
import SchedulerPage from './app/SchedulerPage';
import SimulationPage from './app/SimulationPage';
import KnowledgeGraphPage from './app/KnowledgeGraphPage';
import AnalyticsPage from './app/AnalyticsPage';
import GeoMapPage from './app/GeoMapPage';
import DeveloperPage from './app/DeveloperPage';
import OfflineBanner from './components/OfflineBanner';
import { SyncService } from './lib/services/syncService';
import { NotificationService } from './lib/services/notificationService';
import { useNetworkStatus } from './lib/hooks/useNetworkStatus';

const App: React.FC = () => {
  const isOnline = useNetworkStatus();

  useEffect(() => {
    if (isOnline) {
      // Trigger sync when coming online
      SyncService.syncPendingScans().then(count => {
        if (count > 0) {
          NotificationService.sendBrowserNotification('Sync Complete', `${count} active scans were updated.`);
        }
      });
    }
  }, [isOnline]);

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-primary/30 flex flex-col lg:flex-row">
        <Header />
        <main className="flex-1 min-w-0 transition-all duration-300 flex flex-col">
          <OfflineBanner />
          <Routes>
            <Route path="/" element={<Navigate to="/scan" replace />} />
            <Route path="/scan" element={<ScanPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/batch" element={<BatchScanPage />} />
            <Route path="/scheduler" element={<SchedulerPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/graph" element={<KnowledgeGraphPage />} />
            <Route path="/geomap" element={<GeoMapPage />} />
            <Route path="/threats" element={<ThreatsPage />} />
            <Route path="/dependencies" element={<DependencyScanPage />} />
            <Route path="/benchmark" element={<BenchmarkPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/education" element={<EducationPage />} />
            <Route path="/developer" element={<DeveloperPage />} />
            <Route path="/results/:id" element={<ResultsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/diff/:id1/:id2" element={<DiffPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="*" element={<div className="p-10 text-center text-slate-500">404 - Page Not Found</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
