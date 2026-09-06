// colors.ts - Government Tech Theme for Metro Verify (SIH26036)

export const Colors = {
  // Primary Palette (Indian Gov Tech: Deep Navy & Warm Amber)
  primaryNavy: '#0B2545',
  headerNavy: '#133B5C',
  navyDark: '#07162C',
  navyLight: '#1D4E89',
  
  accentAmber: '#E65100', // Warm orange/amber primary action
  accentOrange: '#F58220',
  accentGold: '#D97706',
  
  // Backgrounds & Surfaces
  background: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  border: '#E2E8F0',
  borderDark: '#CBD5E1',
  
  // Typography
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textWhite: '#FFFFFF',

  // Status Badges (Strictly aligned with requirements)
  status: {
    pending: {
      bg: '#F1F5F9',
      text: '#475569',
      border: '#CBD5E1',
      dot: '#94A3B8'
    },
    scheduled: {
      bg: '#EFF6FF',
      text: '#1D4ED8',
      border: '#BFDBFE',
      dot: '#3B82F6'
    },
    inProgress: {
      bg: '#FFFBEB',
      text: '#B45309',
      border: '#FDE68A',
      dot: '#F59E0B'
    },
    verified: {
      bg: '#ECFDF5',
      text: '#047857',
      border: '#A7F3D0',
      dot: '#10B981'
    },
    expiringSoon: {
      bg: '#FFF7ED',
      text: '#C2410C',
      border: '#FED7AA',
      dot: '#F97316'
    },
    expired: {
      bg: '#FEF2F2',
      text: '#B91C1C',
      border: '#FECACA',
      dot: '#EF4444'
    }
  }
};
