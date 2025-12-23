import React from 'react';
import SimulationDashboard from '../components/SimulationDashboard';
import { ShieldAlert } from 'lucide-react';

const SimulationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            Threat Simulation
          </h1>
          <p className="text-slate-400">
            Safely reproduce vulnerability scenarios to understand attack vectors and validate defenses.
            <span className="text-red-400 ml-2 text-sm font-medium border border-red-500/30 px-2 py-0.5 rounded bg-red-500/10">Non-Destructive Mode</span>
          </p>
        </header>

        <SimulationDashboard />
      </div>
    </div>
  );
};

export default SimulationPage;
