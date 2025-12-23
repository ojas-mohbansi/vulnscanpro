import React from 'react';
import { Share2 } from 'lucide-react';
import KnowledgeGraphExplorer from '../components/KnowledgeGraphExplorer';

const KnowledgeGraphPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <Share2 className="w-6 h-6 text-purple-500" />
            Security Knowledge Graph
          </h1>
          <p className="text-slate-400">
            Explore the interconnected web of CVEs, CWEs, and Frameworks. 
            Powered by NVD, CIRCL, and MITRE data feeds.
          </p>
        </header>

        <KnowledgeGraphExplorer />
      </div>
    </div>
  );
};

export default KnowledgeGraphPage;
