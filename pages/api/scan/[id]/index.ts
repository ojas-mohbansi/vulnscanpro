
import type { NextApiRequest, NextApiResponse } from 'next';
import { getScan } from '../../../../lib/store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const scan = await getScan(id as string);

  if (!scan) {
    return res.status(404).json({ message: 'Scan not found' });
  }

  res.status(200).json(scan);
}
