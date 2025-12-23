import { fallbackManager } from './fallbackManager';

export interface GeoIpResult {
  country: string;
  isp: string;
  source: string;
  lat?: number;
  lon?: number;
}

export class GeoIpService {
  // Simple in-memory cache to prevent rate limit exhaustion on the map view
  private static cache = new Map<string, GeoIpResult>();

  static async lookup(hostOrIp: string): Promise<GeoIpResult> {
    const q = hostOrIp;
    
    // Check Cache
    if (this.cache.has(q)) {
      return this.cache.get(q)!;
    }

    // Primary: ip-api.com
    // Fallbacks: geojs.io, freegeoip.app, etc.
    const endpoints = [
      `http://ip-api.com/json/${q}`, // Primary
      `https://get.geojs.io/v1/ip/geo/${q}.json`,
      `https://ipwhois.app/json/${q}`,
      `https://ipinfo.io/${q}/json`,
      `https://ipapi.co/${q}/json/`,
      `https://api.db-ip.com/v2/free/${q}`,
      `https://freegeoip.app/json/${q}`,
      `https://api.ipregistry.co/${q}?key=tryout`,
      `https://ipwho.is/${q}`,
      `https://api.ipdata.co/${q}?api-key=test`,
      `https://geolocation-db.com/json/${q}`,
      `https://extreme-ip-lookup.com/json/${q}`,
      `https://ipapi.com/ip_api.php?ip=${q}`,
      `https://ip-fast.com/api/ip/?ip=${q}`,
      `https://api.ip2location.io/?ip=${q}`,
      `https://freeipapi.com/api/json/${q}`,
      `https://api.maptiler.com/geolocation/ip/${q}?key=free`,
      `https://rdap.arin.net/registry/ip/${q}`,
      `https://rdap.ripe.net/ip/${q}`,
      `https://rdap.apnic.net/ip/${q}`,
      `https://rdap.lacnic.net/rdap/ip/${q}`,
      `https://rdap.afrinic.net/rdap/ip/${q}`,
      `https://www.iplocate.io/api/lookup/${q}`,
      `https://api.hostip.info/get_json.php?ip=${q}`,
      `https://api.hackertarget.com/geoip/?q=${q}&output=json`
    ];

    try {
      const result = await fallbackManager.fetchWithFallback<any>(
        endpoints,
        (data) => {
           if (!data) return false;
           // Valid if contains country or ISP info
           if (data.country || data.country_name || data.countryCode || data.isp || data.org || data.as) return true;
           // Valid if contains coordinates
           if (data.lat || data.latitude || data.loc) return true;
           // RDAP checks
           if (data.name && data.handle) return true;
           return false;
        }
      );

      const d = result.data || {};
      
      // Normalization
      let country = d.country || d.country_name || d.country_code || d.countryCode || 'Unknown';
      let isp = d.isp || d.org || d.as || d.organization || 'Unknown';
      
      // Coordinate Extraction
      let lat: number | undefined = undefined;
      let lon: number | undefined = undefined;

      if (d.lat) lat = parseFloat(d.lat);
      else if (d.latitude) lat = parseFloat(d.latitude);
      
      if (d.lon) lon = parseFloat(d.lon);
      else if (d.longitude) lon = parseFloat(d.longitude);

      // Handle "loc": "12.34,56.78" format (ipinfo)
      if (!lat && d.loc && typeof d.loc === 'string') {
          const parts = d.loc.split(',');
          if (parts.length === 2) {
              lat = parseFloat(parts[0]);
              lon = parseFloat(parts[1]);
          }
      }

      // RDAP normalization
      if (result.source.includes('rdap')) {
         country = d.country || 'RDAP Registry';
         isp = d.name || 'Registry Data';
      }

      const geoResult = {
        country,
        isp,
        source: result.source,
        lat,
        lon
      };

      this.cache.set(q, geoResult);
      return geoResult;

    } catch (e) {
      console.error('GeoIP lookup failed', e);
      return { country: 'Unknown', isp: 'Unknown', source: 'None' };
    }
  }
}