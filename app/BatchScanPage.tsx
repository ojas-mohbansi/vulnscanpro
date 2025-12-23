import React, { useState } from 'react';
import { Layers, Upload, Play, Loader2, AlertCircle, FileText } from 'lucide-react';
import { api } from '../utils/apiClients';
import { BatchTarget, ScanStatus, EnrichmentResult } from '../types';
import BatchResults from '../components/BatchResults';
import { NotificationService } from '../lib/services/notificationService';

const BatchScanPage: React.FC = () => {
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [rawInput, setRawInput] = useState('');
  const [targets, setTargets] = useState<BatchTarget[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [concurrency, setConcurrency] = useState(2);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseTargets(text);
      };
      reader.readAsText(file);
    }
  };

  const parseTargets = (text: string) => {
    // Supports CSV (one per line) or JSON array
    let urls: string[] = [];
    try {
      // Try JSON first
      const json = JSON.parse(text);
      if (Array.isArray(json)) urls = json.map(x => typeof x === 'string' ? x : x.url);
    } catch {
      // Fallback to CSV/Text
      urls = text.split(/[\n,]/).map(s => s.trim()).filter(s => s.length > 0);
    }

    const batch: BatchTarget[] = urls.map((url, idx) => {
      // Basic normalization
      let cleanUrl = url;
      if (!url.startsWith('http')) cleanUrl = `https://${url}`;
      
      return {
        id: `t-${idx}-${Date.now()}`,
        url: cleanUrl,
        status: 'pending'
      };
    });

    setTargets(batch);
  };

  const runBatch = async () => {
    setIsRunning(true);
    
    // Process queue
    const queue = [...targets];
    const inProgress = new Set<Promise<void>>();
    
    // Helper to update state
    const updateTarget = (id: string, updates: Partial<BatchTarget>) => {
      setTargets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const processTarget = async (target: BatchTarget) => {
      try {
        // 1. Enrich
        updateTarget(target.id, { status: 'enriching' });
        
        let enrichment: EnrichmentResult | undefined;
        try {
           const res = await fetch('/api/batch/enrich', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ target: target.url })
           });
           if (res.ok) enrichment = await res.json();
        } catch (e) { console.error('Enrichment failed', e); }

        updateTarget(target.id, { status: 'scanning', enrichment });

        // 2. Start Scan
        const { scanId } = await api.startScan({ 
            url: target.url, 
            framework: 'auto', 
            options: { depth: 2, maxPages: 20, rateLimitRps: 5, subdomains: false } 
        });
        
        updateTarget(target.id, { scanId });

        // 3. Poll until done
        // We use a simple poll here to avoid 50 open SSE connections
        let finished = false;
        while (!finished) {
           await new Promise(r => setTimeout(r, 2000));
           const scan = await api.getScan(scanId);
           if (scan.status === 'completed' || scan.status === 'failed' || scan.status === 'cancelled') {
             finished = true;
             updateTarget(target.id, { 
                status: scan.status === 'completed' ? 'completed' : 'failed',
                result: scan
             });
           }
        }

      } catch (err) {
        updateTarget(target.id, { status: 'failed', error: 'Init failed' });
      }
    };

    // Concurrency Loop
    let currentIndex = 0;
    while (currentIndex < queue.length || inProgress.size > 0) {
       // Fill slots
       while (inProgress.size < concurrency && currentIndex < queue.length) {
         const p = processTarget(queue[currentIndex])
            .then(() => { inProgress.delete(p); });
         inProgress.add(p);
         currentIndex++;
       }
       // Wait for at least one to finish before looping to allow UI updates or filling slots
       if (inProgress.size > 0) {
         await Promise.race(inProgress);
       }
    }

    setIsRunning(false);

    // Notify Batch Completion
    // Calculate stats from current state (targets)
    const criticals = targets.reduce((acc, t) => acc + (t.result?.stats.critical || 0), 0);
    NotificationService.notifyBatchComplete(targets.length, criticals);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <Layers className="w-6 h-6 text-primary" />
            Batch Scanner
          </h1>
          <p className="text-slate-400">Orchestrate multi-target security scans with automated DNS & GeoIP enrichment.</p>
        </header>

        {!isRunning && targets.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex gap-4 mb-4 border-b border-slate-800 pb-4">
               <button 
                 onClick={() => setInputMode('text')} 
                 className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${inputMode === 'text' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
               >
                 Paste Text
               </button>
               <button 
                 onClick={() => setInputMode('file')} 
                 className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${inputMode === 'file' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
               >
                 Upload File
               </button>
            </div>

            {inputMode === 'text' ? (
              <div>
                <textarea 
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="https://example.com&#10;https://test.com&#10;192.168.1.1"
                  className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-4 font-mono text-sm focus:ring-1 focus:ring-primary outline-none"
                />
                <button 
                  onClick={() => parseTargets(rawInput)}
                  className="mt-4 bg-primary text-slate-900 font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary.hover transition-colors"
                >
                  <FileText className="w-4 h-4" /> Load Targets
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-700 rounded-lg h-48 flex flex-col items-center justify-center bg-slate-950/50">
                <Upload className="w-8 h-8 text-slate-500 mb-2" />
                <p className="text-slate-400 text-sm mb-4">Drag & Drop or Select CSV/JSON</p>
                <input 
                  type="file" 
                  accept=".csv,.json,.txt"
                  onChange={handleFileUpload}
                  className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700"
                />
              </div>
            )}
          </div>
        )}

        {targets.length > 0 && (
          <div className="space-y-6">
             {/* Controls */}
             {!isRunning && !targets.some(t => t.status === 'completed') && (
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="text-sm">
                      <span className="text-slate-400">Targets loaded:</span> <span className="text-white font-bold">{targets.length}</span>
                   </div>
                   <div className="h-4 w-px bg-slate-700"></div>
                   <div className="flex items-center gap-2">
                     <label className="text-sm text-slate-400">Concurrency:</label>
                     <select 
                       value={concurrency}
                       onChange={(e) => setConcurrency(Number(e.target.value))}
                       className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                     >
                       <option value={1}>1 (Sequential)</option>
                       <option value={2}>2 (Safe)</option>
                       <option value={5}>5 (Fast)</option>
                     </select>
                   </div>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => setTargets([])} className="text-slate-400 hover:text-white text-sm px-3 py-2">Clear</button>
                    <button 
                      onClick={runBatch}
                      className="bg-primary text-slate-900 font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary.hover transition-colors"
                    >
                      <Play className="w-4 h-4" /> Start Batch
                    </button>
                 </div>
               </div>
             )}

             <BatchResults targets={targets} />
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchScanPage;
