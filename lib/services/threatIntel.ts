import { fallbackManager } from './fallbackManager';

export interface ThreatMatch {
  indicator: string;
  listType: string;
}

export interface ThreatResult {
  matches: ThreatMatch[];
  source: string;
}

export const checkThreats = async (target: string): Promise<ThreatResult> => {
  // Normalize target to host
  let host = target;
  try {
    host = new URL(target).hostname;
  } catch (e) { /* keep as is */ }

  // Primary + 25 Fallbacks (Mix of API JSON and Text Lists)
  const endpoints = [
    `https://urlhaus-api.abuse.ch/v1/payloads/recent/`, // Primary (JSON)
    `https://openphish.com/feed.txt`, // Text
    `https://feodotracker.abuse.ch/downloads/ipblocklist.csv`,
    `https://sslbl.abuse.ch/blacklist/sslipblacklist.csv`,
    `https://api.threatminer.org/v2/domain.php?q=${host}`,
    `https://www.virustotal.com/ui/domains/${host}`, // HTML/JSON API
    `https://check.spamhaus.org/api/v1/lookup/${host}`,
    `https://otx.alienvault.com/api/v1/indicators/domain/${host}/general`,
    `https://raw.githubusercontent.com/stamparm/ipsum/master/ipsum.txt`,
    `https://cinosurecloud.com/wp-content/uploads/lists/sentinel.txt`,
    `https://lists.blocklist.de/lists/all.txt`,
    `https://c-ip.com/api/json/${host}`,
    `https://db.aa419.org/fakebankslist.php?x=1`,
    `https://api.phish.net/v3/search?q=${host}`,
    `https://hole.cert.pl/domains/domains.json`,
    `https://phishing.army/download/phishing_army_blocklist_extended.txt`,
    `https://blocklist.cyberthreatcoalition.org/vlc/vlc-domains.txt`,
    `https://urlhaus.abuse.ch/downloads/csv_online/`,
    `https://malc0de.com/bl/IP_Blacklist.txt`,
    `https://mirai.security.joburg/mirai_tracker/mirai_ips.txt`,
    `https://ransomwaretracker.abuse.ch/downloads/RW_DOMBL.txt`,
    `https://zeustracker.abuse.ch/blocklist.php?download=domainblocklist`,
    `https://v.firebog.net/hosts/static/w3kbl.txt`,
    `https://adaway.org/hosts.txt`,
    `https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml`,
    `https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts`
  ];

  const result = await fallbackManager.fetchWithFallback<any>(
    endpoints,
    (data) => {
       // Valid if non-empty
       if (!data) return false;
       if (Array.isArray(data)) return true; // JSON list
       if (typeof data === 'object') return true; // JSON object
       if (typeof data === 'string' && data.length > 20) return true; // Text list
       return false;
    }
  );

  const normalized: ThreatResult = {
    matches: [],
    source: result.source
  };

  if (!result.data) return normalized;

  // Normalization
  const d = result.data;
  
  if (result.source.includes('urlhaus') && Array.isArray(d)) {
     // Check if host is in payload list
     // Note: URLHaus returns distinct payloads, we check strict match or loose match
     const match = d.find((entry: any) => entry.url?.includes(host));
     if (match) {
       normalized.matches.push({ indicator: host, listType: 'Malware/URLHaus' });
     }
  } else if (typeof d === 'string') {
     // Text/CSV List processing
     if (d.includes(host)) {
       normalized.matches.push({ indicator: host, listType: `Blocklist Match (${result.source})` });
     }
  } else if (result.source.includes('alienvault')) {
     if (d.pulse_info?.count > 0) {
        normalized.matches.push({ indicator: host, listType: 'AlienVault OTX' });
     }
  }

  return normalized;
};
