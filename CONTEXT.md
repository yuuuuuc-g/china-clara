# Knowledge Galaxy

A 3D solar system visualization.
This branch contains the frontend UI shell only; application modules and backend functionality have been removed.

## Language

**Planet**:
A celestial body in the 3D visualization. Clicking a Planet focuses the camera on it and opens its detail panel.

**Focus**:
The state in which one Planet is selected. Camera controls lock onto the focused Planet and the detail HUD appears. Escape or "Back to Galaxy" clears Focus.

**HUD**:
HTML overlay content rendered above the 3D canvas (mission header, detail panel). HUD elements never live inside the Canvas render tree.

## Relationships

- At most one **Planet** is in **Focus** at a time
- **Focus** drives the **HUD** detail panel visibility

## Example dialogue

> **Dev:** "Should the detail panel stream data while the camera animates to the planet?"
> **Domain expert:** "There is no data to stream — the panel shows the planet's static config. Keep high-frequency values out of the Canvas tree regardless."
