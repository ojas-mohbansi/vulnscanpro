import { fallbackManager } from './fallbackManager';

export interface HeaderAnalysisResult {
  headersPresent: string[];
  headersMissing: string[];
  grade: string;
  recommendations: string[];
  source: string;
  raw?: any;
}

const SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'x-xss-protection',
  'access-control-allow-origin'
];

export class HeadersAnalyzer {
  
  static async analyze(target: string): Promise<HeaderAnalysisResult> {
    let domain = target;
    try {
      domain = new URL(target).hostname;
    } catch { /* keep as is */ }

    // Primary: Mozilla Observatory
    // 25 Fallbacks: Mix of API endpoints and scraping targets for header info
    const endpoints = [
      `https://http-observatory.security.mozilla.org/api/v1/analyze?host=${domain}`, // Primary
      `https://api.securityheaders.com/?q=${domain}&followRedirects=on`,
      `https://hardenize.com/api/v1/analyze/${domain}`,
      `https://webbkoll.dataskydd.net/en/check?url=${domain}`,
      `https://api.ssllabs.com/api/v3/analyze?host=${domain}&all=done`,
      `https://tls-observatory.services.mozilla.com/api/v1/scan?target=${domain}`,
      `https://checktls.com/TestReceiver?email=${domain}`,
      `https://cryptcheck.fr/api/tls/${domain}`,
      `https://api.certspotter.com/v1/issuances?domain=${domain}`,
      `https://api.hackertarget.com/httpheaders/?q=${domain}`,
      `https://api.geekflare.com/headers?url=${domain}`,
      `https://sitecheck.sucuri.net/api/v3/scan/${domain}`,
      `https://quttera.com/api/scan/${domain}`,
      `https://urlscan.io/api/v1/search/?q=domain:${domain}`,
      `https://api.upguard.com/cheatsheet/${domain}`,
      `https://detector.dtrack.com/api/v1/domain/${domain}`,
      `https://api.internet.nl/api/v1/domain/${domain}`,
      `https://sonar.omnisint.io/headers/${domain}`,
      `https://observatory.mozilla.org/api/v1/analyze?host=${domain}`,
      `https://api.immuniweb.com/v1/ssl?host=${domain}`,
      `https://api.detectify.com/v1/domain/${domain}`,
      `https://networkcalc.com/api/security/headers/${domain}`,
      `https://securityheaders.io/?q=${domain}`, // HTML fallback
      `https://www.ssllabs.com/ssltest/analyze.html?d=${domain}`, // HTML fallback
      `https://globalsign.ssllabs.com/analyze.html?d=${domain}`,
      `https://www.digicert.com/help/?host=${domain}`
    ];

    try {
      const result = await fallbackManager.fetchWithFallback<any>(
        endpoints,
        (data) => {
          if (!data) return false;
          // Mozilla Observatory success check
          if (data.grade || data.scan_id) return true;
          // Generic JSON validation
          if (typeof data === 'object' && (data.headers || data.results)) return true;
          // HTML validation
          if (typeof data === 'string' && (data.includes('Security Report') || data.includes('Headers'))) return true;
          return false;
        },
        { method: 'POST' } // Mozilla expects POST to trigger scan, GET to retrieve. Fallback manager handles retries.
      );

      return this.normalize(result.data, result.source, domain);

    } catch (e) {
      console.error("Header Analysis Failed", e);
      return {
        headersPresent: [],
        headersMissing: [],
        grade: 'Unknown',
        recommendations: ['Unable to perform external analysis.'],
        source: 'None'
      };
    }
  }

  private static normalize(data: any, source: string, domain: string): HeaderAnalysisResult {
    const res: HeaderAnalysisResult = {
      headersPresent: [],
      headersMissing: [],
      grade: 'C', // Default optimistic
      recommendations: [],
      source,
      raw: data
    };

    // 1. Mozilla Observatory Normalization
    if (source.includes('mozilla')) {
      if (data.grade) res.grade = data.grade;
      else if (data.state === 'FINISHED') res.grade = 'B'; // Infer if finished without explicit grade
      
      // Observatory doesn't send header list directly in analyze response usually, 
      // but might in detailed results. We infer from tests_failed if available.
      if (data.tests_failed) {
         // Heuristic mapping
         const failed = JSON.stringify(data.tests_failed).toLowerCase();
         if (failed.includes('content-security-policy')) res.headersMissing.push('content-security-policy');
         if (failed.includes('strict-transport-security')) res.headersMissing.push('strict-transport-security');
         if (failed.includes('x-frame-options')) res.headersMissing.push('x-frame-options');
      }
    } 
    // 2. SecurityHeaders / Generic JSON
    else if (typeof data === 'object') {
       const str = JSON.stringify(data).toLowerCase();
       SECURITY_HEADERS.forEach(h => {
         if (str.includes(h)) res.headersPresent.push(h);
         else res.headersMissing.push(h);
       });
       
       // Guess grade based on missing count
       const missingCount = res.headersMissing.length;
       if (missingCount === 0) res.grade = 'A+';
       else if (missingCount < 2) res.grade = 'A';
       else if (missingCount < 4) res.grade = 'C';
       else res.grade = 'F';
    }
    // 3. HTML Scraping Fallback
    else if (typeof data === 'string') {
       const lower = data.toLowerCase();
       SECURITY_HEADERS.forEach(h => {
         if (lower.includes(h)) res.headersPresent.push(h);
         else res.headersMissing.push(h);
       });
       // Attempt to find grade in HTML
       const gradeMatch = data.match(/Grade:\s*([A-F][+-]?)/i);
       if (gradeMatch) res.grade = gradeMatch[1].toUpperCase();
    }

    // Generate Recommendations
    res.headersMissing.forEach(h => {
       res.recommendations.push(`Implement the ${h} header to mitigate specific attack vectors.`);
    });

    if (res.grade.startsWith('F') || res.grade.startsWith('D')) {
      res.recommendations.push('Immediate action required: The site grade indicates severe configuration issues.');
    }

    return res;
  }
}
