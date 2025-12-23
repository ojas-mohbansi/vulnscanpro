import React, { useEffect, useState } from 'react';
import { Package, Download, Trash2, Shield, Search, ExternalLink, Loader2, Check, RefreshCw, Cloud } from 'lucide-react';
import { PluginService } from '../lib/services/pluginService';
import { MarketplaceEntry } from '../types';

const MarketplacePage: React.FC = () => {
  const [packs, setPacks] = useState<MarketplaceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('Initializing...');
  const [searchTerm, setSearchTerm] = useState('');

  const loadMarketplace = async () => {
    setLoading(true);
    const data = await PluginService.getMarketplace();
    setPacks(data.entries);
    setSource(data.source);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await PluginService.fetchRegistry(); // Force fetch
    await loadMarketplace();
  };

  useEffect(() => {
    loadMarketplace();
  }, []);

  const handleInstall = (id: string) => {
    PluginService.installPack(id);
    setPacks(prev => prev.map(p => p.pack.id === id ? { ...p, installed: true } : p));
  };

  const handleUninstall = (id: string) => {
    PluginService.uninstallPack(id);
    setPacks(prev => prev.map(p => p.pack.id === id ? { ...p, installed: false } : p));
  };

  const filteredPacks = packs.filter(p => 
    p.pack.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.pack.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-primary" />
              Plugin Marketplace
            </h1>
            <p className="text-slate-400 mt-1">Extend the scanner with community rule packs and plugins.</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search plugins..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-transparent outline-none"
                />
             </div>
             <button 
               onClick={handleRefresh}
               disabled={loading}
               className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
             >
               <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
               Refresh
             </button>
          </div>
        </header>

        {/* Source Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
           <Cloud className="w-3 h-3" />
           <span>Registry loaded from: <span className="text-slate-300 font-mono">{source}</span></span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {filteredPacks.map((entry) => (
               <div key={entry.pack.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col h-full hover:border-slate-700 transition-colors shadow-sm">
                 <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-slate-800 rounded-lg">
                      <Shield className="w-6 h-6 text-slate-300" />
                   </div>
                   {entry.isOfficial && (
                     <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full border border-blue-500/20 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Official
                     </span>
                   )}
                 </div>

                 <h3 className="text-lg font-bold text-white mb-2">{entry.pack.name}</h3>
                 <p className="text-slate-400 text-sm mb-4 flex-1 leading-relaxed">
                   {entry.pack.description}
                 </p>

                 <div className="flex flex-wrap gap-2 mb-6">
                    {entry.pack.tags.map(tag => (
                      <span key={tag} className="text-xs bg-slate-950 text-slate-500 px-2 py-1 rounded border border-slate-800 font-mono">
                        #{tag}
                      </span>
                    ))}
                 </div>

                 <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-auto">
                    <div className="text-xs text-slate-500">
                       v{entry.pack.version} • {entry.pack.rules.length} Rules
                    </div>
                    
                    {entry.installed ? (
                      <button 
                        onClick={() => handleUninstall(entry.pack.id)}
                        className="text-xs flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Uninstall
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleInstall(entry.pack.id)}
                        className="text-xs flex items-center gap-2 px-3 py-1.5 bg-primary text-slate-950 hover:bg-primary.hover font-bold rounded-md transition-colors"
                      >
                        <Download className="w-3 h-3" /> Install
                      </button>
                    )}
                 </div>
               </div>
             ))}

             {/* Custom Import Card */}
             <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center h-full group hover:bg-slate-900 transition-colors">
                <div className="p-4 bg-slate-800 rounded-full mb-4 group-hover:bg-slate-700 transition-colors">
                  <ExternalLink className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-300 mb-1">Import Custom Pack</h3>
                <p className="text-slate-500 text-sm mb-4">Load a rule pack from a URL (GitHub Raw, etc.)</p>
                <button 
                   onClick={() => alert("Custom import feature coming in v1.2")}
                   className="text-xs px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
                >
                   Import from URL
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplacePage;
