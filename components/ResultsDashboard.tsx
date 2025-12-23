
import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../utils/apiClients';
import { ScanResult, ScanEvent, Finding, Severity, ScanStatus } from '../types';
import ProgressStream from '../components/ProgressStream';
import SeverityChart from '../components/SeverityChart';
import FindingDetail from '../components/FindingDetail';
import ReportExport from '../components/ReportExport';
import BadgesPanel from '../components/BadgesPanel';
import QuizModal from '../components/QuizModal';
import ComplianceDashboard from '../components/ComplianceDashboard';
import RiskDashboard from '../components/RiskDashboard';
import InsightDashboard from '../components/InsightDashboard';
import { PreferencesService } from '../lib/services/preferences';
import { GamificationService } from '../lib/services/gamification';
import { AlertCircle, Search, Filter, ChevronRight, ArrowLeft, Loader2, ChevronDown, GraduationCap, FileCheck, TrendingUp, Lightbulb, Clock, Activity, Shield } from 'lucide-react';
import { ComplianceService } from '../lib/services/complianceService';
import { RiskService } from '../lib/services/riskService';
import { NotificationService } from '../lib/services/notificationService';

const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'findings' | 'compliance' | 'risk' | 'insights'>('findings');
  
  const [learningMode, setLearningMode] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);

  const notifiedFindingsRef = useRef(new Set<string>());
  const previousStatusRef = useRef<ScanStatus>('queued');

  useEffect(() => {
    if (!id) return;
    
    const prefs = PreferencesService.getPreferences();
    setLearningMode(prefs.learningMode);

    api.getScan(id).then(async (data) => {
      previousStatusRef.current = data.status;

      if (data.findings.length > 0) {
         if (!data.compliance) {
            data.compliance = await ComplianceService.evaluate(data.findings);
         }
         const needsRisk = data.findings.some(f => !f.risk);
         if (needsRisk) {
            const scoredFindings = await Promise.all(
                data.findings.map(async (f) => {
                    if (f.risk) return f;
                    const risk = await RiskService.calculateRisk(f);
                    return { ...f, risk };
                })
            );
            data.findings = scoredFindings;
         }
      }
      
      setScan(data);
      setEvents(data.events);
      setLoading(false);
      
      data.findings.forEach(f => notifiedFindingsRef.current.add(f.id));

      if (data.status === 'completed') {
        GamificationService.unlockBadge('first_scan');
      }
      if (data.stats.critical > 0 || data.stats.high > 0) {
        GamificationService.unlockBadge('bug_hunter');
      }

    }).catch(console.error);

    const unsubscribe = api.subscribeToScan(id, (event) => {
      setEvents(prev => [...prev, event]);
      api.getScan(id).then(async (s) => {
        if (s.findings.length > 0 && !s.findings[0].risk) {
             const scoredFindings = await Promise.all(s.findings.map(async f => ({...f, risk: await RiskService.calculateRisk(f)})));
             s.findings = scoredFindings;
        }
        if (!s.compliance && s.findings.length > 0) {
           s.compliance = await ComplianceService.evaluate(s.findings);
        }
        
        if (previousStatusRef.current !== s.status) {
            if (s.status === 'completed') NotificationService.notifyScanComplete(s);
            else if (s.status === 'failed') NotificationService.notifyScanFailed(s);
            previousStatusRef.current = s.status;
        }

        s.findings.forEach(f => {
            if ((f.severity === 'critical' || f.severity === 'high') && !notifiedFindingsRef.current.has(f.id)) {
                NotificationService.notifyHighSeverity(f);
                notifiedFindingsRef.current.add(f.id);
            }
        });

        setScan(s);
      }); 
    });

    return () => unsubscribe();
  }, [id]);

  if (loading || !scan) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">Loading scan context...</div>;
  }

  const filteredFindings = scan.findings.filter(f => {
    const matchesSeverity = filterSeverity === 'all' || f.severity === filterSeverity;
    const matchesSearch = f.title.toLowerCase().includes(search.toLowerCase()) || f.module.includes(search.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const visibleFindings = filteredFindings.slice(0, visibleCount);

  const severityData = [
    { name: 'Critical', value: scan.stats.critical, color: '#ef4444' },
    { name: 'High', value: scan.stats.high, color: '#f97316' },
    { name: 'Medium', value: scan.stats.medium, color: '#eab308' },
    { name: 'Low', value: scan.stats.low, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const getSeverityBadge = (s: Severity) => {
    const styles = {
      critical: 'bg-red-500/10 text-red-500 border-red-500/20',
      high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border uppercase ${styles[s]}`}>
        {s}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-4 w-full sm:w-auto">
             <Link to="/scan" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 hover:bg-slate-800">
               <ArrowLeft className="w-4 h-4" /> Back
             </Link>
             <h1 className="text-xl font-bold text-white hidden md:block">Scan Results</h1>
           </div>
           <div className="w-full sm:w-auto flex justify-end">
             <ReportExport scan={scan} />
           </div>
        </div>

        {learningMode && <BadgesPanel />}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column: Status & Stream */}
          <div className="space-y-6 xl:sticky xl:top-6 xl:h-fit">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-slate-400 text-sm uppercase tracking-wider font-semibold mb-4">Target Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">URL</label>
                  <div className="font-mono text-white truncate text-sm break-all" title={scan.target}>{scan.target}</div>
                </div>
                <div className="flex gap-4">
                   <div>
                      <label className="text-xs text-slate-500 block mb-1">Status</label>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                        scan.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                        scan.status === 'running' ? 'bg-blue-500/10 text-blue-500' : 
                        scan.status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {scan.status}
                      </span>
                   </div>
                   <div>
                      <label className="text-xs text-slate-500 block mb-1">Duration</label>
                      <span className="text-sm text-slate-300 font-mono">
                         {scan.stats.durationMs > 0 ? `${(scan.stats.durationMs / 1000).toFixed(1)}s` : '--'}
                      </span>
                   </div>
                </div>
              </div>
            </div>

            <ProgressStream events={events} status={scan.status} />
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-slate-400 text-sm uppercase tracking-wider font-semibold mb-4">Severity Distribution</h2>
              <SeverityChart data={severityData} />
            </div>
          </div>

          {/* Right Column: Findings & Analysis */}
          <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl shadow-lg flex flex-col overflow-hidden min-h-[600px] xl:h-[calc(100vh-100px)]">
             {/* Tabs */}
             <div className="flex border-b border-slate-800 overflow-x-auto bg-slate-950/50 sticky top-0 z-20">
               {['findings', 'insights', 'risk', 'compliance'].map((tab) => (
                 <button 
                   key={tab}
                   onClick={() => setActiveTab(tab as any)}
                   className={`flex-1 min-w-[100px] py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-b-2 capitalize whitespace-nowrap ${
                     activeTab === tab ? 'border-primary text-white bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                   }`}
                 >
                   {tab === 'findings' && <AlertCircle className="w-4 h-4" />}
                   {tab === 'insights' && <Lightbulb className="w-4 h-4" />}
                   {tab === 'risk' && <TrendingUp className="w-4 h-4" />}
                   {tab === 'compliance' && <FileCheck className="w-4 h-4" />}
                   {tab}
                   {tab === 'findings' && <span className="ml-1 text-xs bg-slate-800 px-1.5 py-0.5 rounded-full">{filteredFindings.length}</span>}
                 </button>
               ))}
             </div>

             {activeTab === 'findings' && (
                <div className="flex flex-col h-full overflow-hidden">
                   {/* Sticky Filters */}
                   <div className="p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
                     <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                          <input 
                            type="text" 
                            placeholder="Search findings..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 text-sm rounded-lg pl-9 pr-4 py-2 focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="relative w-full sm:w-auto">
                          <select 
                            value={filterSeverity}
                            onChange={(e) => setFilterSeverity(e.target.value)}
                            className="w-full sm:w-auto bg-slate-950 border border-slate-700 text-sm rounded-lg pl-3 pr-8 py-2 focus:ring-1 focus:ring-primary appearance-none"
                          >
                            <option value="all">All Severities</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                          <Filter className="absolute right-3 top-2.5 w-3 h-3 text-slate-500 pointer-events-none" />
                        </div>
                     </div>
                   </div>

                   <div className="flex-1 overflow-y-auto custom-scrollbar">
                     {filteredFindings.length === 0 ? (
                       <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 min-h-[300px]">
                         {scan.status === 'running' ? (
                            <>
                              <Loader2 className="w-8 h-8 animate-spin" />
                              <p>Scanning in progress...</p>
                            </>
                         ) : (
                            <p>No findings match your filters.</p>
                         )}
                       </div>
                     ) : (
                       <>
                         {/* Desktop Data Table */}
                         <div className="hidden lg:block w-full">
                           <table className="w-full text-left border-collapse">
                             <thead className="bg-slate-900/90 sticky top-0 z-10 text-xs font-semibold text-slate-400 uppercase tracking-wider shadow-sm">
                               <tr>
                                 <th className="px-6 py-4 border-b border-slate-800">Severity</th>
                                 <th className="px-6 py-4 border-b border-slate-800 w-1/3">Finding</th>
                                 <th className="px-6 py-4 border-b border-slate-800">Module</th>
                                 <th className="px-6 py-4 border-b border-slate-800">Risk Score</th>
                                 <th className="px-6 py-4 border-b border-slate-800">Confidence</th>
                                 <th className="px-6 py-4 border-b border-slate-800 text-right">Time</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-800 text-sm">
                               {visibleFindings.map((finding) => (
                                 <tr 
                                   key={finding.id} 
                                   onClick={() => setSelectedFinding(finding)}
                                   className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                 >
                                   <td className="px-6 py-4">
                                     {getSeverityBadge(finding.severity)}
                                   </td>
                                   <td className="px-6 py-4">
                                     <div className="font-medium text-slate-200 group-hover:text-white truncate max-w-[300px]">{finding.title}</div>
                                     <div className="text-xs text-slate-500 mt-1 truncate max-w-[300px]">{finding.description}</div>
                                   </td>
                                   <td className="px-6 py-4">
                                     <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                       {finding.module}
                                     </span>
                                   </td>
                                   <td className="px-6 py-4">
                                     {finding.risk && (
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                                            finding.risk.score >= 7 ? 'bg-red-500/20 text-red-400' : 
                                            finding.risk.score >= 4 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                                        }`}>
                                          {finding.risk.score}
                                        </span>
                                     )}
                                   </td>
                                   <td className="px-6 py-4">
                                     <div className="flex items-center gap-2">
                                       <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                                         <div className="h-full bg-slate-500" style={{ width: `${finding.confidence * 100}%` }}></div>
                                       </div>
                                       <span className="text-xs text-slate-500">{(finding.confidence * 100).toFixed(0)}%</span>
                                     </div>
                                   </td>
                                   <td className="px-6 py-4 text-right text-xs font-mono text-slate-600">
                                     {new Date(finding.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>

                         {/* Mobile/Tablet List View */}
                         <div className="lg:hidden divide-y divide-slate-800">
                           {visibleFindings.map((finding) => (
                             <button 
                               key={finding.id}
                               onClick={() => setSelectedFinding(finding)}
                               className="w-full text-left p-4 hover:bg-slate-800/50 transition-colors group flex items-start gap-4"
                             >
                               <div className="mt-1">{getSeverityBadge(finding.severity)}</div>
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center justify-between">
                                    <h3 className="font-medium text-slate-200 group-hover:text-white truncate pr-2">{finding.title}</h3>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {finding.risk && (
                                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                              finding.risk.score >= 7 ? 'bg-red-500 text-white' : 
                                              finding.risk.score >= 4 ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-300'
                                          }`}>{finding.risk.score}</span>
                                      )}
                                    </div>
                                 </div>
                                 <p className="text-sm text-slate-400 mt-1 line-clamp-1">{finding.description}</p>
                                 <div className="flex items-center gap-3 mt-2">
                                   <span className="text-xs text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{finding.module}</span>
                                   <span className="text-xs text-slate-600 font-mono">{new Date(finding.createdAt).toLocaleTimeString()}</span>
                                 </div>
                               </div>
                               <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-primary mt-2 shrink-0" />
                             </button>
                           ))}
                         </div>
                         
                         {visibleCount < filteredFindings.length && (
                           <button 
                              onClick={() => setVisibleCount(c => c + 50)}
                              className="w-full py-4 text-center text-sm text-slate-400 hover:text-white hover:bg-slate-800/30 flex items-center justify-center gap-2 border-t border-slate-800"
                           >
                              Show More ({filteredFindings.length - visibleCount} remaining)
                              <ChevronDown className="w-4 h-4" />
                           </button>
                         )}
                       </>
                     )}
                   </div>
                </div>
             )}

             {activeTab === 'insights' && (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                   <InsightDashboard scan={scan} />
                </div>
             )}

             {activeTab === 'risk' && (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                   <RiskDashboard scan={scan} />
                </div>
             )}

             {activeTab === 'compliance' && (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                   <ComplianceDashboard scan={scan} />
                </div>
             )}
          </div>
        </div>
      </div>

      {selectedFinding && (
        <FindingDetail 
          finding={selectedFinding} 
          onClose={() => setSelectedFinding(null)} 
        />
      )}

      {showQuiz && (
        <QuizModal onClose={() => setShowQuiz(false)} />
      )}
    </div>
  );
};

export default ResultsPage;
