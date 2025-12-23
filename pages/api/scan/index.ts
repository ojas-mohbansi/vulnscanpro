
import type { NextApiRequest, NextApiResponse } from 'next';
import { ScanRequest, ScanResult } from '../../../types';
import { saveScan } from '../../../lib/store';
import { scanQueue } from '../../../lib/queue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url, framework, options, activeRulePackIds } = req.body as ScanRequest;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  
  const newScan: ScanResult = {
    id: scanId,
    target: url,
    status: 'queued',
    startTime: new Date().toISOString(),
    findings: [],
    events: [],
    stats: {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      modulesCompleted: 0,
      durationMs: 0
    },
    activeRulePackIds: activeRulePackIds || ['core-secrets']
  };

  // 1. Save initial state to DB
  await saveScan(newScan);

  // 2. Add to Job Queue
  await scanQueue.add('scan', {
    scanId,
    url,
    framework,
    options,
    activeRulePackIds: newScan.activeRulePackIds
  });

  res.status(200).json({ scanId, status: 'queued' });
}
