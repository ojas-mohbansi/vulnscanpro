
import { ScanResult } from '../types';

const DB_NAME = 'vulnscan-db';
const DB_VERSION = 1;
const STORE_SCANS = 'scans';
const CACHE_LIMIT_BYTES = 50 * 1024 * 1024; // 50MB

class ClientDB {
  private db: IDBDatabase | null = null;

  async connect(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_SCANS)) {
          db.createObjectStore(STORE_SCANS, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async saveScan(scan: ScanResult): Promise<void> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_SCANS], 'readwrite');
      const store = transaction.objectStore(STORE_SCANS);
      const request = store.put(scan);

      request.onsuccess = () => {
        // Trigger eviction check asynchronously after save
        this.enforceLimits().catch(console.error);
        // Notify app of update
        window.dispatchEvent(new CustomEvent('scan-updated', { detail: { id: scan.id } }));
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getScan(id: string): Promise<ScanResult | undefined> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_SCANS], 'readonly');
      const store = transaction.objectStore(STORE_SCANS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllScans(): Promise<ScanResult[]> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_SCANS], 'readonly');
      const store = transaction.objectStore(STORE_SCANS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteScan(id: string): Promise<void> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_SCANS], 'readwrite');
        const store = transaction.objectStore(STORE_SCANS);
        const request = store.delete(id);
        
        request.onsuccess = () => {
            window.dispatchEvent(new CustomEvent('scan-updated', { detail: { id } }));
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
  }

  // LRU Eviction Policy based on size
  private async enforceLimits(): Promise<void> {
    try {
      const scans = await this.getAllScans();
      if (scans.length === 0) return;

      // Calculate sizes
      let totalSize = 0;
      const scanMeta = scans.map(s => {
        // Rough size approximation (UTF-16 chars * 2 bytes)
        const size = JSON.stringify(s).length * 2;
        totalSize += size;
        return { id: s.id, date: new Date(s.startTime).getTime(), size };
      });

      if (totalSize <= CACHE_LIMIT_BYTES) return;

      console.log(`Cache size ${totalSize} exceeds limit ${CACHE_LIMIT_BYTES}. Evicting old scans...`);

      // Sort by date ascending (oldest first)
      scanMeta.sort((a, b) => a.date - b.date);

      const toDelete: string[] = [];
      let sizeToFree = totalSize - CACHE_LIMIT_BYTES + (5 * 1024 * 1024); // Free extra 5MB buffer

      for (const item of scanMeta) {
        if (sizeToFree <= 0) break;
        toDelete.push(item.id);
        sizeToFree -= item.size;
      }

      if (toDelete.length > 0) {
        const db = await this.connect();
        const tx = db.transaction([STORE_SCANS], 'readwrite');
        const store = tx.objectStore(STORE_SCANS);
        
        toDelete.forEach(id => {
          store.delete(id);
        });
        
        console.log(`Evicted ${toDelete.length} scans.`);
      }
    } catch (e) {
      console.error('Error during cache eviction:', e);
    }
  }

  // --- Export / Import ---

  async exportDatabase(): Promise<string> {
    const scans = await this.getAllScans();
    return JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        scans
    }, null, 2);
  }

  async importDatabase(jsonString: string): Promise<number> {
    try {
        const data = JSON.parse(jsonString);
        if (!data.scans || !Array.isArray(data.scans)) {
            throw new Error("Invalid format");
        }

        let count = 0;
        for (const scan of data.scans) {
            // Basic validation
            if (scan.id && scan.target && scan.startTime) {
                await this.saveScan(scan);
                count++;
            }
        }
        return count;
    } catch (e) {
        console.error("Import failed", e);
        throw e;
    }
  }
  
  async clearDatabase(): Promise<void> {
      const db = await this.connect();
      return new Promise((resolve, reject) => {
          const tx = db.transaction([STORE_SCANS], 'readwrite');
          const store = tx.objectStore(STORE_SCANS);
          const req = store.clear();
          req.onsuccess = () => {
              window.dispatchEvent(new CustomEvent('scan-updated'));
              resolve();
          };
          req.onerror = () => reject(req.error);
      });
  }
}

export const clientDb = new ClientDB();
