// colors.ts - Stripe Design System Theme for Metro Verify (SIH26036)
// Grounded in official Stripe visual identity: Midnight Navy (#0A2540), Blurple (#635BFF), Slate (#425466), Clean Canvas (#F6F9FC), Crisp Border (#E3E8EE)

export const Colors = {
  // Stripe Primary Palette
  stripeBlurple: '#635BFF',      // Signature Stripe Blurple CTA
  stripeBlurpleDark: '#4B45C6',  // Hover / active dark blurple
  stripeBlurpleLight: '#EFF2FE', // Light tint for badges & active tabs
  stripeNavy: '#0A2540',         // Deep Stripe midnight navy for headings
  stripeSlate: '#425466',        // Clean readable slate for body & captions
  stripeMuted: '#8898AA',        // Secondary meta text
  stripeCanvas: '#F6F9FC',       // Clean, modern cool canvas
  stripeBorder: '#E3E8EE',       // Ultra-fine crisp card border
  stripeBorderLight: '#F1F4F8',
  
  // Stripe Gradient Swoosh & Accent Colors (from hero graphic)
  gradientCoral: '#FF5E5B',
  gradientOrange: '#FF7A59',
  gradientMagenta: '#EA4C89',
  gradientPurple: '#635BFF',
  gradientCyan: '#00D4FF',
  gradientBlue: '#0073E6',
  stripeRibbon: ['#FF5E5B', '#FF7A59', '#EA4C89', '#635BFF', '#00D4FF'] as const,

  // Primary Theme Aliases (Mapped to Stripe Palette for 100% backward compatibility)
  primaryNavy: '#0A2540',
  headerNavy: '#0A2540',
  navyDark: '#071A2E',
  navyLight: '#1B3B6F',
  navyAccent: '#635BFF',
  
  // Accents
  accentAmber: '#635BFF',        // Shifted to Stripe Blurple for modern elegance
  accentOrange: '#FF7A59',
  accentGold: '#635BFF',         // Modern Blurple accent
  accentGoldLight: '#EFF2FE',
  accentGoldMuted: '#4B45C6',
  accentRoyalBlue: '#635BFF',
  accentEmerald: '#059669',
  accentRuby: '#DF1B41',
  
  // Backgrounds & Glass Surfaces
  background: '#F6F9FC',         // Stripe signature light canvas
  backgroundDark: '#0A2540',
  surface: '#FFFFFF',
  surfaceSubtle: '#FAFCFD',
  surfaceGlass: 'rgba(255, 255, 255, 0.95)',
  surfaceGlassDark: 'rgba(10, 37, 64, 0.95)',
  surfaceCardGlass: '#FFFFFF',
  
  // High-End Borders
  border: '#E3E8EE',             // Stripe standard border
  borderLight: '#EDF2F7',
  borderDark: '#D8DEE4',
  borderGold: 'rgba(99, 91, 255, 0.3)',
  borderGlass: 'rgba(227, 232, 238, 0.8)',
  
  // Typography Hierarchy
  textPrimary: '#0A2540',        // Stripe Midnight Navy
  textSecondary: '#425466',      // Stripe Slate
  textMuted: '#8898AA',
  textWhite: '#FFFFFF',
  textGold: '#635BFF',

  // Status Badges (Stripe subtle pastel pills with crisp readable ink)
  status: {
    pending: {
      bg: '#F8FAFC',
      text: '#425466',
      border: '#E3E8EE',
      dot: '#94A3B8'
    },
    scheduled: {
      bg: '#EFF2FE',
      text: '#4B45C6',
      border: '#D8DEFE',
      dot: '#635BFF'
    },
    inProgress: {
      bg: '#FFFBEB',
      text: '#92400E',
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
      text: '#991B1B',
      border: '#FECACA',
      dot: '#EF4444'
    }
  }
};


