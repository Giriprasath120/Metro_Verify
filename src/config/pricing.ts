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
 * Dynamically computes verification fee for any instrument based on its category and accuracy class
 */
export function calculateVerificationFee(category: string, accuracyClass?: string): FeeBreakdown {
  // Check special Class I / II for NAWI
  if (category.toLowerCase().includes('non-automatic') || category.toLowerCase().includes('nawi')) {
    if (accuracyClass?.includes('Class I')) {
      return {
        category: 'NAWI Class I (High Precision Bullion)',
        statutoryFee: 5000,
        haulageFee: 500,
        totalFee: 5500,
        ruleReference: 'Schedule IX, Part I - Precision Analytical Balances'
      };
    }
    if (accuracyClass?.includes('Class II')) {
      return {
        category: 'NAWI Class II (Laboratory Analytical)',
        statutoryFee: 2500,
        haulageFee: 400,
        totalFee: 2900,
        ruleReference: 'Schedule IX, Part I - Laboratory Balances'
      };
    }
    if (accuracyClass?.includes('Class IV')) {
      return {
        category: 'NAWI Class IV (Heavy Floor Platform)',
        statutoryFee: 1000,
        haulageFee: 300,
        totalFee: 1300,
        ruleReference: 'Schedule IX, Part I - Heavy Industrial Platform'
      };
    }
  }

  const match = STATUTORY_FEE_SCHEDULE[category] || {
    statutory: 800,
    haulage: 200,
    rule: 'Schedule IX - Standard Verification Schedule'
  };

  return {
    category,
    statutoryFee: match.statutory,
    haulageFee: match.haulage,
    totalFee: match.statutory + match.haulage,
    ruleReference: match.rule
  };
}
