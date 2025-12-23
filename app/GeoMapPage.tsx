import React from 'react';
import { Globe, Map as MapIcon } from 'lucide-react';
import WorldMap from '../components/WorldMap';

const GeoMapPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <Globe className="w-6 h-6 text-primary" />
            Global Threat Map
          </h1>
          <p className="text-slate-400">
            Geographic distribution of your scanned targets and identified vulnerabilities.
            Locations are approximate based on public IP geolocation data.
          </p>
        </header>

        <WorldMap />
      </div>
    </div>
  );
};

export default GeoMapPage;
