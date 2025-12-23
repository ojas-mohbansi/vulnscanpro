import { Finding } from '../../../types';

export const analyzeReact = async (scanId: string, url: string, html: string, headers: Headers): Promise<Finding[]> => {
  const findings: Finding[] = [];
  const start = Date.now();

  // Helper to extract script sources
  const scriptSrcs: string[] = [];
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    let src = match[1];
    if (src.startsWith('/')) {
      src = new URL(src, url).toString();
    } else if (!src.startsWith('http')) {
      src = new URL(src, url).toString();
    }
    scriptSrcs.push(src);
  }

  // 1. Check for Source Maps (Information Leakage)
  // We check the first few scripts to see if .map files exist
  for (const scriptUrl of scriptSrcs.slice(0, 3)) {
    try {
      const mapUrl = scriptUrl + '.map';
      const res = await fetch(mapUrl, { method: 'HEAD' });
      if (res.ok) {
        findings.push({
          id: `react-sourcemap-${Date.now()}`,
          scanId,
          module: 'react',
          title: 'Source Maps Enabled',
          severity: 'low',
          confidence: 1.0,
          description: `Production JavaScript bundle has source maps enabled (${mapUrl}). This exposes original source code, making reverse engineering easier.`,
          evidence: { mapUrl },
          remediation: 'Disable source map generation in your build configuration (e.g., `GENERATE_SOURCEMAP=false` in Create React App or `devtool: false` in Webpack production config).',
          refs: ['https://create-react-app.dev/docs/advanced-configuration/'],
          source: { api: 'ReactHeuristics', latencyMs: Date.now() - start },
          createdAt: new Date().toISOString()
        });
        break; // Only report once
      }
    } catch (e) { /* ignore network errors */ }
  }

  // 2. Scan JS bundles for dangerous patterns (dangerouslySetInnerHTML)
  // Limited to first 2 scripts to avoid timeouts
  for (const scriptUrl of scriptSrcs.slice(0, 2)) {
    try {
      const res = await fetch(scriptUrl);
      if (res.ok) {
        const jsContent = await res.text();
        if (jsContent.includes('dangerouslySetInnerHTML')) {
          findings.push({
            id: `react-dangerous-${Date.now()}`,
            scanId,
            module: 'react',
            title: 'Usage of dangerouslySetInnerHTML',
            severity: 'medium',
            confidence: 0.8,
            description: 'Detected usage of `dangerouslySetInnerHTML` in client-side bundles. If user input is passed here without sanitization, it leads to XSS.',
            evidence: { script: scriptUrl, snippet: '...dangerouslySetInnerHTML...' },
            remediation: 'Avoid `dangerouslySetInnerHTML` where possible. If necessary, ensure content is sanitized using a library like DOMPurify before rendering.',
            refs: ['https://react.dev/reference/react-dom/components/common#dangerouslysetinnerhtml'],
            source: { api: 'ReactHeuristics', latencyMs: Date.now() - start },
            createdAt: new Date().toISOString()
          });
          break; 
        }
      }
    } catch (e) { /* ignore */ }
  }

  // 3. SPA CSP Check
  const csp = headers.get('content-security-policy');
  if (!csp || (csp.includes("'unsafe-inline'") && !csp.includes('nonce-'))) {
    findings.push({
      id: `react-csp-${Date.now()}`,
      scanId,
      module: 'react',
      title: 'Weak Content Security Policy for SPA',
      severity: 'high',
      confidence: 0.9,
      description: 'The CSP is either missing or allows `unsafe-inline` without a nonce. React SPAs are vulnerable to XSS if an attacker can inject script tags.',
      evidence: { csp: csp || 'Missing' },
      remediation: "Implement a strict CSP. For React: \n`Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<random_string>';`\nEnsure the nonce is generated server-side and passed to `index.html`.",
      refs: ['https://web.dev/strict-csp/'],
      source: { api: 'ReactHeuristics', latencyMs: Date.now() - start },
      createdAt: new Date().toISOString()
    });
  }

  return findings;
};
