
import { ScanResult } from '../types';
import { db } from './db';
import { scans } from './db/schema';
import { eq, desc } from 'drizzle-orm';

// --- In-Memory Fallback Store (for "No Backend Persistence" mode) ---
// This allows the scanner to function ephemerally if MySQL isn't configured.
const memoryStore = new Map<string, ScanResult>();

const hasDb = !!process.env.DATABASE_URL;

// Helper to cast DB result to ScanResult type
const mapToScanResult = (row: typeof scans.$inferSelect): ScanResult => {
  return {
    id: row.id,
    target: row.target,
    status: row.status as ScanResult['status'],
    startTime: row.startTime,
    endTime: row.endTime || undefined,
    findings: (row.findings as any[]) || [],
    events: (row.events as any[]) || [],
    stats: (row.stats as any) || { total: 0, critical: 0, high: 0, medium: 0, low: 0, modulesCompleted: 0, durationMs: 0 },
    compliance: (row.compliance as any[]) || undefined,
    activeRulePackIds: (row.activeRulePackIds as string[]) || [],
    benchmark: (row.benchmark as any) || undefined,
    insights: (row.insights as any) || undefined,
  };
};

export const getScan = async (id: string): Promise<ScanResult | undefined> => {
  try {
    if (hasDb) {
      const result = await db.select().from(scans).where(eq(scans.id, id)).limit(1);
      if (result.length === 0) return undefined;
      return mapToScanResult(result[0]);
    } else {
      return memoryStore.get(id);
    }
  } catch (e) {
    console.warn(`Store Error (getScan ${id}):`, e);
    // Fallback to memory on DB error to keep app alive
    return memoryStore.get(id);
  }
};

export const saveScan = async (scan: ScanResult): Promise<void> => {
  // Always save to memory for immediate consistency in this process
  memoryStore.set(scan.id, scan);

  try {
    if (hasDb) {
      await db.insert(scans).values({
        id: scan.id,
        target: scan.target,
        status: scan.status,
        startTime: scan.startTime,
        endTime: scan.endTime,
        findings: scan.findings,
        events: scan.events,
        stats: scan.stats,
        compliance: scan.compliance,
        activeRulePackIds: scan.activeRulePackIds,
        benchmark: scan.benchmark,
        insights: scan.insights,
      }).onDuplicateKeyUpdate({
        set: {
          status: scan.status,
          endTime: scan.endTime,
          findings: scan.findings,
          events: scan.events,
          stats: scan.stats,
          compliance: scan.compliance,
          benchmark: scan.benchmark,
          insights: scan.insights,
        }
      });
    }
  } catch (e) {
    console.warn(`Store Error (saveScan ${scan.id}):`, e);
  }
};

export const isCancelled = async (id: string): Promise<boolean> => {
  try {
    if (hasDb) {
      const result = await db.select({ status: scans.status }).from(scans).where(eq(scans.id, id)).limit(1);
      return result.length > 0 && result[0].status === 'cancelled';
    } else {
      const s = memoryStore.get(id);
      return s?.status === 'cancelled';
    }
  } catch (e) {
    return false;
  }
};

export const cancelScan = async (id: string): Promise<void> => {
  // Update memory immediately
  const memScan = memoryStore.get(id);
  if (memScan) {
    memScan.status = 'cancelled';
    memoryStore.set(id, memScan);
  }

  try {
    if (hasDb) {
      await db.update(scans).set({ status: 'cancelled' }).where(eq(scans.id, id));
    }
  } catch (e) {
    console.warn(`Store Error (cancelScan ${id}):`, e);
  }
};

export const getAllScans = async (): Promise<ScanResult[]> => {
  try {
    if (hasDb) {
      const results = await db.select().from(scans).orderBy(desc(scans.createdAt));
      return results.map(mapToScanResult);
    } else {
      return Array.from(memoryStore.values()).sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    }
  } catch (e) {
    console.error("Store Error (getAllScans):", e);
    // Fallback to memory
    return Array.from(memoryStore.values());
  }
};
