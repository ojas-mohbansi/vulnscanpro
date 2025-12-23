
import { db } from '../db';
import { proxyLogs } from '../db/schema';

export class ProxyService {
  /**
   * Retrieves a random proxy from the environment configuration.
   * Supports PROXY_LIST env var (comma separated).
   */
  static getRotatingProxy(): string | undefined {
    const list = process.env.PROXY_LIST;
    if (!list) return undefined;

    const proxies = list.split(',').map(p => p.trim()).filter(p => p.length > 0);
    if (proxies.length === 0) return undefined;

    // Simple random rotation
    return proxies[Math.floor(Math.random() * proxies.length)];
  }

  /**
   * Logs proxy usage to the database with credential redaction.
   */
  static async logUsage(scanId: string, proxyUrl: string, target: string) {
    let cleanProxy = proxyUrl;
    try {
      const u = new URL(proxyUrl);
      if (u.password) u.password = '***';
      if (u.username) u.username = '***';
      cleanProxy = u.toString();
    } catch (e) {
      // If not a valid URL, just store a masked version if possible or generic
      if (proxyUrl.includes('@')) {
          cleanProxy = 'REDACTED_AUTH@' + proxyUrl.split('@')[1];
      }
    }

    try {
      const id = `pl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await db.insert(proxyLogs).values({
        id,
        scanId,
        proxy: cleanProxy,
        target
      });
    } catch (e) {
      console.error('Failed to log proxy usage', e);
    }
  }
}
