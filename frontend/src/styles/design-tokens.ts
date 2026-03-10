/**
 * Premium Design Tokens
 * 
 * Comprehensive design system for luxury automotive e-commerce experience.
 * 
 * @module DesignTokens
 */

export const designTokens = {
  // Premium Color Palette
  colors: {
    // Primary - Luxury Orange/Gold
    primary: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#F97316', // Main brand color
      600: '#EA580C',
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12',
      950: '#431407',
    },
    
    // Premium Dark Background
    dark: {
      900: '#0A0E14', // Deepest dark
      800: '#0F1724', // Main background
      700: '#1A202E', // Elevated surfaces
      600: '#252D3D', // Hover states
      500: '#374151',
    },
    
    // Accent Colors
    accent: {
      gold: '#D4AF37',
      platinum: '#E5E4E2',
      silver: '#C0C0C0',
      bronze: '#CD7F32',
    },
    
    // Glass Effects
    glass: {
      light: 'rgba(255, 255, 255, 0.05)',
      medium: 'rgba(255, 255, 255, 0.1)',
      strong: 'rgba(255, 255, 255, 0.15)',
    }
  },
  
  // Premium Typography
  typography: {
    fonts: {
      primary: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
      display: '"Playfair Display", Georgia, serif', // For luxury headings
      mono: '"JetBrains Mono", "Fira Code", monospace',
    },
    sizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      black: 900,
    }
  },
  
  // Premium Spacing
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
  },
  
  // Luxury Shadows
  shadows: {
    subtle: '0 2px 8px rgba(0, 0, 0, 0.1)',
    soft: '0 4px 16px rgba(0, 0, 0, 0.15)',
    medium: '0 8px 24px rgba(0, 0, 0, 0.2)',
    strong: '0 16px 48px rgba(0, 0, 0, 0.3)',
    glow: '0 0 32px rgba(249, 115, 22, 0.4)',
    glowStrong: '0 0 48px rgba(249, 115, 22, 0.6)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  
  // Premium Blur Effects
  blur: {
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '40px',
  },
  
  // Smooth Transitions
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: '600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // Border Radius
  radius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  },
} as const;

/**
 * Utility function to get color value
 */
export const getColor = (path: string): string => {
  const keys = path.split('.');
  let value: any = designTokens.colors;
  for (const key of keys) {
    value = value[key];
  }
  return value as string;
};

/**
 * Utility function to get shadow value
 */
export const getShadow = (name: keyof typeof designTokens.shadows): string => {
  return designTokens.shadows[name];
};

