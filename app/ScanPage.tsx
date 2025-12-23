
import React from 'react';
import ScanForm from '../components/ScanForm';
import { useNetworkStatus } from '../lib/hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';

const ScanPage: React.FC = () => {
  const isOnline = useNetworkStatus();

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-8 mt-10">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">New Vulnerability Scan</h1>
          <p className="text-slate-400">Target framework-specific misconfigurations in React, Flask, and Django apps.</p>
        </div>
        
        {isOnline ? (
          <ScanForm />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center flex flex-col items-center space-y-4">
             <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-slate-500" />
             </div>
             <h2 className="text-xl font-bold text-white">Offline Mode</h2>
             <p className="text-slate-400 max-w-md">
               Scanning requires an active internet connection to reach target servers and external vulnerability databases.
             </p>
             <p className="text-sm text-slate-500">You can still view <a href="#/history" className="text-primary hover:underline">History</a> and Reports.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanPage;
