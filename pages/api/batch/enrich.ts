import type { NextApiRequest, NextApiResponse } from 'next';
import { DnsService } from '../../../lib/services/dnsService';
import { GeoIpService } from '../../../lib/services/geoIpService';
import { EnrichmentResult } from '../../../types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { target } = req.body;
  if (!target) return res.status(400).json({ message: 'Target required' });

  try {
    // 1. Resolve Hostname
    let domain = target;
    try {
       domain = new URL(target).hostname;
    } catch { /* assume bare domain/ip */ }

    const dns = await DnsService.resolve(domain);
    
    // 2. Resolve GeoIP (using resolved IP if available, else domain)
    const lookupTarget = (dns.ip && dns.ip !== 'Unknown' && dns.ip !== 'Resolution Failed') ? dns.ip : domain;
    const geo = await GeoIpService.lookup(lookupTarget);

    const result: EnrichmentResult = {
        dns: {
            ip: dns.ip,
            provider: dns.source,
            raw: dns.raw
        },
        geo: {
            country: geo.country,
            isp: geo.isp,
            provider: geo.source
        }
    };

    res.status(200).json(result);
  } catch (e) {
    console.error('Enrichment error', e);
    res.status(500).json({ message: 'Enrichment failed' });
  }
}
