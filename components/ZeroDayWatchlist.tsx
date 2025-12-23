import React, { useEffect, useState } from 'react';
import { AlertOctagon, ExternalLink, Shield, Flame, Activity, Clock } from 'lucide-react';
import { ZeroDayService } from '../lib/services/zeroDayService';
import { ZeroDayCandidate } from '../types';

const ZeroDayWatchlist: React.FC = () => {
  const [candidates, setCandidates] = useState<ZeroDayCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ZeroDayService.getWatchlist().then(data => {
      setCandidates(data);
      setLoading(false);
    });
  }, []);

  const getConfidenceStyle = (c: string) => {
    switch (c) {
      case 'confirmed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'suspected': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'rumor': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-full">
      <div className="p-4 border-b border-slate-800 bg-red-950/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
             <AlertOctagon className="w-5 h-5 text-red-500" />
             <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
          </div>
          <h3 className="font-bold text-white">Zero-Day Watchlist</h3>
        </div>
        <div className="text-[10px] text-red-400 uppercase font-bold tracking-wider flex items-center gap-1">
           <Flame className="w-3 h-3" /> High Priority
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-0">
        {loading ? (
          <div className="p-8 text-center text-slate-500 animate-pulse">Scanning global feeds...</div>
        ) : candidates.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No immediate zero-day alerts found in public feeds.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {candidates.map((c) => (
              <div key={c.id} className="p-4 hover:bg-slate-800/30 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {c.cveId ? (
                        <span className="font-mono text-red-400 font-bold text-sm bg-red-950/30 px-1.5 py-0.5 rounded">{c.cveId}</span>
                    ) : (
                        <span className="font-mono text-orange-400 font-bold text-xs bg-orange-950/30 px-1.5 py-0.5 rounded">NO CVE</span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${getConfidenceStyle(c.confidence)}`}>
                      {c.confidence}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(c.date).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-sm text-slate-300 font-medium leading-snug mb-3">
                  {c.summary.length > 80 ? c.summary.substring(0, 80) + '...' : c.summary}
                </p>

                <div className="flex items-center justify-between text-xs">
                   <div className="flex items-center gap-2 text-slate-500">
                      <Activity className="w-3 h-3" />
                      <span>Source: {c.source}</span>
                   </div>
                   {c.refs.length > 0 && (
                     <a href={c.refs[0]} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                       Details <ExternalLink className="w-3 h-3" />
                     </a>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ZeroDayWatchlist;
