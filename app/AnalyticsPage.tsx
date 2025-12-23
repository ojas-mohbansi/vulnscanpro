import React from 'react';
import { BarChart2 } from 'lucide-react';
import TrendDashboard from '../components/TrendDashboard';

const AnalyticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <BarChart2 className="w-6 h-6 text-primary" />
            Trend Analytics
          </h1>
          <p className="text-slate-400">
            Visualize the evolution of vulnerabilities across different frameworks over time. 
            Data sourced from NVD, CIRCL, and OSV.
          </p>
        </header>

        <TrendDashboard />
      </div>
    </div>
  );
};

export default AnalyticsPage;
