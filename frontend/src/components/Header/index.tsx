/**
 * Header Component - Main Entry Point
 * 
 * This is the main entry point for the Header component system.
 * 
 * ARCHITECTURE:
 * - Header/index.tsx: Main entry point (this file) - re-exports the actual Header component
 * - Header.tsx: The actual Header implementation (thin wrapper pattern)
 * - Header/DesktopHeader.tsx: Desktop-specific header UI (currently unused, kept for future use)
 * - Header/MobileHeader.tsx: Mobile-specific header UI (currently unused, kept for future use)
 * - Header/SearchBar.tsx: Search bar component (used by Header.tsx)
 * - Header/*.tsx: Other sub-components (FilterDropdown, UserMenu, etc.)
 * 
 * USAGE:
 * ```tsx
 * import Header from '@/components/Header';
 * // This resolves to Header/index.tsx, which exports from ../Header.tsx
 * ```
 * 
 * @module Header
 */

// Main Header component - re-export from parent directory
// This allows Header/ to be the main entry point while keeping the implementation in Header.tsx
export { default } from '../Header';
export { default as Header } from '../Header';

// Sub-components exports (for direct imports if needed)
export { default as SearchBar } from './SearchBar';
export { default as DesktopHeader } from './DesktopHeader';
export { default as MobileHeader } from './MobileHeader';
export { default as FilterDropdown } from './FilterDropdown';
export { default as AdminFilterEditor } from './AdminFilterEditor';
export { default as FilterMenuItem } from './FilterMenuItem';
export { default as UserMenu } from './UserMenu';
export { default as NavigationLinks } from './NavigationLinks';
export { default as SideMenu } from './SideMenu';
export { default as MobileNav } from './MobileNav';
export { default as NavigationMenu } from './NavigationMenu';

