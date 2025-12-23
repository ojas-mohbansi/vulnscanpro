
import React, { useEffect, useState, useMemo } from 'react';
import { Finding, EducationResource } from '../types';
import { PreferencesService } from '../lib/services/preferences';
import { X, Copy, ExternalLink, ShieldCheck, Activity, Lightbulb, GraduationCap, BookOpen, AlertTriangle, ChevronDown, ChevronUp, Check, Code2, Terminal } from 'lucide-react';
import RemediationGenerator from './RemediationGenerator';
import { EducationService } from '../lib/services/educationService';
import { ExplanationService, Explanation } from '../lib/services/explanationService';
import { Link } from 'react-router-dom';

interface FindingDetailProps {
  finding: Finding;
  onClose: () => void;
}

const FindingDetail: React.FC<FindingDetailProps> = ({ finding, onClose }) => {
  const [learningMode, setLearningMode] = useState(false);
  const [relatedResources, setRelatedResources] = useState<EducationResource[]>([]);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [isEvidenceExpanded, setIsEvidenceExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [apiTab, setApiTab] = useState<'fetch' | 'axios'>('fetch');

  useEffect(() => {
    const prefs = PreferencesService.getPreferences();
    setLearningMode(prefs.learningMode);
    
    // Load educational resources
    const resources = EducationService.getRelatedResources(finding);
    setRelatedResources(resources);

    // Load detailed explanation
    ExplanationService.generate(finding).then(setExplanation);
  }, [finding]);

  const getSeverityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  const handleCopyRemediation = () => {
    navigator.clipboard.writeText(finding.remediation);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Enhanced Evidence Processing
  const evidenceContent = useMemo(() => {
    if (!finding.evidence) return '';
    
    // If evidence contains a specific code snippet or raw content, prefer that over JSON dump
    if (typeof finding.evidence.snippet === 'string') {
        return finding.evidence.snippet;
    }
    if (typeof finding.evidence.match === 'string') {
        return finding.evidence.match;
    }
    
    // Default to formatted JSON
    return JSON.stringify(finding.evidence, null, 2);
  }, [finding.evidence]);

  const needsExpansion = evidenceContent.split('\n').length > 12 || evidenceContent.length > 600;

  const fetchSnippet = `// Native Fetch API Example
const secureFetch = async () => {
  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'X-CSRF-Token': csrfToken // Ensure CSRF protection
      },
      body: JSON.stringify({ data: 'safe_value' })
    });

    if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
    return await response.json();
  } catch (err) {
    console.error('Secure fetch failed:', err);
  }
};`;

  const axiosSnippet = `// Axios Example (with Security Config)
import axios from 'axios';

// Create instance with security defaults
const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    // 'X-CSRF-Token': csrfToken
  },
  xsrfCookieName: 'csrftoken', // Matches Django/Flask defaults
  xsrfHeaderName: 'X-CSRFToken',
});

const secureRequest = async () => {
  try {
    const res = await api.post('/endpoint', { data: 'safe_value' });
    return res.data;
  } catch (err) {
    console.error('API Error:', err.message);
  }
};`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <div className="bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden focus:outline-none">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-start shrink-0 bg-slate-950/50">
          <div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border mb-3 ${getSeverityColor(finding.severity)}`}>
              {finding.severity}
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{finding.title}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Activity className="w-4 h-4 text-slate-500" /> Conf: {(finding.confidence * 100).toFixed(0)}%
              </span>
              <span className="flex items-center gap-1">
                <Terminal className="w-4 h-4 text-slate-500" /> {finding.module}
              </span>
              <span className="text-slate-600">#{finding.id}</span>
            </div>
          </div>
          <button 
             onClick={onClose} 
             className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
             aria-label="Close details"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Col: Context & Evidence */}
            <div className="space-y-6">
               <section>
                <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                <p className="text-slate-300 leading-relaxed text-sm">{finding.description}</p>
              </section>

              {/* Dynamic Explanation Section */}
              <section className={`rounded-xl p-5 border transition-all ${
                  learningMode 
                    ? 'bg-indigo-950/30 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                    : 'bg-slate-800/30 border-slate-700'
                }`}>
                  <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${learningMode ? 'text-indigo-400' : 'text-blue-400'}`}>
                    {learningMode ? <GraduationCap className="w-4 h-4" /> : <Lightbulb className="w-4 h-4" />}
                    Why this matters
                  </h3>
                  
                  {explanation ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-200 text-sm font-medium mb-1">{explanation.title}</p>
                        <p className="text-slate-400 text-sm leading-relaxed">{explanation.summary}</p>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                         <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">
                           <AlertTriangle className="w-3 h-3" /> Potential Impact
                         </div>
                         <p className="text-slate-400 text-xs">{explanation.impact}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-300 text-sm leading-relaxed">{finding.whyMatters || "Analyzing context..."}</p>
                  )}
              </section>

              {finding.reproSteps && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Reproduction Steps</h3>
                  <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 border border-slate-800 overflow-x-auto shadow-inner">
                    {finding.reproSteps}
                  </div>
                </section>
              )}

              {/* Evidence Panel */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Evidence / Payload</h3>
                  {needsExpansion && (
                    <button 
                      onClick={() => setIsEvidenceExpanded(!isEvidenceExpanded)}
                      className="text-xs text-primary hover:text-primary.hover flex items-center gap-1 transition-colors"
                    >
                      {isEvidenceExpanded ? (
                        <>Collapse <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>Expand <ChevronDown className="w-3 h-3" /></>
                      )}
                    </button>
                  )}
                </div>
                <div className={`bg-slate-950 border border-slate-800 rounded-lg relative group ${isEvidenceExpanded ? '' : 'max-h-48 overflow-hidden'}`}>
                  <div className="p-4">
                    <pre className="text-xs font-mono text-emerald-400/90 whitespace-pre-wrap break-all overflow-x-auto leading-relaxed">
                      {evidenceContent}
                    </pre>
                  </div>
                  {!isEvidenceExpanded && needsExpansion && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent cursor-pointer flex items-end justify-center pb-3"
                      onClick={() => setIsEvidenceExpanded(true)}
                    >
                      <span className="text-[10px] text-slate-300 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 shadow-lg hover:bg-slate-700 transition-colors font-medium">
                        Show Full Evidence
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* AI Generator Integration */}
              <section className="pt-2">
                 <RemediationGenerator finding={finding} />
              </section>
            </div>

            {/* Right Col: Remediation & Docs */}
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Standard Remediation
                </h3>
                
                <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-4 bg-slate-950/50">
                    <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap font-medium overflow-x-auto">{finding.remediation}</pre>
                  </div>
                  
                  {/* Action Bar */}
                  <div className="bg-slate-900 border-t border-slate-800 p-2 flex items-center justify-between gap-3">
                    <button 
                      onClick={handleCopyRemediation}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-md transition-colors border border-slate-700 shadow-sm focus:outline-none active:scale-95"
                      aria-label="Copy remediation code"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-green-500" />
                          <span className="text-green-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Snippet
                        </>
                      )}
                    </button>

                    {finding.refs.length > 0 && (
                      <a 
                        href={finding.refs[0]} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-white transition-colors ml-auto"
                        title={finding.refs[0]}
                      >
                        Docs <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </section>

              {/* API Implementation Snippets */}
              <section>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Code2 className="w-4 h-4" />
                  Secure API Implementation
                </h3>
                <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
                  <div className="flex border-b border-slate-800">
                    <button 
                      onClick={() => setApiTab('fetch')}
                      className={`flex-1 py-2 text-xs font-bold transition-colors ${
                        apiTab === 'fetch' ? 'bg-slate-800 text-white border-b-2 border-primary' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Fetch API
                    </button>
                    <button 
                      onClick={() => setApiTab('axios')}
                      className={`flex-1 py-2 text-xs font-bold transition-colors ${
                        apiTab === 'axios' ? 'bg-slate-800 text-white border-b-2 border-primary' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Axios
                    </button>
                  </div>
                  <div className="p-4 bg-slate-950/50">
                    <pre className="font-mono text-xs text-blue-200/80 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                      {apiTab === 'fetch' ? fetchSnippet : axiosSnippet}
                    </pre>
                  </div>
                </div>
              </section>

              {/* Education / Learn More */}
              <section className="border-t border-slate-800 pt-6">
                 <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                   <BookOpen className="w-5 h-5 text-indigo-400" />
                   Learning Resources
                 </h3>
                 
                 <div className="space-y-3">
                   {relatedResources.map((res) => (
                     <a 
                        key={res.id}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:border-slate-600 transition-all group"
                     >
                       <div className="flex items-center justify-between mb-1">
                         <span className="text-sm font-medium text-slate-200 group-hover:text-white flex items-center gap-2">
                           {res.title}
                           <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-primary transition-colors" />
                         </span>
                         <span className="text-[10px] bg-slate-950 text-slate-500 px-2 py-0.5 rounded border border-slate-800 uppercase tracking-wider">{res.source}</span>
                       </div>
                       <p className="text-xs text-slate-500 group-hover:text-slate-400 line-clamp-1">{res.description}</p>
                     </a>
                   ))}
                 </div>
                 
                 <div className="mt-4 text-center">
                   <Link to="/education" className="text-sm text-primary hover:text-primary.hover hover:underline">
                     Visit Full Education Hub &rarr;
                   </Link>
                 </div>
              </section>
            </div>
          </div>

          {/* References */}
          {finding.refs.length > 0 && (
            <section className="border-t border-slate-800 pt-6">
              <h3 className="text-lg font-semibold text-white mb-2">Technical References</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {finding.refs.map((ref, idx) => (
                  <li key={idx}>
                    <a href={ref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors text-sm truncate p-2 hover:bg-slate-900 rounded">
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{ref}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          
          <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-[10px] text-slate-600 font-mono uppercase tracking-wider">
            <div>Detector: {finding.source.api}</div>
            {finding.source.fallbackUsed && <div>Fallback: {finding.source.fallbackUsed}</div>}
            <div>Latency: {finding.source.latencyMs}ms</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindingDetail;
