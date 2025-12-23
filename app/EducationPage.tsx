import React, { useEffect, useState } from 'react';
import { BookOpen, Search, ExternalLink, Tag, Bookmark, Youtube, FileText, Code } from 'lucide-react';
import { EducationService } from '../lib/services/educationService';
import { EducationResource } from '../types';

const EducationPage: React.FC = () => {
  const [resources, setResources] = useState<EducationResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<EducationResource[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      const data = await EducationService.getAllResources();
      setResources(data);
      setFilteredResources(data);
      setLoading(false);
    };
    loadContent();
  }, []);

  useEffect(() => {
    let result = resources;

    if (selectedTag !== 'all') {
      result = result.filter(r => r.tags.includes(selectedTag));
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.title.toLowerCase().includes(lower) || 
        r.description.toLowerCase().includes(lower) ||
        r.source.toLowerCase().includes(lower)
      );
    }

    setFilteredResources(result);
  }, [searchTerm, selectedTag, resources]);

  // Extract unique tags
  const allTags = Array.from(new Set(resources.flatMap(r => r.tags))).sort();

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'video': return <Youtube className="w-4 h-4 text-red-500" />;
      case 'docs': return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'cheatsheet': return <Code className="w-4 h-4 text-green-500" />;
      default: return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="space-y-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            Developer Education Hub
          </h1>
          <p className="text-slate-400 max-w-2xl text-lg">
            Curated security resources, cheat sheets, and documentation to help you remediate vulnerabilities and build secure applications.
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
             <input 
               type="text" 
               placeholder="Search topics (e.g., XSS, CSP, React)..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
             />
           </div>
           
           <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
             <button 
               onClick={() => setSelectedTag('all')}
               className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${selectedTag === 'all' ? 'bg-primary text-slate-900 border-primary' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
             >
               All Topics
             </button>
             {allTags.map(tag => (
               <button 
                 key={tag}
                 onClick={() => setSelectedTag(tag)}
                 className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap capitalize ${selectedTag === tag ? 'bg-primary text-slate-900 border-primary' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
               >
                 {tag}
               </button>
             ))}
           </div>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading educational resources...</div>
        ) : filteredResources.length === 0 ? (
          <div className="py-20 text-center text-slate-500">No resources found matching your criteria.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((res) => (
              <div key={res.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col hover:border-slate-600 transition-all group shadow-sm hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {getTypeIcon(res.type)}
                    {res.type}
                  </div>
                  <span className="text-[10px] bg-slate-800 px-2 py-1 rounded border border-slate-700 text-slate-400 font-mono">
                    {res.source}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                  {res.title}
                </h3>
                
                <p className="text-slate-400 text-sm mb-6 flex-1 leading-relaxed">
                  {res.description}
                </p>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {res.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] flex items-center gap-1 bg-slate-950 px-2 py-1 rounded text-slate-500 border border-slate-800">
                        <Tag className="w-3 h-3" /> {tag}
                      </span>
                    ))}
                  </div>
                  
                  <a 
                    href={res.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Read Guide <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EducationPage;
