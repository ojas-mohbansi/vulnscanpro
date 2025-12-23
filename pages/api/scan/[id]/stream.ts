
import type { NextApiRequest, NextApiResponse } from 'next';
import { getScan } from '../../../../lib/store';
import { redisSub } from '../../../../lib/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const scanId = id as string;
  const scan = await getScan(scanId);

  if (!scan) {
    res.status(404).end();
    return;
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  // If scan is already done, send final status and close
  if (scan.status === 'completed' || scan.status === 'failed' || scan.status === 'cancelled') {
    const finalEvent = {
        scanId,
        module: 'system',
        status: scan.status === 'completed' ? 'completed' : 'error',
        progressPct: 100,
        message: `Scan already ${scan.status}.`,
        timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(finalEvent)}\n\n`);
    res.end();
    return;
  }

  // Subscribe to Redis channel for this scan
  const channel = `scan-events:${scanId}`;
  
  // We need a dedicated subscriber instance for this connection context or use the shared one with listener
  // Since `redisSub` is global, we add a listener. 
  // NOTE: In standard Next.js API routes (lambda), persistent listeners are tricky. 
  // However, for SSE keep-alive, the lambda stays hot until timeout.
  
  const messageHandler = (chan: string, message: string) => {
    if (chan === channel) {
      res.write(`data: ${message}\n\n`);
      
      // Check for completion message to close stream
      try {
          const event = JSON.parse(message);
          if (event.status === 'completed' || (event.status === 'error' && event.module === 'system')) {
              cleanup();
              res.end();
          }
      } catch (e) {}
    }
  };

  // Subscribe
  await redisSub.subscribe(channel);
  redisSub.on('message', messageHandler);

  // Send connected message
  res.write(`data: ${JSON.stringify({ scanId, module: 'system', status: 'started', progressPct: 0, message: 'Connected to scan stream...', timestamp: new Date().toISOString() })}\n\n`);

  // Cleanup on client disconnect
  const cleanup = () => {
    redisSub.off('message', messageHandler);
    redisSub.unsubscribe(channel).catch(console.error);
  };

  req.on('close', cleanup);
}
