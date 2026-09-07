// Comprehensive Auth Service for Owner, Officer, and Admin authentication, registration, and JWT handling
import { API_ENDPOINTS } from '../config/api';

export type UserRole = 'owner' | 'officer' | 'admin' | 'none';

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  businessName?: string;
  badgeNumber?: string;
  designation?: string;
  department?: string;
  district?: string;
  state?: string;
  address?: string;
  jurisdiction?: string;
  complianceScore?: number;
}

export interface OfficerProfile extends UserProfile {
  badgeNumber: string;
  district: string;
}

let activeToken: string | null = null;
let activeRole: UserRole = 'none';
let currentUser: UserProfile | null = null;

// Default officer for fallback
let currentOfficer: OfficerProfile = {
  id: 'LMO-101',
  name: 'V. Ramanathan',
  role: 'LMO',
  badgeNumber: 'LM-HYD-042',
  designation: 'Senior Legal Metrology Officer',
  department: 'Department of Legal Metrology',
  district: 'Chennai',
  jurisdiction: 'Chennai North',
};

// Try to initialize from localStorage if on web
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedToken = localStorage.getItem('mv_auth_token') || localStorage.getItem('mv_officer_token');
    const savedUser = localStorage.getItem('mv_auth_user');
    const savedRole = localStorage.getItem('mv_auth_role') as UserRole;
    const savedOfficer = localStorage.getItem('mv_officer_profile');

    if (savedToken) activeToken = savedToken;
    if (savedRole) activeRole = savedRole;
    if (savedUser) currentUser = JSON.parse(savedUser);
    if (savedOfficer) currentOfficer = JSON.parse(savedOfficer);
  }
} catch (e) {
  // Ignore
}

export const getUserToken = (): string | null => activeToken;
export const getOfficerToken = (): string | null => activeToken;

export const getActiveUser = (): UserProfile | null => currentUser;
export const getActiveRole = (): UserRole => activeRole;
export const getActiveOfficer = (): OfficerProfile => currentOfficer;

export const setActiveSession = (user: UserProfile, role: UserRole, token?: string) => {
  currentUser = user;
  activeRole = role;
  if (token) activeToken = token;

  if (role === 'officer' || user.role === 'LMO' || user.role === 'GATC') {
    currentOfficer = user as OfficerProfile;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('mv_auth_user', JSON.stringify(user));
      localStorage.setItem('mv_auth_role', role);
      if (token) {
        localStorage.setItem('mv_auth_token', token);
        localStorage.setItem('mv_officer_token', token);
      }
      if (role === 'officer') {
        localStorage.setItem('mv_officer_profile', JSON.stringify(user));
      }
    }
  } catch (e) {}
};

export const setActiveOfficer = (officer: OfficerProfile, token?: string) => {
  currentOfficer = officer;
  setActiveSession(officer, 'officer', token);
};

export const logoutUser = () => {
  activeToken = null;
  activeRole = 'none';
  currentUser = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('mv_auth_token');
      localStorage.removeItem('mv_auth_user');
      localStorage.removeItem('mv_auth_role');
      localStorage.removeItem('mv_officer_token');
      localStorage.removeItem('mv_officer_profile');
    }
  } catch (e) {}
};

// Generic Login for any role (Owner, Officer, Admin)
export const loginUser = async (
  role: 'owner' | 'officer' | 'admin',
  identifier: string,
  password: string = 'password123'
): Promise<{ success: boolean; user?: UserProfile; role?: UserRole; token?: string; error?: string }> => {
  try {
    const res = await fetch(API_ENDPOINTS.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, identifier, password }),
    });

    const data = await res.json();
    if (data.success && data.token && data.user) {
      const canonicalRole: UserRole =
        data.role === 'owner' ? 'owner' :
        data.role === 'admin' ? 'admin' : 'officer';

      setActiveSession(data.user, canonicalRole, data.token);
      return { success: true, user: data.user, role: canonicalRole, token: data.token };
    }
    return { success: false, error: data.error || data.message || 'Authentication failed' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// Generic Register for Owner or Officer
export const registerUser = async (
  payload: {
    role: 'owner' | 'officer' | 'gatc';
    name: string;
    businessName?: string;
    email: string;
    phone?: string;
    password?: string;
    state?: string;
    district?: string;
    address?: string;
    badgeNumber?: string;
    designation?: string;
  }
): Promise<{ success: boolean; user?: UserProfile; role?: UserRole; token?: string; error?: string }> => {
  try {
    const res = await fetch(API_ENDPOINTS.register, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.success && data.token && data.user) {
      const canonicalRole: UserRole =
        data.role === 'owner' ? 'owner' : 'officer';

      setActiveSession(data.user, canonicalRole, data.token);
      return { success: true, user: data.user, role: canonicalRole, token: data.token };
    }
    return { success: false, error: data.error || 'Registration failed' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// Backwards-compatible loginOfficer
export const loginOfficer = async (
  identifier: string = 'LMO-101',
  password: string = 'password123'
): Promise<{ success: boolean; officer?: OfficerProfile; token?: string; error?: string }> => {
  const result = await loginUser('officer', identifier, password);
  return {
    success: result.success,
    officer: result.user as OfficerProfile,
    token: result.token,
    error: result.error,
  };
};
