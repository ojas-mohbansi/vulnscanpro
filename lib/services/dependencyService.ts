import { Dependency, DependencyVulnerability, DependencyScanResult, Severity } from '../../types';
import { fallbackManager } from './fallbackManager';

export class DependencyService {
  
  static async scanDependencies(dependencies: Dependency[]): Promise<DependencyScanResult> {
    const vulnerabilities: DependencyVulnerability[] = [];
    
    // Batch processing to respect rate limits, though OSV is generous
    // We will do parallel requests in chunks
    const chunkSize = 5;
    for (let i = 0; i < dependencies.length; i += chunkSize) {
      const chunk = dependencies.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map(d => this.checkDependency(d)));
      results.forEach(r => vulnerabilities.push(...r));
    }

    // Aggregate Stats
    const uniqueVulnerable = new Set(vulnerabilities.map(v => v.dependency)).size;
    const critical = vulnerabilities.filter(v => v.severity === 'critical').length;
    const high = vulnerabilities.filter(v => v.severity === 'high').length;
    const medium = vulnerabilities.filter(v => v.severity === 'medium').length;
    const low = vulnerabilities.filter(v => v.severity === 'low').length;

    return {
      dependencies,
      vulnerabilities,
      summary: {
        totalDependencies: dependencies.length,
        vulnerableDependencies: uniqueVulnerable,
        critical,
        high,
        medium,
        low
      }
    };
  }

  private static async checkDependency(dep: Dependency): Promise<DependencyVulnerability[]> {
    if (dep.version === 'latest' || !dep.version) return []; // Cannot check without version

    const vulns: DependencyVulnerability[] = [];
    
    // Primary: OSV.dev
    const osvEndpoint = 'https://api.osv.dev/v1/query';
    
    // 25 Fallbacks for vulnerability checking
    // Note: Most of these endpoints search by string/CPE, not structured package object.
    // We construct search queries for the fallbacks.
    const q = `${dep.name} ${dep.version}`;
    const fallbackEndpoints = [
        osvEndpoint, // 1 (Primary)
        `https://cve.circl.lu/api/search/${dep.name}`, // 2 (CIRCL)
        `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${q}`, // 3 (NVD)
        `https://api.osv.dev/v1/query?ecosystem=${dep.ecosystem}&package=${dep.name}`, // 4 (OSV Alt)
        `https://api.deps.dev/v3/systems/${dep.ecosystem.toLowerCase()}/packages/${encodeURIComponent(dep.name)}/versions/${dep.version}`, // 5 (Deps.dev)
        `https://security.snyk.io/package/${dep.ecosystem.toLowerCase()}/${dep.name}`, // 6 (Snyk HTML)
        `https://github.com/advisories?query=${dep.name}`, // 7 (GitHub)
        `https://www.cvedetails.com/google-search-results.php?q=${q}`, // 8 (CVE Details)
        `https://vulners.com/api/v3/search/lucene/?query=${q}`, // 9 (Vulners)
        `https://www.exploit-db.com/search?q=${dep.name}`, // 10
        `https://packetstormsecurity.com/search/?q=${dep.name}`, // 11
        `https://api.vulncheck.com/v3/index?q=${dep.name}`, // 12
        `https://www.opencve.io/api/cve?search=${dep.name}`, // 13
        `https://security-tracker.debian.org/tracker/source-package/${dep.name}`, // 14
        `https://ubuntu.com/security/cves?q=${dep.name}`, // 15
        `https://access.redhat.com/labs/securitydataapi/cve.json?package=${dep.name}`, // 16
        `https://cxsecurity.com/search/wlb/desc/${dep.name}`, // 17
        `https://www.securityfocus.com/bid/${dep.name}`, // 18
        `https://exchange.xforce.ibmcloud.com/search/${dep.name}`, // 19
        `https://tools.cisco.com/security/center/search.x?q=${dep.name}`, // 20
        `https://www.fortiguard.com/search?q=${dep.name}`, // 21
        `https://threatpost.com/?s=${dep.name}`, // 22
        `https://thehackernews.com/search?q=${dep.name}`, // 23
        `https://nvd.nist.gov/vuln/search/results?query=${dep.name}`, // 24
        `https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword=${dep.name}`, // 25
        `https://www.rapid7.com/db/search/?q=${dep.name}` // 26
    ];

    try {
        // OSV Query Payload
        const payload = {
            package: {
                name: dep.name,
                ecosystem: dep.ecosystem
            },
            version: dep.version
        };

        const result = await fallbackManager.fetchWithFallback<any>(
            fallbackEndpoints, 
            (data) => {
                // OSV success
                if (data.vulns) return true;
                // Deps.dev success
                if (data.advisories) return true;
                // CIRCL/NVD/Generic success (array or object with results)
                if (Array.isArray(data) || data.results || data.vulnerabilities) return true;
                return false;
            },
            {
                method: 'POST', // Default to POST for OSV
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            }
        );

        // Normalize OSV Response
        if (result.source.includes('osv.dev') && result.data?.vulns) {
            result.data.vulns.forEach((v: any) => {
                vulns.push({
                    id: v.id,
                    dependency: dep.name,
                    version: dep.version,
                    severity: this.mapSeverity(v.database_specific?.severity || 'MODERATE'),
                    title: v.summary || `Vulnerability in ${dep.name}`,
                    summary: v.details || 'No details provided.',
                    fixedIn: v.affected?.[0]?.ranges?.[0]?.events?.find((e: any) => e.fixed)?.fixed || 'Unknown',
                    refs: v.references?.map((r: any) => r.url) || [],
                    source: 'OSV.dev'
                });
            });
        }
        // Normalize Deps.dev Response
        else if (result.source.includes('deps.dev') && result.data?.advisories) {
            result.data.advisories.forEach((adv: any) => {
                 vulns.push({
                    id: adv.sourceID || adv.advisoryKey?.id,
                    dependency: dep.name,
                    version: dep.version,
                    severity: 'high', // Deps.dev often omits severity in simple view
                    title: adv.title,
                    summary: adv.description || '',
                    fixedIn: 'Check advisory',
                    refs: [adv.url],
                    source: 'deps.dev'
                 });
            });
        }
        // Fallback: Generic Match (CIRCL/NVD) - Heuristic
        else if ((result.source.includes('circl') || result.source.includes('nvd')) && result.data) {
             // This is a loose match on package name, strictly strictly speaking we don't know if THIS version is vuln
             // We flag it as warning/manual check
             vulns.push({
                 id: 'POSSIBLE-MATCH',
                 dependency: dep.name,
                 version: dep.version,
                 severity: 'medium',
                 title: `Potential Vulnerabilities Found for ${dep.name}`,
                 summary: `The vulnerability database (${result.source}) contains records for this package. Automatic version matching failed, so please verify manually.`,
                 fixedIn: 'Manual Verification',
                 refs: [`https://nvd.nist.gov/vuln/search/results?query=${dep.name}`],
                 source: result.source + ' (Heuristic)'
             });
        }

    } catch (e) {
        console.warn(`Failed to check dependency ${dep.name}:`, e);
    }

    return vulns;
  }

  private static mapSeverity(input: string): Severity {
    const s = input.toUpperCase();
    if (s.includes('CRITICAL')) return 'critical';
    if (s.includes('HIGH')) return 'high';
    if (s.includes('MODERATE') || s.includes('MEDIUM')) return 'medium';
    return 'low';
  }
}
