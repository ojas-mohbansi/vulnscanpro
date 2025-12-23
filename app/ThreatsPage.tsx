
import React, { useEffect, useState } from 'react';
import { ShieldAlert, Globe, Activity, Filter, RefreshCw, Search, ExternalLink, Hash, Server, Link as LinkIcon, AlertTriangle, Clock } from 'lucide-react';
import { ThreatDashboardService } from '../lib/services/threatDashboardService';
import { ThreatIndicator, ThreatStats } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import ZeroDayWatchlist from '../components/ZeroDayWatchlist';

const ThreatsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ indicators: ThreatIndicator[], stats: ThreatStats | null }>({ indicators: [], stats: null });
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ThreatDashboardService.getLatestThreats();
      setData(result);
    } catch (e: any) {
      setError(e.message || "Failed to load threat feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredIndicators = data.indicators.filter(i => {
    const matchesType = filterType === 'all' || i.type === filterType;
    const matchesSearch = i.indicator.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          i.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ip': return <Server className="w-4 h-4 text-blue-400" />;
      case 'domain': return <Globe className="w-4 h-4 text-green-400" />;
      case 'url': return <LinkIcon className="w-4 h-4 text-orange-400" />;
      case 'hash': return <Hash className="w-4 h-4 text-purple-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-slate-400" />;
    }
  };

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#10b981'];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-primary" />
              Global Threat Intelligence
            </h1>
            <p className="text-slate-400 mt-1">Real-time indicators of compromise and emerging zero-day threats.</p>
          </div>
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-sm font-medium disabled:opacity-50 w-full md:w-auto justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Feed
          </button>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
             <AlertTriangle className="w-5 h-5" />
             {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Main Feed Stats & Charts */}
           <div className="lg:col-span-2 space-y-6">
              {/* Stats Cards */}
              {data.stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                     <div className="text-slate-500 text-xs uppercase font-bold mb-1">Total Indicators</div>
                     <div className="text-2xl font-bold text-white">{data.stats.total.toLocaleString()}</div>
                     <div className="text-xs text-slate-500 mt-2">Latest fetch: {new Date(data.stats.lastUpdated).toLocaleTimeString()}</div>
                   </div>
                   <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                     <div className="text-slate-500 text-xs uppercase font-bold mb-1">Top Threat Type</div>
                     <div className="text-xl font-bold text-blue-400 truncate">{data.stats.byCategory[0]?.name || 'N/A'}</div>
                     <div className="text-xs text-slate-500 mt-2">{data.stats.byCategory[0]?.value} indicators</div>
                   </div>
                   <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                     <div className="text-slate-500 text-xs uppercase font-bold mb-1">Active Source</div>
                     <div className="text-xl font-bold text-green-400 truncate" title={data.stats.source}>{data.stats.source}</div>
                     <div className="text-xs text-slate-500 mt-2">Primary Provider</div>
                   </div>
                </div>
              )}

              {/* Chart */}
              {data.stats && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" /> Threat Categories
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.stats.byCategory.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                          <XAxis type="number" stroke="#64748b" fontSize={10} />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={100} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                            cursor={{ fill: '#1e293b' }}
                          />
                          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                            {data.stats.byCategory.slice(0, 10).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
           </div>

           {/* Sidebar: Zero-Day Watchlist */}
           <div className="lg:col-span-1 h-[600px] lg:h-auto">
              <ZeroDayWatchlist />
           </div>
        </div>

        {/* Live Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
           <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
             <h3 className="font-bold text-white flex items-center gap-2">
               Live Indicator Feed
               <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{filteredIndicators.length} items</span>
             </h3>
             
             <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:w-64">
                 <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                 <input 
                   type="text" 
                   placeholder="Search IOCs or tags..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                 />
               </div>
               <select 
                 value={filterType}
                 onChange={(e) => setFilterType(e.target.value)}
                 className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
               >
                 <option value="all">All Types</option>
                 <option value="url">URLs</option>
                 <option value="ip">IP Addresses</option>
                 <option value="domain">Domains</option>
                 <option value="hash">Hashes</option>
               </select>
             </div>
           </div>

           {/* Mobile Card List */}
           <div className="block md:hidden max-h-[500px] overflow-y-auto p-4 space-y-3">
              {filteredIndicators.map((item) => (
                <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                         {getTypeIcon(item.type)}
                         <span className="font-bold text-sm text-slate-300 capitalize">{item.type}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${
                         item.category.includes('Malware') ? 'bg-red-900/20 text-red-400 border-red-900/30' : 
                         'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                         {item.category}
                      </span>
                   </div>
                   
                   <div className="font-mono text-xs text-white break-all mb-2 p-2 bg-slate-900 rounded border border-slate-800">
                      {item.indicator}
                   </div>

                   <div className="flex justify-between items-center text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                         <Clock className="w-3 h-3" />
                         {new Date(item.timestamp).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                         <div className={`w-2 h-2 rounded-full ${item.confidence > 0.8 ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                         {(item.confidence * 100).toFixed(0)}% Conf
                      </div>
                   </div>
                </div>
              ))}
              {filteredIndicators.length === 0 && <div className="text-center text-slate-500 py-8">No indicators found.</div>}
           </div>

           {/* Desktop Table */}
           <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                 <tr>
                   <th className="px-6 py-3 font-medium">Type</th>
                   <th className="px-6 py-3 font-medium">Indicator</th>
                   <th className="px-6 py-3 font-medium">Category</th>
                   <th className="px-6 py-3 font-medium">Confidence</th>
                   <th className="px-6 py-3 font-medium">Tags</th>
                   <th className="px-6 py-3 font-medium text-right">Detected</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800">
                 {loading && data.indicators.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading live threats...</td></tr>
                 ) : filteredIndicators.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-500">No matching indicators found.</td></tr>
                 ) : (
                   filteredIndicators.map((item) => (
                     <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                       <td className="px-6 py-3 flex items-center gap-2 capitalize text-slate-300">
                         {getTypeIcon(item.type)}
                         {item.type}
                       </td>
                       <td className="px-6 py-3 font-mono text-slate-200 max-w-[300px] truncate" title={item.indicator}>
                         {item.indicator}
                         <button 
                            onClick={() => navigator.clipboard.writeText(item.indicator)}
                            className="ml-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-opacity"
                            title="Copy IOC"
                         >
                           <ExternalLink className="w-3 h-3" />
                         </button>
                       </td>
                       <td className="px-6 py-3">
                         <span className={`px-2 py-0.5 rounded text-xs border ${
                            item.category.includes('Malware') ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            item.category.includes('Phishing') ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                            'bg-slate-800 text-slate-400 border-slate-700'
                         }`}>
                           {item.category}
                         </span>
                       </td>
                       <td className="px-6 py-3">
                         <div className="flex items-center gap-2">
                           <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                             <div 
                               className={`h-full rounded-full ${item.confidence > 0.8 ? 'bg-red-500' : 'bg-yellow-500'}`} 
                               style={{ width: `${item.confidence * 100}%` }}
                             />
                           </div>
                           <span className="text-xs text-slate-500">{(item.confidence * 100).toFixed(0)}%</span>
                         </div>
                       </td>
                       <td className="px-6 py-3">
                         <div className="flex flex-wrap gap-1">
                           {item.tags.slice(0, 3).map((tag, idx) => (
                             <span key={idx} className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">
                               {tag}
                             </span>
                           ))}
                           {item.tags.length > 3 && <span className="text-[10px] text-slate-500">+{item.tags.length - 3}</span>}
                         </div>
                       </td>
                       <td className="px-6 py-3 text-right text-slate-500 font-mono text-xs">
                         {new Date(item.timestamp).toLocaleDateString()}
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatsPage;
