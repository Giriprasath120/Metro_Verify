// Persistent Offline Verification Queue Service
import { API_ENDPOINTS } from '../config/api';
import { getOfficerToken } from './authService';

export interface OfflineVerificationItem {
  localId: string;
  assignmentId?: string;
  instrumentId: string;
  instrumentModel?: string;
  category?: string;
  ownerName?: string;
  ownerAddress?: string;
  result: 'PASS' | 'FAIL';
  standardWeight: string;
  indicatedValue: string;
  errorMargin: string;
  toleranceLimit: string;
  observations: string;
  remarks?: string;
  photoReference?: string;
  latitude?: number;
  longitude?: number;
  locationTimestamp?: string;
  queuedAt: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'ERROR';
  errorMessage?: string;
}

const STORAGE_KEY = 'metro_verify_offline_queue';

let memoryQueue: OfflineVerificationItem[] = [];

// Initialize from localStorage if web environment
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      memoryQueue = JSON.parse(raw);
    }
  }
} catch (e) {
  // Ignore
}

const saveQueue = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryQueue));
    }
  } catch (e) {}
};

export const getOfflineQueue = (): OfflineVerificationItem[] => {
  return [...memoryQueue];
};

export const addToOfflineQueue = (item: Omit<OfflineVerificationItem, 'localId' | 'queuedAt' | 'syncStatus'>): OfflineVerificationItem => {
  const localId = `LOCAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newItem: OfflineVerificationItem = {
    ...item,
    localId,
    queuedAt: new Date().toISOString(),
    syncStatus: 'PENDING',
  };

  memoryQueue.unshift(newItem);
  saveQueue();
  return newItem;
};

export const removeOfflineItem = (localId: string): boolean => {
  const index = memoryQueue.findIndex((i) => i.localId === localId);
  if (index !== -1) {
    memoryQueue.splice(index, 1);
    saveQueue();
    return true;
  }
  return false;
};

export const syncOfflineQueue = async (): Promise<{
  success: boolean;
  syncedCount: number;
  remainingCount: number;
  error?: string;
}> => {
  if (memoryQueue.length === 0) {
    return { success: true, syncedCount: 0, remainingCount: 0 };
  }

  const token = getOfficerToken();
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(API_ENDPOINTS.offlineSync, {
      method: 'POST',
      headers,
      body: JSON.stringify({ verifications: memoryQueue }),
    });

    const data = await res.json();
    if (data.success && Array.isArray(data.results)) {
      const syncedIds = new Set(
        data.results
          .filter((r: any) => r.status === 'SYNCED' || r.status === 'ALREADY_SYNCED')
          .map((r: any) => r.localId)
      );

      // Remove successfully synced items from local queue
      memoryQueue = memoryQueue.filter((item) => !syncedIds.has(item.localId));
      saveQueue();

      return {
        success: true,
        syncedCount: syncedIds.size,
        remainingCount: memoryQueue.length,
      };
    } else {
      return {
        success: false,
        syncedCount: 0,
        remainingCount: memoryQueue.length,
        error: data.error || 'Sync request failed',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      syncedCount: 0,
      remainingCount: memoryQueue.length,
      error: err.message || 'Network error during sync',
    };
  }
};
