# Header Component Architecture

## 📁 Current Structure

```
components/
├── Header.tsx                    # Main Header implementation (2080 lines)
├── Header_NEW.tsx                # Alternative implementation (unused, kept for reference)
└── Header/
    ├── index.tsx                 # ✅ MAIN ENTRY POINT - Re-exports from ../Header.tsx
    ├── SearchBar.tsx             # ✅ USED - Imported by Header.tsx
    ├── DesktopHeader.tsx          # ⚠️ UNUSED - Kept for future refactoring
    ├── MobileHeader.tsx           # ⚠️ UNUSED - Kept for future refactoring
    ├── NavigationMenu.tsx        # ⚠️ UNUSED - Used by DesktopHeader (which is unused)
    ├── UserMenu.tsx              # ⚠️ UNUSED - Used by DesktopHeader (which is unused)
    ├── MobileNav.tsx             # ⚠️ UNUSED - Used by MobileHeader (which is unused)
    ├── FilterDropdown.tsx        # ⚠️ UNUSED - Kept for future use
    ├── AdminFilterEditor.tsx     # ⚠️ UNUSED - Kept for future use
    ├── FilterMenuItem.tsx        # ⚠️ UNUSED - Kept for future use
    ├── NavigationLinks.tsx       # ⚠️ UNUSED - Kept for future use
    ├── SideMenu.tsx              # ⚠️ UNUSED - Kept for future use
    └── README.md                 # Documentation
```

## 🎯 Entry Point

**Main Entry**: `Header/index.tsx`

All imports should use:
```tsx
import Header from '@/components/Header';
```

This resolves to `Header/index.tsx`, which re-exports the actual Header component from `../Header.tsx`.

## 📦 Exports

### Main Export
- `default` - The main Header component (from `../Header.tsx`)

### Sub-component Exports (for direct imports if needed)
- `SearchBar` - Search bar component (✅ used by Header.tsx)
- `DesktopHeader` - Desktop header (⚠️ unused, kept for reference)
- `MobileHeader` - Mobile header (⚠️ unused, kept for reference)
- `FilterDropdown` - Filter dropdown component
- `AdminFilterEditor` - Admin filter editor
- `FilterMenuItem` - Filter menu item
- `UserMenu` - User menu component
- `NavigationLinks` - Navigation links component
- `SideMenu` - Side menu component
- `MobileNav` - Mobile navigation component
- `NavigationMenu` - Navigation menu component

## 🔄 Import Resolution

When you import:
```tsx
import Header from '@/components/Header';
```

The module resolution works as follows:
1. Looks for `@/components/Header/index.tsx` ✅
2. `Header/index.tsx` exports: `export { default } from '../Header'`
3. This resolves to `@/components/Header.tsx` ✅
4. The actual Header component is returned

## ⚠️ Unused Components

The following components are **not currently used** but are kept for future refactoring:

- `DesktopHeader.tsx` - Clean desktop header implementation
- `MobileHeader.tsx` - Clean mobile header implementation
- `Header_NEW.tsx` - Alternative wrapper using DesktopHeader/MobileHeader
- `NavigationMenu.tsx` - Used by DesktopHeader
- `UserMenu.tsx` - Used by DesktopHeader
- `MobileNav.tsx` - Used by MobileHeader

**Why kept?**
- They represent a cleaner architecture
- Useful for future refactoring to split the large Header.tsx
- No harm in keeping them (they're not imported anywhere)

## ✅ Used Components

- `Header.tsx` - The main implementation (used everywhere)
- `Header/SearchBar.tsx` - Used by Header.tsx
- `Header/index.tsx` - Entry point (used by all imports)

## 🚀 Future Refactoring

To use the cleaner architecture:

1. **Move logic from Header.tsx to DesktopHeader/MobileHeader**
   - Extract desktop-specific logic to `DesktopHeader.tsx`
   - Extract mobile-specific logic to `MobileHeader.tsx`
   - Keep shared logic in a custom hook or shared file

2. **Update Header.tsx to be a thin wrapper**
   ```tsx
   import DesktopHeader from './Header/DesktopHeader';
   import MobileHeader from './Header/MobileHeader';
   import { useIsMobile } from '@/hooks/use-mobile';
   
   const Header = () => {
     const isMobile = useIsMobile();
     return isMobile ? <MobileHeader /> : <DesktopHeader />;
   };
   ```

3. **Test thoroughly** before removing the old implementation

## 📝 Notes

- **DO NOT** delete any files unless you're 100% sure they're unused
- **DO NOT** change public exports without updating all imports
- **DO** add comments when marking files as unused
- **DO** keep unused files if they might be useful later

## 🔍 How to Check if a Component is Used

```bash
# Search for imports
grep -r "from.*Header/ComponentName" src/
grep -r "import.*ComponentName.*Header" src/

# If no results, the component is likely unused
```

---

**Last Updated**: 2025-01-18  
**Status**: ✅ Refactored - Clean architecture established

