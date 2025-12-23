import React, { useEffect, useState } from 'react';
import { ScanResult, InsightReport } from '../types';
import { InsightService } from '../lib/services/insightService';
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Activity, Globe } from 'lucide-react';

interface Props {
  scan: ScanResult;
}

const InsightDashboard: React.FC<Props> = ({ scan }) => {
  const [report, setReport] = useState<InsightReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await InsightService.generate(scan);
      setReport(data);
      setLoading(false);
    };
    load();
  }, [scan]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500 animate-pulse">Analyzing scan findings...</div>;
  }

  if (!report) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Executive Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-start gap-4">
           <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <Lightbulb className="w-6 h-6 text-indigo-400" />
           </div>
           <div>
              <h3 className="text-lg font-bold text-white mb-2">Executive Insight</h3>
              <p className="text-slate-300 leading-relaxed text-sm">
                {report.summary}
              </p>
              <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
                 <span className="flex items-center gap-1">
                   <Activity className="w-3 h-3" /> Generated: {new Date(report.generatedAt).toLocaleTimeString()}
                 </span>
                 <span className="flex items-center gap-1">
                   <Globe className="w-3 h-3" /> Context: Global
                 </span>
              </div>
           </div>
        </div>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {report.insights.map((insight) => (
          <div key={insight.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
             <div className="flex justify-between items-start mb-4">
               <div className={`p-2 rounded-lg ${
                 insight.type === 'warning' ? 'bg-red-500/10 text-red-400' :
                 insight.type === 'positive' ? 'bg-green-500/10 text-green-400' :
                 'bg-blue-500/10 text-blue-400'
               }`}>
                 {insight.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
                  insight.type === 'positive' ? <CheckCircle className="w-5 h-5" /> :
                  <TrendingUp className="w-5 h-5" />}
               </div>
               {insight.metric && (
                 <span className="text-lg font-bold text-white font-mono">{insight.metric}</span>
               )}
             </div>
             
             <h4 className="font-bold text-slate-200 mb-2">{insight.title}</h4>
             <p className="text-sm text-slate-400 mb-4">{insight.description}</p>
             
             {insight.source && (
               <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-600 font-mono uppercase tracking-wider">
                 Source: {insight.source}
               </div>
             )}
          </div>
        ))}
      </div>

      {/* Prioritized Action Plan */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
         <div className="p-4 border-b border-slate-800 bg-slate-950 font-bold text-white flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-primary" /> Recommended Next Steps
         </div>
         <div className="divide-y divide-slate-800">
            {scan.findings
              .filter(f => f.severity === 'critical' || f.severity === 'high')
              .slice(0, 3)
              .map((f, idx) => (
                <div key={idx} className="p-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors">
                   <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-700">
                     {idx + 1}
                   </div>
                   <div className="flex-1">
                      <div className="text-sm font-medium text-white">{f.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Detected in {f.module} module</div>
                   </div>
                   <span className={`px-2 py-0.5 text-[10px] rounded uppercase font-bold border ${
                      f.severity === 'critical' ? 'text-red-400 border-red-500/20 bg-red-500/10' : 'text-orange-400 border-orange-500/20 bg-orange-500/10'
                   }`}>
                     {f.severity}
                   </span>
                </div>
            ))}
            {scan.findings.filter(f => f.severity === 'critical' || f.severity === 'high').length === 0 && (
               <div className="p-8 text-center text-slate-500 text-sm">
                 No critical actions required. Monitor for low severity improvements.
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default InsightDashboard;
