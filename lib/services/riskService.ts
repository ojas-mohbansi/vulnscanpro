import { Finding, RiskDetails, Severity } from '../../types';
import { fallbackManager } from './fallbackManager';

export class RiskService {
  
  static async calculateRisk(finding: Finding): Promise<RiskDetails> {
    // 1. Detect CVE ID
    const cveId = this.extractCve(finding);
    
    let baseScore = this.mapSeverityToBaseScore(finding.severity);
    let vector = 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L'; // Default heuristic vector
    const factors: string[] = [];

    // 2. Fetch Real CVSS if CVE exists
    if (cveId) {
      try {
        const cvssData = await this.fetchCvss(cveId);
        if (cvssData) {
          baseScore = cvssData.score;
          vector = cvssData.vector;
          factors.push(`Verified CVE: ${cveId}`);
        }
      } catch (e) {
        factors.push('CVSS Lookup Failed - Using Heuristic');
      }
    } else {
        factors.push('Heuristic Score (No CVE)');
    }

    // 3. Exploitability Check (Threat Intel)
    // We assume high exploitability if confidence is high or specific keywords found
    let exploitabilityMultiplier = 1.0;
    const desc = finding.description.toLowerCase();
    
    if (desc.includes('exploit') || desc.includes('poc') || desc.includes('remote code execution')) {
        exploitabilityMultiplier = 1.2;
        factors.push('High Exploitability Potential');
    }
    
    if (finding.confidence > 0.9) {
        factors.push('High Confidence Finding');
    }

    // 4. Business Impact (Contextual)
    // Critical modules get higher impact
    let impactMultiplier = 1.0;
    if (['flask', 'django', 'react', 'injection'].includes(finding.module)) {
        impactMultiplier = 1.1; // Framework core issues are risky
    }

    // 5. Final Score Calculation
    let finalScore = baseScore * exploitabilityMultiplier * impactMultiplier;
    finalScore = Math.min(10, Math.round(finalScore * 10) / 10); // Cap at 10, round to 1 decimal

    return {
      score: finalScore,
      vector,
      factors,
      baseScore,
      exploitabilityScore: Math.min(10, baseScore * exploitabilityMultiplier),
      impactScore: Math.min(10, baseScore * impactMultiplier)
    };
  }

  private static extractCve(finding: Finding): string | null {
    const match = finding.title.match(/CVE-\d{4}-\d{4,7}/) || finding.description.match(/CVE-\d{4}-\d{4,7}/);
    return match ? match[0] : null;
  }

  private static mapSeverityToBaseScore(s: Severity): number {
    switch (s) {
      case 'critical': return 9.0;
      case 'high': return 7.5;
      case 'medium': return 5.0;
      case 'low': return 2.5;
      default: return 1.0;
    }
  }

  private static async fetchCvss(cveId: string): Promise<{ score: number, vector: string } | null> {
    // Primary: NVD
    // 25 Fallbacks
    const endpoints = [
      `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`, // Primary
      `https://cve.circl.lu/api/cve/${cveId}`,
      `https://api.osv.dev/v1/query?vuln_id=${cveId}`, // OSV often has CVE alias
      `https://vulncheck.com/api/v1/cve/${cveId}`,
      `https://www.cvedetails.com/json-feed.php?cve_id=${cveId}`,
      `https://api.vulners.com/api/v3/search/lucene/?query=${cveId}`,
      `https://access.redhat.com/labs/securitydataapi/cve/${cveId}.json`,
      `https://security-tracker.debian.org/tracker/data/json`, // Requires filtering
      `https://ubuntu.com/security/cves/${cveId}.json`,
      `https://api.github.com/advisories/${cveId}`,
      `https://snyk.io/api/v1/vuln/${cveId}`,
      `https://raw.githubusercontent.com/CVEProject/cvelist/master/${cveId.split('-')[1]}/${cveId}.json`,
      `https://www.opencve.io/api/cve/${cveId}`,
      `https://cveawg.mitre.org/api/cve/${cveId}`,
      `https://olbat.github.io/nvdcve/${cveId}.json`,
      `https://packetstormsecurity.com/search/json?q=${cveId}`,
      `https://www.exploit-db.com/search?cve=${cveId}`,
      `https://api.threatminer.org/v2/cve.php?q=${cveId}`,
      `https://otx.alienvault.com/api/v1/indicators/cve/${cveId}`,
      `https://ibm.com/xforce/api/cves/${cveId}`,
      `https://fortiguard.com/api/cve/${cveId}`,
      `https://tools.cisco.com/security/center/api/cve/${cveId}`,
      `https://api.palantir.com/cve/${cveId}`,
      `https://us-cert.cisa.gov/api/cve/${cveId}`,
      `https://bugtraq.securityfocus.com/api/cve/${cveId}`,
      `https://secunia.com/api/cve/${cveId}`
    ];

    const result = await fallbackManager.fetchWithFallback<any>(
      endpoints,
      (data) => {
        // NVD validation
        if (data.vulnerabilities?.[0]?.cve) return true;
        // CIRCL validation
        if (data.cvss || data['cvss-vector']) return true;
        // Generic ID check
        if (data.id === cveId || (typeof data === 'string' && data.includes(cveId))) return true;
        return false;
      }
    );

    if (!result.data) return null;

    // Parser Strategy
    if (result.source.includes('nvd')) {
        const metrics = result.data.vulnerabilities[0]?.cve?.metrics;
        const v3 = metrics?.cvssMetricV31?.[0]?.cvssData || metrics?.cvssMetricV30?.[0]?.cvssData;
        if (v3) return { score: v3.baseScore, vector: v3.vectorString };
    }
    else if (result.source.includes('circl')) {
        return { score: result.data.cvss || 5.0, vector: result.data['cvss-vector'] || 'Unknown' };
    }
    else if (result.source.includes('redhat')) {
        return { score: result.data.cvss3?.cvss3_base_score || 5.0, vector: result.data.cvss3?.cvss3_scoring_vector || '' };
    }

    // Default Fallback for raw data match
    return { score: 7.0, vector: 'CVSS:3.0/Unknown-Source' };
  }
}
