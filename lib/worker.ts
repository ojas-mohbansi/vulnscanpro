import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { ScannerService } from './services/scanner';
import { getScan, saveScan, isCancelled } from './store';
import { ScanEvent } from '../types';
import { redis } from './redis';

declare var require: any;
declare var module: any;

// Worker needs a blocking connection, so we create a new one with maxRetriesPerRequest: null
const workerConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

export const startWorker = () => {
  const worker = new Worker('vulnscan-queue', async (job: Job) => {
    const { scanId, options, activeRulePackIds } = job.data;
    
    console.log(`Processing scan ${scanId}...`);

    // Fetch scan state
    const scan = await getScan(scanId);
    if (!scan) {
        console.error(`Scan ${scanId} not found in DB`);
        return;
    }

    // Update status to running
    scan.status = 'running';
    await saveScan(scan);

    // Event Emitter wrapper
    const emit = async (event: ScanEvent) => {
        // 1. Publish to Redis for realtime frontend updates
        await redis.publish(`scan-events:${scanId}`, JSON.stringify(event));
        
        // 2. Persist to DB for history
        // Note: In production, consider buffering these writes or using a separate events table
        const s = await getScan(scanId);
        if (s) {
            s.events.push(event);
            await saveScan(s);
        }
    };

    const scanner = new ScannerService(
        scanId, 
        scan.target, 
        emit, 
        options.rateLimitRps, 
        activeRulePackIds
    );

    try {
        await emit({ 
            scanId, 
            module: 'system', 
            status: 'started', 
            progressPct: 0, 
            message: 'Worker picked up scan job.', 
            timestamp: new Date().toISOString() 
        });

        await scanner.run();

        if (await isCancelled(scanId)) {
            await emit({ scanId, module: 'system', status: 'error', progressPct: 100, message: 'Scan cancelled by user.', timestamp: new Date().toISOString() });
        } else {
            // Finalize
            const finalScan = await getScan(scanId);
            if (finalScan) {
                finalScan.status = 'completed';
                finalScan.endTime = new Date().toISOString();
                finalScan.stats.durationMs = new Date(finalScan.endTime).getTime() - new Date(finalScan.startTime).getTime();
                await saveScan(finalScan);
            }
            await emit({ scanId, module: 'system', status: 'completed', progressPct: 100, message: 'Scan completed successfully.', timestamp: new Date().toISOString() });
        }

    } catch (error: any) {
        console.error(`Scan ${scanId} failed:`, error);
        const s = await getScan(scanId);
        if (s) {
            s.status = 'failed';
            await saveScan(s);
        }
        await emit({ scanId, module: 'system', status: 'error', progressPct: 100, message: `Fatal worker error: ${error.message}`, timestamp: new Date().toISOString() });
        throw error; // Let BullMQ handle retries if configured
    }

  }, { connection: workerConnection });

  worker.on('completed', job => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed`, err);
  });
  
  return worker;
};

// Auto-start if running as standalone script
if (require.main === module) {
    startWorker();
}