// allocationEngine.ts - Deterministic Legal Metrology Slot Allocation Algorithm
// Used by both the mobile client and the Express backend (/schedule/allocate)

import { Officer, Instrument } from '../data/mockData';

export interface AllocationRequest {
  requestId?: string;
  instrumentId?: string;
  instrumentName?: string;
  category?: string;
  state: string;
  district: string;
  requestedDate: string; // YYYY-MM-DD
  lat?: number;
  lng?: number;
  isBulk?: boolean;
  batchCount?: number;
}

export interface OfficerScoreResult {
  officer: Officer;
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

/**
 * Calculates straight line distance in km between two GPS coordinates using the Haversine formula
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
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

// Fallback coordinates for known test districts
const districtCoordinates: Record<string, { lat: number; lng: number }> = {
  'Hyderabad North': { lat: 17.4485, lng: 78.487 },
  'Hyderabad South': { lat: 17.3616, lng: 78.4747 },
  'Secunderabad': { lat: 17.4399, lng: 78.4983 },
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

/**
 * Deterministic scoring function: scoreOfficer(request, officer)
 * - Jurisdiction match: +40 pts if district/state matches (hard filter for GATCs, soft preference for LMOs)
 * - Distance: up to +30 pts, decreasing linearly as distance (km) increases
 * - Current workload: up to +20 pts, decreasing as pending jobs increase
 * - Availability: +10 pts if officer has open slot on requested date, 0 otherwise
 */
export function scoreOfficer(request: AllocationRequest, officer: Officer): OfficerScoreResult {
  const reqDistrict = (request.district || '').trim().toLowerCase();
  const offDistrict = (officer.district || '').trim().toLowerCase();
  const reqState = (request.state || '').trim().toLowerCase();
  const offState = (officer.state || '').trim().toLowerCase();

  // 1. Jurisdiction Match (+40 points)
  let jurisdictionScore = 0;
  let isEligible = true;

  const isExactDistrict = reqDistrict === offDistrict;
  const isExactState = reqState === offState;

  if (officer.role === 'GATC') {
    // Hard filter for GATC: Must match state, and preferably district
    if (!isExactState) {
      isEligible = false;
      jurisdictionScore = 0;
    } else if (isExactDistrict) {
      jurisdictionScore = 40;
    } else {
      jurisdictionScore = 20; // Regional GATC lab coverage within state
    }
  } else {
    // LMO: Soft preference
    if (isExactDistrict) {
      jurisdictionScore = 40;
    } else if (isExactState) {
      jurisdictionScore = 20; // Adjacent sub-division inside state
    } else {
      jurisdictionScore = 5; // Inter-state mutual aid
    }
  }

  // 2. Distance Calculation (up to +30 points)
  const reqLat = request.lat ?? districtCoordinates[request.district]?.lat ?? 17.4485;
  const reqLng = request.lng ?? districtCoordinates[request.district]?.lng ?? 78.487;
  const distKm = calculateDistanceKm(reqLat, reqLng, officer.lat, officer.lng);

  // Decreasing linearly: 30 at 0km, 0 at 40km or more
  const distanceScore = Math.max(0, Math.round(30 - distKm * 0.75));

  // 3. Current Workload (up to +20 points)
  // Max 20 points, decreasing by 2.5 per pending job
  const workloadScore = Math.max(0, Math.round(20 - officer.pendingJobs * 2.5));

  // 4. Availability (+10 points)
  const isAvailable = officer.availableDates.includes(request.requestedDate);
  const availabilityScore = isAvailable ? 10 : 0;

  const totalScore = isEligible ? jurisdictionScore + distanceScore + workloadScore + availabilityScore : 0;

  // Build human-explainable rationale
  const reasons: string[] = [];
  if (isExactDistrict) {
    reasons.push('Same district jurisdiction (+40)');
  } else if (isExactState) {
    reasons.push('Same state jurisdiction (+20)');
  } else {
    reasons.push('Cross-jurisdiction');
  }

  if (distKm <= 8) {
    reasons.push(`Closest match, ${distKm}km away (+${distanceScore})`);
  } else {
    reasons.push(`${distKm}km travel distance (+${distanceScore})`);
  }

  reasons.push(`${officer.pendingJobs} active pending jobs (+${workloadScore})`);

  if (isAvailable) {
    reasons.push(`Slot open on ${request.requestedDate} (+10)`);
  } else {
    reasons.push(`No direct slot on ${request.requestedDate} (+0)`);
  }

  const explanation = reasons.join(', ');

  return {
    officer,
    totalScore,
    eligible: isEligible,
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

/**
 * Rank officers for a single instrument request and return the top suggested officer
 */
export function allocateSingleSlot(request: AllocationRequest, officers: Officer[]): SingleAllocationResponse {
  const scored = officers
    .map(officer => scoreOfficer(request, officer))
    .filter(res => res.eligible)
    .sort((a, b) => b.totalScore - a.totalScore);

  const suggestedOfficer = scored[0] || scoreOfficer(request, officers[0]);

  return {
    suggestedOfficer,
    allRankedOfficers: scored,
    timestamp: new Date().toISOString()
  };
}

/**
 * Distribute a bulk batch across the top 2-4 eligible officers
 * Balances workload proportionally while respecting jurisdiction
 */
export function allocateBulkBatch(request: AllocationRequest, officers: Officer[]): BulkAllocationResponse {
  const totalInstruments = Math.max(1, request.batchCount || 25);

  // 1. Rank all eligible officers
  const ranked = officers
    .map(officer => scoreOfficer(request, officer))
    .filter(res => res.eligible && res.totalScore > 20)
    .sort((a, b) => b.totalScore - a.totalScore);

  // Pick top 2 to 4 officers depending on batch size
  const officerCountToUse = totalInstruments <= 10 ? Math.min(2, ranked.length) : Math.min(3, ranked.length);
  const selectedOfficers = ranked.slice(0, Math.max(1, officerCountToUse));

  // Compute workload inverse weights to balance post-allocation jobs
  // Lower existing pending jobs = higher share of new instruments
  const totalBaseWeight = selectedOfficers.reduce((acc, curr) => {
    // Score weight combined with inverted workload
    const workloadWeight = Math.max(1, 10 - curr.officer.pendingJobs);
    return acc + curr.totalScore * workloadWeight;
  }, 0);

  let remaining = totalInstruments;
  const distributions: BulkAllocationDistribution[] = [];

  selectedOfficers.forEach((item, index) => {
    let count: number;
    if (index === selectedOfficers.length - 1) {
      count = remaining; // Assign remainder to last officer
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

  // Build human-friendly summary text e.g. "Batch of 25 → Officer A: 10, Officer B: 9, Officer C: 6"
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
