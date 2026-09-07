// mockData.ts - Server copy of mock data
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
  availableDates: string[];
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
  instruments: string[];
}

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
    lng: 78.487,
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
    passportTimeline: [
      {
        stage: 'Registered',
        date: '2024-03-10',
        officerName: 'System Registration',
        note: 'Instrument passport created.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2025-08-20',
        officerName: 'Rajesh Kumar (Owner)',
        note: 'Annual reverification application submitted.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2025-09-02',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Slot allocated for test weight verification.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2025-09-14',
        officerName: 'V. Ramanathan (LMO)',
        note: 'Passed tolerance test (+5kg at 20t). Lead seal affixed.',
        completed: true
      },
      {
        stage: 'Certificate Issued',
        date: '2025-09-14',
        officerName: 'Controller of Legal Metrology, TS',
        note: 'Digital Certificate IND/LM/TS/25/0147 issued.',
        completed: true
      },
      {
        stage: 'Next Due',
        date: '2026-09-13',
        officerName: 'Scheduled LMO',
        note: 'Verification due within 10 days.',
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
        note: 'Annual verification requested.',
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
        note: 'Corner load deviation 0g. Hologram stamped.',
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
        note: 'Class I precision microbalance registered.',
        completed: true
      },
      {
        stage: 'Verification Requested',
        date: '2026-04-05',
        officerName: 'Priya Sharma (Owner)',
        note: 'Request submitted with E2 standard reference report.',
        completed: true
      },
      {
        stage: 'Inspection Scheduled',
        date: '2026-04-12',
        officerName: 'Neha Verma (LMO)',
        note: 'Inspection scheduled.',
        completed: true
      },
      {
        stage: 'Field-Verified',
        date: '2026-04-18',
        officerName: 'Neha Verma (LMO)',
        note: 'Repeatability error 0.02 mg. Verified compliant.',
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
    passportTimeline: []
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
    passportTimeline: []
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
    passportTimeline: []
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
    passportTimeline: []
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
    passportTimeline: []
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
    passportTimeline: []
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
    passportTimeline: []
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
    passportTimeline: []
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
    passportTimeline: []
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
    passportTimeline: []
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
    passportTimeline: []
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
    passportTimeline: []
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
    passportTimeline: []
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
    passportTimeline: []
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
    passportTimeline: []
  }
];

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
    qrPayload: 'https://emaap.gov.in/verify?cert=IND/LM/TS/25/0147',
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
    qrPayload: 'https://emaap.gov.in/verify?cert=IND/LM/TS/26/0482',
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
    qrPayload: 'https://emaap.gov.in/verify?cert=IND/LM/DL/26/0892',
    status: 'Active'
  }
];

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
  }
];

export const mockAdminStats = {
  totalInstrumentsStatewide: 48920,
  verificationsThisMonth: 3412,
  verificationsPending: 1845,
  averageComplianceScore: 88.4,
  overdueAlertsCount: 147
};
