import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeDetailPanel } from "@/src/components/hud/NodeDetailPanel";
import { useSolarStore } from "@/src/store/solarStore";
import type { PlanetConfig } from "@/src/components/canvas/types";

const jupiter: PlanetConfig = {
  name: "Jupiter",
  type: "planet",
  description: "The largest planet in the solar system.",
  color: "#d8ca9d",
  size: 2.4,
  orbitRadius: 14,
  orbitSpeed: 0.2,
  rotationSpeed: 0.4,
};

describe("NodeDetailPanel", () => {
  beforeEach(() => {
    useSolarStore.setState({ focusedPlanet: null });
  });

  afterEach(() => {
    cleanup();
    useSolarStore.setState({ focusedPlanet: null });
  });

  it("renders nothing when no planet is focused", () => {
    const { container } = render(<NodeDetailPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows planet details when a planet is focused", () => {
    useSolarStore.setState({ focusedPlanet: jupiter });
    render(<NodeDetailPanel />);

    expect(screen.getByRole("heading", { name: "JUPITER" })).toBeInTheDocument();
    expect(screen.getByText("The largest planet in the solar system.")).toBeInTheDocument();
    expect(screen.getByText("14 AU")).toBeInTheDocument();
  });

  it("clears focus when Back to Galaxy is clicked", () => {
    useSolarStore.setState({ focusedPlanet: jupiter });
    render(<NodeDetailPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Back to Galaxy" }));

    expect(useSolarStore.getState().focusedPlanet).toBeNull();
  });
});
