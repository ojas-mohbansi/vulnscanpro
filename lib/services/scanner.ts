
import { chromium, Browser, BrowserContext } from 'playwright';
import { ScanResult, ScanEvent, Finding, Severity, PageContext } from '../../types';
import { saveScan, getScan, isCancelled } from '../store';
import { CrawlerService } from './dast/crawler';
import { FuzzerService } from './dast/fuzzer';
import { analyzeReact } from './rules/reactRules';
import { analyzeFlask } from './rules/flaskRules';
import { analyzeDjango } from './rules/djangoRules';
import { HeadersAnalyzer } from './headersAnalyzer';
import { BenchmarkingService } from './benchmarkingService';
import { ProxyService } from './proxyService';
import { TlsAnalyzerService } from './tlsAnalyzer';
import { PolicyService } from './policyService';

type EventEmitter = (event: ScanEvent) => void;

export class ScannerService {
  private scanId: string;
  private target: string;
  private emit: EventEmitter;
  private activeRulePackIds: string[];
  
  // DAST Config
  private maxDepth = 2;
  private maxPages = 15;

  constructor(scanId: string, target: string, emit: EventEmitter, rps: number = 5, activeRulePackIds: string[] = []) {
    this.scanId = scanId;
    this.target = target;
    this.emit = emit;
    this.activeRulePackIds = activeRulePackIds;
  }

  async run() {
    if (await isCancelled(this.scanId)) return;

    // Start Baseline
    const baselinePromise = BenchmarkingService.measureBaselineLatency();
    this.emit({ scanId: this.scanId, module: 'system', status: 'started', progressPct: 5, message: 'Launching Headless Engine (Playwright)...', timestamp: new Date().toISOString() });

    let browser: Browser | undefined;
    
    try {
      // 1. SSL/TLS Analysis (Parallel)
      this.emit({ scanId: this.scanId, module: 'tls', status: 'started', progressPct: 10, message: 'Analyzing SSL/TLS Configuration...', timestamp: new Date().toISOString() });
      const tlsFindings = await TlsAnalyzerService.analyze(this.target, this.scanId);
      for (const f of tlsFindings) await this.addFinding(f);

      // Configure Proxy
      const proxyUrl = ProxyService.getRotatingProxy();
      if (proxyUrl) {
          await ProxyService.logUsage(this.scanId, proxyUrl, this.target);
          this.emit({ scanId: this.scanId, module: 'system', status: 'started', progressPct: 12, message: `Routing traffic via proxy...`, timestamp: new Date().toISOString() });
      }

      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        proxy: proxyUrl ? { server: proxyUrl } : undefined
      });
      
      const context = await browser.newContext({
        userAgent: 'VulnScanPro/2.0 (DAST; +https://vulnscan.pro)',
        ignoreHTTPSErrors: true
      });

      const crawler = new CrawlerService(context, this.target, this.maxDepth, this.maxPages);
      const fuzzer = new FuzzerService(context, this.scanId);

      let pagesScanned = 0;

      // --- Crawl & Scan Loop ---
      await crawler.crawl(async (pageCtx: PageContext) => {
        if (await isCancelled(this.scanId)) return;
        pagesScanned++;
        const pct = Math.min(15 + (pagesScanned * 5), 85);
        
        this.emit({ scanId: this.scanId, module: 'crawler', status: 'started', progressPct: pct, message: `Analyzing ${pageCtx.url}...`, timestamp: new Date().toISOString() });

        // 2. Passive Analysis (Headers, Frameworks, Policies)
        await this.runPassiveAnalysis(pageCtx);

        // 3. Active Fuzzing (XSS, SQLi on forms)
        if (pageCtx.forms.length > 0) {
           this.emit({ scanId: this.scanId, module: 'fuzzer', status: 'started', progressPct: pct, message: `Fuzzing ${pageCtx.forms.length} forms on ${pageCtx.url}`, timestamp: new Date().toISOString() });
           const fuzzFindings = await fuzzer.fuzzPage(pageCtx);
           for (const f of fuzzFindings) {
             await this.addFinding(f);
           }
        }
      });

      // --- External Analysis (Headers) ---
      // We still run the external check as it gives a "Grade" which is nice UX
      try {
        const extAnalysis = await HeadersAnalyzer.analyze(this.target);
        if (extAnalysis.grade && (extAnalysis.grade.startsWith('D') || extAnalysis.grade.startsWith('F'))) {
           await this.addFinding({
             id: `ext-grade-${Date.now()}`,
             scanId: this.scanId,
             module: 'headers',
             title: `Low Security Grade: ${extAnalysis.grade}`,
             severity: 'medium',
             confidence: 0.9,
             description: `External analysis assigned a grade of ${extAnalysis.grade}.`,
             evidence: { grade: extAnalysis.grade, missing: extAnalysis.headersMissing },
             remediation: extAnalysis.recommendations.join('\n'),
             refs: ['https://observatory.mozilla.org/'],
             source: { api: extAnalysis.source },
             createdAt: new Date().toISOString()
           });
        }
      } catch (e) {}

      // --- Benchmark Completion ---
      try {
          const baseline = await baselinePromise;
          const scan = await getScan(this.scanId);
          if (scan) {
              const metrics = BenchmarkingService.calculateScanMetrics(scan.startTime, new Date().toISOString(), baseline.latency, baseline.source);
              scan.benchmark = metrics;
              await saveScan(scan);
          }
      } catch (e) {
          console.warn("Failed to save benchmarks", e);
      }

    } catch (err: any) {
      console.error("DAST Engine Error", err);
      this.emit({ scanId: this.scanId, module: 'system', status: 'error', progressPct: 0, message: `Engine failure: ${err.message}`, timestamp: new Date().toISOString() });
    } finally {
      if (browser) await browser.close();
    }
  }

  private async runPassiveAnalysis(pageCtx: PageContext) {
    const findings: Finding[] = [];
    
    const headers = new Headers(pageCtx.headers);

    // 1. Policy Analysis (CSP/CORS/COEP)
    const policyFindings = await PolicyService.analyze(pageCtx.url, this.scanId, headers);
    findings.push(...policyFindings);

    // 2. Framework Heuristics
    const reactFindings = await analyzeReact(this.scanId, pageCtx.url, pageCtx.html, headers);
    findings.push(...reactFindings);

    const flaskFindings = await analyzeFlask(this.scanId, pageCtx.url, pageCtx.html, headers);
    findings.push(...flaskFindings);

    const djangoFindings = await analyzeDjango(this.scanId, pageCtx.url, pageCtx.html, headers);
    findings.push(...djangoFindings);

    // 3. Browser Console Checks (captured via pageCtx if we hook console)
    // Note: Crawler service currently doesn't fully capture console logs in PageContext for brevity,
    // but in a full impl we would hook page.on('console') in CrawlerService.
    // For now, we rely on Header analysis for CSP.

    for (const f of findings) {
        if (pageCtx.screenshot && !f.evidence.screenshot) {
            f.evidence.screenshot = pageCtx.screenshot;
        }
        await this.addFinding(f);
    }
  }

  private async addFinding(finding: Finding) {
    const scan = await getScan(this.scanId);
    if (scan) {
        // Dedup: Simple check by title + url (if in evidence) to avoid spamming same issue on every page
        const exists = scan.findings.some(f => f.title === finding.title && JSON.stringify(f.evidence) === JSON.stringify(finding.evidence));
        if (!exists) {
            scan.findings.push(finding);
            scan.stats.total++;
            scan.stats[finding.severity]++;
            await saveScan(scan);
        }
    }
  }
}
