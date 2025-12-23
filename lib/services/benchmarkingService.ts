import { fallbackManager } from './fallbackManager';
import { api } from '../../utils/apiClients';
import { BenchmarkMetric, ModuleBenchmark, ScanBenchmark } from '../../types';

export class BenchmarkingService {
  
  static getNetworkMetrics(): BenchmarkMetric[] {
    return fallbackManager.getMetrics();
  }

  static async getModulePerformance(): Promise<ModuleBenchmark[]> {
    try {
      const history = await api.getHistory();
      const moduleStats: Record<string, { totalMs: number, count: number }> = {};

      history.forEach(scan => {
        const moduleStarts = new Map<string, number>();
        
        scan.events.forEach(e => {
           if (e.module === 'system') return;

           if (e.status === 'started') {
             moduleStarts.set(e.module, new Date(e.timestamp).getTime());
           } else if (e.status === 'completed' && moduleStarts.has(e.module)) {
             const start = moduleStarts.get(e.module)!;
             const duration = new Date(e.timestamp).getTime() - start;
             
             if (!moduleStats[e.module]) {
               moduleStats[e.module] = { totalMs: 0, count: 0 };
             }
             moduleStats[e.module].totalMs += duration;
             moduleStats[e.module].count++;
           }
        });
      });

      return Object.entries(moduleStats).map(([name, stats]) => ({
        moduleName: name,
        avgDurationMs: Math.round(stats.totalMs / stats.count),
        calls: stats.count
      })).sort((a,b) => b.avgDurationMs - a.avgDurationMs);

    } catch (e) {
      console.warn("Failed to calculate module stats", e);
      return [];
    }
  }

  /**
   * Measures baseline network latency using 25+ free telemetry endpoints.
   */
  static async measureBaselineLatency(): Promise<{ latency: number, source: string }> {
    const start = Date.now();
    
    // Primary: HTTPBin latency test
    // 25 Fallbacks: Latency JSONs and public telemetry endpoints
    const endpoints = [
      'https://httpbin.org/delay/0', // Primary (0s delay to measure raw RTT)
      'https://run.mocky.io/v3/4f17904e-4b47-4560-8452-19c235763654', // Mocky
      'https://vulnscan.beeceptor.com/telemetry', // Beeceptor
      'https://jsonplaceholder.typicode.com/posts/1', // JSONPlaceholder
      'https://reqres.in/api/users/2', // Reqres
      'https://raw.githubusercontent.com/VulnScanPro/telemetry/main/ping.json', // GitHub Raw
      'https://cdn.jsdelivr.net/gh/VulnScanPro/telemetry@main/ping.json', // jsDelivr
      'https://unpkg.com/@vulnscan/telemetry/ping.json', // unpkg
      'https://vulnscan-telemetry.netlify.app/status.json', // Netlify
      'https://vulnscan-demo.vercel.app/api/telemetry', // Vercel
      'https://vulnscan.surge.sh/telemetry.json', // Surge
      'https://vulnscan.onrender.com/telemetry', // Render
      'https://vulnscan.up.railway.app/telemetry', // Railway
      'https://vulnscan.fly.dev/telemetry', // Fly.io
      'https://vulnscan.glitch.me/telemetry', // Glitch
      'https://vulnscan.herokuapp.com/telemetry', // Heroku
      'https://vulnscan-demo.web.app/telemetry.json', // Firebase
      'https://vulnscan-demo.supabase.co/storage/v1/object/public/telemetry/ping.json', // Supabase
      'https://ipfs.io/ipfs/QmHashTelemetry', // IPFS
      'https://worker.cloudflare.com/telemetry', // CF Workers
      'https://dns-lookup.org/api/ping', // DNS-Lookup
      'https://rdap.arin.net/registry/ip/1.1.1.1', // ARIN
      'https://rdap.ripe.net/ip/1.1.1.1', // RIPE
      'https://rdap.apnic.net/ip/1.1.1.1', // APNIC
      'https://rdap.lacnic.net/rdap/ip/1.1.1.1', // LACNIC
      'https://rdap.afrinic.net/rdap/ip/1.1.1.1' // AFRINIC
    ];

    try {
        const result = await fallbackManager.fetchWithFallback<any>(
            endpoints,
            (data) => !!data, // Any successful read
            { timeout: 3000, method: 'GET' }
        );
        return { latency: result.latencyMs, source: result.source };
    } catch (e) {
        return { latency: 0, source: 'Measurement Failed' };
    }
  }

  /**
   * Aggregates metrics for a specific scan timespan.
   */
  static calculateScanMetrics(startTime: string, endTime: string, baselineMs: number, source: string): ScanBenchmark {
    const startTs = new Date(startTime).getTime();
    const endTs = new Date(endTime).getTime();
    const allMetrics = this.getNetworkMetrics();

    // Filter metrics for this scan
    const scanMetrics = allMetrics.filter(m => {
        const ts = new Date(m.timestamp).getTime();
        return ts >= startTs && ts <= endTs;
    });

    const totalRequests = scanMetrics.length;
    let avgRequestLatencyMs = 0;
    let fallbackCount = 0;

    if (totalRequests > 0) {
        const sumLatency = scanMetrics.reduce((acc, m) => acc + m.latencyMs, 0);
        avgRequestLatencyMs = Math.round(sumLatency / totalRequests);
        fallbackCount = scanMetrics.filter(m => m.isFallback).length;
    }

    const durationSec = (endTs - startTs) / 1000;
    const rps = durationSec > 0 ? parseFloat((totalRequests / durationSec).toFixed(2)) : 0;

    return {
        baselineLatencyMs: baselineMs,
        avgRequestLatencyMs,
        requestsPerSecond: rps,
        totalRequests,
        fallbackUsagePercent: totalRequests > 0 ? parseFloat(((fallbackCount / totalRequests) * 100).toFixed(1)) : 0,
        telemetrySource: source
    };
  }

  // Legacy syncTelemetry (kept for backward compat)
  static async syncTelemetry(): Promise<{ success: boolean, endpoint: string }> {
      const baseline = await this.measureBaselineLatency();
      return { success: baseline.latency > 0, endpoint: baseline.source };
  }
}
