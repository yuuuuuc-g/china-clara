# Knowledge Galaxy Project Guidelines

## 🛠 Project Stack
- **Framework**: Next.js (App Router)
- **3D Engine**: @react-three/fiber + @react-three/drei (Three.js)
- **UI**: Tailwind CSS
- **Animations**: Framer Motion / Framer Motion 3D
- **State**: Zustand
- **Type Safety**: Strict TypeScript (Matt Pocock Style)

This branch is the frontend UI shell only.
All backend functionality (Supabase, AI pipelines, RAG, intelligence ingestion, cron jobs) has been removed.

## 🏛 Architecture Patterns
- **Canvas-First (3D)**: `page.tsx` should only contain the `<Canvas>` and HUD containers. Celestial bodies (Star, Planet, Belt) are strictly split into `src/components/canvas/`.
- **Z-Index Strategy**:
  - `Z-Index 0`: Three.js Canvas
  - `Z-Index 10+`: HUD Overlays & Panels

## 🧩 TypeScript Standards (Matt Pocock Style)
- **Ref Typing**: Explicit Three.js types for refs (e.g., `useRef<THREE.Group>(null!)`).
- **Props Interfaces**: Use `interface` for component props; exhaustive typing over `any`.
- **Zero-Assertion**: Avoid `as any`. Use type guards.
- **Utility Types**: Leverage `ComponentPropsWithoutRef`.

## 🌌 Performance Strategy (8GB RAM Device Optimization)
- **3D Instancing**: Use `Instances` or `Merged` for repetitive objects (asteroids, starfields).
- **Asset Management**: Always use `useGLTF.preload` for 3D models.
- **Frame Looping**: Use `useFrame` sparingly. Dispose of geometries/materials on unmount.
- **High-Frequency State Isolation**: Never store high-frequency values in components wrapping `<Canvas>` or in global state. See `docs/decisions/001-r3f-streaming-isolation.md`.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `yuuuuuc-g/knowledge-galaxy`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-state triage label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo with `CONTEXT.md`, `docs/adr/`, and `docs/decisions/`. See `docs/agents/domain.md`.

### GitNexus usage boundary

GitNexus is project-local and should be invoked via `npx --no-install gitnexus`. Do not use GitNexus as a routine daily-development prerequisite. Only use it when building a large information map, taking over a fully unfamiliar legacy codebase, or doing macro-level architecture safety review.

## 🤖 Agent Workflow (Orchestration & Engineering Skills)
You MUST read and adhere to the skills installed in the `.agents` directory before executing code changes. This project strictly follows the **Matt Pocock "Real Engineering" SOP**:

1. **Initial Setup (Mandatory)**
   - Run `/setup-matt-pocock-skills` (if not already done) to scaffold per-repo config for issue tracking, vocabulary, and domain docs.

2. **Planning & Alignment (Before Coding)**
   - Do NOT start writing code immediately.
   - Use **`/grill-with-docs`**: When tackling a complex task, interrogate the user to challenge the plan against the existing domain model. Update `CONTEXT.md` and ADRs inline.
   - Use **`/to-prd`**: After grilling, synthesize the conversation into a PRD to solidify the architecture.

3. **Implementation Strategy**
   - Use **`/prototype`**: For unproven integrations (e.g., novel 3D HUD toggles), build a throwaway prototype first to resolve state/logic uncertainties before merging into the main codebase.
   - Use **`/tdd`**: When writing utility functions or core data transformations, adopt a red-green-refactor loop. Build vertical slices.

4. **Debugging & Refactoring**
   - Use **`/diagnose`**: If encountering React rendering loops or 3D canvas crashes, follow the strict diagnosis loop: reproduce → minimise → hypothesise → instrument → fix → regression-test.
   - Use **`/improve-codebase-architecture`**: Periodically analyze the component tree (e.g., `page.tsx`) to find deepening opportunities, guided by the domain language in `CONTEXT.md`.
   - Use **`/zoom-out`**: If stuck on localized state management, zoom out to analyze the broader architecture.

5. **Communication**
   - Use **`/caveman`**: To reduce token usage and drop filler, communicate with the user in ultra-compressed mode while retaining full technical accuracy.
