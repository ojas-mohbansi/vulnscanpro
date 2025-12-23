
import { Queue } from 'bullmq';
import { redis } from './redis';

// Reuse the ioredis connection
export const scanQueue = new Queue('vulnscan-queue', { 
  connection: redis 
});
