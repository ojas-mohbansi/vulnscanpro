
import React from 'react';
import { DependencyScanResult, Severity } from '../types';
import { AlertTriangle, CheckCircle, Package, ExternalLink, ShieldAlert, ArrowRight } from 'lucide-react';
import SeverityChart from './SeverityChart';

interface Props {
  results: DependencyScanResult;
}

const DependencyResults: React.FC<Props> = ({ results }) => {
  const { summary, vulnerabilities, dependencies } = results;

  const severityData = [
    { name: 'Critical', value: summary.critical, color: '#ef4444' },
    { name: 'High', value: summary.high, color: '#f97316' },
    { name: 'Medium', value: summary.medium, color: '#eab308' },
    { name: 'Low', value: summary.low, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const getSeverityBadge = (s: Severity) => {
    const styles = {
      critical: 'bg-red-500/10 text-red-500 border-red-500/20',
      high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${styles[s]}`}>{s}</span>;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
           <div className="text-slate-500 text-xs uppercase font-bold mb-1">Total Dependencies</div>
           <div className="text-2xl font-bold text-white flex items-center gap-2">
             <Package className="w-5 h-5 text-slate-400" />
             {summary.totalDependencies}
           </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
           <div className="text-slate-500 text-xs uppercase font-bold mb-1">Vulnerable Packages</div>
           <div className={`text-2xl font-bold ${summary.vulnerableDependencies > 0 ? 'text-red-500' : 'text-green-500'}`}>
             {summary.vulnerableDependencies}
           </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
           <div className="text-slate-500 text-xs uppercase font-bold mb-1">Security Score</div>
           <div className="text-2xl font-bold text-white">
             {summary.totalDependencies > 0 
               ? Math.max(0, 100 - (summary.critical * 20 + summary.high * 10 + summary.medium * 5)).toFixed(0) 
               : 100}
           </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
           <div className="text-slate-500 text-xs uppercase font-bold mb-1">Critical Issues</div>
           <div className="text-2xl font-bold text-red-500">{summary.critical}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-bold text-white mb-4">Vulnerability Severity</h3>
          <SeverityChart data={severityData} />
        </div>

        {/* Vulnerability List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            Detected Vulnerabilities
          </h3>
          
          {vulnerabilities.length === 0 ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h4 className="text-green-400 font-bold text-lg">No Known Vulnerabilities Found</h4>
              <p className="text-green-300/80 mt-2">Your dependencies appear clean based on current OSV.dev data.</p>
            </div>
          ) : (
            vulnerabilities.map((vuln, idx) => (
              <div key={`${vuln.id}-${idx}`} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    {getSeverityBadge(vuln.severity)}
                    <div className="font-mono text-indigo-300 font-bold break-all">{vuln.dependency}@{vuln.version}</div>
                  </div>
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded self-start">ID: {vuln.id}</span>
                </div>
                
                <h4 className="font-bold text-white mb-2">{vuln.title}</h4>
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{vuln.summary}</p>
                
                <div className="bg-slate-950 rounded-lg p-3 text-sm border border-slate-800 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                   <span className="text-slate-400">Fixed in: <span className="text-green-400 font-mono">{vuln.fixedIn || 'Unknown'}</span></span>
                   <span className="text-xs text-slate-600">Source: {vuln.source}</span>
                </div>

                {vuln.refs.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {vuln.refs.slice(0, 3).map((ref, i) => (
                      <a key={i} href={ref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded">
                        Reference {i + 1} <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Full Dependency List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 font-bold text-white">All Dependencies ({dependencies.length})</div>
        
        {/* Mobile List */}
        <div className="block md:hidden max-h-64 overflow-y-auto p-4 space-y-2">
           {dependencies.map((dep, idx) => {
             const isVuln = vulnerabilities.some(v => v.dependency === dep.name);
             return (
               <div key={idx} className="flex justify-between items-center p-3 bg-slate-950 rounded border border-slate-800">
                  <div>
                     <div className="text-slate-200 font-medium text-sm">{dep.name}</div>
                     <div className="text-slate-500 text-xs font-mono">{dep.version} ({dep.ecosystem})</div>
                  </div>
                  {isVuln ? (
                     <AlertTriangle className="w-4 h-4 text-red-400" />
                  ) : (
                     <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
               </div>
             );
           })}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block max-h-64 overflow-y-auto">
          <table className="w-full text-left text-sm">
             <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
               <tr>
                 <th className="px-6 py-3">Package</th>
                 <th className="px-6 py-3">Version</th>
                 <th className="px-6 py-3">Ecosystem</th>
                 <th className="px-6 py-3">Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800">
               {dependencies.map((dep, idx) => {
                 const isVuln = vulnerabilities.some(v => v.dependency === dep.name);
                 return (
                   <tr key={idx} className="hover:bg-slate-800/50">
                     <td className="px-6 py-3 text-slate-200 font-medium">{dep.name}</td>
                     <td className="px-6 py-3 text-slate-400 font-mono">{dep.version}</td>
                     <td className="px-6 py-3 text-slate-500">{dep.ecosystem}</td>
                     <td className="px-6 py-3">
                       {isVuln ? (
                         <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Vulnerable</span>
                       ) : (
                         <span className="text-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Secure</span>
                       )}
                     </td>
                   </tr>
                 );
               })}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DependencyResults;
