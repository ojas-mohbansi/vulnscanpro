
import React, { useEffect, useState } from 'react';
import { BarChart2, Activity, Zap, RefreshCw, Server, ArrowUpRight, CheckCircle, XCircle } from 'lucide-react';
import { BenchmarkingService } from '../lib/services/benchmarkingService';
import { BenchmarkMetric, ModuleBenchmark } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from 'recharts';

const BenchmarkPage: React.FC = () => {
  const [metrics, setMetrics] = useState<BenchmarkMetric[]>([]);
  const [moduleStats, setModuleStats] = useState<ModuleBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    const m = BenchmarkingService.getNetworkMetrics();
    const stats = await BenchmarkingService.getModulePerformance();
    setMetrics([...m].reverse());
    setModuleStats(stats);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setLastSyncResult(null);
    try {
      const result = await BenchmarkingService.syncTelemetry();
      setLastSyncResult(result.success ? `Synced via ${result.endpoint}` : 'Sync failed');
      refreshData();
    } finally {
      setSyncing(false);
    }
  };

  const latencyData = metrics.slice(0, 50).reverse().map(m => ({
     time: new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
     latency: m.latencyMs,
     source: m.source
  }));

  const fallbackCounts = metrics.reduce((acc, curr) => {
    if (curr.isFallback) acc.fallback++;
    else acc.primary++;
    return acc;
  }, { primary: 0, fallback: 0 });

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6 text-primary" />
              Benchmarking & Telemetry
            </h1>
            <p className="text-slate-400 mt-1">Real-time performance metrics, fallback efficiency, and latency tracking.</p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
             <button 
               onClick={refreshData}
               className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-sm font-medium"
             >
               <RefreshCw className="w-4 h-4" /> Refresh
             </button>
             <button 
               onClick={handleSync}
               disabled={syncing}
               className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary.hover text-slate-950 font-bold rounded-lg transition-colors text-sm disabled:opacity-50"
             >
               {syncing ? <Zap className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
               Sync
             </button>
          </div>
        </header>

        {lastSyncResult && (
           <div className={`p-4 rounded-lg border flex items-center gap-2 ${lastSyncResult.includes('failed') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
              {lastSyncResult.includes('failed') ? <XCircle className="w-5 h-5"/> : <CheckCircle className="w-5 h-5"/>}
              {lastSyncResult}
           </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Latency Chart */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
               <Zap className="w-5 h-5 text-yellow-400" /> API Latency (Last 50)
             </h3>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={latencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                    />
                    <Line type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Module Performance */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
               <BarChart2 className="w-5 h-5 text-blue-400" /> Module Exec Time (Avg)
             </h3>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={moduleStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={10} unit="ms" />
                    <YAxis dataKey="moduleName" type="category" stroke="#94a3b8" fontSize={10} width={80} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                      cursor={{fill: '#1e293b'}}
                    />
                    <Bar dataKey="avgDurationMs" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Fallback Usage */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
               <Server className="w-5 h-5 text-purple-400" /> Fallback Efficiency
             </h3>
             <div className="flex items-center justify-around h-24 md:h-48">
                 <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-green-400">{fallbackCounts.primary}</div>
                    <div className="text-xs md:text-sm text-slate-500 uppercase tracking-wider mt-1">Primary Hits</div>
                 </div>
                 <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-orange-400">{fallbackCounts.fallback}</div>
                    <div className="text-xs md:text-sm text-slate-500 uppercase tracking-wider mt-1">Fallback Hits</div>
                 </div>
                 <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-blue-400">{metrics.length}</div>
                    <div className="text-xs md:text-sm text-slate-500 uppercase tracking-wider mt-1">Total</div>
                 </div>
             </div>
             <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden mt-4 flex">
                <div style={{ width: `${(fallbackCounts.primary / metrics.length) * 100}%` }} className="bg-green-500 h-full"></div>
                <div style={{ width: `${(fallbackCounts.fallback / metrics.length) * 100}%` }} className="bg-orange-500 h-full"></div>
             </div>
          </div>

          {/* Recent Logs List/Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-[300px]">
             <div className="p-4 border-b border-slate-800 font-bold text-white bg-slate-950">
               Recent Network Activity
             </div>
             <div className="overflow-auto flex-1">
               {/* Mobile Cards */}
               <div className="block md:hidden p-4 space-y-3">
                  {metrics.map((m) => (
                    <div key={m.id} className="bg-slate-950 p-3 rounded border border-slate-800">
                       <div className="flex justify-between text-xs mb-1">
                          <span className="font-bold text-slate-400">{m.method}</span>
                          <span className="font-mono text-slate-500">{new Date(m.timestamp).toLocaleTimeString()}</span>
                       </div>
                       <div className="text-xs text-slate-300 break-all truncate mb-2">{m.endpoint}</div>
                       <div className="flex justify-between items-center text-xs">
                          <span className={`${m.latencyMs > 1000 ? 'text-red-400' : 'text-green-400'}`}>{m.latencyMs}ms</span>
                          <span className={`${m.status >= 400 ? 'text-red-500' : 'text-green-500'}`}>HTTP {m.status}</span>
                       </div>
                    </div>
                  ))}
               </div>

               {/* Desktop Table */}
               <table className="hidden md:table w-full text-left text-xs">
                 <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                   <tr>
                     <th className="px-4 py-2">Time</th>
                     <th className="px-4 py-2">Method</th>
                     <th className="px-4 py-2">Endpoint</th>
                     <th className="px-4 py-2">Latency</th>
                     <th className="px-4 py-2">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800">
                   {metrics.map((m) => (
                     <tr key={m.id} className="hover:bg-slate-800/50">
                       <td className="px-4 py-2 font-mono text-slate-500">
                         {new Date(m.timestamp).toLocaleTimeString()}
                       </td>
                       <td className="px-4 py-2 font-bold text-slate-400">{m.method}</td>
                       <td className="px-4 py-2 text-slate-300 truncate max-w-[150px]" title={m.endpoint}>
                         {m.endpoint}
                         {m.isFallback && <span className="ml-2 text-[10px] bg-orange-500/20 text-orange-400 px-1 rounded">FB</span>}
                       </td>
                       <td className="px-4 py-2 font-mono">
                         <span className={m.latencyMs > 1000 ? 'text-red-400' : m.latencyMs > 500 ? 'text-yellow-400' : 'text-green-400'}>
                           {m.latencyMs}ms
                         </span>
                       </td>
                       <td className="px-4 py-2">
                         {m.status >= 200 && m.status < 300 ? (
                           <span className="text-green-500">{m.status}</span>
                         ) : (
                           <span className="text-red-500">{m.status}</span>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkPage;
