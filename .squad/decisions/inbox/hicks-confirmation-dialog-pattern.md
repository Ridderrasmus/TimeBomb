# Decision: Confirmation Dialog Pattern for Destructive Actions

**Date:** 2026-02-23  
**Author:** Hicks (Game UI Dev)  
**Context:** Issue #5 (Game Restart) - first destructive user action requiring confirmation

## Decision
Established a confirmation dialog pattern for destructive or irreversible actions:
- Modal overlay with backdrop blur (z-index 2000, above drawers at 1001)
- Scale-in animation for dialog appearance (`restartDialogScaleIn`)
- Clear warning text explaining consequences
- Two-button layout: Cancel (muted gray) and Confirm (distinctive color)
- Escape key closes dialog (before closing underlying UI)
- Click outside dialog cancels action
- Busy state prevents multiple submissions

## Visual Design
- **Confirmation button**: Orange-to-pink gradient (`#ff7b4f` to `#ff5b8f`) to distinguish from standard blue actions
- **Cancel button**: Muted gray background matching other secondary actions
- **Dialog**: Elevated surface with strong border, 24px shadow for prominence
- **Text hierarchy**: Bold title (1.4rem), explanatory body text (0.95rem), clear button labels

## UX Flow
```
User clicks destructive action button
  → Confirmation dialog appears with overlay
  → User can: Cancel (Escape/click outside/Cancel button) OR Confirm
  → On confirm: Dialog closes, action executes with busy state
  → On cancel: Dialog closes, no action taken
```

## Implementation Pattern
```tsx
// Component state
const [showConfirmDialog, setShowConfirmDialog] = useState(false);

// Trigger confirmation
const handleDestructiveAction = () => setShowConfirmDialog(true);

// Execute action
const handleConfirm = async () => {
  setShowConfirmDialog(false);
  await performDestructiveAction();
};

// Cancel
const handleCancel = () => setShowConfirmDialog(false);

// Render
{showConfirmDialog && (
  <div className="confirm-overlay" onClick={handleCancel}>
    <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
      <h3>Action Title</h3>
      <p>Clear warning about consequences</p>
      <div className="confirm-actions">
        <button onClick={handleCancel}>Cancel</button>
        <button onClick={handleConfirm}>Confirm Action</button>
      </div>
    </div>
  </div>
)}
```

## CSS Guidelines
```css
.confirm-overlay {
  z-index: 2000; /* Above drawers (1001) and overlays (1000) */
  background: rgba(3, 7, 21, 0.84);
  backdrop-filter: blur(8px);
}

.confirm-dialog {
  animation: confirmDialogScaleIn 240ms cubic-bezier(0.16, 1, 0.3, 1);
}

.destructive-action-button {
  background: linear-gradient(135deg, #ff7b4f 0%, #ff5b8f 100%);
  /* Orange-pink gradient for destructive actions */
}
```

## When to Use
- Actions that reset significant state (game restart, lobby reset)
- Actions that delete data (clear history, remove player)
- Actions that affect other users (kick player, force end game)
- Actions that trigger external side effects (leave lobby, abandon match)

## When NOT to Use
- Normal gameplay actions (reveal wire, make decision)
- Toggles and reversible settings
- Navigation actions
- Read-only operations (open drawer, view details)

## Rationale
1. **Prevents accidents**: Users won't accidentally trigger destructive actions with a single misclick
2. **Clear communication**: Warning text ensures users understand consequences
3. **Visual distinction**: Orange-pink color signals "caution" vs standard blue "go ahead"
4. **Accessibility**: Escape key and click-outside provide multiple exit paths
5. **Consistency**: Reusable pattern for future destructive actions

## Related Patterns
- **Drawer Pattern** (issues #3, #4): For contextual information display
- **Decision Modal** (Phase 2): For gameplay choices (not destructive, different UX)
- **Error Display** (existing): For backend validation failures

## Future Applications
- Leave lobby during active game (would affect other players)
- Clear rule configuration (loses unsaved changes)
- Force end game as creator (terminates active match)
- Kick player from lobby (affects another user)

## Files
- Example: `frontend/src/components/DetailsDrawer.tsx` (restart confirmation)
- Styles: `frontend/src/App.css` (`.restart-confirm-*` classes)
- Pattern can be extracted into reusable `ConfirmDialog` component if needed
