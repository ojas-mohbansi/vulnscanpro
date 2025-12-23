import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { api } from '../utils/apiClients';
import { ScanResult, Severity } from '../types';
import { GeoIpService } from '../lib/services/geoIpService';
import { Loader2, AlertTriangle } from 'lucide-react';

// Marker Icons (Leaflet doesn't bundle them well in pure ESM/No-bundler setup, so we use data URIs or CDNs)
const MARKER_ICON = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const getSeverityColor = (s: Severity) => {
  switch (s) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#3b82f6';
    default: return '#64748b';
  }
};

// Create a custom colored marker using HTML DivIcon for performance/customization
const createColoredMarker = (severity: Severity, count: number) => {
  const color = getSeverityColor(severity);
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">${count > 1 ? count : ''}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const WorldMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);

  useEffect(() => {
    // Initialize Map
    if (mapContainerRef.current && !mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([20, 0], 2);

      // Dark Mode Tiles (CartoDB Dark Matter)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const history = await api.getHistory();
        
        // Group by target to avoid redundant lookups for same host
        const uniqueTargets = new Map<string, ScanResult[]>();
        history.forEach(scan => {
           let host = scan.target;
           try { host = new URL(scan.target).hostname; } catch {}
           if (!uniqueTargets.has(host)) uniqueTargets.set(host, []);
           uniqueTargets.get(host)!.push(scan);
        });

        setTotalToProcess(uniqueTargets.size);
        let currentProcessed = 0;

        // Process each unique target
        for (const [host, scans] of uniqueTargets.entries()) {
           // Get highest severity for coloring
           let maxSeverity: Severity = 'low';
           let totalVulns = 0;
           
           scans.forEach(s => {
              if (s.stats.critical > 0) maxSeverity = 'critical';
              else if (s.stats.high > 0 && maxSeverity !== 'critical') maxSeverity = 'high';
              else if (s.stats.medium > 0 && maxSeverity !== 'critical' && maxSeverity !== 'high') maxSeverity = 'medium';
              totalVulns += s.stats.total;
           });

           // Skip safe items if we want to focus on risks? No, plot everything.
           
           // Resolve Geo
           try {
             const geo = await GeoIpService.lookup(host);
             
             if (geo.lat && geo.lon && mapInstanceRef.current) {
               const marker = L.marker([geo.lat, geo.lon], {
                 icon: createColoredMarker(maxSeverity, scans.length)
               });

               const popupContent = `
                 <div class="p-2">
                   <h3 class="font-bold text-sm mb-1">${host}</h3>
                   <div class="text-xs text-slate-300 mb-2">${geo.country} (${geo.isp})</div>
                   <div class="flex gap-2 text-xs">
                      <span class="text-red-400 font-bold">${scans.reduce((a,b) => a + b.stats.critical, 0)} Crit</span>
                      <span class="text-orange-400 font-bold">${scans.reduce((a,b) => a + b.stats.high, 0)} High</span>
                   </div>
                   <div class="mt-2 text-[10px] text-slate-500">Source: ${geo.source}</div>
                 </div>
               `;

               marker.bindPopup(popupContent);
               marker.addTo(mapInstanceRef.current);
             }
           } catch (e) {
             console.warn(`Failed to map ${host}`, e);
           }

           currentProcessed++;
           setProcessedCount(currentProcessed);
        }

      } catch (e) {
        console.error("Map data load error", e);
      } finally {
        setLoading(false);
      }
    };

    if (mapInstanceRef.current) {
       loadData();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[600px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {loading && (
        <div className="absolute inset-0 bg-slate-950/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
           <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
           <p className="text-white font-medium">Enriching Geography Data...</p>
           <p className="text-slate-400 text-sm mt-1">{processedCount} / {totalToProcess} Targets Resolved</p>
        </div>
      )}

      <div className="absolute bottom-6 left-6 z-[400] bg-slate-900/90 backdrop-blur p-3 rounded-lg border border-slate-800 shadow-xl">
         <h4 className="text-xs font-bold text-slate-300 uppercase mb-2">Severity Legend</h4>
         <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
               <div className="w-3 h-3 rounded-full bg-red-500 border border-white/20"></div> Critical
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
               <div className="w-3 h-3 rounded-full bg-orange-500 border border-white/20"></div> High
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
               <div className="w-3 h-3 rounded-full bg-yellow-500 border border-white/20"></div> Medium
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
               <div className="w-3 h-3 rounded-full bg-blue-500 border border-white/20"></div> Low
            </div>
         </div>
      </div>
    </div>
  );
};

export default WorldMap;
