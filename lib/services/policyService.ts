
import { Finding } from '../../types';

export class PolicyService {
  static async analyze(target: string, scanId: string, headers: Headers): Promise<Finding[]> {
    const findings: Finding[] = [];
    const start = Date.now();

    // 1. Content-Security-Policy (CSP) Analysis
    const csp = headers.get('content-security-policy');
    if (csp) {
      const directives = csp.split(';').map(d => d.trim()).filter(Boolean);
      const directiveMap: Record<string, string> = {};
      
      directives.forEach(d => {
        const parts = d.split(/\s+/);
        const name = parts[0];
        const values = parts.slice(1).join(' ');
        directiveMap[name] = values;
      });

      // Unsafe Inline
      if (directiveMap['script-src'] && directiveMap['script-src'].includes("'unsafe-inline'") && !directiveMap['script-src'].includes('nonce-')) {
        findings.push({
          id: `csp-unsafe-inline-${Date.now()}`,
          scanId,
          module: 'headers',
          title: 'CSP Allows Unsafe Inline Scripts',
          severity: 'medium',
          confidence: 1.0,
          description: "The `script-src` directive includes `'unsafe-inline'` without a nonce. This allows XSS attacks to execute inline scripts.",
          evidence: { csp },
          remediation: "Remove `'unsafe-inline'` and use hashes or nonces for inline scripts.",
          refs: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src'],
          source: { api: 'PolicyAnalyzer', latencyMs: Date.now() - start },
          createdAt: new Date().toISOString()
        });
      }

      // Unsafe Eval
      if (directiveMap['script-src'] && directiveMap['script-src'].includes("'unsafe-eval'")) {
        findings.push({
          id: `csp-unsafe-eval-${Date.now()}`,
          scanId,
          module: 'headers',
          title: 'CSP Allows Unsafe Eval',
          severity: 'low',
          confidence: 1.0,
          description: "The `script-src` directive includes `'unsafe-eval'`, enabling strings to be executed as code (eval).",
          evidence: { csp },
          remediation: "Remove `'unsafe-eval'`. Refactor code to avoid dynamic execution.",
          refs: [],
          source: { api: 'PolicyAnalyzer' },
          createdAt: new Date().toISOString()
        });
      }

      // Missing Object Src
      if (!directiveMap['object-src'] && directiveMap['default-src'] !== "'none'") {
         findings.push({
          id: `csp-object-src-${Date.now()}`,
          scanId,
          module: 'headers',
          title: 'CSP Missing object-src Restriction',
          severity: 'low',
          confidence: 1.0,
          description: "No `object-src` directive found. Flash or other plugins might be loaded if default-src is permissive.",
          evidence: { csp },
          remediation: "Set `object-src 'none'` to prevent plugin-based vulnerabilities.",
          refs: [],
          source: { api: 'PolicyAnalyzer' },
          createdAt: new Date().toISOString()
        });
      }
    }

    // 2. CORS Analysis
    const acao = headers.get('access-control-allow-origin');
    const acac = headers.get('access-control-allow-credentials');

    if (acao === '*') {
       findings.push({
          id: `cors-wildcard-${Date.now()}`,
          scanId,
          module: 'headers',
          title: 'CORS Wildcard Origin',
          severity: 'low',
          confidence: 1.0,
          description: "Access-Control-Allow-Origin is set to `*`. Any site can read public data from this API.",
          evidence: { acao },
          remediation: "If this API handles private data, specify exact origins. If public, this is acceptable.",
          refs: ['https://portswigger.net/web-security/cors'],
          source: { api: 'PolicyAnalyzer' },
          createdAt: new Date().toISOString()
        });
    }

    if (acao === '*' && acac === 'true') {
        findings.push({
          id: `cors-misconfig-${Date.now()}`,
          scanId,
          module: 'headers',
          title: 'CORS Misconfiguration (Wildcard + Credentials)',
          severity: 'high',
          confidence: 1.0,
          description: "Invalid configuration: `Access-Control-Allow-Origin: *` cannot be used with `Access-Control-Allow-Credentials: true`. Browsers will block this, but it indicates server misconfiguration.",
          evidence: { acao, acac },
          remediation: "Specify explicit origins when using credentials.",
          refs: [],
          source: { api: 'PolicyAnalyzer' },
          createdAt: new Date().toISOString()
        });
    }

    // 3. COEP / COOP (Cross-Origin Isolation)
    const coep = headers.get('cross-origin-embedder-policy');
    const coop = headers.get('cross-origin-opener-policy');

    if (coop && !coep) {
        findings.push({
          id: `coop-coep-mismatch-${Date.now()}`,
          scanId,
          module: 'headers',
          title: 'Missing COEP for COOP',
          severity: 'low',
          confidence: 0.9,
          description: "Cross-Origin-Opener-Policy is set, but Cross-Origin-Embedder-Policy is missing. This might prevent the document from being cross-origin isolated.",
          evidence: { coop, coep: 'Missing' },
          remediation: "Set `Cross-Origin-Embedder-Policy: require-corp` to enable full isolation.",
          refs: ['https://web.dev/coop-coep/'],
          source: { api: 'PolicyAnalyzer' },
          createdAt: new Date().toISOString()
        });
    }

    return findings;
  }
}
