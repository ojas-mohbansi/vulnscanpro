
import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../lib/hooks/useNetworkStatus';

const OfflineBanner: React.FC = () => {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top" role="status">
      <div className="flex items-center gap-2 text-sm font-medium">
        <WifiOff className="w-4 h-4" />
        Offline Mode Enabled. Viewing cached data.
      </div>
      <button 
        onClick={() => window.location.reload()}
        className="text-xs flex items-center gap-1 hover:text-amber-400 underline"
      >
        <RefreshCw className="w-3 h-3" /> Reconnect
      </button>
    </div>
  );
};

export default OfflineBanner;
