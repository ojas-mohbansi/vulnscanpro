
import React, { useState } from 'react';
import { Box, FileCode, Upload, Search, Loader2 } from 'lucide-react';
import { DependencyParser } from '../lib/utils/dependencyParser';
import { DependencyService } from '../lib/services/dependencyService';
import { DependencyScanResult } from '../types';
import DependencyResults from '../components/DependencyResults';

const DependencyScanPage: React.FC = () => {
  const [content, setContent] = useState('');
  const [filename, setFilename] = useState('package.json');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DependencyScanResult | null>(null);

  const handleScan = async () => {
    setLoading(true);
    setResults(null);
    try {
      // 1. Parse
      const deps = DependencyParser.parse(filename, content);
      
      // 2. Query OSV
      const scanResults = await DependencyService.scanDependencies(deps);
      
      setResults(scanResults);
    } catch (e) {
      console.error(e);
      alert("Scan failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFilename(file.name);
      const reader = new FileReader();
      reader.onload = (e) => setContent(e.target?.result as string);
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <Box className="w-6 h-6 text-primary" />
            Dependency Scanner
          </h1>
          <p className="text-slate-400">
            Check your manifests or lockfiles against OSV.dev and 25+ vulnerability databases.
            Supports <code>package.json</code>, <code>package-lock.json</code>, <code>requirements.txt</code>, and <code>pyproject.toml</code>.
          </p>
        </header>

        {!results && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
             <div className="flex flex-col md:flex-row gap-6">
                {/* File Select */}
                <div className="w-full md:w-1/3 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">File Type</label>
                    <select 
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-primary outline-none"
                    >
                      <option value="package.json">Node.js (package.json)</option>
                      <option value="package-lock.json">Node.js Lockfile (package-lock.json)</option>
                      <option value="requirements.txt">Python (requirements.txt)</option>
                      <option value="pyproject.toml">Python (pyproject.toml)</option>
                    </select>
                  </div>

                  <div className="border-2 border-dashed border-slate-700 rounded-lg h-32 flex flex-col items-center justify-center bg-slate-950/30 hover:bg-slate-950/50 transition-colors relative">
                    <Upload className="w-8 h-8 text-slate-500 mb-2" />
                    <p className="text-slate-400 text-sm">Upload File</p>
                    <input 
                      type="file" 
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Editor */}
                <div className="flex-1 space-y-4">
                   <label className="block text-sm font-medium text-slate-300">
                     Or Paste Content Found in {filename}
                   </label>
                   <textarea 
                     value={content}
                     onChange={(e) => setContent(e.target.value)}
                     className="w-full h-64 bg-slate-950 border border-slate-700 rounded-lg p-4 font-mono text-xs text-slate-300 focus:ring-1 focus:ring-primary outline-none resize-none"
                     placeholder={filename.includes('json') ? '{\n  "dependencies": {\n    "react": "16.8.0"\n  }\n}' : 'flask==2.0.0'}
                   />
                   <button 
                     onClick={handleScan}
                     disabled={loading || !content}
                     className="w-full py-3 bg-primary hover:bg-primary.hover text-slate-900 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                   >
                     {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                     Scan Dependencies
                   </button>
                </div>
             </div>
          </div>
        )}

        {results && (
           <div className="space-y-6">
             <button 
               onClick={() => setResults(null)}
               className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
             >
               &larr; Scan Another File
             </button>
             <DependencyResults results={results} />
           </div>
        )}
      </div>
    </div>
  );
};

export default DependencyScanPage;
