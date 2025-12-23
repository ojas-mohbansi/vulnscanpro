import { fallbackManager } from './fallbackManager';

export interface HeadersTlsResult {
  headersPresent: string[];
  headersMissing: string[];
  tlsIssues: string[];
  grade?: string;
  source: string;
}

// Normalized keys for internal use
const SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'x-xss-protection'
];

export const checkHeadersTls = async (target: string): Promise<HeadersTlsResult> => {
  const domain = new URL(target).hostname;

  // Primary + 25 Fallbacks
  const endpoints = [
    `https://http-observatory.security.mozilla.org/api/v1/analyze?host=${domain}`, // Primary
    `https://api.securityheaders.com/?q=${domain}&followRedirects=on`,
    `https://api.ssllabs.com/api/v3/analyze?host=${domain}&all=done`,
    `https://tls-observatory.services.mozilla.com/api/v1/scan?target=${domain}`,
    `https://hardenize.com/api/v1/analyze/${domain}`,
    `https://checktls.com/TestReceiver?email=${domain}`,
    `https://webbkoll.dataskydd.net/en/check?url=${domain}`,
    `https://cryptcheck.fr/api/tls/${domain}`,
    `https://api.certspotter.com/v1/issuances?domain=${domain}`,
    `https://crt.sh/?q=${domain}&output=json`,
    `https://api.hackertarget.com/httpheaders/?q=${domain}`,
    `https://sonar.omnisint.io/subdomains/${domain}`, // Indirect TLS inference via subdomain enumeration
    `https://api.cert.sh/domain/${domain}`,
    `https://networkcalc.com/api/security/headers/${domain}`,
    `https://api.geekflare.com/headers?url=${domain}`,
    `https://scan.metascan.ru/api/scan/${domain}`,
    `https://sitecheck.sucuri.net/api/v3/scan/${domain}`,
    `https://quttera.com/api/scan/${domain}`,
    `https://urlscan.io/api/v1/search/?q=domain:${domain}`, // Search existing scans
    `https://otx.alienvault.com/api/v1/indicators/domain/${domain}/url_list`,
    `https://api.threatminer.org/v2/domain.php?q=${domain}&rt=1`,
    `https://www.virustotal.com/ui/domains/${domain}`,
    `https://endpoint.snyk.io/api/v1/domain/${domain}`,
    `https://api.upguard.com/cheatsheet/${domain}`,
    `https://detector.dtrack.com/api/v1/domain/${domain}`,
    `https://api.internet.nl/api/v1/domain/${domain}`
  ];

  const result = await fallbackManager.fetchWithFallback<any>(
    endpoints,
    (data) => {
      // Basic validation: Check if data looks like a JSON object or string content
      return data && (typeof data === 'object' || typeof data === 'string' && data.length > 0);
    }
  );

  const normalized: HeadersTlsResult = {
    headersPresent: [],
    headersMissing: [],
    tlsIssues: [],
    source: result.source
  };

  if (!result.data) return normalized;

  // Normalization Logic based on Source
  if (result.source.includes('mozilla')) {
    // Mozilla Observatory JSON
    if (result.data.grade) normalized.grade = result.data.grade;
    // Mozilla doesn't explicitly list headers in the summary object easily without processing tests
    // Heuristic fallback for header presence if implicit
    if (result.data.tests_failed && result.data.tests_failed > 0) {
        normalized.tlsIssues.push('Some Mozilla Observatory tests failed');
    }
  } 
  else if (result.source.includes('securityheaders')) {
    // Usually raw HTML or JSON if API
    const str = JSON.stringify(result.data).toLowerCase();
    SECURITY_HEADERS.forEach(h => {
        if (!str.includes(h)) normalized.headersMissing.push(h);
        else normalized.headersPresent.push(h);
    });
  }
  else if (result.source.includes('ssllabs')) {
    // SSL Labs JSON
    const ep = result.data.endpoints?.[0];
    if (ep) {
        if (ep.grade) normalized.grade = ep.grade;
        if (ep.details?.supportsRc4) normalized.tlsIssues.push('RC4 Enabled');
        if (ep.details?.poodle) normalized.tlsIssues.push('POODLE Vulnerable');
    }
  }
  else {
    // Generic Parser for others
    // We treat the result as text and grep for headers
    const str = typeof result.data === 'string' ? result.data.toLowerCase() : JSON.stringify(result.data).toLowerCase();
    SECURITY_HEADERS.forEach(h => {
        if (str.includes(h)) normalized.headersPresent.push(h);
        else normalized.headersMissing.push(h);
    });
    
    if (str.includes('expired') || str.includes('revoked')) normalized.tlsIssues.push('Certificate potential issues (expired/revoked keyword match)');
  }

  return normalized;
};
