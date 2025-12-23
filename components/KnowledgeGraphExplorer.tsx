import React, { useState } from 'react';
import { Search, Network, Loader2, GitBranch } from 'lucide-react';
import { KnowledgeGraphService } from '../lib/services/knowledgeGraphService';
import { GraphData } from '../types';
import VulnerabilityGraph from './VulnerabilityGraph';

const KnowledgeGraphExplorer: React.FC = () => {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const graph = await KnowledgeGraphService.buildGraph(query);
      setData(graph);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter CVE (CVE-2021-44228), CWE (CWE-79), or Framework (React)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || !query}
            className="bg-primary hover:bg-primary.hover text-slate-900 font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Network className="w-5 h-5" />}
            Build Graph
          </button>
        </form>
        
        <div className="mt-4 flex gap-4 text-xs text-slate-500">
           <span>Suggestions:</span>
           <button onClick={() => setQuery('CWE-79')} className="hover:text-primary underline">CWE-79 (XSS)</button>
           <button onClick={() => setQuery('CVE-2021-44228')} className="hover:text-primary underline">Log4Shell</button>
           <button onClick={() => setQuery('React')} className="hover:text-primary underline">React</button>
        </div>
      </div>

      {hasSearched && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
           {data.nodes.length > 0 ? (
             <VulnerabilityGraph data={data} />
           ) : (
             <div className="h-[400px] bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500">
                {loading ? (
                    <div className="flex flex-col items-center gap-3">
                       <Loader2 className="w-8 h-8 animate-spin text-primary" />
                       <p>Querying 25+ vulnerability databases...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                       <GitBranch className="w-10 h-10 opacity-30" />
                       <p>No relationships found for "{query}". Try a different ID.</p>
                    </div>
                )}
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraphExplorer;
