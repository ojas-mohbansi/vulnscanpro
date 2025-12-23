
import type { NextApiRequest, NextApiResponse } from 'next';
import { getScan } from '../../../lib/store';
import { ReportGenerator, generateFilename } from '../../../lib/utils/reportGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, format } = req.query;
  const scanId = id as string;
  const fmt = (format as 'json' | 'html' | 'md' | 'csv') || 'json';

  const scan = await getScan(scanId);

  if (!scan) {
    return res.status(404).json({ message: 'Scan not found' });
  }

  let content = '';
  let contentType = 'application/json';

  try {
    switch (fmt) {
      case 'html':
        content = ReportGenerator.html(scan);
        contentType = 'text/html';
        break;
      case 'md':
        content = ReportGenerator.markdown(scan);
        contentType = 'text/markdown';
        break;
      case 'csv':
        content = ReportGenerator.csv(scan);
        contentType = 'text/csv';
        break;
      case 'json':
      default:
        content = ReportGenerator.json(scan);
        contentType = 'application/json';
        break;
    }

    const filename = generateFilename(scanId, fmt);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(content);

  } catch (error) {
    console.error('Report Generation Error:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
}
