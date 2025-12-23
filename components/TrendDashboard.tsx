
import React, { useEffect, useState } from 'react';
import { TrendService } from '../lib/services/trendService';
import { TrendData } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Calendar, Filter, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';

const TrendDashboard: React.FC = () => {
  const [framework, setFramework] = useState('react');
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await TrendService.getTrends(framework);
      setData(res);
      setLoading(false);
    };
    load();
  }, [framework]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
           <Filter className="w-5 h-5 text-slate-400" />
           <span className="text-sm font-medium text-slate-300">Filter Ecosystem:</span>
           <select 
             value={framework} 
             onChange={(e) => setFramework(e.target.value)}
             className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
           >
             <option value="react">React</option>
             <option value="flask">Flask</option>
             <option value="django">Django</option>
             <option value="all">All Web</option>
           </select>
        </div>
        
        {data && (
           <div className="text-xs text-slate-500 font-mono">
             Source: {data.source}
           </div>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-500 gap-2">
           <Loader2 className="w-6 h-6 animate-spin" /> Fetching historical data...
        </div>
      ) : !data || data.timeline.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500">No trend data available for this selection.</div>
      ) : (
        <div className="space-y-6 animate-in fade-in">
           {/* KPIs */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                 <div className="text-slate-500 text-xs uppercase font-bold mb-1">Total CVEs (Sampled)</div>
                 <div className="text-2xl font-bold text-white">{data.totalCves}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                 <div className="text-slate-500 text-xs uppercase font-bold mb-1">Peak Activity</div>
                 <div className="text-2xl font-bold text-blue-400">{data.peakMonth}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                 <div className="text-slate-500 text-xs uppercase font-bold mb-1">Recent Trend</div>
                 <div className="text-2xl font-bold text-green-400 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" /> Active
                 </div>
              </div>
           </div>

           {/* Velocity Chart */}
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4">Vulnerability Velocity (New CVEs/Month)</h3>
              <div className="h-72 md:h-80 lg:h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeline}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Severity Breakdown */}
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold text-white mb-4">Severity Distribution Over Time</h3>
              <div className="h-72 md:h-80 lg:h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                    <Legend />
                    <Bar dataKey="critical" stackId="a" fill="#ef4444" />
                    <Bar dataKey="high" stackId="a" fill="#f97316" />
                    <Bar dataKey="medium" stackId="a" fill="#eab308" />
                    <Bar dataKey="low" stackId="a" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TrendDashboard;
