
import { Page, BrowserContext } from 'playwright';
import { PageContext, FormDefinition } from '../../../types';

export class CrawlerService {
  private visited = new Set<string>();
  private queue: { url: string; depth: number }[] = [];
  private results: PageContext[] = [];
  private maxPages: number;
  private maxDepth: number;
  private context: BrowserContext;

  constructor(context: BrowserContext, startUrl: string, maxDepth: number = 2, maxPages: number = 10) {
    this.context = context;
    this.queue.push({ url: startUrl, depth: 0 });
    this.maxDepth = maxDepth;
    this.maxPages = maxPages;
  }

  async crawl(onPageFound: (page: PageContext) => Promise<void>): Promise<void> {
    while (this.queue.length > 0 && this.visited.size < this.maxPages) {
      const { url, depth } = this.queue.shift()!;
      
      if (this.visited.has(url)) continue;
      this.visited.add(url);

      try {
        const page = await this.context.newPage();
        
        // Block heavy resources
        await page.route('**/*.{png,jpg,jpeg,gif,css,woff,woff2}', route => route.abort());
        
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        if (!response) {
            await page.close();
            continue;
        }

        const html = await page.content();
        const headers = response.headers();
        
        // Extract Forms
        const forms: FormDefinition[] = await page.evaluate(() => {
          return Array.from(document.forms).map(f => ({
            action: f.action,
            method: f.method,
            inputs: Array.from(f.querySelectorAll('input, textarea, select')).map((i: any) => ({
              name: i.name || i.id,
              type: i.type || 'text'
            })),
            html: f.outerHTML
          }));
        });

        // Screenshot for evidence (only if important or random sampling to save db space)
        let screenshot: string | undefined;
        try {
            const buffer = await page.screenshot({ quality: 50, type: 'jpeg' });
            screenshot = buffer.toString('base64');
        } catch (e) { /* ignore */ }

        const pageContext: PageContext = {
          url,
          html,
          headers,
          forms,
          screenshot
        };

        await onPageFound(pageContext);

        // Extract Links for Recursion
        if (depth < this.maxDepth) {
          const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
              .map(a => a.href)
              .filter(href => href.startsWith('http')); // Simple filter
          });

          // Normalize and add to queue
          const baseUrl = new URL(url).origin;
          for (const link of links) {
            try {
              // Only follow internal links
              if (link.startsWith(baseUrl) && !this.visited.has(link)) {
                this.queue.push({ url: link, depth: depth + 1 });
              }
            } catch { /* ignore */ }
          }
        }

        await page.close();

      } catch (e) {
        console.warn(`Failed to crawl ${url}`, e);
      }
    }
  }
}
