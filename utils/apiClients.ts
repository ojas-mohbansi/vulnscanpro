
import { ScanRequest, ScanResult, ScanEvent } from '../types';
import { clientDb } from '../lib/clientDb';

export const api = {
  startScan: async (request: ScanRequest): Promise<{ scanId: string }> => {
    if (!navigator.onLine) {
        throw new Error('Cannot start new scan while offline.');
    }
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error('Failed to start scan');
    return res.json();
  },

  getScan: async (scanId: string): Promise<ScanResult> => {
    try {
      if (navigator.onLine) {
        const res = await fetch(`/api/scan/${scanId}`);
        if (res.ok) {
          const scan = await res.json();
          // Cache to IDB
          await clientDb.saveScan(scan);
          return scan;
        }
      }
      // Fallback to offline DB
      const cached = await clientDb.getScan(scanId);
      if (cached) return cached;
      throw new Error('Scan not found locally or remotely');
    } catch (e) {
      // If fetch fails (network error), try IDB
      const cached = await clientDb.getScan(scanId);
      if (cached) return cached;
      throw e;
    }
  },

  cancelScan: async (scanId: string): Promise<void> => {
    if (!navigator.onLine) return; // Cannot cancel if offline
    await fetch(`/api/scan/${scanId}/cancel`, { method: 'POST' });
  },

  subscribeToScan: (scanId: string, callback: (event: ScanEvent) => void) => {
    if (!navigator.onLine) return () => {};

    const eventSource = new EventSource(`/api/scan/${scanId}/stream`);
    
    eventSource.onmessage = (e) => {
      try {
        const event: ScanEvent = JSON.parse(e.data);
        callback(event);
        if (event.status === 'completed' || (event.status === 'error' && event.module === 'system')) {
          eventSource.close();
          // Trigger a re-fetch of the full object to cache it
          api.getScan(scanId).catch(console.error);
        }
      } catch (err) {
        console.error('SSE Parse Error', err);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE Error');
      // eventSource.close(); 
    };

    return () => eventSource.close();
  },
  
  getHistory: async (): Promise<ScanResult[]> => {
    try {
      if (navigator.onLine) {
        // Since we are using a mock backend without a real DB persistence in this demo,
        // we might not actually have an API endpoint for listing history in the mock server code provided previously.
        // However, assuming one existed or we use the store.
        // For the purpose of this "Offline" upgrade, we rely heavily on the local DB as the source of truth for history
        // because the "Server" in this Vercel/Mock context wipes on restart.
        // So we will just return local DB.
        // But if there WAS a server endpoint:
        /*
        const res = await fetch('/api/history');
        if (res.ok) {
            const list = await res.json();
            for (const s of list) await clientDb.saveScan(s);
            return list;
        }
        */
      }
      return await clientDb.getAllScans();
    } catch (e) {
      return await clientDb.getAllScans();
    }
  }
};
