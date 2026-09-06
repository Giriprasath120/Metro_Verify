// Centralized API configuration for Metro Verify
export const API_BASE_URL = 'http://localhost:4000';

export const API_ENDPOINTS = {
  // Auth
  login: `${API_BASE_URL}/api/auth/login`,
  register: `${API_BASE_URL}/api/auth/register`,
  officersList: `${API_BASE_URL}/api/auth/officers`,

  // LMO Officer
  lmoDashboard: `${API_BASE_URL}/api/lmo/dashboard`,
  lmoAssignments: `${API_BASE_URL}/api/lmo/assignments`,
  lmoBatches: (id: string) => `${API_BASE_URL}/api/lmo/batches/${id}`,
  lmoInstrument: (id: string) => `${API_BASE_URL}/api/lmo/instruments/${id}`,

  // Inspections
  inspectionStart: (id: string) => `${API_BASE_URL}/api/inspections/${id}/start`,
  inspectionResults: (id: string) => `${API_BASE_URL}/api/inspections/${id}/results`,
  inspectionPhotos: (id: string) => `${API_BASE_URL}/api/inspections/${id}/photos`,
  inspectionLocation: (id: string) => `${API_BASE_URL}/api/inspections/${id}/location`,
  inspectionComplete: (id: string) => `${API_BASE_URL}/api/inspections/${id}/complete`,
  inspectionFailure: (id: string) => `${API_BASE_URL}/api/inspections/${id}/failure`,
  inspectionReinspection: (id: string) => `${API_BASE_URL}/api/inspections/${id}/reinspection`,

  // Offline
  offlineSync: `${API_BASE_URL}/api/offline/sync`,
  offlineStatus: `${API_BASE_URL}/api/offline/status`,

  // Applications
  applications: `${API_BASE_URL}/api/applications`,
  applicationWithdraw: (id: string) => `${API_BASE_URL}/api/applications/${id}/withdraw`,

  // Bulk requests
  bulkRequests: `${API_BASE_URL}/api/bulk-requests`,
  bulkSplit: (id: string) => `${API_BASE_URL}/api/bulk-requests/${id}/split`,

  // Instruments
  instruments: `${API_BASE_URL}/api/instruments`,
  instrumentDetail: (id: string) => `${API_BASE_URL}/api/instruments/${id}`,
  instrumentPassport: (id: string) => `${API_BASE_URL}/api/instruments/${id}/passport`,

  // Certificates
  certificates: `${API_BASE_URL}/api/certificates`,
  certificateDetail: (id: string) => `${API_BASE_URL}/api/certificates/${id}`,
  certificatePdf: (id: string) => `${API_BASE_URL}/api/certificates/${id}/pdf`,

  // Chatbot
  chatbotQuery: `${API_BASE_URL}/api/chatbot/query`,

  // Schedule & Allocation
  scheduleAllocate: `${API_BASE_URL}/api/schedule/allocate`,
  scheduleAssign: `${API_BASE_URL}/api/schedule/assign`,
  scheduleAllocateBalanced: `${API_BASE_URL}/api/schedule/allocate-balanced`,
  officersSchedule: `${API_BASE_URL}/api/schedule/officers`,

  // Officer legacy
  recordVerification: (id: string) => `${API_BASE_URL}/verifications/${id}/record`,

  // Compliance
  complianceScore: (ownerId: string) => `${API_BASE_URL}/api/compliance/${ownerId}/score`,

  // Dashboard
  adminDashboard: `${API_BASE_URL}/api/dashboard/admin`,
  cleanSlate: `${API_BASE_URL}/api/dashboard/clean-slate`,

  // Bulk Auto-Split
  bulkAutoSplitAllocate: (id: string) => `${API_BASE_URL}/api/bulk-requests/${id}/auto-split-allocate`,

  // GATC Handoff & Endorsement
  passToGatc: (id: string) => `${API_BASE_URL}/api/inspections/${id}/pass-to-gatc`,
  pendingGatc: `${API_BASE_URL}/api/inspections/pending-gatc`,
  gatcEndorse: (id: string) => `${API_BASE_URL}/api/inspections/${id}/gatc-endorse`,

  // Dashboard
  dashboard: (role: string) => `${API_BASE_URL}/dashboard/${role}`,
};
