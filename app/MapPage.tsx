import React, { useEffect, useState } from 'react';
import { Network, Share2 } from 'lucide-react';
import VulnerabilityGraph from '../components/VulnerabilityGraph';
import { api } from '../utils/apiClients';
import { GraphService } from '../lib/services/graphService';
import { GraphData } from '../types';

const MapPage: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch History to build graph
    const loadData = async () => {
      try {
        const history = await api.getHistory();
        const graph = GraphService.transformScanHistory(history);
        setGraphData(graph);
      } catch (e) {
        console.error("Failed to load map data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <Network className="w-6 h-6 text-primary" />
            Vulnerability Map
          </h1>
          <p className="text-slate-400">
            Interactive visualization of attack surface, findings, and infrastructure relationships.
          </p>
        </header>

        {loading ? (
          <div className="h-[600px] bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500">
            Loading graph...
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="h-[600px] bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500 space-y-4">
            <Share2 className="w-12 h-12 opacity-50" />
            <p>No data to visualize. Run a scan first.</p>
          </div>
        ) : (
          <VulnerabilityGraph data={graphData} />
        )}
      </div>
    </div>
  );
};

export default MapPage;
