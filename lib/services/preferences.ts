import { UserPreferences, ScanOptions, Framework } from '../../types';

const PREFS_KEY = 'vulnscan_prefs_v1';

const DEFAULT_OPTIONS: ScanOptions = {
  depth: 2,
  maxPages: 50,
  rateLimitRps: 5,
  subdomains: false,
};

const DEFAULT_PREFS: UserPreferences = {
  defaultFramework: 'auto',
  defaultScanOptions: DEFAULT_OPTIONS,
  defaultReportFormat: 'json',
  chartLibrary: 'recharts',
  autoScrollLog: true,
  theme: 'dark',
  learningMode: true, 
  xp: 0,
  unlockedBadges: [],
  installedPacks: ['core-secrets'],
  language: 'en',
  notifications: {
    enabled: true,
    browserNotifications: true,
    webhookEnabled: false,
    webhookUrl: '',
    notifyOnFinish: true,
    notifyOnFinding: true
  }
};

export class PreferencesService {
  static getPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) {
        // Merge with defaults to handle new fields in existing localStorage
        return { 
          ...DEFAULT_PREFS, 
          ...JSON.parse(stored),
          notifications: {
            ...DEFAULT_PREFS.notifications,
            ...(JSON.parse(stored).notifications || {})
          }
        };
      }
    } catch (e) {
      console.warn('Failed to load preferences', e);
    }
    return DEFAULT_PREFS;
  }

  static savePreferences(prefs: UserPreferences): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      window.dispatchEvent(new Event('prefs-updated'));
    } catch (e) {
      console.error('Failed to save preferences', e);
    }
  }

  static resetPreferences(): UserPreferences {
    this.savePreferences(DEFAULT_PREFS);
    return DEFAULT_PREFS;
  }

  static exportPreferences(): void {
    const prefs = this.getPreferences();
    const blob = new Blob([JSON.stringify(prefs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vulnscan_prefs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  static async importPreferences(file: File): Promise<UserPreferences> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const newPrefs = { ...DEFAULT_PREFS, ...json };
          this.savePreferences(newPrefs);
          resolve(newPrefs);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  static async syncPreferences(): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 800)); 
    const prefs = this.getPreferences();
    prefs.lastSync = new Date().toISOString();
    this.savePreferences(prefs);
    return true;
  }
}
