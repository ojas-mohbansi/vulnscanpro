import React, { useState } from 'react';
import { ComplianceStandard, ScanResult } from '../types';
import { ShieldCheck, AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronRight, FileText } from 'lucide-react';

interface Props {
  scan: ScanResult;
}

const ComplianceDashboard: React.FC<Props> = ({ scan }) => {
  const [activeStandard, setActiveStandard] = useState<string>(scan.compliance?.[0]?.id || '');
  const [expandedControl, setExpandedControl] = useState<string | null>(null);

  if (!scan.compliance || scan.compliance.length === 0) {
    return <div className="p-6 text-center text-slate-500">Compliance data not available.</div>;
  }

  const currentStandard = scan.compliance.find(s => s.id === activeStandard) || scan.compliance[0];

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'fail': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'warning': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar / Tabs */}
        <div className="w-full md:w-64 space-y-2">
          {scan.compliance.map(std => (
            <button
              key={std.id}
              onClick={() => setActiveStandard(std.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                activeStandard === std.id 
                  ? 'bg-primary/10 border-primary/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="font-medium text-sm">{std.name}</span>
              <div className={`px-2 py-0.5 rounded text-xs font-bold ${
                std.score === 100 ? 'bg-green-500 text-slate-900' : 
                std.score > 80 ? 'bg-yellow-500 text-slate-900' : 'bg-red-500 text-white'
              }`}>
                {std.score}%
              </div>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary" />
                {currentStandard.name} <span className="text-slate-500 text-sm font-normal">v{currentStandard.version}</span>
              </h2>
              <p className="text-slate-400 text-sm mt-1">Compliance Status Report</p>
            </div>
            <div className="text-right">
               <div className="text-3xl font-bold text-white">{currentStandard.score}%</div>
               <div className="text-xs text-slate-500 uppercase tracking-wider">Compliance Score</div>
            </div>
          </div>

          <div className="divide-y divide-slate-800">
            {currentStandard.controls.map(ctrl => (
              <div key={ctrl.id} className="group">
                <button 
                  onClick={() => setExpandedControl(expandedControl === ctrl.id ? null : ctrl.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-slate-800/30 transition-colors text-left"
                >
                  <div className="shrink-0">{getStatusIcon(ctrl.status)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500 text-sm">{ctrl.code}</span>
                      <span className="font-medium text-slate-200">{ctrl.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {ctrl.relatedFindings.length > 0 && (
                      <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
                        {ctrl.relatedFindings.length} Finding{ctrl.relatedFindings.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded uppercase font-bold border ${getStatusColor(ctrl.status)}`}>
                      {ctrl.status}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedControl === ctrl.id ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {expandedControl === ctrl.id && (
                  <div className="bg-slate-950/50 p-4 pl-14 border-t border-slate-800/50">
                    {ctrl.relatedFindings.length === 0 ? (
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" /> No violations detected for this control.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-400 font-medium mb-2">Violating Findings:</p>
                        {ctrl.relatedFindings.map(fid => {
                          const finding = scan.findings.find(f => f.id === fid);
                          if (!finding) return null;
                          return (
                            <div key={fid} className="flex items-start gap-3 p-3 bg-slate-900 rounded border border-slate-800">
                              <AlertCircle className={`w-4 h-4 mt-0.5 ${finding.severity === 'critical' || finding.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                              <div>
                                <div className="text-sm text-white font-medium">{finding.title}</div>
                                <div className="text-xs text-slate-500 mt-1 line-clamp-1">{finding.description}</div>
                                <div className="flex gap-2 mt-2">
                                   <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{finding.module}</span>
                                   <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">ID: {fid}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="mt-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded">
                           <h4 className="text-xs font-bold text-blue-400 mb-1 flex items-center gap-1">
                             <FileText className="w-3 h-3" /> Remediation Guidance
                           </h4>
                           <p className="text-xs text-slate-400">
                             Resolve the above findings to satisfy {currentStandard.name} control {ctrl.code}. Refer to the specific finding details for code snippets.
                           </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceDashboard;
