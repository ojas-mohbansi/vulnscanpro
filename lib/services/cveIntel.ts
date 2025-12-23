import { fallbackManager } from './fallbackManager';

export interface CveEntry {
  id: string;
  summary: string;
  cvss?: number;
  refs: string[];
}

export interface CveResult {
  cves: CveEntry[];
  source: string;
}

export const checkCve = async (query: string): Promise<CveResult> => {
  const q = encodeURIComponent(query);
  
  // Primary + 25 Fallbacks
  const endpoints = [
    `https://cve.circl.lu/api/search/${q}`, // Primary (JSON)
    `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${q}`,
    `https://api.osv.dev/v1/query?package=${q}`, // Requires POST strictly, so this GET might fail, handled by fallback logic
    `https://security-tracker.debian.org/tracker/data/json`, // Big JSON, might need filtering
    `https://ubuntu.com/security/cves.json?q=${q}`,
    `https://access.redhat.com/labs/securitydataapi/cve.json?package=${q}`,
    `https://api.vulncheck.com/v3/index?q=${q}`,
    `https://vulners.com/api/v3/search/lucene/?query=${q}`,
    `https://www.cvedetails.com/json-feed.php?product=${q}`,
    `https://api.github.com/search/code?q=${q}+filename:cve`, // GitHub code search as proxy
    `https://raw.githubusercontent.com/CVEProject/cvelist/master/${q}`, // Direct raw access attempt
    `https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword=${q}`, // HTML
    `https://www.opencve.io/api/cve?search=${q}`,
    `https://feeds.canonical.com/ubuntu-security-notices/rss`,
    `https://support.apple.com/en-us/HT201222`, // Static parser fallback
    `https://chromereleases.googleblog.com/search?q=${q}`,
    `https://nvd.nist.gov/vuln/search/results?query=${q}`,
    `https://packetstormsecurity.com/search/?q=${q}`,
    `https://www.exploit-db.com/search?cve=${q}`,
    `https://cxsecurity.com/search/wlb/desc/${q}`,
    `https://www.securityfocus.com/bid/${q}`,
    `https://exchange.xforce.ibmcloud.com/search/${q}`,
    `https://tools.cisco.com/security/center/search.x?q=${q}`,
    `https://www.fortiguard.com/search?q=${q}`,
    `https://threatpost.com/?s=${q}`,
    `https://thehackernews.com/search?q=${q}`
  ];

  const result = await fallbackManager.fetchWithFallback<any>(
    endpoints,
    (data) => {
       // Validate: needs to be non-empty
       if (!data) return false;
       // Valid if it's an array (CIRCL/NVD) or a string (HTML) containing "CVE-"
       if (Array.isArray(data)) return true;
       if (typeof data === 'object' && (data.results || data.vulnerabilities || data.cves)) return true;
       if (typeof data === 'string' && data.includes('CVE-')) return true;
       return false;
    }
  );

  const normalized: CveResult = {
    cves: [],
    source: result.source
  };

  if (!result.data) return normalized;

  // Normalization Logic
  if (result.source.includes('circl')) {
    // CIRCL returns array or object with results
    const list = Array.isArray(result.data) ? result.data : result.data.results || [];
    normalized.cves = list.slice(0, 5).map((item: any) => ({
      id: item.id || item.cve,
      summary: item.summary || 'No summary',
      cvss: item.cvss,
      refs: item.references || []
    }));
  } else if (result.source.includes('nvd')) {
    // NVD 2.0 structure
    const vulns = result.data.vulnerabilities || [];
    normalized.cves = vulns.slice(0, 5).map((v: any) => ({
      id: v.cve.id,
      summary: v.cve.descriptions?.[0]?.value || 'No summary',
      cvss: v.cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore,
      refs: []
    }));
  } else {
    // Generic/HTML parser
    // Simple regex for CVE-YYYY-NNNN
    const str = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
    const matches = str.match(/CVE-\d{4}-\d{4,7}/g);
    if (matches) {
      const unique = Array.from(new Set(matches)).slice(0, 5);
      normalized.cves = unique.map(id => ({
        id,
        summary: 'Detected via heuristic scrape',
        refs: []
      }));
    }
  }

  return normalized;
};
