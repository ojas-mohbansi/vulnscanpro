
import React from 'react';
import { BatchTarget } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { CheckCircle2, XCircle, Globe, Server, ShieldAlert, ArrowRight } from 'lucide-react';

interface Props {
  targets: BatchTarget[];
}

const BatchResults: React.FC<Props> = ({ targets }) => {
  const completed = targets.filter(t => t.status === 'completed');
  const failed = targets.filter(t => t.status === 'failed');
  
  // Aggregate Stats
  const totalFindings = completed.reduce((acc, t) => acc + (t.result?.stats.total || 0), 0);
  const criticals = completed.reduce((acc, t) => acc + (t.result?.stats.critical || 0), 0);
  const highs = completed.reduce((acc, t) => acc + (t.result?.stats.high || 0), 0);
  
  // Chart Data: Findings per Target
  const findingsData = completed.slice(0, 10).map(t => ({
    name: new URL(t.url).hostname.substring(0, 15) + '...',
    critical: t.result?.stats.critical || 0,
    high: t.result?.stats.high || 0,
    medium: t.result?.stats.medium || 0
  }));

  // Chart Data: Geo Distribution
  const geoMap = new Map<string, number>();
  targets.forEach(t => {
      if (t.enrichment?.geo.country && t.enrichment.geo.country !== 'Unknown') {
          const c = t.enrichment.geo.country;
          geoMap.set(c, (geoMap.get(c) || 0) + 1);
      }
  });
  const geoData = Array.from(geoMap.entries()).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
           <div className="text-slate-500 text-xs uppercase font-bold mb-1">Targets Processed</div>
           <div className="text-2xl font-bold text-white flex items-center gap-2">
             {completed.length} <span className="text-slate-500 text-sm">/ {targets.length}</span>
           </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
           <div className="text-slate-500 text-xs uppercase font-bold mb-1">Total Vulnerabilities</div>
           <div className="text-2xl font-bold text-blue-400">{totalFindings}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
           <div className="text-slate-500 text-xs uppercase font-bold mb-1">Critical Risks</div>
           <div className="text-2xl font-bold text-red-500">{criticals}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
           <div className="text-slate-500 text-xs uppercase font-bold mb-1">Success Rate</div>
           <div className="text-2xl font-bold text-green-500">
             {targets.length > 0 ? ((completed.length / targets.length) * 100).toFixed(0) : 0}%
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Findings by Target Chart */}
         <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold text-white mb-4">Risk Distribution (Top 10)</h3>
            <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={findingsData}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                        itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend />
                    <Bar dataKey="critical" stackId="a" fill="#ef4444" />
                    <Bar dataKey="high" stackId="a" fill="#f97316" />
                    <Bar dataKey="medium" stackId="a" fill="#eab308" />
                 </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Geo Distribution Chart */}
         <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold text-white mb-4">Geographic Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={geoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {geoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 4]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* Target Results - Mobile Cards & Desktop Table */}
      <div className="space-y-4">
         {/* Mobile View */}
         <div className="grid grid-cols-1 gap-4 md:hidden">
            {targets.map((t) => (
               <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                     <div className="flex items-center gap-2">
                        {t.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        {t.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                        {t.status === 'scanning' && <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />}
                        {t.status === 'enriching' && <div className="w-4 h-4 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />}
                        {t.status === 'pending' && <div className="w-4 h-4 rounded-full bg-slate-700" />}
                        <span className="font-mono text-sm text-white truncate max-w-[200px]">{t.url}</span>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3">
                     <div className="flex items-center gap-2">
                        <Server className="w-3 h-3" /> {t.enrichment?.dns.ip || '-'}
                     </div>
                     <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3" /> {t.enrichment?.geo.country || '-'}
                     </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                     <div>
                        {t.result ? (
                           <div className="flex gap-1.5">
                              {t.result.stats.critical > 0 && <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded text-[10px] font-bold">{t.result.stats.critical}C</span>}
                              {t.result.stats.high > 0 && <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-[10px] font-bold">{t.result.stats.high}H</span>}
                              <span className="text-slate-500 text-xs">{t.result.stats.total} total</span>
                           </div>
                        ) : <span className="text-xs text-slate-600">No findings</span>}
                     </div>
                     {t.scanId && (
                       <a href={`#/results/${t.scanId}`} className="text-primary hover:text-white transition-colors">
                          <ArrowRight className="w-4 h-4" />
                       </a>
                     )}
                  </div>
               </div>
            ))}
         </div>

         {/* Desktop Table */}
         <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Target URL</th>
                  <th className="px-6 py-4">IP Address</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Findings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {targets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      {t.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {t.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                      {t.status === 'scanning' && <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />}
                      {t.status === 'enriching' && <div className="w-4 h-4 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />}
                      {t.status === 'pending' && <div className="w-4 h-4 rounded-full bg-slate-700" />}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300 max-w-[200px] truncate" title={t.url}>
                      {t.url}
                    </td>
                    <td className="px-6 py-4 flex items-center gap-2 text-slate-400">
                       <Server className="w-3 h-3" />
                       {t.enrichment?.dns.ip || '...'}
                    </td>
                    <td className="px-6 py-4 flex items-center gap-2 text-slate-400">
                       <Globe className="w-3 h-3" />
                       {t.enrichment?.geo.country || '...'}
                    </td>
                    <td className="px-6 py-4">
                      {t.result ? (
                         <div className="flex gap-1">
                           {t.result.stats.critical > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}
                           {t.result.stats.high > 0 && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                           {t.result.stats.medium > 0 && <span className="w-2 h-2 rounded-full bg-yellow-500" />}
                           <span className="ml-1 text-slate-500 font-mono text-xs">{t.result.stats.total}</span>
                         </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default BatchResults;
