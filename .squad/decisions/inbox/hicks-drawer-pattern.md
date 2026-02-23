# Decision: Drawer Component Pattern for UI Overlays

**Date:** 2026-02-23  
**Author:** Hicks (Game UI Dev)  
**Context:** Issue #3 (HistoryDrawer) and Issue #4 (DetailsDrawer)

## Decision
Established a consistent drawer pattern for contextual UI overlays that provides:
- Shared `.drawer-overlay` backdrop (semi-transparent with blur)
- Shared `.drawer-close-button` styling for consistency
- Slide-in animation from the edge (left or right)
- Escape key handling for quick closure
- Body scroll lock when drawer is open
- Reduced-motion accessibility fallback

## Pattern Structure
```tsx
// Component structure
<>
  <div className="drawer-overlay" onClick={onClose} />
  <aside className="[specific]-drawer" role="dialog">
    <div className="[specific]-drawer-header">
      <h2>Title</h2>
      <button className="drawer-close-button">✕</button>
    </div>
    <div className="[specific]-drawer-content">
      {/* Content */}
    </div>
  </aside>
</>
```

## Spatial Strategy
- **Right side:** Primary gameplay information (HistoryDrawer with scroll icon 📜)
- **Left side:** Meta/settings information (DetailsDrawer with gear icon ⚙️)
- This creates visual separation between "what happened" vs "what are the rules"

## Implementation Notes
- Both drawers use `z-index: 1000` (overlay) and `z-index: 1001` (drawer)
- Toggle buttons positioned at `bottom: 1.8rem`, spaced `left/right: 1.8rem` from edges
- Animation duration: 280ms cubic-bezier for drawer, 240ms ease for overlay fade
- TypeScript: Ensure both `activeGame` and `activeLobby` null checks when rendering drawers

## Why This Matters
- New drawer types (e.g., player stats, settings) can follow this pattern  
- Consistent UX across all overlays improves learnability
- Shared CSS reduces bundle size and maintenance burden
- Spatial positioning prevents drawer conflicts
