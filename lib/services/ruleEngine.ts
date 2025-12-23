import { Rule, Finding } from '../../types';

export class RuleEngine {
  /**
   * Executes a set of dynamic rules against the provided context (HTML, Headers, URL).
   */
  static execute(
    rules: Rule[], 
    scanId: string, 
    url: string, 
    html: string, 
    headers: Headers
  ): Finding[] {
    const findings: Finding[] = [];
    const start = Date.now();

    for (const rule of rules) {
      try {
        const target = rule.target || 'body';
        const regex = new RegExp(rule.pattern, 'i'); // Case insensitive default
        
        let match = false;
        let evidenceSnippet = '';

        if (target === 'body') {
          const m = html.match(regex);
          if (m) {
            match = true;
            evidenceSnippet = m[0];
          }
        } else if (target === 'header') {
          // Check stringified headers
          const headerStr = JSON.stringify(Object.fromEntries(headers.entries()));
          const m = headerStr.match(regex);
          if (m) {
            match = true;
            evidenceSnippet = m[0];
          }
        } else if (target === 'url') {
            if (regex.test(url)) {
                match = true;
                evidenceSnippet = url;
            }
        }

        if (match) {
          findings.push({
            id: `rule-${rule.id}-${Date.now()}`,
            scanId,
            module: 'custom-rules',
            title: rule.title,
            severity: rule.severity,
            confidence: 1.0, // Pattern match is usually high confidence
            description: rule.description,
            whyMatters: 'Matched a custom security rule pattern defined in your installed rule packs.',
            evidence: { pattern: rule.pattern, match: evidenceSnippet.substring(0, 100) },
            remediation: rule.remediation,
            refs: rule.refs || [],
            source: { api: 'RuleEngine', latencyMs: Date.now() - start },
            createdAt: new Date().toISOString()
          });
        }

      } catch (err) {
        console.warn(`Failed to execute rule ${rule.id}:`, err);
      }
    }

    return findings;
  }
}
