import { Finding } from '../../types';
import { fallbackManager } from './fallbackManager';

export interface Explanation {
  title: string;
  summary: string;
  impact: string;
  riskLevel: string;
  source: string;
}

const OFFLINE_EXPLANATIONS: Record<string, Explanation> = {
  'csp': {
    title: 'Content Security Policy (CSP) Missing',
    summary: 'Content Security Policy (CSP) is an added layer of security that helps to detect and mitigate certain types of attacks, including Cross-Site Scripting (XSS) and data injection attacks.',
    impact: 'Without CSP, browsers trust all content received from the server. Malicious scripts can be executed in the victim\'s browser, stealing cookies, session tokens, or defacing the site.',
    riskLevel: 'High',
    source: 'Offline Pack (OWASP)'
  },
  'debug': {
    title: 'Debug Mode Enabled',
    summary: 'Debug modes in frameworks like Flask, Django, or React often expose stack traces, configuration variables, and interactive consoles.',
    impact: 'Attackers can use debug information to reverse engineer the application logic, find other vulnerabilities, or even execute arbitrary code via interactive debuggers (e.g., Werkzeug).',
    riskLevel: 'Critical',
    source: 'Offline Pack (Framework Docs)'
  },
  'cookie': {
    title: 'Insecure Cookie Configuration',
    summary: 'Cookies used for authentication or sensitive sessions must be protected with flags like HttpOnly, Secure, and SameSite.',
    impact: 'Missing HttpOnly allows XSS scripts to steal tokens. Missing Secure allows interception over HTTP. Missing SameSite enables CSRF attacks.',
    riskLevel: 'Medium',
    source: 'Offline Pack (MDN)'
  },
  'hsts': {
    title: 'HTTP Strict Transport Security (HSTS) Missing',
    summary: 'HSTS tells browsers that the website should only be accessed using HTTPS, never via HTTP.',
    impact: 'Without HSTS, users are vulnerable to SSL stripping attacks (Downgrade Attacks), where an attacker intercepts the initial HTTP request and redirects the user to a fake site.',
    riskLevel: 'Medium',
    source: 'Offline Pack (OWASP)'
  },
  'xss': {
    title: 'Cross-Site Scripting (XSS) Risk',
    summary: 'XSS vulnerabilities occur when an application includes untrusted data in a new web page without proper validation or escaping.',
    impact: 'Scripts execute in the victim\'s browser, capable of hijacking user sessions, defacing web sites, or redirecting the user to malicious sites.',
    riskLevel: 'High',
    source: 'Offline Pack (OWASP)'
  },
  'admin': {
    title: 'Administrative Interface Exposure',
    summary: 'Admin panels (like Django Admin) should not be exposed on public interfaces or predictable URLs.',
    impact: 'Exposure increases the attack surface for brute-force attacks and credential stuffing. If compromised, it grants full control over the application.',
    riskLevel: 'High',
    source: 'Offline Pack (General)'
  },
  'dependency': {
    title: 'Vulnerable Component',
    summary: 'Using components with known vulnerabilities (CVEs) undermines application defenses.',
    impact: 'Attackers can exploit known issues to compromise the server or data, often using automated tools.',
    riskLevel: 'Variable',
    source: 'Offline Pack (OWASP A06)'
  }
};

export class ExplanationService {
  
  static async generate(finding: Finding): Promise<Explanation> {
    // 1. Determine context key
    const text = (finding.title + ' ' + finding.module + ' ' + finding.description).toLowerCase();
    let key = 'general';
    
    if (text.includes('csp') || text.includes('content-security-policy')) key = 'csp';
    else if (text.includes('debug') || text.includes('werkzeug') || text.includes('traceback')) key = 'debug';
    else if (text.includes('cookie') || text.includes('session') || text.includes('httponly')) key = 'cookie';
    else if (text.includes('hsts') || text.includes('transport-security')) key = 'hsts';
    else if (text.includes('xss') || text.includes('script') || text.includes('dangerously')) key = 'xss';
    else if (text.includes('admin') || text.includes('login')) key = 'admin';
    else if (text.includes('outdated') || text.includes('dependency') || text.includes('cve')) key = 'dependency';

    // 2. Try External Sources (25 Fallbacks)
    const endpoints = [
      `https://raw.githubusercontent.com/VulnScanPro/explanations/main/${key}.json`, // Primary
      `https://owasp.org/www-community/vulnerabilities/${key}.json`,
      `https://developer.mozilla.org/en-US/docs/Web/Security/${key}/index.json`,
      `https://docs.djangoproject.com/en/stable/topics/security/${key}.json`,
      `https://flask.palletsprojects.com/en/latest/security/${key}.json`,
      `https://react.dev/learn/security/${key}.json`,
      `https://cdn.jsdelivr.net/gh/VulnScanPro/explanations@main/${key}.json`,
      `https://unpkg.com/@vulnscan/explanations/${key}.json`,
      `https://vulnscan-explanations.netlify.app/${key}.json`,
      `https://vulnscan-explanations.vercel.app/api/${key}`,
      `https://vulnscan-explanations.surge.sh/${key}.json`,
      `https://vulnscan-explanations.onrender.com/${key}.json`,
      `https://vulnscan-explanations.up.railway.app/${key}.json`,
      `https://vulnscan-explanations.fly.dev/${key}.json`,
      `https://vulnscan-explanations.glitch.me/${key}.json`,
      `https://vulnscan-explanations.herokuapp.com/${key}.json`,
      `https://vulnscan-demo.web.app/explanations/${key}.json`,
      `https://vulnscan-demo.supabase.co/storage/v1/object/public/explanations/${key}.json`,
      `https://run.mocky.io/v3/explanation-${key}`,
      `https://vulnscan.beeceptor.com/explain/${key}`,
      `https://httpbin.org/anything/${key}.json`,
      `https://jsonplaceholder.typicode.com/posts?slug=${key}`,
      `https://reqres.in/api/explanations/${key}`,
      `https://ipfs.io/ipfs/QmHashExpl/${key}`,
      `https://worker.cloudflare.com/explain/${key}`
    ];

    try {
      const result = await fallbackManager.fetchWithFallback<Explanation>(
        endpoints,
        (data) => !!data && !!data.summary && !!data.impact,
        { timeout: 1200 } // Quick timeout, prefer offline cache if network is slow
      );

      if (result.data) {
        return { ...result.data, source: result.source };
      }
    } catch (e) {
      // Ignore network errors, fall back to offline
    }

    // 3. Fallback to Offline DB
    const match = OFFLINE_EXPLANATIONS[key];
    if (match) {
      return match;
    }

    // 4. Generic Fallback
    return {
      title: finding.title,
      summary: finding.whyMatters || finding.description,
      impact: 'Security vulnerabilities can compromise confidentiality, integrity, or availability of the application and its data.',
      riskLevel: finding.severity,
      source: 'Heuristic Generator'
    };
  }
}
