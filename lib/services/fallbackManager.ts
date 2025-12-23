import { BenchmarkMetric } from '../../types';

export interface FallbackResult<T> {
  data: T | null;
  source: string; // Hostname of the endpoint used
  endpointUsed: string; // Full URL
  fallbackIndex: number;
  latencyMs: number;
  statusCode: number;
  error?: string;
}

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

export class FallbackManager {
  // Store internal metrics
  private metrics: BenchmarkMetric[] = [];

  private async wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  public getMetrics() {
    return this.metrics;
  }
  
  public clearMetrics() {
    this.metrics = [];
  }

  private recordMetric(endpoint: string, latency: number, status: number, isFallback: boolean, method: string) {
    try {
      const urlObj = new URL(endpoint);
      this.metrics.push({
        id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: new Date().toISOString(),
        endpoint: urlObj.hostname,
        source: urlObj.hostname,
        latencyMs: latency,
        status,
        isFallback,
        method
      });
      
      // Keep metrics array capped to avoid memory leak in long running sessions
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(this.metrics.length - 1000);
      }
    } catch (e) { /* ignore invalid urls */ }
  }

  /**
   * Tries to fetch from a list of endpoints sequentially.
   * Implements retries with jitter for transient errors.
   */
  async fetchWithFallback<T>(
    endpoints: string[], 
    validate: (payload: any) => boolean,
    options: FetchOptions = {}
  ): Promise<FallbackResult<T>> {
    const { timeout = 8000, retries = 1, ...fetchOpts } = options;
    const method = fetchOpts.method || 'GET';

    for (let i = 0; i < endpoints.length; i++) {
      const url = endpoints[i];
      const start = Date.now();
      let attempt = 0;

      while (attempt <= retries) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeout);
          
          const res = await fetch(url, {
            ...fetchOpts,
            signal: controller.signal,
            headers: {
              'User-Agent': 'VulnScanPro/1.0 (Security Research; +https://vulnscan.pro/ethics)',
              'Accept': 'application/json, text/plain, */*',
              ...fetchOpts.headers,
            }
          });
          
          clearTimeout(id);
          const latency = Date.now() - start;

          // Record Metric (Success/Failure tracking)
          this.recordMetric(url, latency, res.status, i > 0, method);

          // Handle rate limiting immediately by breaking retry loop and moving to next endpoint
          if (res.status === 429) {
            console.warn(`Rate limit hit for ${url}, skipping to next fallback.`);
            break; 
          }

          if (!res.ok) {
             throw new Error(`HTTP ${res.status}`);
          }
          
          const contentType = res.headers.get('content-type') || '';
          let data: any;
          
          if (contentType.includes('application/json')) {
            data = await res.json();
          } else {
            data = await res.text();
          }
          
          if (validate(data)) {
            return {
              data: data as T,
              source: new URL(url).hostname,
              endpointUsed: url,
              fallbackIndex: i,
              latencyMs: latency,
              statusCode: res.status
            };
          } else {
            throw new Error('Validation failed');
          }

        } catch (err: any) {
          const latency = Date.now() - start;
          // Record failure metrics too (status 0 for network err)
          if (attempt === retries) {
            this.recordMetric(url, latency, 0, i > 0, method);
          }
          
          const isLastAttempt = attempt === retries;
          if (!isLastAttempt && err.name !== 'AbortError') {
             // Jittered backoff: 500ms + random 0-500ms
             const delay = 500 + Math.random() * 500;
             await this.wait(delay);
          } else {
             console.warn(`Attempt ${attempt + 1} failed for ${url}: ${err.message}`);
          }
        }
        attempt++;
      }
    }

    return {
      data: null,
      source: 'none',
      endpointUsed: '',
      fallbackIndex: -1,
      latencyMs: 0,
      statusCode: 0,
      error: 'All fallbacks failed'
    };
  }
}

export const fallbackManager = new FallbackManager();
