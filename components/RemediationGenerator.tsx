import React, { useState } from 'react';
import { Sparkles, Copy, AlertTriangle, Check, Loader2, BookOpen, ShieldAlert } from 'lucide-react';
import { Finding } from '../types';
import { RemediationService, RemediationResult } from '../lib/services/remediationService';

interface Props {
  finding: Finding;
}

const RemediationGenerator: React.FC<Props> = ({ finding }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RemediationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'explain'>('code');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await RemediationService.generateFix(finding);
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!result && !loading) {
    return (
      <button 
        onClick={handleGenerate}
        className="w-full mt-4 group relative flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20"
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
        Generate AI-Assisted Fix
        <span className="absolute inset-0 rounded-xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all"></span>
      </button>
    );
  }

  return (
    <div className="mt-6 bg-slate-950 border border-indigo-500/30 rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-indigo-900/20 border-b border-indigo-500/20 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
          <Sparkles className="w-4 h-4" />
          AI Remediation Assistant
        </div>
        {loading && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
      </div>

      <div className="p-0">
        {loading ? (
          <div className="p-8 text-center space-y-4">
            <div className="flex justify-center gap-1">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
            </div>
            <p className="text-slate-400 text-sm">Analyzing finding context and retrieving templates...</p>
          </div>
        ) : result ? (
          <>
             {/* Tabs */}
             <div className="flex border-b border-slate-800">
                <button 
                  onClick={() => setActiveTab('code')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'code' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Suggested Fix
                </button>
                <button 
                  onClick={() => setActiveTab('explain')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'explain' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Analysis & Trade-offs
                </button>
             </div>

             <div className="p-4">
                {activeTab === 'code' && (
                  <div className="relative group">
                    <pre className="bg-slate-900 p-4 rounded-lg text-sm font-mono text-indigo-100 overflow-x-auto border border-slate-800 shadow-inner">
                      {result.snippet}
                    </pre>
                    <button 
                      onClick={handleCopy}
                      className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors border border-slate-700"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <div className="mt-2 text-xs text-slate-500 flex justify-between">
                      <span>Source: {result.source}</span>
                      <span className="text-indigo-400/60">Verify before deploying</span>
                    </div>
                  </div>
                )}

                {activeTab === 'explain' && (
                  <div className="space-y-4">
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                      <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-400" /> 
                        Why this works
                      </h4>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {result.explanation}
                      </p>
                    </div>

                    {result.tradeoffs.length > 0 && (
                      <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500/20">
                        <h4 className="text-sm font-bold text-orange-400 mb-2 flex items-center gap-2">
                           <AlertTriangle className="w-4 h-4" />
                           Trade-offs & Risks
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {result.tradeoffs.map((t, i) => (
                            <li key={i} className="text-sm text-orange-200/80">{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
             </div>

             <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-start gap-3">
               <ShieldAlert className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
               <p className="text-xs text-slate-500 leading-relaxed">
                 <strong>Disclaimer:</strong> This code is generated from static templates and heuristics. 
                 It may not cover all edge cases in your specific environment. 
                 Always test security changes in a staging environment first.
               </p>
             </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default RemediationGenerator;
