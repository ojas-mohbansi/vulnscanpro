
import type { NextApiRequest, NextApiResponse } from 'next';
import { getScan, cancelScan, saveScan } from '../../../../lib/store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { id } = req.query;
  const scan = await getScan(id as string);

  if (!scan) return res.status(404).json({ message: 'Scan not found' });

  await cancelScan(scan.id);
  // Re-fetch or manually update local object to ensure consistent return if needed, 
  // but cancelScan updates DB. We just need to respond.
  res.status(200).json({ message: 'Cancel requested' });
}
