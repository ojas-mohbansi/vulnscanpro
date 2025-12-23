
import { Page, BrowserContext } from 'playwright';
import { FormDefinition, Finding, PageContext } from '../../../types';

const XSS_PAYLOAD = '<img src=x onerror=console.log("VULN_XSS_DETECTED")>';
const SQLI_PAYLOAD = "' OR '1'='1";

export class FuzzerService {
  private context: BrowserContext;
  private scanId: string;

  constructor(context: BrowserContext, scanId: string) {
    this.context = context;
    this.scanId = scanId;
  }

  async fuzzPage(pageCtx: PageContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Fuzz Forms
    for (const form of pageCtx.forms) {
      if (form.inputs.length === 0) continue;

      // 1. Test XSS
      try {
        const xssFindings = await this.testXss(pageCtx.url, form);
        findings.push(...xssFindings);
      } catch (e) { console.error('XSS Fuzz error', e); }

      // 2. Test SQLi
      try {
        const sqliFindings = await this.testSqli(pageCtx.url, form);
        findings.push(...sqliFindings);
      } catch (e) { console.error('SQLi Fuzz error', e); }
    }

    return findings;
  }

  private async testXss(url: string, form: FormDefinition): Promise<Finding[]> {
    const page = await this.context.newPage();
    const findings: Finding[] = [];
    let isVulnerable = false;

    // Listen for the payload trigger
    page.on('console', msg => {
      if (msg.text().includes('VULN_XSS_DETECTED')) {
        isVulnerable = true;
      }
    });

    try {
      await page.goto(url);
      
      // Fill all text inputs with payload
      for (const input of form.inputs) {
        if (input.type === 'text' || input.type === 'search' || input.type === 'textarea') {
           const selector = `[name="${input.name}"]`;
           if (await page.isVisible(selector)) {
             await page.fill(selector, XSS_PAYLOAD);
           }
        }
      }

      // Submit
      // Heuristic: Press Enter on the last input or click button
      await page.keyboard.press('Enter');
      
      // Wait for reflection
      try {
        await page.waitForTimeout(2000); 
      } catch { }

      if (isVulnerable) {
        findings.push({
          id: `xss-${Date.now()}`,
          scanId: this.scanId,
          module: 'dast-xss',
          title: 'Reflected XSS Detected',
          severity: 'high',
          confidence: 1.0,
          description: `The application executed an injected JavaScript payload via a form on ${url}.`,
          evidence: { formHtml: form.html, payload: XSS_PAYLOAD },
          remediation: 'Implement context-aware output encoding (e.g., HTML entity encoding) for all user-supplied data reflected in the response.',
          refs: ['https://owasp.org/www-community/attacks/xss/'],
          source: { api: 'Playwright Fuzzer' },
          createdAt: new Date().toISOString()
        });
      }

    } finally {
      await page.close();
    }
    return findings;
  }

  private async testSqli(url: string, form: FormDefinition): Promise<Finding[]> {
    const page = await this.context.newPage();
    const findings: Finding[] = [];

    try {
      await page.goto(url);
      
      // Fill inputs
      for (const input of form.inputs) {
        if (input.type === 'text' || input.type === 'password') {
           const selector = `[name="${input.name}"]`;
           if (await page.isVisible(selector)) {
             await page.fill(selector, SQLI_PAYLOAD);
           }
        }
      }

      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);

      const content = await page.content();
      const sqlErrors = [
        "SQL syntax",
        "mysql_fetch",
        "ORA-01756",
        "SQLite/JDBCDriver",
        "System.Data.SqlClient"
      ];

      const foundError = sqlErrors.find(e => content.includes(e));

      if (foundError) {
        findings.push({
          id: `sqli-${Date.now()}`,
          scanId: this.scanId,
          module: 'dast-sqli',
          title: 'Possible SQL Injection',
          severity: 'critical',
          confidence: 0.9,
          description: `Database error message detected after injecting SQL payload: "${foundError}".`,
          evidence: { errorMatch: foundError, payload: SQLI_PAYLOAD },
          remediation: 'Use parameterized queries (prepared statements) for all database access. Never concatenate user input into SQL strings.',
          refs: ['https://owasp.org/www-community/attacks/SQL_Injection'],
          source: { api: 'Playwright Fuzzer' },
          createdAt: new Date().toISOString()
        });
      }

    } finally {
      await page.close();
    }
    return findings;
  }
}
