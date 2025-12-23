
import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, Trash2, Play, Pause, RefreshCw, Cloud, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';
import { SchedulerService } from '../lib/services/schedulerService';
import { ScheduledScan, Frequency } from '../types';
import { api } from '../utils/apiClients';

const SchedulerPage: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduledScan[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newFreq, setNewFreq] = useState<Frequency>('daily');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ msg: string, success: boolean } | null>(null);

  useEffect(() => {
    loadSchedules();
    SchedulerService.checkDueScans().then(count => {
        if (count > 0) loadSchedules();
    });
  }, []);

  const loadSchedules = () => {
    setSchedules(SchedulerService.getSchedules());
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    
    SchedulerService.createSchedule(newUrl, newFreq);
    setNewUrl('');
    loadSchedules();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this schedule?')) {
        SchedulerService.deleteSchedule(id);
        loadSchedules();
    }
  };

  const toggleStatus = (s: ScheduledScan) => {
    const updated = { ...s, status: s.status === 'active' ? 'paused' : 'active' } as ScheduledScan;
    SchedulerService.saveSchedule(updated);
    loadSchedules();
  };

  const handleSync = async () => {
    setLoading(true);
    setSyncStatus(null);
    try {
        const res = await SchedulerService.syncRemote();
        setSyncStatus({ 
            msg: res.success ? `Synced to ${res.source}` : 'Sync failed', 
            success: res.success 
        });
    } catch (e) {
        setSyncStatus({ msg: 'Sync Error', success: false });
    } finally {
        setLoading(false);
    }
  };

  const handleRunNow = async (s: ScheduledScan) => {
    if (confirm(`Run immediate scan for ${s.target}?`)) {
        await api.startScan({
            url: s.target,
            framework: s.framework,
            options: { depth: 2, maxPages: 20, rateLimitRps: 5, subdomains: false }
        });
        alert('Scan started. Check progress in the main scanner or history.');
        const updated = { ...s, lastRun: new Date().toISOString() };
        SchedulerService.saveSchedule(updated);
        loadSchedules();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
              <CalendarClock className="w-6 h-6 text-primary" />
              Batch Scan Scheduler
            </h1>
            <p className="text-slate-400">Automate recurring security scans. Schedules run locally when the app is open.</p>
          </div>
          <button 
            onClick={handleSync}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-sm font-medium disabled:opacity-50 w-full md:w-auto"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
            Sync to Cloud
          </button>
        </header>

        {syncStatus && (
           <div className={`p-4 rounded-lg border flex items-center gap-2 ${syncStatus.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {syncStatus.success ? <CheckCircle className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
              {syncStatus.msg}
           </div>
        )}

        {/* Add Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
           <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-1 w-full">
               <label className="block text-sm font-medium text-slate-300 mb-2">Target URL</label>
               <input 
                 type="text" 
                 value={newUrl}
                 onChange={(e) => setNewUrl(e.target.value)}
                 placeholder="https://example.com"
                 className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-primary outline-none"
                 required
               />
             </div>
             <div className="w-full md:w-auto">
               <label className="block text-sm font-medium text-slate-300 mb-2">Frequency</label>
               <select 
                 value={newFreq}
                 onChange={(e) => setNewFreq(e.target.value as Frequency)}
                 className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-primary outline-none md:min-w-[150px]"
               >
                 <option value="daily">Daily</option>
                 <option value="weekly">Weekly</option>
                 <option value="manual">Manual Only</option>
               </select>
             </div>
             <button 
               type="submit"
               className="bg-primary hover:bg-primary.hover text-slate-900 font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors w-full md:w-auto justify-center"
             >
               <Plus className="w-5 h-5" /> Add
             </button>
           </form>
        </div>

        {/* List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
           
           {/* Mobile Cards */}
           <div className="block md:hidden p-4 space-y-4">
              {schedules.length === 0 && <div className="text-center text-slate-500">No schedules yet.</div>}
              {schedules.map(s => (
                <div key={s.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4 relative">
                   <div className="flex justify-between items-start mb-2">
                      <div className="font-mono text-white text-sm break-all pr-4">{s.target}</div>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${
                           s.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                         }`}>
                           <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                           {s.status}
                      </span>
                   </div>
                   
                   <div className="text-xs text-slate-400 mb-4 flex flex-col gap-1">
                      <span className="capitalize flex items-center gap-1"><Calendar className="w-3 h-3"/> {s.frequency}</span>
                      <span>Next: {s.nextRun ? new Date(s.nextRun).toLocaleDateString() : 'Manual'}</span>
                   </div>

                   <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
                         <button 
                           onClick={() => toggleStatus(s)}
                           className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors border border-slate-800"
                           title={s.status === 'active' ? 'Pause' : 'Resume'}
                         >
                           {s.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                         </button>
                         <button 
                           onClick={() => handleRunNow(s)}
                           className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition-colors border border-slate-800"
                           title="Run Now"
                         >
                           <RefreshCw className="w-4 h-4" />
                         </button>
                         <button 
                           onClick={() => handleDelete(s.id)}
                           className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition-colors border border-slate-800"
                           title="Delete"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                   </div>
                </div>
              ))}
           </div>

           {/* Desktop Table */}
           <div className="hidden md:block overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                 <tr>
                   <th className="px-6 py-4 font-medium">Target</th>
                   <th className="px-6 py-4 font-medium">Frequency</th>
                   <th className="px-6 py-4 font-medium">Last Run</th>
                   <th className="px-6 py-4 font-medium">Next Run</th>
                   <th className="px-6 py-4 font-medium">Status</th>
                   <th className="px-6 py-4 font-medium text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800">
                 {schedules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No active schedules. Add one above.
                      </td>
                    </tr>
                 ) : (
                   schedules.map(s => (
                     <tr key={s.id} className="hover:bg-slate-800/50 transition-colors">
                       <td className="px-6 py-4 font-mono text-slate-200">{s.target}</td>
                       <td className="px-6 py-4 capitalize text-slate-400">{s.frequency}</td>
                       <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                         {s.lastRun ? new Date(s.lastRun).toLocaleString() : 'Never'}
                       </td>
                       <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                         {s.nextRun ? new Date(s.nextRun).toLocaleString() : 'Manual'}
                       </td>
                       <td className="px-6 py-4">
                         <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                           s.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                         }`}>
                           <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                           {s.status}
                         </span>
                       </td>
                       <td className="px-6 py-4 flex items-center justify-end gap-2">
                         <button 
                           onClick={() => toggleStatus(s)}
                           className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                           title={s.status === 'active' ? 'Pause' : 'Resume'}
                         >
                           {s.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                         </button>
                         <button 
                           onClick={() => handleRunNow(s)}
                           className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-blue-400 transition-colors"
                           title="Run Now"
                         >
                           <RefreshCw className="w-4 h-4" />
                         </button>
                         <button 
                           onClick={() => handleDelete(s.id)}
                           className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition-colors"
                           title="Delete"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulerPage;
