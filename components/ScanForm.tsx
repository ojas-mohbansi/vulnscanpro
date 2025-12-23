
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader2, AlertCircle, Globe, Terminal, Shield, Layers, Settings2 } from 'lucide-react';
import { api } from '../utils/apiClients';
import { Framework, ScanOptions } from '../types';
import { PreferencesService } from '../lib/services/preferences';
import { useI18n } from '../lib/hooks/useI18n';

const ScanForm: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  
  // Initialize with defaults from service
  const prefs = PreferencesService.getPreferences();
  
  const [framework, setFramework] = useState<Framework>(prefs.defaultFramework);
  const [options, setOptions] = useState<ScanOptions>(prefs.defaultScanOptions);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Re-fetch prefs on mount in case they changed in another tab/page
  useEffect(() => {
    const currentPrefs = PreferencesService.getPreferences();
    setFramework(currentPrefs.defaultFramework);
    setOptions(currentPrefs.defaultScanOptions);
  }, []);

  const validateUrl = (str: string) => {
    try {
      const u = new URL(str);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url) {
      setError('Target URL is required');
      return;
    }
    if (!validateUrl(url)) {
      setError('Please enter a valid URL including http:// or https://');
      return;
    }

    setLoading(true);
    try {
      // Fetch latest active packs to ensure hot-reload of rules configuration
      const latestPrefs = PreferencesService.getPreferences();
      const activeRulePackIds = latestPrefs.installedPacks || ['core-secrets'];

      const { scanId } = await api.startScan({ 
          url, 
          framework, 
          options,
          activeRulePackIds // Pass rules to server
      });
      navigate(`/results/${scanId}`);
    } catch (err) {
      setError('Failed to start scan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-6 md:p-8 border-b border-slate-800 bg-slate-950/50">
        <h2 className="text-xl md:text-2xl font-semibold text-white flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
             <Play className="w-6 h-6 text-primary" aria-hidden="true" />
          </div>
          {t('scan.title', 'Configure Scan')}
        </h2>
        <p className="text-slate-400 text-sm md:text-base mt-2 ml-11 max-w-2xl">
          {t('scan.subtitle', 'Non-destructive heuristic scan. Safe for production environments. Target a specific URL to begin analysis.')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
        
        {/* Fieldset: Target Definition */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
             <Globe className="w-4 h-4" /> Target Scope
          </legend>
          <div className="relative group">
            <input
              id="target-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              aria-invalid={!!error}
              aria-describedby={error ? "url-error" : undefined}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 text-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono shadow-inner transition-all"
            />
            <div className="absolute right-4 top-4 text-slate-600 pointer-events-none group-focus-within:text-primary transition-colors">
               Target URL
            </div>
          </div>
          {error && (
            <div id="url-error" role="alert" className="flex items-center gap-2 mt-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              {error}
            </div>
          )}
        </fieldset>

        {/* Fieldset: Configuration */}
        <fieldset className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
          <legend className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2 px-2">
             <Settings2 className="w-4 h-4" /> Scan Parameters
          </legend>
          
          {/* Framework */}
          <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
            <label htmlFor="framework-select" className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              {t('scan.framework', 'Framework')}
            </label>
            <div className="relative">
              <select
                id="framework-select"
                value={framework}
                onChange={(e) => setFramework(e.target.value as Framework)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
              >
                <option value="auto">Auto Detect</option>
                <option value="react">React / Next.js</option>
                <option value="flask">Flask</option>
                <option value="django">Django</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-tight">Optimizes heuristics for specific stacks.</p>
          </div>

          {/* Rate Limit */}
          <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
            <label htmlFor="rps-input" className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              {t('scan.ratelimit', 'Rate Limit (RPS)')}
            </label>
            <input
              id="rps-input"
              type="number"
              min="1"
              max="20"
              value={options.rateLimitRps}
              onChange={(e) => setOptions({ ...options, rateLimitRps: parseInt(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-slate-500 leading-tight">Max requests per second to avoid WAF blocks.</p>
          </div>

          {/* Max Depth */}
          <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
            <label htmlFor="depth-input" className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-400" />
              Crawl Depth
            </label>
            <input
              id="depth-input"
              type="number"
              min="1"
              max="5"
              value={options.depth}
              onChange={(e) => setOptions({ ...options, depth: parseInt(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-slate-500 leading-tight">Link recursion depth (1-5).</p>
          </div>
        </fieldset>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto bg-primary hover:bg-primary.hover text-slate-950 font-bold py-4 px-10 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-primary/20 focus:outline-none transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                {t('scan.initializing', 'Initializing Scanner...')}
              </>
            ) : (
              <>
                <Play className="w-5 h-5" fill="currentColor" />
                {t('scan.start', 'Start Security Scan')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScanForm;
