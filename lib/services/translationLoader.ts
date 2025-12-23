import { fallbackManager } from './fallbackManager';

// We support en, es, fr, hi
export type SupportedLanguage = 'en' | 'es' | 'fr' | 'hi';

export class TranslationLoader {
  
  static async load(lang: SupportedLanguage): Promise<Record<string, string> | null> {
    if (lang === 'en') return null; // English is bundled statically

    // 25 Fallback Sources for "Free Translation Packs"
    // These patterns simulate fetching JSON bundles from various public code hosts and CDNs.
    const patterns = [
        `https://raw.githubusercontent.com/VulnScanPro/i18n/main/${lang}.json`, // Primary
        `https://gitlab.com/vulnscan/i18n/-/raw/main/${lang}.json`,
        `https://bitbucket.org/vulnscan/i18n/raw/main/${lang}.json`,
        `https://codeberg.org/vulnscan/i18n/raw/branch/main/${lang}.json`,
        `https://cdn.jsdelivr.net/gh/VulnScanPro/i18n@main/${lang}.json`,
        `https://unpkg.com/@vulnscan/i18n/${lang}.json`,
        `https://vulnscan-i18n.netlify.app/${lang}.json`,
        `https://vulnscan-i18n.vercel.app/${lang}.json`,
        `https://vulnscan-i18n.surge.sh/${lang}.json`,
        `https://vulnscan-i18n.onrender.com/${lang}.json`,
        `https://vulnscan-i18n.up.railway.app/${lang}.json`,
        `https://vulnscan-i18n.fly.dev/${lang}.json`,
        `https://vulnscan-i18n.glitch.me/${lang}.json`,
        `https://vulnscan-i18n.herokuapp.com/${lang}.json`,
        `https://vulnscan-demo.web.app/${lang}.json`, // Firebase
        `https://vulnscan-demo.supabase.co/storage/v1/object/public/i18n/${lang}.json`,
        `https://run.mocky.io/v3/translation-${lang}`,
        `https://vulnscan.beeceptor.com/${lang}.json`,
        `https://httpbin.org/anything/${lang}.json`, // Mock reflection
        `https://jsonplaceholder.typicode.com/posts/${lang}`, // Mock
        `https://reqres.in/api/${lang}`,
        `https://ipfs.io/ipfs/QmHash${lang}`,
        `https://worker.cloudflare.com/i18n/${lang}`,
        `https://docs.google.com/spreadsheets/d/e/2PACX-${lang}/pub?output=csv`,
        `https://public-i18n-bucket.s3.amazonaws.com/${lang}.json`
    ];

    try {
      const result = await fallbackManager.fetchWithFallback<Record<string, string>>(
        patterns,
        (data) => {
            // Validate it's a translation map
            return data && typeof data === 'object' && (data['scan.title'] || data['report.exec_summary']);
        },
        { timeout: 3000 } // Fast timeout to fallback quickly
      );

      if (result.data) {
          console.log(`Loaded ${lang} translations from ${result.source}`);
          return result.data;
      }
    } catch (e) {
      console.warn(`Failed to load external translations for ${lang}`, e);
    }
    
    return null;
  }
}
