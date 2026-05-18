# PRD: Workbench Layout Refactoring — "Left Chat, Right Work"

## Problem Statement

The current analytical pipeline page renders selectable cards and tags inline within the left panel's conversation flow. This creates several UX problems:

1. **Vertical overflow**: Phase B and C generate many option cards that stretch the page vertically, forcing excessive scrolling
2. **Context loss**: When users scroll through long option lists, they lose sight of the input controls and action buttons
3. **Wasted right panel**: The right Canvas panel only activates in Phase D, leaving 50%+ of the screen unused during Phases B-C
4. **Cognitive overload**: Mixing chat/conversation UI with structured selection UI in the same column creates visual clutter

## Solution

Implement a **"Left Chat, Right Work"** paradigm where:

- **Left Panel (Chat Column)**: Narrow, sticky sidebar for user input, AI conversation, and action buttons. Always visible, never scrolls away.
- **Right Panel (Workbench)**: Wide workspace that slides out early (Phase B) to host all structured content — option cards, tags, and eventually the editor.

This mirrors modern AI workbench patterns (Gemini Canvas, Claude Artifacts) where the conversation and the work product are spatially separated.

## User Stories

1. As an analyst, I want the option cards to appear in a dedicated workspace, so that the conversation flow stays compact and scannable.
2. As an analyst, I want the right panel to appear as soon as structured options are generated (Phase B), so that I have maximum space for selection and refinement.
3. As an analyst, I want the left panel to remain fixed while I scroll through long option lists on the right, so that I can always access the action buttons.
4. As an analyst, I want the right panel to smoothly transition from showing option cards (Phase B/C) to showing the editor (Phase D), so that the workspace feels continuous.
5. As an analyst, I want to see which phase I'm in and what the current workbench contains, so that I don't lose context during transitions.
6. As an analyst, I want my tag edits in Phase C to persist and be clearly visible, so that I can curate the concept set confidently.
7. As an analyst, I want the Phase A experience to remain simple (single column), so that the initial input feels lightweight and uncluttered.

## Implementation Decisions

### 1. Panel Trigger: Phase B (not Phase D)

- `isCanvasOpen` becomes `true` when `phase >= "B"` (i.e., Phase B, C, or D)
- Phase A remains single-column centered (`max-w-3xl mx-auto`)
- The transition from A→B triggers the panel slide-out animation

### 2. Workbench View State Machine

Introduce a derived view state based on the current phase:

```typescript
type WorkbenchView = "cards" | "tags" | "editor";

const workbenchView: WorkbenchView = 
  phase === "B" ? "cards" :
  phase === "C" ? "tags" :
  phase === "D" ? "editor" : "cards";
```

**View rendering:**
- `"cards"`: Renders the checkbox card list (existing Phase B/C card UI, moved from left panel)
- `"tags"`: Renders the interactive tag pills + add input (existing Phase C tag UI, moved from left panel)
- `"editor"`: Renders TipTap editor or Markdown preview (existing Phase D right panel content)

### 3. Layout Structure

```
<section className="flex flex-1 gap-5 overflow-x-hidden">
  {/* Left Panel — Chat Column */}
  <div className={`transition-all duration-500 ${isWorkbenchOpen ? 'w-[38%]' : 'w-full max-w-3xl mx-auto'}`}>
    {/* Phase tabs */}
    {/* Input / conversation */}
    {/* Action buttons */}
    {/* Summary of prior selections (compact) */}
  </div>

  {/* Right Panel — Workbench */}
  <div className={`transition-all duration-500 ${isWorkbenchOpen ? 'w-[62%] opacity-100' : 'w-0 opacity-0'}`}>
    <GlassPanel className="flex flex-col h-full">
      <header>{/* Workbench title + context */}</header>
      <div className="flex-1 overflow-y-auto">
        {view === "cards" && <OptionCardsList />}
        {view === "tags" && <TagEditor />}
        {view === "editor" && <DraftEditor />}
      </div>
    </GlassPanel>
  </div>
</section>
```

### 4. Left Panel Content Restructuring

Remove the "SELECTABLE OUTPUT" GlassPanel from the left column entirely. The left panel becomes:

1. **Phase tabs** (grid-cols-4) — keep for navigation
2. **Context area** — show current phase title + prior selections summary (compact, not full cards)
3. **Action buttons** — Generate / Advance / Reset
4. **Streaming status** — brief indicator when AI is generating

### 5. Right Panel Header Context

The right panel header should display context-aware titles:

- Phase B: "DIMENSIONAL ANALYSIS — Select atomic events"
- Phase C: "CONCEPT REFINERY — Curate keywords"
- Phase D: "DEEP SPACE DRAFT — Final composition"

### 6. Sticky Behavior

- Left panel: `position: sticky; top: 0; align-self: flex-start` within the flex container
- Right panel: `overflow-y-auto` on the content area, header stays fixed
- This ensures the left panel stays visible while the right panel scrolls independently

### 7. State Management

No new top-level state needed. The view is derived from `phase`:

```typescript
const isWorkbenchOpen = phase !== "A";
const workbenchView = phase === "B" ? "cards" : phase === "C" ? "tags" : "editor";
```

All existing state (`selections`, `selectedItems`, `customTags`, `archives`, etc.) continues to work unchanged.

### 8. Data Flow Preservation

- `toggleSelection` callback remains the same
- `runPhase` and `advancePhase` remain the same
- `buildPhasePrompt` remains the same
- The only change is **where** the UI renders, not **how** the data flows

## Testing Decisions

### What to test

1. **Layout transitions**: Verify that entering Phase B triggers the panel slide-out, and returning to Phase A collapses it
2. **View switching**: Verify that Phase B shows cards, Phase C shows tags, Phase D shows editor
3. **Scroll isolation**: Verify that scrolling the right panel doesn't scroll the left panel
4. **Data persistence**: Verify that selections made in the right panel are preserved when switching phases

### Manual test checklist

- [ ] Phase A: Single column, no right panel, input area centered
- [ ] Phase B: Right panel slides out, cards render in right panel, left panel shows summary
- [ ] Phase B→C: Right panel switches from cards to tags, left panel updates context
- [ ] Phase C→D: Right panel switches from tags to editor, left panel shows final summary
- [ ] Phase D: Editor fully functional, save/edit buttons work
- [ ] Reset: Returns to Phase A, single column, all state cleared
- [ ] Responsive: Layout works on tablet and desktop (mobile can stack)

## Open Questions

1. Should the left panel show a **mini-preview** of what's selected in the right panel? (e.g., "3 events selected" badge)
2. Should users be able to **manually toggle** the right panel open/closed via a button, or is phase-driven sufficient?
3. Should Phase A also have a "preview" mode where the right panel shows the initial prompt/context?

---

**Status**: Ready for implementation
**Priority**: High
**Estimated effort**: Medium (mostly UI restructuring, minimal logic changes)
