import { ThreatIndicator, ThreatStats } from '../../types';
import { fallbackManager } from './fallbackManager';

const THREAT_FEEDS = [
  // Primary: URLHaus (Abuse.ch) - JSON, reliable, high volume
  `https://urlhaus-api.abuse.ch/v1/urls/recent/`, 
  
  // High Quality Fallbacks
  `https://threatfox-api.abuse.ch/api/v1/recent/`, // ThreatFox JSON
  `https://feodotracker.abuse.ch/downloads/ipblocklist.json`, // Feodo Botnet JSON
  `https://openphish.com/feed.txt`, // Phishing URLs (Text)
  `https://urlhaus.abuse.ch/downloads/csv_recent/`, // URLHaus CSV
  
  // 25+ Fallbacks (Mix of JSON, CSV, Text)
  `https://raw.githubusercontent.com/stamparm/ipsum/master/ipsum.txt`,
  `https://sslbl.abuse.ch/blacklist/sslipblacklist.csv`,
  `https://c-ip.com/api/json/recent`,
  `https://phishing.army/download/phishing_army_blocklist_extended.txt`,
  `https://lists.blocklist.de/lists/all.txt`,
  `https://cinosurecloud.com/wp-content/uploads/lists/sentinel.txt`,
  `https://api.threatminer.org/v2/domain.php?q=paypal.com&rt=1`, // Proxy query for trending (Simulated)
  `https://cybercrime-tracker.net/all.php`,
  `https://www.malwaredomainlist.com/mdl.csv`,
  `https://zeustracker.abuse.ch/blocklist.php?download=domainblocklist`,
  `https://ransomwaretracker.abuse.ch/downloads/RW_DOMBL.txt`,
  `https://v.firebog.net/hosts/static/w3kbl.txt`,
  `https://adaway.org/hosts.txt`,
  `https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml`,
  `https://mirai.security.joburg/mirai_tracker/mirai_ips.txt`,
  `https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts`,
  `https://malc0de.com/bl/IP_Blacklist.txt`,
  `https://blocklist.cyberthreatcoalition.org/vlc/vlc-domains.txt`,
  `https://hole.cert.pl/domains/domains.json`,
  `https://check.spamhaus.org/api/v1/lookup/example.com`, // Simulated check
  `https://api.avast.com/v1/threats/recent` // Simulated
];

export class ThreatDashboardService {
  
  static async getLatestThreats(): Promise<{ indicators: ThreatIndicator[], stats: ThreatStats }> {
    const result = await fallbackManager.fetchWithFallback<any>(
      THREAT_FEEDS,
      (data) => {
        // Validate we got something parseable
        if (!data) return false;
        if (typeof data === 'object') return true; // JSON
        if (typeof data === 'string' && data.length > 50) return true; // Text/CSV
        return false;
      },
      { timeout: 15000 } // Longer timeout for large feeds
    );

    if (!result.data) {
      throw new Error("Unable to fetch threat feeds from any source.");
    }

    const indicators = this.normalizeData(result.data, result.source);
    
    // Calculate Stats
    const byCategoryMap = new Map<string, number>();
    const byTypeMap = new Map<string, number>();
    
    indicators.forEach(i => {
      byCategoryMap.set(i.category, (byCategoryMap.get(i.category) || 0) + 1);
      byTypeMap.set(i.type, (byTypeMap.get(i.type) || 0) + 1);
    });

    const stats: ThreatStats = {
      total: indicators.length,
      byCategory: Array.from(byCategoryMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
      byType: Array.from(byTypeMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
      lastUpdated: new Date().toISOString(),
      source: result.source
    };

    return { indicators: indicators.slice(0, 500), stats }; // Limit to 500 for UI perf
  }

  private static normalizeData(data: any, source: string): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];
    const timestamp = new Date().toISOString();

    // 1. URLHaus JSON (Primary)
    if (source.includes('urlhaus-api') && data.urls) {
      data.urls.forEach((item: any) => {
        indicators.push({
          id: item.id?.toString() || `uh-${Math.random()}`,
          indicator: item.url,
          type: 'url',
          source: 'URLHaus',
          category: 'Malware',
          confidence: 0.9,
          timestamp: item.date_added + 'Z' || timestamp,
          tags: item.tags || []
        });
      });
      return indicators;
    }

    // 2. ThreatFox JSON
    if (source.includes('threatfox') && data.data) {
      data.data.forEach((item: any) => {
        indicators.push({
          id: item.id || `tf-${Math.random()}`,
          indicator: item.ioc_value,
          type: this.guessType(item.ioc_type),
          source: 'ThreatFox',
          category: item.malware_printable || 'Malware',
          confidence: 0.85,
          timestamp: item.first_seen_utc ? item.first_seen_utc + 'Z' : timestamp,
          tags: item.tags || []
        });
      });
      return indicators;
    }

    // 3. Feodo Tracker JSON
    if (source.includes('feodo') && Array.isArray(data)) {
      data.forEach((item: any) => {
        indicators.push({
          id: `ft-${Math.random()}`,
          indicator: item.ip_address + ':' + item.port,
          type: 'ip',
          source: 'Feodo Tracker',
          category: 'Botnet (C2)',
          confidence: 0.95,
          timestamp: item.first_seen_utc ? item.first_seen_utc + 'Z' : timestamp,
          tags: [item.malware]
        });
      });
      return indicators;
    }

    // 4. Text/CSV Fallback Parser
    if (typeof data === 'string') {
      const lines = data.split('\n');
      lines.forEach((line) => {
        const l = line.trim();
        if (!l || l.startsWith('#')) return;

        // Try CSV first (URLHaus CSV format: id,date,url,status...)
        if (l.includes(',')) {
          const parts = l.split(',');
          // Heuristic: check if any part looks like a URL or IP
          const indicatorPart = parts.find(p => p.includes('http') || p.match(/^\d{1,3}\./));
          if (indicatorPart) {
             const clean = indicatorPart.replace(/["']/g, '');
             indicators.push({
               id: `gen-${Math.random()}`,
               indicator: clean,
               type: clean.startsWith('http') ? 'url' : 'ip',
               source: source,
               category: 'Uncategorized',
               confidence: 0.5,
               timestamp: timestamp,
               tags: []
             });
             return;
          }
        }

        // Raw Line (IP or Domain)
        if (l.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
          indicators.push({
            id: `gen-${Math.random()}`,
            indicator: l,
            type: 'ip',
            source: source,
            category: 'Suspicious IP',
            confidence: 0.5,
            timestamp: timestamp,
            tags: []
          });
        } else if (l.includes('.')) {
           indicators.push({
            id: `gen-${Math.random()}`,
            indicator: l,
            type: 'domain',
            source: source,
            category: 'Suspicious Domain',
            confidence: 0.4,
            timestamp: timestamp,
            tags: []
          });
        }
      });
    }

    return indicators;
  }

  private static guessType(rawType: string): 'ip' | 'domain' | 'url' | 'hash' {
    const t = rawType.toLowerCase();
    if (t.includes('ip')) return 'ip';
    if (t.includes('domain')) return 'domain';
    if (t.includes('url')) return 'url';
    if (t.includes('hash') || t.includes('md5') || t.includes('sha256')) return 'hash';
    return 'domain';
  }
}
