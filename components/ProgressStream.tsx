
import React, { useEffect, useRef, useMemo } from 'react';
import { ScanEvent, ScanStatus } from '../types';
import { Terminal, CheckCircle2, AlertTriangle, XCircle, Loader2, Circle, Activity, ChevronRight, Clock, Shield, Server, Lock } from 'lucide-react';

interface ProgressStreamProps {
  events: ScanEvent[];
  status: ScanStatus;
}

const EXPECTED_MODULES = [
  { id: 'headers', label: 'Headers', icon: Terminal },
  { id: 'tls', label: 'TLS', icon: Lock },
  { id: 'react', label: 'React', icon: Activity },
  { id: 'flask', label: 'Flask', icon: Activity },
  { id: 'django', label: 'Django', icon: Activity },
  { id: 'cve', label: 'CVEs', icon: Shield },
  { id: 'threat', label: 'Threats', icon: AlertTriangle },
  { id: 'ip', label: 'Infra', icon: Server },
];

const SCAN_PHASES = [
  { id: 'init', label: 'Initialize', pct: 0 },
  { id: 'crawl', label: 'Crawl & Map', pct: 15 },
  { id: 'audit', label: 'Vulnerability Audit', pct: 40 },
  { id: 'finalize', label: 'Finalize Report', pct: 90 },
];

const ProgressStream: React.FC<ProgressStreamProps> = ({ events, status }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Derive module states
  const moduleStates = useMemo(() => {
    const states: Record<string, 'pending' | 'running' | 'completed' | 'error'> = {};
    EXPECTED_MODULES.forEach(m => states[m.id] = 'pending');

    events.forEach(e => {
        // Map internal module names to UI chip IDs
        let mod = e.module;
        if (mod === 'external_headers') mod = 'headers';
        if (mod === 'threat_intel') mod = 'threat';
        if (mod === 'custom-rules') mod = 'cve'; 
        if (mod === 'availability') mod = 'ip';
        
        if (states[mod] !== undefined) {
            if (e.status === 'started') states[mod] = 'running';
            if (e.status === 'completed') states[mod] = 'completed';
            if (e.status === 'error') states[mod] = 'error';
        }
    });
    return states;
  }, [events]);

  // Determine current phase based on progress of last event or status
  const currentProgress = events.length > 0 ? events[events.length - 1].progressPct : 0;
  const currentPhaseIndex = status === 'completed' 
    ? SCAN_PHASES.length - 1 
    : SCAN_PHASES.findIndex((p, i) => {
        const next = SCAN_PHASES[i + 1];
        return currentProgress >= p.pct && (!next || currentProgress < next.pct);
      });

  useEffect(() => {
    if (status === 'running') {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, status]);

  const getIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getModuleStatusIcon = (s: string) => {
      switch (s) {
          case 'completed': return <CheckCircle2 className="w-3.5 h-3.5" />;
          case 'error': return <XCircle className="w-3.5 h-3.5" />;
          case 'running': return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
          default: return <Circle className="w-3.5 h-3.5 opacity-20" />;
      }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-[500px] lg:h-[600px] transition-all duration-300">
      
      {/* Header / Timeline */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-5 shadow-sm z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${status === 'running' ? 'bg-green-500/10' : 'bg-slate-800'}`}>
               <Terminal className={`w-4 h-4 ${status === 'running' ? 'text-green-500 animate-pulse' : 'text-slate-400'}`} />
            </div>
            <span className="text-sm font-mono text-slate-300 font-semibold">Live Execution Log</span>
          </div>
          
          {/* Desktop Horizontal Timeline */}
          <div className="hidden lg:flex items-center gap-2">
             {SCAN_PHASES.map((phase, idx) => {
               const isActive = idx === currentPhaseIndex;
               const isCompleted = idx < currentPhaseIndex || status === 'completed';
               return (
                 <div key={phase.id} className="flex items-center">
                   <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                     isActive ? 'bg-primary/10 border-primary text-primary shadow-[0_0_10px_rgba(16,185,129,0.2)]' :
                     isCompleted ? 'bg-slate-800 border-slate-700 text-slate-400' :
                     'bg-transparent border-transparent text-slate-700'
                   }`}>
                     {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary animate-pulse' : 'bg-slate-700'}`} />}
                     {phase.label}
                   </div>
                   {idx < SCAN_PHASES.length - 1 && (
                     <div className={`w-4 h-0.5 mx-1 transition-colors ${isCompleted ? 'bg-slate-700' : 'bg-slate-800'}`} />
                   )}
                 </div>
               );
             })}
          </div>

          {/* Mobile Badge */}
          <div className="lg:hidden flex items-center gap-2">
             {status === 'running' && (
               <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] uppercase font-bold tracking-wider border border-blue-500/20 animate-pulse">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                 Scanning
               </span>
             )}
             {status === 'completed' && (
               <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold tracking-wider border border-emerald-500/20">
                 Finished
               </span>
             )}
             {status === 'failed' && (
               <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] uppercase font-bold tracking-wider border border-red-500/20">
                 Failed
               </span>
             )}
          </div>
        </div>

        {/* Module Chips (Grid on Desktop) */}
        <div className="flex flex-wrap lg:grid lg:grid-cols-4 gap-2">
            {EXPECTED_MODULES.map(m => {
                const s = moduleStates[m.id];
                let styles = 'bg-slate-800/30 border-slate-800 text-slate-600';
                if (s === 'completed') styles = 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400';
                if (s === 'running') styles = 'bg-blue-500/10 border-blue-500/30 text-blue-400 ring-1 ring-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]';
                if (s === 'error') styles = 'bg-red-500/10 border-red-500/20 text-red-400';

                return (
                    <div key={m.id} className={`flex items-center gap-2 px-3 py-2 rounded-md border text-[10px] font-bold uppercase tracking-wide transition-all duration-300 ${styles}`}>
                        {getModuleStatusIcon(s)}
                        <span className="truncate flex-1">{m.label}</span>
                        {s === 'running' && <span className="flex h-1.5 w-1.5 rounded-full bg-current animate-ping opacity-75"></span>}
                    </div>
                );
            })}
        </div>
      </div>
      
      {/* Log Content */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2 relative bg-slate-950/50 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
         {events.length === 0 && (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 space-y-3">
             <div className="p-3 bg-slate-900 rounded-full border border-slate-800">
                <Loader2 className="w-6 h-6 animate-spin opacity-50" />
             </div>
             <p className="text-sm font-medium">Waiting for scan stream...</p>
           </div>
         )}
        {events.map((event, idx) => {
            const isError = event.status === 'error';
            const isWarning = event.status === 'warning';
            const isSuccess = event.status === 'completed';
            
            return (
              <div 
                key={idx} 
                className={`flex gap-3 p-2.5 rounded-lg border transition-all animate-in fade-in slide-in-from-left-2 duration-200 group ${
                    isError ? 'bg-red-950/20 border-red-900/40 text-red-200' :
                    isWarning ? 'bg-amber-950/20 border-amber-900/40 text-amber-200' :
                    isSuccess ? 'bg-emerald-950/10 border-emerald-900/20 text-emerald-200/80' :
                    'bg-slate-900/40 border-transparent hover:bg-slate-800/50 text-slate-400'
                }`}
              >
                <div className="shrink-0 flex flex-col items-center gap-1 w-14 sm:w-16 border-r border-white/5 pr-2 mr-1">
                  <span className="text-[10px] opacity-50">
                    {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                  </span>
                </div>
                
                <div className={`shrink-0 mt-0.5 ${
                    isError ? 'text-red-500' : isWarning ? 'text-amber-500' : isSuccess ? 'text-emerald-500' : 'text-blue-500'
                }`}>
                  {getIcon(event.status)}
                </div>

                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  {event.module !== 'system' && (
                      <span className={`uppercase text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded self-start sm:self-auto ${
                        isError ? 'bg-red-950 text-red-400 border border-red-900' : 
                        isWarning ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                        isSuccess ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                        'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}>
                        {event.module}
                      </span>
                  )}
                  <span className="break-words leading-relaxed text-sm opacity-90">{event.message}</span>
                </div>
              </div>
            );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default ProgressStream;
