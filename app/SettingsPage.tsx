
import React, { useEffect, useState } from 'react';
import { Save, RotateCcw, Download, Upload, Cloud, Loader2, Settings, GraduationCap, Globe, Bell, CheckCircle, Database, Trash2, FileJson } from 'lucide-react';
import { UserPreferences, Framework, Language } from '../types';
import { PreferencesService } from '../lib/services/preferences';
import { NotificationService } from '../lib/services/notificationService';
import { useI18n } from '../lib/hooks/useI18n';
import { clientDb } from '../lib/clientDb';

const SettingsPage: React.FC = () => {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<UserPreferences>(PreferencesService.getPreferences());
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleSave = () => {
    setSaving(true);
    PreferencesService.savePreferences(prefs);
    setTimeout(() => {
      setSaving(false);
      setMessage({ text: t('settings.saved', 'Preferences saved.'), type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    }, 500);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      const defaults = PreferencesService.resetPreferences();
      setPrefs(defaults);
      setMessage({ text: 'Preferences reset to defaults.', type: 'success' });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await PreferencesService.syncPreferences();
      setPrefs(PreferencesService.getPreferences());
      setMessage({ text: 'Synced successfully (Simulated).', type: 'success' });
    } catch (e) {
      setMessage({ text: 'Sync failed.', type: 'error' });
    } finally {
      setSyncing(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      PreferencesService.importPreferences(file)
        .then((newPrefs) => {
          setPrefs(newPrefs);
          setMessage({ text: 'Preferences imported successfully.', type: 'success' });
        })
        .catch(() => setMessage({ text: 'Failed to import file. Invalid JSON.', type: 'error' }));
    }
  };

  const requestBrowserPermission = async () => {
    const granted = await NotificationService.requestPermission();
    if (granted) {
        setPrefs(p => ({ ...p, notifications: { ...p.notifications, browserNotifications: true } }));
        setMessage({ text: 'Browser notifications enabled.', type: 'success' });
    } else {
        setMessage({ text: 'Permission denied. Check browser settings.', type: 'error' });
    }
  };

  const handleTestAlert = async () => {
    setTestingAlert(true);
    try {
      await NotificationService.sendTestAlert();
      setMessage({ text: 'Test alert sent (Browser + Webhook). Check fallback endpoints if configured.', type: 'success' });
    } catch (e) {
      setMessage({ text: 'Failed to send test alert.', type: 'error' });
    } finally {
      setTestingAlert(false);
    }
  };

  // --- Scan History Management ---
  const handleExportHistory = async () => {
      try {
          const json = await clientDb.exportDatabase();
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `vulnscan_history_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          URL.revokeObjectURL(url);
          document.body.removeChild(a);
          setMessage({ text: 'History exported successfully.', type: 'success' });
      } catch (e) {
          setMessage({ text: 'Failed to export history.', type: 'error' });
      }
  };

  const handleImportHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (ev) => {
          try {
              const count = await clientDb.importDatabase(ev.target?.result as string);
              setMessage({ text: `Imported ${count} scans successfully.`, type: 'success' });
          } catch (err) {
              setMessage({ text: 'Import failed. Invalid file format.', type: 'error' });
          }
      };
      reader.readAsText(file);
  };

  const handleClearHistory = async () => {
      if (confirm("Are you sure? This will delete ALL local scan history permanently.")) {
          await clientDb.clearDatabase();
          setMessage({ text: 'Local history cleared.', type: 'success' });
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6 text-primary" aria-hidden="true" />
              {t('nav.settings', 'Settings')}
            </h1>
            <p className="text-slate-400 mt-1">Customize scanner defaults and manage data.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary.hover text-slate-950 font-bold rounded-lg transition-all disabled:opacity-50 focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-slate-900"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('settings.save', 'Save Changes')}
            </button>
          </div>
        </div>

        {message && (
          <div role="alert" className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* General & I18n */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
             <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" aria-hidden="true" />
                General
             </h2>
             
             <div>
               <label htmlFor="language-select" className="block text-sm font-medium text-slate-300 mb-2">
                 {t('settings.language', 'Interface Language')}
               </label>
               <select
                 id="language-select"
                 value={prefs.language}
                 onChange={(e) => setPrefs({ ...prefs, language: e.target.value as Language })}
                 className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-primary"
               >
                 <option value="en">English (US)</option>
                 <option value="es">Español</option>
                 <option value="fr">Français</option>
                 <option value="hi">हिन्दी</option>
               </select>
             </div>
          </section>

          {/* Notifications */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications & Alerts
            </h2>
            
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={prefs.notifications.enabled}
                  onChange={(e) => setPrefs(p => ({ ...p, notifications: { ...p.notifications, enabled: e.target.checked } }))}
                  className="rounded border-slate-700 bg-slate-950 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium">Enable Notifications</span>
              </label>
            </div>

            {prefs.notifications.enabled && (
              <div className="space-y-4 border-l-2 border-slate-800 pl-4">
                 {/* Browser */}
                 <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300">Browser Alerts</span>
                      <button 
                        onClick={requestBrowserPermission}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        Request Permission
                      </button>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={prefs.notifications.browserNotifications}
                        onChange={(e) => setPrefs(p => ({ ...p, notifications: { ...p.notifications, browserNotifications: e.target.checked } }))}
                        className="rounded border-slate-700 bg-slate-950 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-slate-400">Scan Complete & Findings</span>
                    </label>
                 </div>

                 {/* Webhook */}
                 <div>
                    <span className="block text-sm text-slate-300 mb-2">Webhook Integration</span>
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input 
                        type="checkbox"
                        checked={prefs.notifications.webhookEnabled}
                        onChange={(e) => setPrefs(p => ({ ...p, notifications: { ...p.notifications, webhookEnabled: e.target.checked } }))}
                        className="rounded border-slate-700 bg-slate-950 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-slate-400">Send JSON Payload</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="https://webhook.site/..."
                      value={prefs.notifications.webhookUrl}
                      onChange={(e) => setPrefs(p => ({ ...p, notifications: { ...p.notifications, webhookUrl: e.target.value } }))}
                      disabled={!prefs.notifications.webhookEnabled}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white disabled:opacity-50"
                    />
                 </div>

                 <button 
                   onClick={handleTestAlert}
                   disabled={testingAlert}
                   className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 flex items-center justify-center gap-2"
                 >
                   {testingAlert ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                   Send Test Alert
                 </button>
              </div>
            )}
          </section>

          {/* Learning Mode */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <GraduationCap className="w-32 h-32 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" aria-hidden="true" />
              Learning Mode
            </h2>
            <div className="flex items-start gap-4">
               <div className="flex-1">
                 <p className="text-slate-300 text-sm mb-4">
                   Enable gamification features, interactive quizzes, and enhanced "Why this matters" context.
                 </p>
                 <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={prefs.learningMode}
                        onChange={(e) => setPrefs({ ...prefs, learningMode: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      <span className="ml-3 text-sm font-medium text-white">Enable Learning Mode</span>
                    </label>
                 </div>
               </div>
            </div>
          </section>

          {/* Scan Defaults */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Scan Defaults</h2>
            
            <div>
              <label htmlFor="default-framework" className="block text-sm font-medium text-slate-300 mb-2">Default Framework</label>
              <select
                id="default-framework"
                value={prefs.defaultFramework}
                onChange={(e) => setPrefs({ ...prefs, defaultFramework: e.target.value as Framework })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-primary"
              >
                <option value="auto">Auto Detect</option>
                <option value="react">React / Next.js</option>
                <option value="flask">Flask</option>
                <option value="django">Django</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="default-depth" className="block text-sm font-medium text-slate-300 mb-2">Default Depth</label>
                <input
                  id="default-depth"
                  type="number"
                  min="1"
                  max="5"
                  value={prefs.defaultScanOptions.depth}
                  onChange={(e) => setPrefs({ ...prefs, defaultScanOptions: { ...prefs.defaultScanOptions, depth: parseInt(e.target.value) } })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="default-rps" className="block text-sm font-medium text-slate-300 mb-2">Default RPS</label>
                <input
                  id="default-rps"
                  type="number"
                  min="1"
                  max="20"
                  value={prefs.defaultScanOptions.rateLimitRps}
                  onChange={(e) => setPrefs({ ...prefs, defaultScanOptions: { ...prefs.defaultScanOptions, rateLimitRps: parseInt(e.target.value) } })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </section>

          {/* UI & Reports */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Interface & Reports</h2>
            
            <div>
              <label htmlFor="default-format" className="block text-sm font-medium text-slate-300 mb-2">Default Report Format</label>
              <select
                id="default-format"
                value={prefs.defaultReportFormat}
                onChange={(e) => setPrefs({ ...prefs, defaultReportFormat: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-primary"
              >
                <option value="json">JSON</option>
                <option value="html">HTML</option>
                <option value="md">Markdown</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoscroll"
                checked={prefs.autoScrollLog}
                onChange={(e) => setPrefs({ ...prefs, autoScrollLog: e.target.checked })}
                className="rounded border-slate-700 bg-slate-950 text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="autoscroll" className="text-sm text-slate-300">Auto-scroll logs during scan</label>
            </div>
          </section>

          {/* Data Management (Prefs) */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2">Preferences Backup</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={PreferencesService.exportPreferences.bind(PreferencesService)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Export Settings
              </button>
              
              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-sm cursor-pointer">
                <Upload className="w-4 h-4" />
                Import Settings
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              </label>

              <button 
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-900/20 hover:bg-blue-900/30 text-blue-400 border border-blue-900/40 rounded-lg transition-colors text-sm"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                Sync Preferences
              </button>
            </div>
            
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <div className="flex items-center gap-2">
                 Last Sync: {prefs.lastSync ? new Date(prefs.lastSync).toLocaleString() : 'Never'}
              </div>
              <button onClick={handleReset} className="flex items-center gap-1 text-red-500 hover:text-red-400 hover:underline">
                <RotateCcw className="w-3 h-3" /> Reset to Defaults
              </button>
            </div>
          </section>

          {/* NEW: Scan History Management */}
          <section className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
             <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
               <Database className="w-5 h-5 text-primary" />
               Scan History Data
             </h2>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <button 
                 onClick={handleExportHistory}
                 className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-sm font-medium"
               >
                 <FileJson className="w-4 h-4 text-yellow-500" /> Export JSON History
               </button>

               <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-sm font-medium cursor-pointer">
                 <Upload className="w-4 h-4 text-blue-500" />
                 Import JSON History
                 <input type="file" accept=".json" className="hidden" onChange={handleImportHistory} />
               </label>

               <button 
                 onClick={handleClearHistory}
                 className="flex items-center justify-center gap-2 px-4 py-3 bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/40 rounded-lg transition-colors text-sm font-medium"
               >
                 <Trash2 className="w-4 h-4" /> Clear All History
               </button>
             </div>
             
             <p className="text-xs text-slate-500 text-center">
               Backing up your scan history ensures you don't lose past reports when clearing browser data or using ephemeral environments.
             </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
