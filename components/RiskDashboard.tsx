
import React, { useMemo } from 'react';
import { ScanResult, Finding } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ScatterChart, Scatter, ZAxis, Legend, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, Shield, Target } from 'lucide-react';

interface Props {
  scan: ScanResult;
}

const RiskDashboard: React.FC<Props> = ({ scan }) => {
  // Aggregate Risk Scores
  const riskData = useMemo(() => {
    if (!scan.findings.length) return [];
    
    // Distribution bucket
    const distribution = [0,0,0,0,0,0,0,0,0,0,0]; // 0-10 buckets
    const scatterData: any[] = [];

    scan.findings.forEach(f => {
      const score = f.risk?.score || 0;
      distribution[Math.floor(score)]++;
      
      scatterData.push({
        x: score,
        y: f.confidence * 100,
        z: 1, // Size
        name: f.title,
        severity: f.severity
      });
    });

    return {
      distribution: distribution.map((count, score) => ({ score, count })),
      scatterData
    };
  }, [scan]);

  const avgRisk = useMemo(() => {
    if (scan.findings.length === 0) return 0;
    const sum = scan.findings.reduce((acc, f) => acc + (f.risk?.score || 0), 0);
    return (sum / scan.findings.length).toFixed(1);
  }, [scan]);

  const maxRisk = useMemo(() => {
    return scan.findings.reduce((max, f) => Math.max(max, f.risk?.score || 0), 0);
  }, [scan]);

  const getSeverityColor = (s: string) => {
    switch(s) {
        case 'critical': return '#ef4444';
        case 'high': return '#f97316';
        case 'medium': return '#eab308';
        case 'low': return '#3b82f6';
        default: return '#94a3b8';
    }
  };

  return (
    <div className="space-y-6">
      {/* Risk KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
           <div className="text-slate-500 text-xs uppercase font-bold mb-1">Average Risk</div>
           <div className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
             <ActivityIcon score={Number(avgRisk)} />
             {avgRisk} <span className="text-xs text-slate-500 font-normal">/ 10</span>
           </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
           <div className="text-slate-500 text-xs uppercase font-bold mb-1">Max Risk Detected</div>
           <div className={`text-2xl lg:text-3xl font-bold ${Number(maxRisk) > 8 ? 'text-red-500' : 'text-yellow-500'}`}>
             {maxRisk}
           </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
           <div className="text-slate-500 text-xs uppercase font-bold mb-1">Findings Scored</div>
           <div className="text-2xl lg:text-3xl font-bold text-blue-400">{scan.findings.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
           <div className="text-slate-500 text-xs uppercase font-bold mb-1">High Risk Items</div>
           <div className="text-2xl lg:text-3xl font-bold text-orange-500">
             {scan.findings.filter(f => (f.risk?.score || 0) >= 7.0).length}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Risk Distribution Chart */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
           <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
             <TrendingUp className="w-5 h-5 text-primary" /> Risk Score Distribution
           </h3>
           <div className="h-64 md:h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData.distribution}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                   <XAxis dataKey="score" stroke="#64748b" fontSize={10} tickFormatter={(val) => `${val}`} label={{ value: 'Risk Score (0-10)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }} />
                   <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                   <Tooltip 
                     cursor={{ fill: '#1e293b' }}
                     contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                   />
                   <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                     {riskData.distribution.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.score >= 7 ? '#ef4444' : entry.score >= 4 ? '#eab308' : '#3b82f6'} />
                     ))}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Risk Matrix (Score vs Confidence) */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
           <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
             <Target className="w-5 h-5 text-purple-400" /> Risk Matrix (Impact vs. Confidence)
           </h3>
           <div className="h-64 md:h-80 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                 <XAxis type="number" dataKey="x" name="Risk Score" unit="" domain={[0, 10]} stroke="#64748b" fontSize={10} label={{ value: 'Risk Score', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10 }} />
                 <YAxis type="number" dataKey="y" name="Confidence" unit="%" domain={[0, 100]} stroke="#64748b" fontSize={10} label={{ value: 'Confidence', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                 <ZAxis type="number" dataKey="z" range={[50, 50]} />
                 <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                 <Scatter name="Findings" data={riskData.scatterData}>
                    {riskData.scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getSeverityColor(entry.severity)} />
                    ))}
                 </Scatter>
               </ScatterChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Top Risks Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
         <div className="p-4 border-b border-slate-800 font-bold text-white bg-slate-950 flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" /> Top Priority Remediation
         </div>
         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
               <tr>
                 <th className="px-6 py-3 font-medium">Risk Score</th>
                 <th className="px-6 py-3 font-medium">Finding</th>
                 <th className="px-6 py-3 font-medium">Risk Factors</th>
                 <th className="px-6 py-3 font-medium text-right">CVSS</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800">
               {scan.findings
                 .sort((a, b) => (b.risk?.score || 0) - (a.risk?.score || 0))
                 .slice(0, 5)
                 .map((f) => (
                   <tr key={f.id} className="hover:bg-slate-800/50 transition-colors">
                     <td className="px-6 py-4">
                       <span className={`inline-block px-3 py-1 rounded font-bold ${
                         (f.risk?.score || 0) >= 7 ? 'bg-red-500 text-white' : 
                         (f.risk?.score || 0) >= 4 ? 'bg-yellow-500 text-slate-900' : 'bg-blue-500 text-white'
                       }`}>
                         {f.risk?.score || 'N/A'}
                       </span>
                     </td>
                     <td className="px-6 py-4">
                       <div className="font-medium text-white">{f.title}</div>
                       <div className="text-xs text-slate-500 mt-1">{f.module}</div>
                     </td>
                     <td className="px-6 py-4">
                       <div className="flex flex-wrap gap-1">
                         {f.risk?.factors.map((factor, i) => (
                           <span key={i} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                             {factor}
                           </span>
                         ))}
                       </div>
                     </td>
                     <td className="px-6 py-4 text-right font-mono text-slate-400">
                       {f.risk?.baseScore.toFixed(1) || '-'}
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

const ActivityIcon: React.FC<{ score: number }> = ({ score }) => {
  if (score >= 7) return <AlertTriangle className="w-5 h-5 text-red-500" />;
  if (score >= 4) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  return <Shield className="w-5 h-5 text-blue-500" />;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl text-xs">
        <p className="font-bold text-white mb-1">{data.name}</p>
        <p className="text-slate-300">Risk Score: {data.x}</p>
        <p className="text-slate-300">Confidence: {data.y}%</p>
        <p className="text-slate-400 capitalize">Severity: {data.severity}</p>
      </div>
    );
  }
  return null;
};

export default RiskDashboard;
