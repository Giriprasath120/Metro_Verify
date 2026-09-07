// server/src/utils/allocationEngine.ts
import { Officer, Instrument } from '../data/mockData';

export interface AllocationRequest {
  requestId?: string;
  instrumentId?: string;
  instrumentName?: string;
  category?: string;
  state: string;
  district: string;
  requestedDate: string; // YYYY-MM-DD
  timeSlot?: string; // e.g., '10:00 AM - 01:00 PM'
  lat?: number;
  lng?: number;
  isBulk?: boolean;
  batchCount?: number;
}

export interface OfficerScoreResult {
  officer: Officer & { slotBookings?: number; maxCapacity?: number; rating?: number };
  totalScore: number;
  eligible: boolean;
  distanceKm: number;
  breakdown: {
    jurisdictionScore: number;
    distanceScore: number;
    workloadScore: number;
    availabilityScore: number;
  };
  explanation: string;
}

export interface SingleAllocationResponse {
  suggestedOfficer: OfficerScoreResult;
  allRankedOfficers: OfficerScoreResult[];
  timestamp: string;
}

export interface BulkAllocationDistribution {
  officerId: string;
  officerName: string;
  role: 'LMO' | 'GATC';
  badgeNumber: string;
  district: string;
  allocatedCount: number;
  initialWorkload: number;
  projectedWorkload: number;
  score: number;
}

export interface BulkAllocationResponse {
  totalInstruments: number;
  summaryText: string;
  distributions: BulkAllocationDistribution[];
  topOfficers: OfficerScoreResult[];
  timestamp: string;
}

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const districtCoordinates: Record<string, { lat: number; lng: number }> = {
  'Chennai North': { lat: 17.4485, lng: 78.487 },
  'Chennai South': { lat: 17.3616, lng: 78.4747 },
  'Guindy': { lat: 17.4399, lng: 78.4983 },
  'Charminar Zone': { lat: 17.3616, lng: 78.4747 },
  'Cyberabad West': { lat: 17.4399, lng: 78.38 },
  'Pune Industrial': { lat: 18.6279, lng: 73.8131 },
  'New Delhi Central': { lat: 28.6433, lng: 77.1895 },
  'Lucknow Industrial': { lat: 26.8467, lng: 80.9462 },
  'Bengaluru Urban': { lat: 12.9716, lng: 77.5946 },
  'Chennai Port GATC': { lat: 13.0827, lng: 80.2707 },
  'Ahmedabad West': { lat: 23.0225, lng: 72.5714 },
  'Visakhapatnam Port Area': { lat: 17.6868, lng: 83.2185 },
  'Ludhiana GT Road': { lat: 30.901, lng: 75.8573 },
  'Jaipur City': { lat: 26.9124, lng: 75.7873 }
};

const HYDERABAD_METRO_ZONES = new Set([
  'hyderabad',
  'hyderabad north',
  'hyderabad south',
  'secunderabad',
  'charminar zone',
  'charminar',
  'cyberabad west',
  'cyberabad',
  'cyberabad east'
]);

export function scoreOfficer(request: AllocationRequest, officer: any): OfficerScoreResult {
  const reqDistrict = (request.district || '').trim().toLowerCase();
  const offDistrict = (officer.district || '').trim().toLowerCase();
  const reqState = (request.state || '').trim().toLowerCase();
  const offState = (officer.state || '').trim().toLowerCase();

  let jurisdictionScore = 0;
  let isEligible = true;

  const isExactDistrict = reqDistrict === offDistrict;
  const isExactState = reqState === offState;
  const isMetroBoth = HYDERABAD_METRO_ZONES.has(reqDistrict) && HYDERABAD_METRO_ZONES.has(offDistrict);

  if (officer.role === 'GATC') {
    if (!isExactState) {
      isEligible = false;
      jurisdictionScore = 0;
    } else if (isExactDistrict) {
      jurisdictionScore = 35;
    } else {
      jurisdictionScore = 20;
    }
  } else {
    if (isExactDistrict) {
      jurisdictionScore = 35;
    } else if (isMetroBoth) {
      jurisdictionScore = 30; // Sister zone within Greater Chennai metropolitan limit
    } else if (isExactState) {
      jurisdictionScore = 20;
    } else {
      jurisdictionScore = 5;
    }
  }

  const reqLat = request.lat ?? districtCoordinates[request.district]?.lat ?? 17.4485;
  const reqLng = request.lng ?? districtCoordinates[request.district]?.lng ?? 78.487;
  const distKm = calculateDistanceKm(reqLat, reqLng, officer.lat, officer.lng);

  const distanceScore = Math.max(0, Math.round(20 - distKm * 0.5));

  // Dynamic Workload Balancing: 50 base points, -10 per active pending job
  const pending = Number(officer.pendingJobs ?? officer.currentWorkload ?? 0);
  const maxCap = Number(officer.maxCapacity || 15);
  let workloadScore = Math.max(-50, Math.round(50 - pending * 10));

  if (pending >= maxCap) {
    workloadScore = -80; // Saturated capacity penalty
  }

  // Time Slot Capacity & Working Hours Enforcement
  const isDateOpen = !officer.availableDates || officer.availableDates.length === 0 || officer.availableDates.includes(request.requestedDate);
  const slotBookings = Number(officer.slotBookings ?? 0);
  let availabilityScore = 0;

  if (slotBookings >= 2) {
    // Time slot capacity exceeded (> 2 inspections booked in this slot)
    availabilityScore = -80;
  } else if (slotBookings === 1) {
    availabilityScore = 10;
  } else if (isDateOpen) {
    availabilityScore = 25; // Working time slot completely free
  } else {
    availabilityScore = 0;
  }

  const totalScore = isEligible ? jurisdictionScore + distanceScore + workloadScore + availabilityScore : 0;

  const reasons: string[] = [];
  if (isExactDistrict) {
    reasons.push('Same sub-district jurisdiction (+35)');
  } else if (isMetroBoth) {
    reasons.push('Metropolitan sister-zone coverage (+30)');
  } else if (isExactState) {
    reasons.push('Same state jurisdiction (+20)');
  } else {
    reasons.push('Cross-jurisdiction (+5)');
  }

  reasons.push(`${distKm}km distance (+${distanceScore})`);
  reasons.push(`${pending} pending cases (${workloadScore >= 0 ? '+' : ''}${workloadScore} workload)`);

  if (slotBookings >= 2) {
    reasons.push('⚠️ Time slot exceeded (max 2/slot, -80)');
  } else if (slotBookings === 1) {
    reasons.push('Time slot partially booked (1 case, +10)');
  } else if (isDateOpen) {
    reasons.push(`Working time slot open on ${request.requestedDate} (+25)`);
  } else {
    reasons.push(`Off-schedule on ${request.requestedDate} (+0)`);
  }

  const explanation = reasons.join(' • ');

  return {
    officer,
    totalScore,
    eligible: isEligible && totalScore > -40,
    distanceKm: distKm,
    breakdown: {
      jurisdictionScore,
      distanceScore,
      workloadScore,
      availabilityScore
    },
    explanation
  };
}

export function allocateSingleSlot(request: AllocationRequest, officers: Officer[]): SingleAllocationResponse {
  const scored = officers
    .map(officer => scoreOfficer(request, officer))
    .filter(res => res.eligible)
    .sort((a, b) => {
      // Primary: totalScore descending
      const diff = b.totalScore - a.totalScore;
      if (Math.abs(diff) > 3) return diff;
      // Secondary: least pending cases
      const pendingDiff = (a.officer.pendingJobs ?? 0) - (b.officer.pendingJobs ?? 0);
      if (pendingDiff !== 0) return pendingDiff;
      // Tertiary: least slot bookings
      return ((a.officer as any).slotBookings ?? 0) - ((b.officer as any).slotBookings ?? 0);
    });

  const suggestedOfficer = scored[0] || scoreOfficer(request, officers[0]);

  return {
    suggestedOfficer,
    allRankedOfficers: scored,
    timestamp: new Date().toISOString()
  };
}

export function allocateBulkBatch(request: AllocationRequest, officers: Officer[]): BulkAllocationResponse {
  const totalInstruments = Math.max(1, request.batchCount || 25);

  const ranked = officers
    .map(officer => scoreOfficer(request, officer))
    .filter(res => res.eligible && res.totalScore > 20)
    .sort((a, b) => b.totalScore - a.totalScore);

  const officerCountToUse = totalInstruments <= 10 ? Math.min(2, ranked.length) : Math.min(3, ranked.length);
  const selectedOfficers = ranked.slice(0, Math.max(1, officerCountToUse));

  const totalBaseWeight = selectedOfficers.reduce((acc, curr) => {
    const workloadWeight = Math.max(1, 10 - curr.officer.pendingJobs);
    return acc + curr.totalScore * workloadWeight;
  }, 0);

  let remaining = totalInstruments;
  const distributions: BulkAllocationDistribution[] = [];

  selectedOfficers.forEach((item, index) => {
    let count: number;
    if (index === selectedOfficers.length - 1) {
      count = remaining;
    } else {
      const workloadWeight = Math.max(1, 10 - item.officer.pendingJobs);
      const ratio = (item.totalScore * workloadWeight) / totalBaseWeight;
      count = Math.max(1, Math.round(totalInstruments * ratio));
      if (count > remaining - (selectedOfficers.length - index - 1)) {
        count = Math.max(1, remaining - (selectedOfficers.length - index - 1));
      }
    }
    remaining -= count;

    distributions.push({
      officerId: item.officer.id,
      officerName: item.officer.name,
      role: item.officer.role,
      badgeNumber: item.officer.badgeNumber,
      district: item.officer.district,
      allocatedCount: count,
      initialWorkload: item.officer.pendingJobs,
      projectedWorkload: item.officer.pendingJobs + count,
      score: item.totalScore
    });
  });

  const summaryParts = distributions.map(d => `${d.officerName.split(' ')[0]}: ${d.allocatedCount}`);
  const summaryText = `Batch of ${totalInstruments} → ${summaryParts.join(', ')}`;

  return {
    totalInstruments,
    summaryText,
    distributions,
    topOfficers: ranked,
    timestamp: new Date().toISOString()
  };
}
