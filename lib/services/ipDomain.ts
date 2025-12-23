import { fallbackManager } from './fallbackManager';

export interface IpDomainResult {
  ip: string;
  country: string;
  org: string;
  source: string;
}

export const checkIpDomain = async (host: string): Promise<IpDomainResult> => {
  // Try to resolve domain to IP first via specific API or treat as IP
  const q = host;

  // Primary + 25 Fallbacks
  const endpoints = [
    `http://ip-api.com/json/${q}`, // Primary
    `https://ipapi.co/${q}/json/`,
    `https://api.ip.sb/geoip/${q}`,
    `https://freegeoip.app/json/${q}`,
    `https://ipwhois.app/json/${q}`,
    `https://ipinfo.io/${q}/json`,
    `https://api.db-ip.com/v2/free/${q}`,
    `https://ip-api.io/json/${q}`,
    `https://api.hostip.info/get_json.php?ip=${q}`,
    `https://www.iplocate.io/api/lookup/${q}`,
    `https://api.ipregistry.co/${q}?key=tryout`, // Demo key often works
    `https://api.ipdata.co/${q}?api-key=test`,
    `https://ipwho.is/${q}`,
    `https://ipapi.com/ip_api.php?ip=${q}`, // Legacy endpoint
    `https://extreme-ip-lookup.com/json/${q}`,
    `https://geolocation-db.com/json/${q}`,
    `https://geoip-db.com/json/${q}`,
    `https://ip-fast.com/api/ip/?ip=${q}`,
    `https://ip.nf/me.json`, // Only works for self, included for connectivity check fallback
    `https://api.ip2location.io/?ip=${q}`,
    `https://api.maptiler.com/geolocation/ip/${q}?key=free`,
    `https://freeipapi.com/api/json/${q}`,
    `https://rdap.arin.net/registry/ip/${q}`, // RDAP JSON
    `https://rdap.ripe.net/ip/${q}`,
    `https://rdap.apnic.net/ip/${q}`,
    `https://dns.google/resolve?name=${q}&type=A` // DNS Fallback
  ];

  const result = await fallbackManager.fetchWithFallback<any>(
    endpoints,
    (data) => {
      // Must contain basic location data or IP
      if (!data) return false;
      if (typeof data === 'string' && (data.includes('country') || data.includes('AS'))) return true;
      if (data.country || data.country_code || data.countryCode || data.org || data.asn || data.Answer) return true;
      return false;
    }
  );

  const normalized: IpDomainResult = {
    ip: q,
    country: 'Unknown',
    org: 'Unknown',
    source: result.source
  };

  if (!result.data) return normalized;

  // Normalization Strategy
  const d = result.data;
  
  // IP-API / IPAPI / Most JSONs
  normalized.country = d.country || d.country_name || d.country_code || d.countryCode || normalized.country;
  normalized.org = d.org || d.as || d.isp || d.organization || normalized.org;

  // RDAP Specifics
  if (result.source.includes('rdap')) {
     normalized.country = d.country || 'RDAP Lookup';
     normalized.org = d.name || 'Registry Data';
  }

  // Google DNS fallback
  if (result.source.includes('dns.google')) {
     normalized.org = 'Resolved via Google Public DNS';
     if (d.Answer && d.Answer.length > 0) {
       normalized.ip = d.Answer[0].data;
     }
  }

  return normalized;
};
