
import React, { useState, useEffect } from 'react';
import { SimulationService } from '../lib/services/simulationService';
import { SimulationScenario, SimulationResult } from '../types';
import { Play, ShieldAlert, Terminal, AlertTriangle, CheckCircle, XCircle, Loader2, Database, Code, Globe, Lock, ChevronDown, ChevronUp } from 'lucide-react';

const SimulationDashboard: React.FC = () => {
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario | null>(null);
  const [target, setTarget] = useState('https://google-gruyere.appspot.com/');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(true); // Mobile toggle

  useEffect(() => {
    SimulationService.getScenarios().then(data => {
      setScenarios(data);
      if (data.length > 0) setSelectedScenario(data[0]);
      setLoading(false);
    });
  }, []);

  const handleRun = async () => {
    if (!selectedScenario || !target) return;
    
    setRunning(true);
    setResult(null);
    try {
      const res = await SimulationService.runSimulation(selectedScenario, target);
      setResult(res);
    } finally {
      setRunning(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'xss': return <Code className="w-4 h-4 text-yellow-400" />;
      case 'sqli': return <Database className="w-4 h-4 text-blue-400" />;
      case 'csrf': return <Globe className="w-4 h-4 text-orange-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[calc(100vh-140px)]">
      {/* Sidebar: Scenario List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-auto lg:h-full">
        <button 
          className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center w-full lg:cursor-default"
          onClick={() => setSidebarOpen(!isSidebarOpen)}
        >
          <div>
            <h2 className="font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                Attack Scenarios
            </h2>
            <p className="text-xs text-slate-500 mt-1 text-left">Select a vulnerability to simulate.</p>
          </div>
          <div className="lg:hidden">
             {isSidebarOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </button>
        
        {isSidebarOpen && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[300px] lg:max-h-none">
            {loading ? (
                <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" /></div>
            ) : (
                scenarios.map(sc => (
                <button
                    key={sc.id}
                    onClick={() => { setSelectedScenario(sc); setResult(null); }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedScenario?.id === sc.id 
                        ? 'bg-primary/10 border-primary/50 text-white' 
                        : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-medium text-sm">
                        {getIcon(sc.type)}
                        {sc.name}
                    </div>
                    <span className={`text-[10px] px-1.5 rounded uppercase font-bold ${
                        sc.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' : 
                        sc.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                        {sc.difficulty}
                    </span>
                    </div>
                    <div className="text-xs opacity-70 truncate">{sc.description}</div>
                </button>
                ))
            )}
          </div>
        )}
      </div>

      {/* Main Content: Simulation Runner */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Config Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
           {selectedScenario ? (
             <div className="space-y-6">
               <div>
                 <h3 className="text-xl font-bold text-white mb-2">{selectedScenario.name}</h3>
                 <p className="text-slate-400 text-sm">{selectedScenario.description}</p>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                 <div className="bg-slate-950 p-3 rounded border border-slate-800 overflow-hidden">
                   <span className="text-slate-500 block mb-1 text-xs uppercase font-bold">Attack Vector (Payload)</span>
                   <code className="text-red-400 font-mono break-all text-xs">{selectedScenario.payload}</code>
                 </div>
                 <div className="bg-slate-950 p-3 rounded border border-slate-800">
                   <span className="text-slate-500 block mb-1 text-xs uppercase font-bold">Potential Risk</span>
                   <span className="text-slate-300">{selectedScenario.risk}</span>
                 </div>
               </div>

               <div className="flex flex-col sm:flex-row gap-4 items-end border-t border-slate-800 pt-6">
                 <div className="flex-1 w-full">
                   <label className="block text-sm font-medium text-slate-300 mb-2">Target URL (Safe Probe)</label>
                   <div className="relative">
                     <input 
                       type="text" 
                       value={target}
                       onChange={(e) => setTarget(e.target.value)}
                       className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white font-mono text-sm focus:ring-1 focus:ring-primary outline-none"
                     />
                     <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                   </div>
                 </div>
                 <button 
                   onClick={handleRun}
                   disabled={running}
                   className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] disabled:opacity-50"
                 >
                   {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                   Run Simulation
                 </button>
               </div>
             </div>
           ) : (
             <div className="h-full flex items-center justify-center text-slate-500 p-8">Select a scenario to configure.</div>
           )}
        </div>

        {/* Console / Output */}
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-inner min-h-[300px]">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-mono text-slate-400">
              <Terminal className="w-4 h-4" /> Simulation Console
            </div>
            {result && (
               <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${result.success ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                 {result.success ? 'Vulnerable' : 'Safe / Blocked'}
               </span>
            )}
          </div>
          
          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2">
            {!result && !running && <div className="text-slate-600 italic">Ready to start...</div>}
            
            {result?.logs.map((log, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-1 sm:gap-3 animate-in fade-in slide-in-from-left-2 mb-2 sm:mb-0">
                <span className="text-slate-600 shrink-0 text-[10px] sm:text-xs">{log.timestamp.split('T')[1].split('.')[0]}</span>
                <span className={`uppercase font-bold shrink-0 w-auto sm:w-16 ${
                  log.status === 'error' ? 'text-red-500' : 
                  log.status === 'success' ? 'text-red-400' : 
                  log.status === 'blocked' ? 'text-green-400' : 'text-blue-400'
                }`}>
                  [{log.step}]
                </span>
                <span className="text-slate-300 break-words">{log.details}</span>
              </div>
            ))}

            {result && (
              <div className="mt-6 pt-4 border-t border-slate-800 animate-in fade-in">
                <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                  <Lock className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-blue-400 font-bold mb-1">Mitigation Advice</h4>
                    <p className="text-slate-300 leading-relaxed text-sm">{result.mitigationAdvice}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationDashboard;
