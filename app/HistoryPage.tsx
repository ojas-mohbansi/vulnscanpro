
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/apiClients';
import { ScanResult } from '../types';
import { Calendar, ArrowRight, Shield, GitCompare } from 'lucide-react';

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [selectedForDiff, setSelectedForDiff] = useState<string[]>([]);

  useEffect(() => {
    // Initial Load
    api.getHistory().then(setHistory);

    // Listen for updates from SyncService / ClientDB
    const handleUpdate = () => {
        api.getHistory().then(setHistory);
    };
    window.addEventListener('scan-updated', handleUpdate);

    return () => window.removeEventListener('scan-updated', handleUpdate);
  }, []);

  const toggleSelection = (id: string) => {
    if (selectedForDiff.includes(id)) {
      setSelectedForDiff(prev => prev.filter(s => s !== id));
    } else {
      if (selectedForDiff.length < 2) {
        setSelectedForDiff(prev => [...prev, id]);
      } else {
        // Replace the oldest selection
        setSelectedForDiff(prev => [prev[1], id]);
      }
    }
  };

  const handleCompare = () => {
    if (selectedForDiff.length === 2) {
      navigate(`/diff/${selectedForDiff[0]}/${selectedForDiff[1]}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Scan History
          </h1>
          {selectedForDiff.length > 0 && (
             <button 
               onClick={handleCompare}
               disabled={selectedForDiff.length !== 2}
               className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-slate-700 transition-all text-sm font-medium"
             >
               <GitCompare className="w-4 h-4" />
               Compare ({selectedForDiff.length}/2)
             </button>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {history.length === 0 ? (
             <div className="p-12 text-center text-slate-500">
               No scans recorded yet. <Link to="/scan" className="text-primary hover:underline">Start your first scan.</Link>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[700px]">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="w-12 px-6 py-4"></th>
                    <th className="px-6 py-4 font-medium">Target</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Findings</th>
                    <th className="px-6 py-4 font-medium hidden sm:table-cell">Duration</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {history.map((scan) => (
                    <tr key={scan.id} className={`hover:bg-slate-800/50 transition-colors ${selectedForDiff.includes(scan.id) ? 'bg-slate-800/30' : ''}`}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedForDiff.includes(scan.id)}
                          onChange={() => toggleSelection(scan.id)}
                          className="rounded border-slate-700 bg-slate-950 text-primary focus:ring-primary"
                          aria-label={`Select scan ${scan.id} for comparison`}
                        />
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300 max-w-[200px] truncate" title={scan.target}>
                        {scan.target}
                      </td>
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {new Date(scan.startTime).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 items-center">
                          {scan.stats.critical > 0 && <span className="w-2 h-2 rounded-full bg-red-500" title={`Critical: ${scan.stats.critical}`}></span>}
                          {scan.stats.high > 0 && <span className="w-2 h-2 rounded-full bg-orange-500" title={`High: ${scan.stats.high}`}></span>}
                          {scan.stats.medium > 0 && <span className="w-2 h-2 rounded-full bg-yellow-500" title={`Medium: ${scan.stats.medium}`}></span>}
                          {scan.stats.low > 0 && <span className="w-2 h-2 rounded-full bg-blue-500" title={`Low: ${scan.stats.low}`}></span>}
                          {scan.stats.total === 0 && <span className="text-slate-600 italic">None</span>}
                          {scan.stats.total > 0 && <span className="ml-2 text-slate-500">{scan.stats.total}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono hidden sm:table-cell">
                        {(scan.stats.durationMs / 1000).toFixed(1)}s
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                           scan.status === 'completed' ? 'bg-green-900/30 text-green-400' : 
                           scan.status === 'running' ? 'bg-blue-900/30 text-blue-400' :
                           'bg-slate-800 text-slate-400'
                        }`}>
                          {scan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/results/${scan.id}`} className="text-primary hover:text-white transition-colors inline-flex items-center gap-1">
                          Results <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
