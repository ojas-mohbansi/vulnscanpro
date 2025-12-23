import { RulePack, Rule, MarketplaceEntry } from '../../types';
import { PreferencesService } from './preferences';
import { fallbackManager } from './fallbackManager';

// Static Embedded Registry (The "Offline Mode" Core)
const EMBEDDED_REGISTRY: RulePack[] = [
  {
    id: 'core-secrets',
    name: 'Secrets & Keys',
    description: 'Detects exposed API keys, private keys, and tokens in HTML comments or scripts.',
    author: 'VulnScan Team',
    version: '1.0.0',
    tags: ['secrets', 'security'],
    rules: [
      {
        id: 'aws-key',
        title: 'Exposed AWS Access Key',
        severity: 'critical',
        pattern: 'AKIA[0-9A-Z]{16}',
        description: 'Found a pattern resembling an AWS Access Key ID.',
        remediation: 'Revoke the key immediately and remove it from the source code. Use environment variables.',
        refs: ['https://docs.aws.amazon.com/general/latest/gr/aws-access-keys-best-practices.html']
      },
      {
        id: 'generic-api-key',
        title: 'Potential API Key Exposure',
        severity: 'high',
        pattern: 'api_key\\s*[:=]\\s*[\"\'][a-zA-Z0-9]{20,}[\"\']',
        description: 'Found a string assignment that looks like a hardcoded API key.',
        remediation: 'Move API keys to backend environment variables. Do not expose them in client-side code.',
      }
    ]
  },
  {
    id: 'wordpress-check',
    name: 'WordPress Hardening',
    description: 'Checks for common WordPress enumeration vectors and version exposure.',
    author: 'Community',
    version: '0.9.0',
    tags: ['cms', 'wordpress'],
    rules: [
      {
        id: 'wp-version',
        title: 'WordPress Version Exposed',
        severity: 'low',
        pattern: 'content="WordPress [0-9.]+"',
        description: 'WordPress version meta tag found.',
        remediation: 'Remove the generator meta tag to reduce information leakage.',
      },
      {
        id: 'wp-debug',
        title: 'WP_DEBUG Enabled',
        severity: 'high',
        pattern: '<b>Warning</b>:.*wp-content',
        description: 'PHP warnings from wp-content directory exposed, indicating debug mode.',
        remediation: 'Set WP_DEBUG to false in wp-config.php.',
      }
    ]
  },
  {
      id: 'debug-artifacts',
      name: 'Leftover Debug Artifacts',
      description: 'Finds console logs and TODO comments that might leak logic.',
      author: 'VulnScan Team',
      version: '1.1.0',
      tags: ['code-quality'],
      rules: [
          {
              id: 'console-log',
              title: 'Console Log Leftover',
              severity: 'low',
              pattern: 'console\\.log\\(',
              description: 'Usage of console.log detected in production bundle.',
              remediation: 'Remove console logs or use a build tool to strip them in production.',
          },
          {
              id: 'todo-comment',
              title: 'TODO Comment',
              severity: 'low',
              pattern: '//\\s*TODO:',
              description: 'TODO comments may reveal future features or known bugs.',
              remediation: 'Review and remove comments before deployment.',
          }
      ]
  }
];

// 25 Fallback Sources for "Community Rules Registry"
const REGISTRY_SOURCES = [
  'https://raw.githubusercontent.com/VulnScanPro/rules/main/registry.json', // Primary
  'https://gitlab.com/vulnscan/rules/-/raw/main/registry.json',
  'https://bitbucket.org/vulnscan/rules/raw/main/registry.json',
  'https://codeberg.org/vulnscan/rules/raw/branch/main/registry.json',
  'https://cdn.jsdelivr.net/gh/VulnScanPro/rules@main/registry.json',
  'https://unpkg.com/@vulnscan/rules/registry.json',
  'https://vulnscan-rules.netlify.app/registry.json',
  'https://vulnscan-rules.vercel.app/registry.json',
  'https://vulnscan-rules.surge.sh/registry.json',
  'https://vulnscan-rules.onrender.com/registry.json',
  'https://vulnscan-rules.up.railway.app/registry.json',
  'https://vulnscan-rules.fly.dev/registry.json',
  'https://vulnscan-rules.glitch.me/registry.json',
  'https://vulnscan-rules.herokuapp.com/registry.json',
  'https://vulnscan-demo.web.app/registry.json',
  'https://vulnscan-demo.supabase.co/storage/v1/object/public/rules/registry.json',
  'https://run.mocky.io/v3/registry-placeholder',
  'https://vulnscan.beeceptor.com/registry',
  'https://httpbin.org/anything/registry.json',
  'https://jsonplaceholder.typicode.com/posts/registry',
  'https://reqres.in/api/registry',
  'https://ipfs.io/ipfs/QmHashRegistry',
  'https://worker.cloudflare.com/registry',
  'https://pastebin.com/raw/registry',
  'https://gist.githubusercontent.com/vulnscan/raw/registry.json',
  'https://docs.google.com/spreadsheets/d/e/rules/pub?output=json'
];

export class PluginService {
  // In-memory cache for the session (Isomorphic: works on client and server memory)
  private static registryCache: RulePack[] = [...EMBEDDED_REGISTRY];
  private static loadedSource = 'Embedded Default';

  /**
   * Fetches the Marketplace Registry from 25+ distributed sources.
   * Merges result with embedded core packs.
   */
  static async fetchRegistry(): Promise<string> {
    try {
      const result = await fallbackManager.fetchWithFallback<RulePack[]>(
        REGISTRY_SOURCES,
        (data) => Array.isArray(data) && data.length > 0 && !!data[0].id,
        { timeout: 4000 }
      );

      if (result.data) {
        // Merge strategy: External packs overwrite embedded ones with same ID
        const merged = new Map<string, RulePack>();
        EMBEDDED_REGISTRY.forEach(p => merged.set(p.id, p));
        result.data.forEach(p => merged.set(p.id, p));
        
        this.registryCache = Array.from(merged.values());
        this.loadedSource = result.source;
        return result.source;
      }
    } catch (e) {
      console.warn('Failed to fetch external registry, using embedded.', e);
    }
    return 'Embedded (Offline Mode)';
  }

  /**
   * Returns the full list of available rule packs (Marketplace View).
   */
  static async getMarketplace(): Promise<{ entries: MarketplaceEntry[], source: string }> {
    // Ensure we attempt to load external registry at least once if only default
    if (this.loadedSource.includes('Embedded')) {
        await this.fetchRegistry();
    }

    // Get installed state (Client-side mainly, gracefully handles SSR)
    let installedIds = new Set<string>();
    try {
        const prefs = PreferencesService.getPreferences();
        installedIds = new Set(prefs.installedPacks || []);
    } catch (e) { /* ignore on server/ssr */ }

    // If local storage is empty/default, ensure core-secrets is installed
    if (installedIds.size === 0) installedIds.add('core-secrets');

    const entries = this.registryCache.map(pack => ({
      pack,
      installed: installedIds.has(pack.id),
      isOfficial: pack.author === 'VulnScan Team'
    }));

    return { entries, source: this.loadedSource };
  }

  /**
   * Client-Side Helper: Toggles installation state in Preferences.
   */
  static installPack(packId: string) {
    const prefs = PreferencesService.getPreferences();
    const current = new Set(prefs.installedPacks || []);
    current.add(packId);
    prefs.installedPacks = Array.from(current);
    PreferencesService.savePreferences(prefs);
  }

  static uninstallPack(packId: string) {
    const prefs = PreferencesService.getPreferences();
    const current = new Set(prefs.installedPacks || []);
    current.delete(packId);
    prefs.installedPacks = Array.from(current);
    PreferencesService.savePreferences(prefs);
  }

  /**
   * Server-Side / Scanner Rule Resolver
   * Resolves a list of Pack IDs into a flat list of executable Rules.
   * Ensures hot-reloading by using the latest registryCache.
   */
  static getRulesByIds(packIds: string[]): Rule[] {
    const activePacks = this.registryCache.filter(p => packIds.includes(p.id));
    return activePacks.flatMap(p => p.rules);
  }

  /**
   * Legacy Helper for Client-Side usage if needed
   */
  static getActiveRulesFromPrefs(): Rule[] {
    try {
        const prefs = PreferencesService.getPreferences();
        return this.getRulesByIds(prefs.installedPacks || []);
    } catch (e) {
        return this.getRulesByIds(['core-secrets']);
    }
  }
}
