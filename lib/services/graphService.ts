import { ScanResult, GraphData, GraphNode, GraphLink, Severity } from '../../types';

export class GraphService {
  static transformScanHistory(history: ScanResult[]): GraphData {
    const nodes: Map<string, GraphNode> = new Map();
    const links: GraphLink[] = [];

    history.forEach(scan => {
      // 1. Target Domain Node
      const targetId = `target-${scan.id}`;
      let label = scan.target;
      try {
        label = new URL(scan.target).hostname;
      } catch (e) { /* ignore */ }

      if (!nodes.has(targetId)) {
        nodes.set(targetId, {
          id: targetId,
          type: 'target',
          label: label,
          val: 20, // Size
          details: `Scan ID: ${scan.id}`,
          provenance: 'User Scan'
        });
      }

      // 2. Finding Nodes
      scan.findings.forEach(f => {
        const findingId = `finding-${f.id}`;
        
        // Add finding node if not exists (or unique per scan)
        if (!nodes.has(findingId)) {
          nodes.set(findingId, {
            id: findingId,
            type: 'finding',
            label: f.title.substring(0, 20) + (f.title.length > 20 ? '...' : ''),
            severity: f.severity,
            val: this.getSeverityWeight(f.severity),
            details: f.description,
            provenance: f.source.api
          });
        }

        // Link Target -> Finding
        links.push({
          source: targetId,
          target: findingId,
          type: 'vulnerable_to'
        });

        // 3. Extract Infrastructure/CVEs from Evidence
        if (f.evidence) {
           // Heuristic: Check for IP addresses in evidence
           const str = JSON.stringify(f.evidence);
           const ipMatch = str.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
           if (ipMatch) {
             const ip = ipMatch[0];
             const ipId = `ip-${ip}`;
             if (!nodes.has(ipId)) {
               nodes.set(ipId, {
                 id: ipId,
                 type: 'ip',
                 label: ip,
                 val: 10,
                 provenance: 'Evidence Extraction'
               });
             }
             // Link Finding -> IP
             links.push({
               source: findingId,
               target: ipId,
               type: 'relates_to'
             });
           }
        }
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      links: links
    };
  }

  private static getSeverityWeight(s: Severity | undefined): number {
    switch (s) {
      case 'critical': return 15;
      case 'high': return 12;
      case 'medium': return 8;
      case 'low': return 5;
      default: return 5;
    }
  }
}
