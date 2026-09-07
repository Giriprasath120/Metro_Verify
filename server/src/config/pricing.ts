// Centralized Statutory Pricing Schedule per Legal Metrology (General) Rules, 2011 (Schedule IX)

export interface FeeBreakdown {
  category: string;
  subCategory?: string;
  statutoryFee: number;
  haulageFee: number;
  totalFee: number;
  ruleReference: string;
}

export const STATUTORY_FEE_SCHEDULE: Record<string, { statutory: number; haulage: number; rule: string }> = {
  'Electronic Weighbridge': {
    statutory: 3500,
    haulage: 1500,
    rule: 'Schedule IX, Part II - Heavy Road Weighbridges'
  },
  'Non-Automatic Weighing Instrument': {
    statutory: 400,
    haulage: 100,
    rule: 'Schedule IX, Part I - Non-Automatic Commercial Scales'
  },
  'Flow Meter': {
    statutory: 8000,
    haulage: 1000,
    rule: 'Schedule IX, Part IV - Coriolis Mass Flow Meters'
  },
  'Petrol Pump Dispensing Unit': {
    statutory: 2500,
    haulage: 500,
    rule: 'Schedule IX, Part III - Petroleum Measuring Dispensing Units'
  },
  'Gas Meter': {
    statutory: 1500,
    haulage: 300,
    rule: 'Schedule IX, Part V - Diaphragm & Turbine Gas Meters'
  },
  'Energy Meter': {
    statutory: 4500,
    haulage: 500,
    rule: 'Schedule IX, Part VI - AC Static HT Energy Meters'
  },
  'Water Meter': {
    statutory: 2000,
    haulage: 400,
    rule: 'Schedule IX, Part VII - Bulk Woltman Potable Water Meters'
  },
  'Taxi/Auto Fare Meter': {
    statutory: 500,
    haulage: 100,
    rule: 'Schedule IX, Part VIII - Commercial Auto/Taxi Fare Meters'
  },
  'Weights of All Categories': {
    statutory: 800,
    haulage: 200,
    rule: 'Schedule IX, Part IX - Standard Commercial & Precision Working Weights'
  },
  'Automatic Gravimetric Filling Instrument': {
    statutory: 4000,
    haulage: 800,
    rule: 'Schedule IX, Part X - Automatic Industrial Gravimetric Filling Machines'
  }
};

/**
 * Parse capacity string (e.g. "50 kg", "60 Tonnes", "500g", "100 Ton") to kilograms
 */
export function parseCapacityKg(capacityStr?: string | number): number {
  if (!capacityStr) return 50; // default 50 kg
  if (typeof capacityStr === 'number') return capacityStr;
  
  const clean = capacityStr.trim().toLowerCase();
  const numMatch = clean.match(/([0-9]+(\.[0-9]+)?)/);
  if (!numMatch) return 50;
  
  const val = parseFloat(numMatch[1]);
  if (clean.includes('ton') || clean.includes('tonne') || clean.includes('t')) {
    return val * 1000;
  }
  if (clean.includes('quintal') || clean.includes('q')) {
    return val * 100;
  }
  if (clean.includes('mg')) {
    return val / 1000000;
  }
  if (clean.includes('g') && !clean.includes('kg')) {
    return val / 1000;
  }
  return val; // default kg
}

/**
 * Dynamically computes statutory verification fee for any instrument based on category, accuracy class, and capacity
 * Follows Legal Metrology (General) Rules, 2011 Schedule IX fee slabs:
 * - Commercial Scales <= 50kg: ₹400 statutory + ₹100 haulage = ₹500
 * - Medium Platform 51kg - 500kg: ₹800 statutory + ₹200 haulage = ₹1,000
 * - Heavy Industrial 501kg - 5,000kg: ₹1,800 statutory + ₹400 haulage = ₹2,200
 * - Heavy Weighbridges 5T - 50T: ₹3,500 statutory + ₹1,500 haulage = ₹5,000
 * - Ultra-Heavy Weighbridges > 50T: ₹5,500 statutory + ₹2,000 haulage = ₹7,500
 */
export function calculateVerificationFee(category: string, accuracyClass?: string, capacity?: string | number): FeeBreakdown {
  const capKg = parseCapacityKg(capacity);
  const catLower = category.toLowerCase();

  // 1. Electronic Weighbridge / Heavy Vehicle Scales
  if (catLower.includes('weighbridge') || catLower.includes('vehicle')) {
    if (capKg > 60000) {
      return {
        category: `Electronic Weighbridge (>60 Tonnes: ${capacity || '60T+'})`,
        statutoryFee: 6500,
        haulageFee: 2500,
        totalFee: 9000,
        ruleReference: 'Schedule IX, Part II - Heavy Road Weighbridge (>60 Tonnes)'
      };
    } else if (capKg > 30000) {
      return {
        category: `Electronic Weighbridge (30T - 60T: ${capacity || '50T'})`,
        statutoryFee: 4500,
        haulageFee: 1800,
        totalFee: 6300,
        ruleReference: 'Schedule IX, Part II - Multi-Axle Road Weighbridge (30T-60T)'
      };
    } else {
      return {
        category: `Electronic Weighbridge (Up to 30 Tonnes: ${capacity || '30T'})`,
        statutoryFee: 3500,
        haulageFee: 1500,
        totalFee: 5000,
        ruleReference: 'Schedule IX, Part II - Standard Road Weighbridge (Up to 30T)'
      };
    }
  }

  // 2. Non-Automatic Weighing Instruments (NAWI) - scales dynamically scaled by capacity
  if (catLower.includes('non-automatic') || catLower.includes('nawi') || catLower.includes('scale') || catLower.includes('bench') || catLower.includes('platform')) {
    // Check special Class I / II for Bullion / Laboratory
    if (accuracyClass?.includes('Class I')) {
      return {
        category: `NAWI Class I High Precision Bullion (${capacity || 'Class I'})`,
        statutoryFee: 5000,
        haulageFee: 500,
        totalFee: 5500,
        ruleReference: 'Schedule IX, Part I - Precision Analytical Balances'
      };
    }
    if (accuracyClass?.includes('Class II')) {
      return {
        category: `NAWI Class II Laboratory Analytical (${capacity || 'Class II'})`,
        statutoryFee: 2500,
        haulageFee: 400,
        totalFee: 2900,
        ruleReference: 'Schedule IX, Part I - Laboratory Balances'
      };
    }

    // Capacity-based slabs for commercial Class III / IV scales
    if (capKg <= 50) {
      return {
        category: `Commercial Scale (<=50 kg: ${capacity || '50 kg'})`,
        statutoryFee: 400,
        haulageFee: 100,
        totalFee: 500,
        ruleReference: 'Schedule IX, Part I - Retail Counter & Bench Scales (<= 50 kg)'
      };
    } else if (capKg <= 200) {
      return {
        category: `Medium Platform Scale (51-200 kg: ${capacity || '200 kg'})`,
        statutoryFee: 800,
        haulageFee: 200,
        totalFee: 1000,
        ruleReference: 'Schedule IX, Part I - Medium Platform Scales (50 kg to 200 kg)'
      };
    } else if (capKg <= 1000) {
      return {
        category: `Heavy Platform Scale (201-1000 kg: ${capacity || '1 Ton'})`,
        statutoryFee: 1500,
        haulageFee: 350,
        totalFee: 1850,
        ruleReference: 'Schedule IX, Part I - Heavy Industrial Platform Scales (200 kg to 1000 kg)'
      };
    } else {
      return {
        category: `Industrial Dormant Scale (>1000 kg: ${capacity || '1T+'})`,
        statutoryFee: 2500,
        haulageFee: 600,
        totalFee: 3100,
        ruleReference: 'Schedule IX, Part I - Dormant Heavy Industrial Scales (> 1 Ton)'
      };
    }
  }

  // 3. Flow Meters & Dispensing Units
  if (catLower.includes('flow') || catLower.includes('dispenser') || catLower.includes('petrol')) {
    const baseStat = catLower.includes('flow') ? 8000 : 2500;
    const baseHaul = catLower.includes('flow') ? 1000 : 500;
    return {
      category: `${category} (${capacity || 'Standard Flow'})`,
      statutoryFee: baseStat,
      haulageFee: baseHaul,
      totalFee: baseStat + baseHaul,
      ruleReference: 'Schedule IX, Part III & IV - Fluid Metering & Dispensing Systems'
    };
  }

  // Default standard match
  const match = STATUTORY_FEE_SCHEDULE[category] || {
    statutory: 800,
    haulage: 200,
    rule: 'Schedule IX - Standard Verification Schedule'
  };

  return {
    category: `${category} (${capacity || 'Standard'})`,
    statutoryFee: match.statutory,
    haulageFee: match.haulage,
    totalFee: match.statutory + match.haulage,
    ruleReference: match.rule
  };
}
