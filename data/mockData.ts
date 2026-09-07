// mockData.ts - Comprehensive mock data for Metro Verify
// Digital Legal Metrology Verification & Lifecycle Management Platform (SIH26036)

export interface Owner {
  id: string;
  name: string;
  businessName: string;
  type: 'Individual' | 'Commercial' | 'Industrial' | 'Government';
  email: string;
  phone: string;
  state: string;
  district: string;
  address: string;
  complianceScore: number;
  complianceDeductions: { reason: string; points: number }[];
}

export interface Instrument {
  id: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  category: string;
  subCategory: string;
  capacity: string;
  accuracyClass?: string;
  ownerId: string;
  location: string;
  district: string;
  state: string;
  lastVerifiedDate: string;
  expiryDate: string;
  status: 'Pending' | 'Scheduled' | 'In Progress' | 'Verified' | 'Expiring Soon' | 'Expired';
  certificateId?: string;
  assignedOfficerId?: string;
  scheduledDate?: string;
  timeSlot?: string;
  batchId?: string;
  readings?: {
    standardWeight: string;
    indicatedValue: string;
    errorMargin: string;
    toleranceLimit: string;
    result: 'PASS' | 'FAIL';
  };
  passportTimeline: {
    stage: 'Registered' | 'Verification Requested' | 'Inspection Scheduled' | 'Field-Verified' | 'Certificate Issued' | 'Next Due';
    date: string;
    officerName: string;
    note: string;
    completed: boolean;
  }[];
}

export interface Officer {
  id: string;
  name: string;
  role: 'LMO' | 'GATC';
  badgeNumber: string;
  designation: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  pendingJobs: number;
  availableDates: string[]; // ISO format YYYY-MM-DD
  contactNumber: string;
  gatcLabName?: string;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  instrumentId: string;
  ownerId: string;
  issuedDate: string;
  validUntil: string;
  issuingAuthority: string;
  officerName: string;
  verificationStandard: string;
  verificationFee: string;
  securityHash: string;
  qrPayload: string;
  status: 'Active' | 'Expiring Soon' | 'Expired';
}

export interface BulkBatch {
  id: string;
  batchNumber: string;
  ownerId: string;
  totalInstruments: number;
  verifiedCount: number;
  pendingCount: number;
  currentBatchIndex: number;
  totalBatches: number;
  status: 'Draft' | 'Allocated' | 'In Progress' | 'Completed';
  createdAt: string;
  assignedOfficers: {
    officerId: string;
    officerName: string;
    allocatedCount: number;
  }[];
  instruments: string[]; // instrument IDs
}

// 12 Realistic Indian Owners across States
export const mockOwners: Owner[] = [
  {
    id: 'OWN-101',
    name: 'Rajesh Kumar',
    businessName: 'Sri Balaji Mandi & Agro Traders',
    type: 'Commercial',
    email: 'rajesh.balaji@agromail.in',
    phone: '+91 98490 12345',
    state: 'Tamil Nadu',
    district: 'Chennai North',
    address: 'Plot 42, Koyambedu Wholesale Market Complex, Chennai',
    complianceScore: 92,
    complianceDeductions: [
      { reason: '1 verification requested 3 days past scheduled grace period', points: -8 }
    ]
  },
  {
    id: 'OWN-102',
    name: 'Priya Sharma',
    businessName: 'Sharma Hallmarking & Gold Refinery',
    type: 'Commercial',
    email: 'priya@sharmagold.co.in',
    phone: '+91 98110 56789',
    state: 'Delhi',
    district: 'New Delhi Central',
    address: '112 Bank Street, Karol Bagh, New Delhi',
    complianceScore: 100,
    complianceDeductions: []
  },
  {
    id: 'OWN-103',
    name: 'Venkat Rao Patrudu',
    businessName: 'Sri Lakshmi Bulk Traders & Warehousing',
    type: 'Commercial',
    email: 'contact@srilakshmitraders.in',
    phone: '+91 89122 34567',
    state: 'Andhra Pradesh',
    district: 'Visakhapatnam Port Area',
    address: 'Wharf Road, Industrial Area, Visakhapatnam',
    complianceScore: 78,
    complianceDeductions: [
      { reason: 'Overdue re-verification for Heavy Weighbridge by 28 days', points: -15 },
      { reason: 'Previous minor calibration variance recorded in 2025 cycle', points: -7 }
    ]
  },
  {
    id: 'OWN-104',
    name: 'Ganesh Vishwakarma',
    businessName: 'Vishwakarma Heavy Engineering Pvt Ltd',
    type: 'Industrial',
    email: 'admin@vishwakarma-engg.com',
    phone: '+91 94220 98765',
    state: 'Maharashtra',
    district: 'Pune Industrial',
    address: 'Gat No 312, MIDC Bhosari, Pune',
    complianceScore: 85,
    complianceDeductions: [
      { reason: 'Late annual calibration submission for bulk weights', points: -15 }
    ]
  },
  {
    id: 'OWN-105',
    name: 'Ananya Hegde',
    businessName: 'Ananya Enterprises Tech Canteens',
    type: 'Commercial',
    email: 'ananya@ananyaenterprises.org',
    phone: '+91 80255 43210',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    address: '77 Electronic City Phase 1, Hosur Road, Bengaluru',
    complianceScore: 95,
    complianceDeductions: [
      { reason: 'Single scale moved across counters without prior notice', points: -5 }
    ]
  },
  {
    id: 'OWN-106',
    name: 'Manish Patel',
    businessName: 'Bharat Petroleum Retail Outlet #428',
    type: 'Commercial',
    email: 'bpcl428.ahmedabad@retailfuel.in',
    phone: '+91 98250 87654',
    state: 'Gujarat',
    district: 'Ahmedabad West',
    address: 'Near Sarkhej Cross Road, SG Highway, Ahmedabad',
    complianceScore: 68,
    complianceDeductions: [
      { reason: 'Verification overdue by 42 days on Nozzle #3 (Petrol)', points: -20 },
      { reason: '1 failed delivery test recorded during previous surprise check', points: -12 }
    ]
  },
  {
    id: 'OWN-107',
    name: 'Ramesh Chandra Shukla',
    businessName: 'Kashi Grain Silos & Mills',
    type: 'Industrial',
    email: 'kashigrains@upagro.in',
    phone: '+91 94150 11223',
    state: 'Uttar Pradesh',
    district: 'Lucknow Industrial',
    address: 'Transport Nagar, Phase 2, Kanpur Road, Lucknow',
    complianceScore: 88,
    complianceDeductions: [
      { reason: 'Delayed stamp fee payment in Q4 2025', points: -12 }
    ]
  },
  {
    id: 'OWN-108',
    name: 'K. Senthil Nathan',
    businessName: 'Chennai Port Container Freight Logistics',
    type: 'Industrial',
    email: 'ops@chennaiportfreight.com',
    phone: '+91 94440 33445',
    state: 'Tamil Nadu',
    district: 'Chennai Port GATC',
    address: 'Harbour Gate 4, Rajaji Salai, Chennai',
    complianceScore: 90,
    complianceDeductions: [
      { reason: 'Re-stamping schedule pushed twice due to port congestion', points: -10 }
    ]
  },
  {
    id: 'OWN-109',
    name: 'Mohammed Aslam',
    businessName: 'Deccan Weighing Solutions & Repairing Works',
    type: 'Commercial',
    email: 'deccanweigh@hydbiz.in',
    phone: '+91 98850 77889',
    state: 'Tamil Nadu',
    district: 'Chennai South',
    address: 'Shop 18, Charminar Steel Market, Chennai',
    complianceScore: 94,
    complianceDeductions: [
      { reason: 'GATC test bench verification renewal pending 2 days', points: -6 }
    ]
  },
  {
    id: 'OWN-110',
    name: 'Vikramaditya Rathore',
    businessName: 'Jaipur Precious Metals Assay Lab',
    type: 'Commercial',
    email: 'rathore@jaipurjewels.org',
    phone: '+91 98290 44556',
    state: 'Rajasthan',
    district: 'Jaipur City',
    address: 'Johari Bazaar, Pink City, Jaipur',
    complianceScore: 98,
    complianceDeductions: [
      { reason: 'Minor delay in uploading calibration certificates', points: -2 }
    ]
  },
  {
    id: 'OWN-111',
    name: 'Harpreet Singh Dhillon',
    businessName: 'Punjab Agro Grain Silos Co-op',
    type: 'Industrial',
    email: 'punjabagrosilos@coop.gov.in',
    phone: '+91 98760 99887',
    state: 'Punjab',
    district: 'Ludhiana GT Road',
    address: 'National Highway 44, Focal Point, Ludhiana',
    complianceScore: 82,
    complianceDeductions: [
      { reason: 'Annual weighbridge verification certificate expired 15 days ago', points: -18 }
    ]
  },
  {
    id: 'OWN-112',
    name: 'Siddharth Rao',
    businessName: 'Bengaluru Tech Hub Smart Canteen',
    type: 'Commercial',
    email: 'siddharth@techhubcanteen.in',
    phone: '+91 99000 66778',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    address: 'Tech Park Campus, Outer Ring Road, Bellandur, Bengaluru',
    complianceScore: 100,
    complianceDeductions: []
  }
];

// 9 Realistic LMOs and GATC Testing Officers
export const mockOfficers: Officer[] = [
  {
    id: 'OFF-01',
    name: 'V. Ramanathan',
    role: 'LMO',
    badgeNumber: 'LMO-TS-HYD-041',
    designation: 'Senior Legal Metrology Inspector',
    district: 'Chennai North',
    state: 'Tamil Nadu',
    lat: 17.4485,
    lng: 78.4870,
    pendingJobs: 3,
    availableDates: ['2026-09-05', '2026-09-06', '2026-09-07', '2026-09-10'],
    contactNumber: '+91 94901 00101'
  },
  {
    id: 'OFF-02',
    name: 'S. Mukherjee',
    role: 'LMO',
    badgeNumber: 'LMO-TS-HYD-082',
    designation: 'Assistant Controller of Legal Metrology',
    district: 'Chennai South',
    state: 'Tamil Nadu',
    lat: 17.3616,
    lng: 78.4747,
    pendingJobs: 5,
    availableDates: ['2026-09-05', '2026-09-08', '2026-09-09'],
    contactNumber: '+91 94901 00102'
  },
  {
    id: 'OFF-03',
    name: 'K. Venkatesh',
    role: 'GATC',
    badgeNumber: 'GATC-TS-SEC-019',
    designation: 'Head Testing Officer (Weighbridges & Flow)',
    district: 'Chennai North',
    state: 'Tamil Nadu',
    lat: 17.4399,
    lng: 78.4983,
    pendingJobs: 2,
    availableDates: ['2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08'],
    contactNumber: '+91 94901 00103',
    gatcLabName: 'Chennai Central Metrology Testing & Calibration Lab'
  },
  {
    id: 'OFF-04',
    name: 'Amit Deshmukh',
    role: 'LMO',
    badgeNumber: 'LMO-MH-PUN-015',
    designation: 'Legal Metrology Inspector',
    district: 'Pune Industrial',
    state: 'Maharashtra',
    lat: 18.6279,
    lng: 73.8131,
    pendingJobs: 4,
    availableDates: ['2026-09-06', '2026-09-07', '2026-09-09'],
    contactNumber: '+91 98220 11220'
  },
  {
    id: 'OFF-05',
    name: 'Neha Verma',
    role: 'LMO',
    badgeNumber: 'LMO-DL-CEN-007',
    designation: 'Senior Inspector (Bullion & Analytical)',
    district: 'New Delhi Central',
    state: 'Delhi',
    lat: 28.6433,
    lng: 77.1895,
    pendingJobs: 1,
    availableDates: ['2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08'],
    contactNumber: '+91 98100 99001'
  },
  {
    id: 'OFF-06',
    name: 'S. K. Gupta',
    role: 'LMO',
    badgeNumber: 'LMO-UP-LKO-033',
    designation: 'Assistant Controller of Weights & Measures',
    district: 'Lucknow Industrial',
    state: 'Uttar Pradesh',
    lat: 26.8467,
    lng: 80.9462,
    pendingJobs: 6,
    availableDates: ['2026-09-07', '2026-09-08', '2026-09-11'],
    contactNumber: '+91 94150 77660'
  },
  {
    id: 'OFF-07',
    name: 'Meera Nair',
    role: 'LMO',
    badgeNumber: 'LMO-KA-BLR-022',
    designation: 'Legal Metrology Inspector',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    lat: 12.9716,
    lng: 77.5946,
    pendingJobs: 2,
    availableDates: ['2026-09-05', '2026-09-06', '2026-09-09'],
    contactNumber: '+91 98450 33441'
  },
  {
    id: 'OFF-08',
    name: 'R. Anbarasan',
    role: 'GATC',
    badgeNumber: 'GATC-TN-CHE-004',
    designation: 'Senior Heavy Calibrator',
    district: 'Chennai Port GATC',
    state: 'Tamil Nadu',
    lat: 13.0827,
    lng: 80.2707,
    pendingJobs: 2,
    availableDates: ['2026-09-05', '2026-09-06', '2026-09-07'],
    contactNumber: '+91 94440 88990',
    gatcLabName: 'Chennai Maritime & Industrial Weighbridge Verification Centre'
  },
  {
    id: 'OFF-09',
    name: 'Pradeep Patel',
    role: 'LMO',
    badgeNumber: 'LMO-GJ-AHM-058',
    designation: 'Senior Petroleum & Dispensers Inspector',
    district: 'Ahmedabad West',
    state: 'Gujarat',
    lat: 23.0225,
    lng: 72.5714,
    pendingJobs: 7,
    availableDates: ['2026-09-08', '2026-09-09'],
    contactNumber: '+91 98250 11447'
  }
];

// 18 Realistic Legal Metrology Instruments
export const mockInstruments: Instrument[] = [
  {
    id: 'INST-TS-01',
    serialNumber: 'SN-2024-WB-8891',
    model: 'Essae SuperWeigh-80T',
    manufacturer: 'Essae-Teraoka Pvt Ltd',
    category: 'Electronic Weighbridge',
    subCategory: 'Pitless Static Road Vehicle Scale',
    capacity: '80 Metric Ton (e = 10 kg)',
    accuracyClass: 'Class III',
    ownerId: 'OWN-101',
    location: 'Koyambedu Market Gate #2, Chennai',
    district: 'Chennai North',
    state: 'Tamil Nadu',
    lastVerifiedDate: '2025-09-14',
    expiryDate: '2026-09-13',
    status: 'Expiring Soon',
    certificateId: 'CERT-TS-2025-0147',
    assignedOfficerId: 'OFF-01',
    scheduledDate: '2026-09-06',
    timeSlot: '10:30 AM - 12:00 PM',
    readings: {
      standardWeight: '20,000 kg Test Weights',
      indicatedValue: '20,005 kg',
      errorMargin: '+5 kg',
      toleranceLimit: '±10 kg',
      result: 'PASS'
    },
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2024-03-10',
        officerName: 'System Registration',
        note: 'Instrument passport created upon initial model approval approval IND/08/24/09.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2025-08-20',
        officerName: 'Rajesh Kumar (Owner)',
        note: 'Annual reverification application submitted via portal.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2025-09-02',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Slot allocated for onsite test weight verification with 20t standard weights.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2025-09-14',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Full load and eccentricity test passed within MPE tolerance (+5kg at 20t). Lead seal affixed.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2025-09-14',
        officerName: 'Controller of Legal Metrology, TS',
        note: 'Digital Certificate IND/LM/TS/25/0147 issued with verifiable QR.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2026-09-13',
        officerName: 'Scheduled LMO',
        note: 'Mandatory annual verification due within 10 days.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-TS-02',
    serialNumber: 'SN-2025-NAWI-1120',
    model: 'Avery Weigh-Tronix Class III Counter',
    manufacturer: 'Avery India Ltd',
    category: 'Non-Automatic Weighing Instrument',
    subCategory: 'Digital Retail Scale (Tabletop)',
    capacity: '30 kg (Max), e = 2 g',
    accuracyClass: 'Class III',
    ownerId: 'OWN-101',
    location: 'Counter 1, Koyambedu Wholesale Mandi',
    district: 'Chennai North',
    state: 'Tamil Nadu',
    lastVerifiedDate: '2026-01-10',
    expiryDate: '2027-01-09',
    status: 'Verified',
    certificateId: 'CERT-TS-2026-0482',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2025-01-05',
        officerName: 'System Registration',
        note: 'New retail scale registered under Rule 14.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2026-01-02',
        officerName: 'Rajesh Kumar (Owner)',
        note: 'Verification requested for annual trade validation.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2026-01-05',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Scheduled for Koyambedu inspection cluster.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2026-01-10',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Standard calibrated weights applied (5kg, 10kg, 20kg, 30kg). Corner load deviation 0g. Hologram stamped.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2026-01-10',
        officerName: 'Legal Metrology Dept, Tamil Nadu',
        note: 'Digital Certificate IND/LM/TS/26/0482 generated.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2027-01-09',
        officerName: 'LMO Inspector',
        note: 'Next annual reverification cycle.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-DL-01',
    serialNumber: 'SN-SART-PREC-7704',
    model: 'Sartorius Quintix 125D-1CEU',
    manufacturer: 'Sartorius India Pvt Ltd',
    category: 'Non-Automatic Weighing Instrument',
    subCategory: 'High Precision Gold & Bullion Analytical Balance',
    capacity: '120 g (e = 1 mg, d = 0.01 mg)',
    accuracyClass: 'Class I',
    ownerId: 'OWN-102',
    location: 'Karol Bagh Hallmarking Chamber A',
    district: 'New Delhi Central',
    state: 'Delhi',
    lastVerifiedDate: '2026-04-18',
    expiryDate: '2027-04-17',
    status: 'Verified',
    certificateId: 'CERT-DL-2026-0892',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2024-04-10',
        officerName: 'Registration Cell',
        note: 'Class I precision microbalance registered under Bullion verification provisions.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2026-04-05',
        officerName: 'Priya Sharma (Owner)',
        note: 'Request submitted with E2 class standard reference calibration report.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2026-04-12',
        officerName: 'Neha Verma (LMO)',
        note: 'Inspection scheduled at temperature-controlled lab.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2026-04-18',
        officerName: 'Neha Verma (LMO)',
        note: 'Multi-point verification with 1g, 10g, 50g, 100g Class E2 weights. Repeatability error 0.02 mg. Verified compliant.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2026-04-18',
        officerName: 'Controller of Legal Metrology, Delhi',
        note: 'Certificate IND/LM/DL/26/0892 sealed digitally.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2027-04-17',
        officerName: 'LMO Inspector',
        note: 'Next statutory bullion check.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-AP-01',
    serialNumber: 'SN-2021-WB-5003',
    model: 'Rice Lake Survivor 100T Rail/Road Scale',
    manufacturer: 'Rice Lake Weighing Systems India',
    category: 'Electronic Weighbridge',
    subCategory: 'Heavy Industrial Weighbridge',
    capacity: '100 Metric Ton (e = 20 kg)',
    accuracyClass: 'Class III',
    ownerId: 'OWN-103',
    location: 'Port Wharf Terminal Gate 9, Visakhapatnam',
    district: 'Visakhapatnam Port Area',
    state: 'Andhra Pradesh',
    lastVerifiedDate: '2025-07-20',
    expiryDate: '2026-07-19',
    status: 'Expired',
    certificateId: 'CERT-AP-2025-0911',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2021-06-15',
        officerName: 'AP LM System',
        note: 'Commercial weighbridge installation registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2025-06-25',
        officerName: 'Venkat Rao Patrudu',
        note: 'Annual reverification requested.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2025-07-10',
        officerName: 'K. R. Murthy (LMO)',
        note: 'Verified with Mobile Testing Unit MTU-02.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2025-07-20',
        officerName: 'K. R. Murthy (LMO)',
        note: 'Stamped with physical lead seal and digital barcode.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2025-07-20',
        officerName: 'Legal Metrology Dept, AP',
        note: 'Certificate IND/LM/AP/25/0911 issued.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2026-07-19',
        officerName: 'Enforcement Squad',
        note: 'OVERDUE: Certificate expired 47 days ago. Penalty notice generated.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-MH-01',
    serialNumber: 'SN-2023-FLW-4412',
    model: 'Endress+Hauser Promass F 300 Coriolis',
    manufacturer: 'Endress+Hauser Flowtec India',
    category: 'Flow Meter',
    subCategory: 'Coriolis Mass Flow Meter for Liquid Chemicals',
    capacity: '0 - 180,000 kg/h',
    accuracyClass: 'Class 0.3',
    ownerId: 'OWN-104',
    location: 'Chemical Reactor Line B, Bhosari, Pune',
    district: 'Pune Industrial',
    state: 'Maharashtra',
    lastVerifiedDate: '2025-11-22',
    expiryDate: '2026-11-21',
    status: 'Verified',
    certificateId: 'CERT-MH-2025-0315',
    assignedOfficerId: 'OFF-04',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2023-08-11',
        officerName: 'System Registration',
        note: 'High-accuracy Coriolis flow meter registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2025-11-01',
        officerName: 'Ganesh Vishwakarma',
        note: 'Annual verification request with gravimetric test loop protocol.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2025-11-15',
        officerName: 'Amit Deshmukh (LMO)',
        note: 'GATC Mobile Flow Calibrator scheduled.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2025-11-22',
        officerName: 'Amit Deshmukh (LMO)',
        note: 'Gravimetric pulse comparison verified within 0.18% error limit. Tamper-evident wire seal intact.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2025-11-22',
        officerName: 'Controller of Legal Metrology, Maharashtra',
        note: 'Certificate IND/LM/MH/25/0315 issued.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2026-11-21',
        officerName: 'LMO Pune',
        note: 'Next calibration cycle in 78 days.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-GJ-01',
    serialNumber: 'SN-2022-DU-8821',
    model: 'Tokheim Quantium 510 Multi-Dispenser',
    manufacturer: 'Dover Fueling Solutions India',
    category: 'Petrol Pump Dispensing Unit',
    subCategory: 'Dual Product 4-Nozzle Dispensing Unit (MS/HSD)',
    capacity: '5 - 50 L/min (Dispense flow rate)',
    accuracyClass: 'Class 0.5',
    ownerId: 'OWN-106',
    location: 'Island 2, SG Highway Station, Ahmedabad',
    district: 'Ahmedabad West',
    state: 'Gujarat',
    lastVerifiedDate: '2025-07-24',
    expiryDate: '2026-07-23',
    status: 'Expired',
    certificateId: 'CERT-GJ-2025-1104',
    assignedOfficerId: 'OFF-09',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2022-04-15',
        officerName: 'System Registration',
        note: 'Retail fuel dispensing unit registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2025-07-02',
        officerName: 'Manish Patel',
        note: 'Bi-annual fuel dispensing verification applied.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2025-07-15',
        officerName: 'Pradeep Patel (LMO)',
        note: 'Standard 5-litre / 10-litre conical measure test scheduled.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2025-07-24',
        officerName: 'Pradeep Patel (LMO)',
        note: 'Delivery deviation tested at 10L delivery. Stamped.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2025-07-24',
        officerName: 'Legal Metrology Dept, Gujarat',
        note: 'Certificate IND/LM/GJ/25/1104 issued.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2026-07-23',
        officerName: 'Enforcement Wing',
        note: 'EXPIRED: 42 days overdue. Auto notice sent to Petroleum Corporation.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-UP-01',
    serialNumber: 'SN-2024-GAS-0199',
    model: 'Raychem RPG Diaphragm Gas Meter G-40',
    manufacturer: 'Raychem RPG Pvt Ltd',
    category: 'Gas Meter',
    subCategory: 'Industrial Diaphragm PNG Gas Meter',
    capacity: '65 m3/h Max Flow',
    accuracyClass: 'Class 1.5',
    ownerId: 'OWN-107',
    location: 'Silo Heating Plant #1, Kanpur Road, Lucknow',
    district: 'Lucknow Industrial',
    state: 'Uttar Pradesh',
    lastVerifiedDate: '2026-02-14',
    expiryDate: '2027-02-13',
    status: 'Verified',
    certificateId: 'CERT-UP-2026-0205',
    assignedOfficerId: 'OFF-06',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2024-01-20',
        officerName: 'System Registration',
        note: 'PNG industrial meter registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2026-01-28',
        officerName: 'Ramesh Chandra Shukla',
        note: 'Verification requested.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2026-02-05',
        officerName: 'S. K. Gupta (LMO)',
        note: 'Bell prover calibration verification scheduled.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2026-02-14',
        officerName: 'S. K. Gupta (LMO)',
        note: 'Pressure loss and flow accuracy confirmed within 1.2% allowable limit. Lead wire seal secured.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2026-02-14',
        officerName: 'Weights & Measures Dept, UP',
        note: 'Certificate IND/LM/UP/26/0205 issued.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2027-02-13',
        officerName: 'LMO Lucknow',
        note: 'Next annual inspection.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-KA-01',
    serialNumber: 'SN-2025-NAWI-5541',
    model: 'Mettler Toledo bRite Standard Retail Scale',
    manufacturer: 'Mettler-Toledo India Pvt Ltd',
    category: 'Non-Automatic Weighing Instrument',
    subCategory: 'Tabletop Point-of-Sale Computing Scale',
    capacity: '15 kg, e = 5 g',
    accuracyClass: 'Class III',
    ownerId: 'OWN-105',
    location: 'Food Court Counter 3, Electronic City, Bengaluru',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    lastVerifiedDate: '2026-03-08',
    expiryDate: '2027-03-07',
    status: 'Verified',
    certificateId: 'CERT-KA-2026-0649',
    assignedOfficerId: 'OFF-07',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2025-02-12',
        officerName: 'System Registration',
        note: 'Commercial canteen POS scale registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2026-02-20',
        officerName: 'Ananya Hegde',
        note: 'Verification requested before statutory due date.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2026-03-01',
        officerName: 'Meera Nair (LMO)',
        note: 'Scheduled for Electronic City commercial route.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2026-03-08',
        officerName: 'Meera Nair (LMO)',
        note: 'Eccentricity and linearity tests passed. Tamper sticker affixed.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2026-03-08',
        officerName: 'Legal Metrology Dept, Karnataka',
        note: 'Certificate IND/LM/KA/26/0649 issued.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2027-03-07',
        officerName: 'LMO Bengaluru',
        note: 'Next annual inspection.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-TS-03',
    serialNumber: 'SN-2024-NRGY-9910',
    model: 'Secure Meters Premier 300 3-Phase HT',
    manufacturer: 'Secure Meters Ltd',
    category: 'Energy Meter',
    subCategory: 'Three Phase 4-Wire Static Electricity Meter',
    capacity: '3x240V, -/5A, 50Hz, Cl 0.5S',
    accuracyClass: 'Class 0.5S',
    ownerId: 'OWN-101',
    location: 'Mandi Substation HT Panel, Koyambedu, Chennai',
    district: 'Chennai North',
    state: 'Tamil Nadu',
    lastVerifiedDate: '2025-09-20',
    expiryDate: '2026-09-19',
    status: 'Expiring Soon',
    certificateId: 'CERT-TS-2025-0331',
    assignedOfficerId: 'OFF-03',
    scheduledDate: '2026-09-08',
    timeSlot: '02:00 PM - 03:30 PM',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2024-05-14',
        officerName: 'System Registration',
        note: 'HT tariff revenue energy meter registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2025-08-30',
        officerName: 'Rajesh Kumar (Owner)',
        note: 'Annual verification request filed.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2025-09-10',
        officerName: 'K. Venkatesh (GATC)',
        note: 'Secondary standard energy test bench scheduled.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2025-09-20',
        officerName: 'K. Venkatesh (GATC)',
        note: 'Active and reactive power accuracy verified across 0.05Ib to Imax at unity and 0.5 pf. Passed.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2025-09-20',
        officerName: 'Government Approved Test Centre, TS',
        note: 'Certificate IND/LM/TS/25/0331 issued.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2026-09-19',
        officerName: 'GATC Officer',
        note: 'Expiring in 15 days. Scheduled for reverification.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-TN-01',
    serialNumber: 'SN-2023-WTR-3382',
    model: 'Kranti Bulk Woltman Water Meter WPH-150',
    manufacturer: 'Kranti Industries Ltd',
    category: 'Water Meter',
    subCategory: 'Turbine Woltman Cold Potable Water Meter',
    capacity: 'DN 150mm, Q3 = 250 m3/h',
    accuracyClass: 'Class 2',
    ownerId: 'OWN-108',
    location: 'Bunkering Berth 3, Chennai Port',
    district: 'Chennai Port GATC',
    state: 'Tamil Nadu',
    lastVerifiedDate: '2025-10-15',
    expiryDate: '2026-10-14',
    status: 'Verified',
    certificateId: 'CERT-TN-2025-0552',
    assignedOfficerId: 'OFF-08',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2023-04-18',
        officerName: 'System Registration',
        note: 'Port bunkering bulk water meter registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2025-09-28',
        officerName: 'K. Senthil Nathan',
        note: 'Biannual verification request submitted.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2025-10-05',
        officerName: 'R. Anbarasan (GATC)',
        note: 'Test rig connection scheduled.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2025-10-15',
        officerName: 'R. Anbarasan (GATC)',
        note: 'Tested at Q1, Q2 and Q3 flows. Error within ±2% at high flow and ±5% at low flow. Seal wire clamped.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2025-10-15',
        officerName: 'GATC Maritime Centre, Chennai',
        note: 'Certificate IND/LM/TN/25/0552 issued.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2026-10-14',
        officerName: 'GATC Officer',
        note: 'Annual check due in 40 days.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-TS-04',
    serialNumber: 'SN-2026-TXI-0419',
    model: 'Pulsar Micro Digital Fare Meter PM-90',
    manufacturer: 'Pulsar Electronics India',
    category: 'Taxi/Auto Fare Meter',
    subCategory: 'Electronic Digital Auto-Rickshaw Fare Meter',
    capacity: 'K-Constant 1000 rev/km, Multi-Tariff',
    accuracyClass: 'Commercial Transport',
    ownerId: 'OWN-109',
    location: 'Charminar Auto Stand Hub, Chennai',
    district: 'Chennai South',
    state: 'Tamil Nadu',
    lastVerifiedDate: '2026-08-15',
    expiryDate: '2027-08-14',
    status: 'Verified',
    certificateId: 'CERT-TS-2026-0779',
    assignedOfficerId: 'OFF-02',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2026-08-01',
        officerName: 'System Registration',
        note: 'Auto fare meter installation registered after pulse gear change.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2026-08-05',
        officerName: 'Mohammed Aslam',
        note: 'Verification requested.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2026-08-10',
        officerName: 'S. Mukherjee (LMO)',
        note: 'Road test track 1km calibration scheduled.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2026-08-15',
        officerName: 'S. Mukherjee (LMO)',
        note: 'Roller bench and 1000m road test completed. Fare increment matches transport tariff notification. Lead wire stamped.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2026-08-15',
        officerName: 'Legal Metrology Dept, Chennai South',
        note: 'Certificate IND/LM/TS/26/0779 issued.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2027-08-14',
        officerName: 'LMO Inspector',
        note: 'Next annual tariff check.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-RJ-01',
    serialNumber: 'SN-2025-WGT-E2-09',
    model: 'Eagle Precision Class E2 Standard Weight Box',
    manufacturer: 'E.G. Kantawalla Pvt Ltd',
    category: 'Weights of All Categories',
    subCategory: 'Class E2 Stainless Steel Calibration Weights (1mg - 500g)',
    capacity: '24 Pcs Set (1 mg to 500 g)',
    accuracyClass: 'Class E2',
    ownerId: 'OWN-110',
    location: 'Assay Lab Vault 1, Johari Bazaar, Jaipur',
    district: 'Jaipur City',
    state: 'Rajasthan',
    lastVerifiedDate: '2025-12-05',
    expiryDate: '2027-12-04',
    status: 'Verified',
    certificateId: 'CERT-RJ-2025-0118',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2025-11-10',
        officerName: 'System Registration',
        note: 'Class E2 primary working weights registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2025-11-20',
        officerName: 'Vikramaditya Rathore',
        note: 'Two-year statutory calibration verification filed.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2025-11-28',
        officerName: 'Regional Metrology Lab Officer',
        note: 'Mass comparator verification scheduled.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2025-12-05',
        officerName: 'Regional Standards Officer',
        note: 'Substitution weighing performed against National Prototype Standard. All pieces within E2 max permissible errors. Box lead sealed.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2025-12-05',
        officerName: 'Department of Consumer Affairs, Rajasthan',
        note: 'Certificate IND/LM/RJ/25/0118 issued.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2027-12-04',
        officerName: 'Regional Officer',
        note: 'Valid for 24 months.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-PB-01',
    serialNumber: 'SN-2023-WB-9040',
    model: 'Leotronic HeavyDuty 60T Pitless Scale',
    manufacturer: 'Leotronic Scales Pvt Ltd',
    category: 'Electronic Weighbridge',
    subCategory: 'Agricultural Grain Weighbridge',
    capacity: '60 Metric Ton (e = 10 kg)',
    accuracyClass: 'Class III',
    ownerId: 'OWN-111',
    location: 'Silo Gate 1, GT Road, Focal Point, Ludhiana',
    district: 'Ludhiana GT Road',
    state: 'Punjab',
    lastVerifiedDate: '2025-08-19',
    expiryDate: '2026-08-18',
    status: 'Expired',
    certificateId: 'CERT-PB-2025-0722',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2023-05-10',
        officerName: 'System Registration',
        note: 'Grain Silo 60t weighbridge registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2025-08-01',
        officerName: 'Harpreet Singh Dhillon',
        note: 'Annual reverification requested.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2025-08-10',
        officerName: 'LMO Ludhiana',
        note: 'Test weight truck scheduled.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2025-08-19',
        officerName: 'LMO Ludhiana',
        note: 'Field calibration verified and stamped.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2025-08-19',
        officerName: 'Legal Metrology Dept, Punjab',
        note: 'Certificate IND/LM/PB/25/0722 issued.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2026-08-18',
        officerName: 'Enforcement Squad',
        note: 'EXPIRED: 17 days overdue. Notice served for immediate reverification.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-TS-05',
    serialNumber: 'SN-2026-NAWI-8911',
    model: 'Phoenix Digital Platform Scale 500kg',
    manufacturer: 'Nitiraj Engineers Ltd (Phoenix)',
    category: 'Non-Automatic Weighing Instrument',
    subCategory: 'Heavy Floor Industrial Platform Scale',
    capacity: '500 kg, e = 50 g',
    accuracyClass: 'Class III',
    ownerId: 'OWN-101',
    location: 'Loading Bay 4, Koyambedu Market, Chennai',
    district: 'Chennai North',
    state: 'Tamil Nadu',
    lastVerifiedDate: '2025-09-02',
    expiryDate: '2026-09-01',
    status: 'Pending',
    assignedOfficerId: 'OFF-01',
    scheduledDate: '2026-09-05',
    timeSlot: '11:00 AM - 12:30 PM',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2025-08-15',
        officerName: 'System Registration',
        note: 'Platform scale registered for wholesale mandi handling.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2026-08-28',
        officerName: 'Rajesh Kumar (Owner)',
        note: 'Reverification application filed online via Metro Verify.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2026-09-02',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Inspection booked for September 5, 2026.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2026-09-05 (Expected)',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Awaiting inspector physical attendance.',
        completed: false
      },
      {
        stage: 'Certificate Issued',
        date: 'Pending',
        officerName: 'Issuing Officer',
        note: 'Certificate will be generated post verification.',
        completed: false
      },
      {
        stage: 'Next Due',
        date: '2027-09-01',
        officerName: 'System',
        note: 'Future due date.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-TS-06',
    serialNumber: 'SN-2026-WGT-M1-44',
    model: 'Cast Iron Hexagonal Weights Set (50kg total)',
    manufacturer: 'National Iron & Steel Foundries, Agra',
    category: 'Weights of All Categories',
    subCategory: 'Class M1 Cast Iron Working Commercial Weights',
    capacity: '50 kg (2x20kg, 1x10kg)',
    accuracyClass: 'Class M1',
    ownerId: 'OWN-101',
    location: 'Grain Weighing Section, Koyambedu, Chennai',
    district: 'Chennai North',
    state: 'Tamil Nadu',
    lastVerifiedDate: '2025-09-05',
    expiryDate: '2026-09-04',
    status: 'In Progress',
    assignedOfficerId: 'OFF-01',
    scheduledDate: '2026-09-04',
    timeSlot: '09:00 AM - 10:30 AM',
    readings: {
      standardWeight: '50 kg Primary Test Standard',
      indicatedValue: '50.008 kg',
      errorMargin: '+8 g',
      toleranceLimit: '±25 g',
      result: 'PASS'
    },
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2024-08-20',
        officerName: 'System Registration',
        note: 'Commercial cast iron weights batch registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2026-08-25',
        officerName: 'Rajesh Kumar (Owner)',
        note: 'Annual re-stamping requested.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2026-08-30',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Inspector assigned for onsite verification.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2026-09-04',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Measurement recorded in field verification app. Lead plug adjustment checked. Stamping in progress.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: 'Pending',
        officerName: 'LMO Chennai North',
        note: 'Certificate signing queued.',
        completed: false
      },
      {
        stage: 'Next Due',
        date: '2027-09-03',
        officerName: 'System',
        note: 'Next annual cycle.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-MH-02',
    serialNumber: 'SN-2025-AGFI-0901',
    model: 'Prabhat Auto-Pack Gravimetric Bagging Weigher',
    manufacturer: 'Prabhat Packaging Machines Pune',
    category: 'Automatic Gravimetric Filling Instrument',
    subCategory: 'Automatic High-Speed Grain Bagging Scale',
    capacity: '50 kg / bag (12 bags/min)',
    accuracyClass: 'Class X(1)',
    ownerId: 'OWN-104',
    location: 'Packing Hall 2, MIDC Bhosari, Pune',
    district: 'Pune Industrial',
    state: 'Maharashtra',
    lastVerifiedDate: '2026-02-18',
    expiryDate: '2027-02-17',
    status: 'Verified',
    certificateId: 'CERT-MH-2026-0491',
    assignedOfficerId: 'OFF-04',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2025-01-18',
        officerName: 'System Registration',
        note: 'Automatic bagging gravimetric instrument registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2026-02-01',
        officerName: 'Ganesh Vishwakarma',
        note: 'Statutory verification requested.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2026-02-10',
        officerName: 'Amit Deshmukh (LMO)',
        note: 'Static and dynamic test run scheduled.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2026-02-18',
        officerName: 'Amit Deshmukh (LMO)',
        note: 'Dynamic test with 20 filled bags performed. Standard deviation 12g (Tolerance 25g). Stamped.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2026-02-18',
        officerName: 'Legal Metrology Dept, Maharashtra',
        note: 'Certificate IND/LM/MH/26/0491 issued.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2027-02-17',
        officerName: 'LMO Pune',
        note: 'Next annual cycle.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-TS-07',
    serialNumber: 'SN-2026-NAWI-9022',
    model: 'Essae PR-85 Counter Retail Scale',
    manufacturer: 'Essae-Teraoka Pvt Ltd',
    category: 'Non-Automatic Weighing Instrument',
    subCategory: 'Retail Counter Scale',
    capacity: '15 kg, e = 2 g',
    accuracyClass: 'Class III',
    ownerId: 'OWN-101',
    location: 'Counter 2, Koyambedu Wholesale Mandi, Chennai',
    district: 'Chennai North',
    state: 'Tamil Nadu',
    lastVerifiedDate: '2025-09-02',
    expiryDate: '2026-09-01',
    status: 'Scheduled',
    assignedOfficerId: 'OFF-01',
    scheduledDate: '2026-09-06',
    timeSlot: '01:30 PM - 02:30 PM',
    batchId: 'BATCH-2026-001',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2025-08-20',
        officerName: 'System Registration',
        note: 'Counter scale registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2026-08-28',
        officerName: 'Rajesh Kumar (Owner)',
        note: 'Included in Bulk Verification Request #B-001.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2026-09-02',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Scheduled as part of Mandi Cluster inspection.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2026-09-06 (Expected)',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Pending field verification.',
        completed: false
      },
      {
        stage: 'Certificate Issued',
        date: 'Pending',
        officerName: 'Issuing Officer',
        note: 'Pending verification.',
        completed: false
      },
      {
        stage: 'Next Due',
        date: '2027-09-01',
        officerName: 'System',
        note: 'Upcoming cycle.',
        completed: false
      }
    ]
  },
  {
    id: 'INST-TS-08',
    serialNumber: 'SN-2026-NAWI-9023',
    model: 'Essae PR-85 Counter Retail Scale',
    manufacturer: 'Essae-Teraoka Pvt Ltd',
    category: 'Non-Automatic Weighing Instrument',
    subCategory: 'Retail Counter Scale',
    capacity: '15 kg, e = 2 g',
    accuracyClass: 'Class III',
    ownerId: 'OWN-101',
    location: 'Counter 3, Koyambedu Wholesale Mandi, Chennai',
    district: 'Chennai North',
    state: 'Tamil Nadu',
    lastVerifiedDate: '2025-09-02',
    expiryDate: '2026-09-01',
    status: 'Scheduled',
    assignedOfficerId: 'OFF-01',
    scheduledDate: '2026-09-06',
    timeSlot: '02:30 PM - 03:30 PM',
    batchId: 'BATCH-2026-001',
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2025-08-20',
        officerName: 'System Registration',
        note: 'Counter scale registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2026-08-28',
        officerName: 'Rajesh Kumar (Owner)',
        note: 'Included in Bulk Verification Request #B-001.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2026-09-02',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Scheduled as part of Mandi Cluster inspection.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2026-09-06 (Expected)',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Pending field verification.',
        completed: false
      },
      {
        stage: 'Certificate Issued',
        date: 'Pending',
        officerName: 'Issuing Officer',
        note: 'Pending verification.',
        completed: false
      },
      {
        stage: 'Next Due',
        date: '2027-09-01',
        officerName: 'System',
        note: 'Upcoming cycle.',
        completed: false
      }
    ]
  }
];

// Realistic Certificates with verifiable verification hash & QR payload
export const mockCertificates: Certificate[] = [
  {
    id: 'CERT-TS-2025-0147',
    certificateNumber: 'IND/LM/TS/25/0147',
    instrumentId: 'INST-TS-01',
    ownerId: 'OWN-101',
    issuedDate: '2025-09-14',
    validUntil: '2026-09-13',
    issuingAuthority: 'Office of the Controller of Legal Metrology, Government of Tamil Nadu',
    officerName: 'V. Ramanathan (LMO, Chennai North)',
    verificationStandard: 'Legal Metrology (General) Rules, 2011 & OIML R-76 Class III',
    verificationFee: '₹ 3,500.00 (Challan # TS-LM-994102)',
    securityHash: 'e4d8a1c97f2e03b4819d44e5108c90ad7310b8cf92419082ef6b52c',
    qrPayload: JSON.stringify({
      certNo: 'IND/LM/TS/25/0147',
      inst: 'INST-TS-01',
      type: '80T Electronic Weighbridge',
      owner: 'Sri Balaji Mandi & Agro Traders',
      validThru: '2026-09-13',
      officer: 'V. Ramanathan (LMO)',
      hash: 'e4d8a1c9'
    }),
    status: 'Expiring Soon'
  },
  {
    id: 'CERT-TS-2026-0482',
    certificateNumber: 'IND/LM/TS/26/0482',
    instrumentId: 'INST-TS-02',
    ownerId: 'OWN-101',
    issuedDate: '2026-01-10',
    validUntil: '2027-01-09',
    issuingAuthority: 'Office of the Controller of Legal Metrology, Government of Tamil Nadu',
    officerName: 'V. Ramanathan (LMO, Chennai North)',
    verificationStandard: 'Legal Metrology (General) Rules, 2011, Schedule VII',
    verificationFee: '₹ 400.00 (Challan # TS-LM-118029)',
    securityHash: '8b7f10d93a4c52e690f145b23d9a8c7e1120f8394a11b059c238fa',
    qrPayload: JSON.stringify({
      certNo: 'IND/LM/TS/26/0482',
      inst: 'INST-TS-02',
      type: 'Retail Counter Scale 30kg',
      owner: 'Sri Balaji Mandi & Agro Traders',
      validThru: '2027-01-09',
      officer: 'V. Ramanathan (LMO)',
      hash: '8b7f10d9'
    }),
    status: 'Active'
  },
  {
    id: 'CERT-DL-2026-0892',
    certificateNumber: 'IND/LM/DL/26/0892',
    instrumentId: 'INST-DL-01',
    ownerId: 'OWN-102',
    issuedDate: '2026-04-18',
    validUntil: '2027-04-17',
    issuingAuthority: 'Department of Weights and Measures, Government of NCT of Delhi',
    officerName: 'Neha Verma (Senior LMO, New Delhi Central)',
    verificationStandard: 'OIML R-76 Class I High Precision Bullion Standard',
    verificationFee: '₹ 5,000.00 (Challan # DL-LM-440192)',
    securityHash: '77a94b2e81cf5d309a24ec118bf304de90a887bc51201948ef1108',
    qrPayload: JSON.stringify({
      certNo: 'IND/LM/DL/26/0892',
      inst: 'INST-DL-01',
      type: 'Sartorius Class I Microbalance',
      owner: 'Sharma Hallmarking & Gold Refinery',
      validThru: '2027-04-17',
      officer: 'Neha Verma (LMO)',
      hash: '77a94b2e'
    }),
    status: 'Active'
  },
  {
    id: 'CERT-MH-2025-0315',
    certificateNumber: 'IND/LM/MH/25/0315',
    instrumentId: 'INST-MH-01',
    ownerId: 'OWN-104',
    issuedDate: '2025-11-22',
    validUntil: '2026-11-21',
    issuingAuthority: 'Directorate of Legal Metrology, Government of Maharashtra',
    officerName: 'Amit Deshmukh (LMO, Pune)',
    verificationStandard: 'OIML R-105 Direct Mass Flow Measuring Systems for Liquids',
    verificationFee: '₹ 8,000.00 (Challan # MH-LM-502811)',
    securityHash: '3c8d19ab44ef90182305a4ecb712398401fed827410982375fa019',
    qrPayload: JSON.stringify({
      certNo: 'IND/LM/MH/25/0315',
      inst: 'INST-MH-01',
      type: 'Coriolis Mass Flow Meter',
      owner: 'Vishwakarma Heavy Engineering Pvt Ltd',
      validThru: '2026-11-21',
      officer: 'Amit Deshmukh (LMO)',
      hash: '3c8d19ab'
    }),
    status: 'Active'
  },
  {
    id: 'CERT-TS-2025-0331',
    certificateNumber: 'IND/LM/TS/25/0331',
    instrumentId: 'INST-TS-03',
    ownerId: 'OWN-101',
    issuedDate: '2025-09-20',
    validUntil: '2026-09-19',
    issuingAuthority: 'Chennai Central Metrology Testing & Calibration Lab (GATC-TS)',
    officerName: 'K. Venkatesh (Head Testing Officer, GATC)',
    verificationStandard: 'IS 14697 & Legal Metrology Rules for AC Static Energy Meters',
    verificationFee: '₹ 4,500.00 (Challan # TS-GATC-772910)',
    securityHash: '55bc901a88df3104e76a91c43089ef02a8849102c9184712ef093a',
    qrPayload: JSON.stringify({
      certNo: 'IND/LM/TS/25/0331',
      inst: 'INST-TS-03',
      type: '3-Phase HT Energy Meter 0.5S',
      owner: 'Sri Balaji Mandi & Agro Traders',
      validThru: '2026-09-19',
      officer: 'K. Venkatesh (GATC)',
      hash: '55bc901a'
    }),
    status: 'Expiring Soon'
  }
];

// Active Bulk Batches across system
export const mockBulkBatches: BulkBatch[] = [
  {
    id: 'BATCH-2026-001',
    batchNumber: 'BLK/TS/HYD/2026/04',
    ownerId: 'OWN-101',
    totalInstruments: 25,
    verifiedCount: 12,
    pendingCount: 13,
    currentBatchIndex: 1,
    totalBatches: 4,
    status: 'In Progress',
    createdAt: '2026-08-28',
    assignedOfficers: [
      { officerId: 'OFF-01', officerName: 'V. Ramanathan (LMO)', allocatedCount: 10 },
      { officerId: 'OFF-02', officerName: 'S. Mukherjee (LMO)', allocatedCount: 9 },
      { officerId: 'OFF-03', officerName: 'K. Venkatesh (GATC)', allocatedCount: 6 }
    ],
    instruments: ['INST-TS-02', 'INST-TS-05', 'INST-TS-06', 'INST-TS-07', 'INST-TS-08']
  },
  {
    id: 'BATCH-2026-002',
    batchNumber: 'BLK/DL/CEN/2026/11',
    ownerId: 'OWN-102',
    totalInstruments: 15,
    verifiedCount: 15,
    pendingCount: 0,
    currentBatchIndex: 3,
    totalBatches: 3,
    status: 'Completed',
    createdAt: '2026-08-10',
    assignedOfficers: [
      { officerId: 'OFF-05', officerName: 'Neha Verma (LMO)', allocatedCount: 15 }
    ],
    instruments: ['INST-DL-01']
  },
  {
    id: 'BATCH-2026-003',
    batchNumber: 'BLK/MH/PUN/2026/08',
    ownerId: 'OWN-104',
    totalInstruments: 40,
    verifiedCount: 18,
    pendingCount: 22,
    currentBatchIndex: 2,
    totalBatches: 5,
    status: 'In Progress',
    createdAt: '2026-08-20',
    assignedOfficers: [
      { officerId: 'OFF-04', officerName: 'Amit Deshmukh (LMO)', allocatedCount: 22 },
      { officerId: 'OFF-08', officerName: 'R. Anbarasan (GATC)', allocatedCount: 18 }
    ],
    instruments: ['INST-MH-01', 'INST-MH-02']
  }
];

// Offline verification queue items for field officers
export interface OfflineVerificationItem {
  id: string;
  instrumentId: string;
  instrumentModel: string;
  ownerName: string;
  location: string;
  recordedAt: string;
  standardReading: string;
  indicatedReading: string;
  errorMargin: string;
  result: 'PASS' | 'FAIL';
  gpsCoords: string;
  photoAttached: boolean;
  remarks: string;
  syncStatus: 'Pending Sync' | 'Syncing' | 'Synced';
}

export const mockOfflineQueue: OfflineVerificationItem[] = [
  {
    id: 'OFFLINE-001',
    instrumentId: 'INST-TS-06',
    instrumentModel: 'Cast Iron Hexagonal Weights 50kg',
    ownerName: 'Sri Balaji Mandi & Agro Traders',
    location: 'Koyambedu Wholesale Mandi, Chennai',
    recordedAt: '2026-09-04 10:14 AM',
    standardReading: '50.000 kg Standard',
    indicatedReading: '50.008 kg Indicated',
    errorMargin: '+8 g (Tolerance ±25 g)',
    result: 'PASS',
    gpsCoords: '17.4722° N, 78.4891° E',
    photoAttached: true,
    remarks: 'Weights cleaned with wire brush, lead adjustment cavities sealed.',
    syncStatus: 'Pending Sync'
  },
  {
    id: 'OFFLINE-002',
    instrumentId: 'INST-TS-05',
    instrumentModel: 'Phoenix Digital Platform Scale 500kg',
    ownerName: 'Sri Balaji Mandi & Agro Traders',
    location: 'Loading Bay 4, Koyambedu Market',
    recordedAt: '2026-09-04 11:30 AM',
    standardReading: '100 kg, 250 kg, 500 kg',
    indicatedReading: '99.98 kg, 250.02 kg, 500.04 kg',
    errorMargin: '+40 g (Tolerance ±50 g)',
    result: 'PASS',
    gpsCoords: '17.4724° N, 78.4894° E',
    photoAttached: true,
    remarks: 'Corner load deviation 10g. Level bubble aligned. Stamping verified.',
    syncStatus: 'Pending Sync'
  }
];

// Statewide verification metrics for Admin
export const mockAdminStats = {
  totalInstrumentsStatewide: 48920,
  verificationsThisMonth: 3412,
  verificationsPending: 1845,
  averageComplianceScore: 88.4,
  overdueAlertsCount: 147,
  activeGatcCentres: 24,
  activeFieldOfficers: 138,
  monthlyVerificationTrend: [
    { month: 'Apr', count: 2890 },
    { month: 'May', count: 3100 },
    { month: 'Jun', count: 2950 },
    { month: 'Jul', count: 3340 },
    { month: 'Aug', count: 3620 },
    { month: 'Sep', count: 3412 }
  ]
};
