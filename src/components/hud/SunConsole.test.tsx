import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SunConsole } from "./SunConsole";

describe("SunConsole", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function renderSunConsole(onPlanetSelect = vi.fn()) {
    act(() => {
      root.render(
        <SunConsole
          isOpen
          onClose={vi.fn()}
          onPlanetSelect={onPlanetSelect}
        />
      );
    });

    return onPlanetSelect;
  }

  function getButton(name: string): HTMLButtonElement {
    const button = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.includes(name)
    );

    if (!(button instanceof HTMLButtonElement)) {
      throw new Error(`Unable to find button containing "${name}"`);
    }

    return button;
  }

  it("renders the planet navigation with mounted and placeholder planets", () => {
    renderSunConsole();
    const sidebar = container.querySelector('[data-testid="planet-nav-sidebar"]');
    const mainContent = container.querySelector('[data-testid="sun-console-main"]');

    expect(container.textContent).toContain("行星导航 / PLANET NAV");
    expect(sidebar?.tagName).toBe("ASIDE");
    expect(mainContent?.tagName).toBe("MAIN");
    expect(sidebar?.nextElementSibling).toBe(mainContent);
    expect(sidebar?.querySelectorAll('button[aria-label^="Navigate to"]')).toHaveLength(8);
    expect(container.textContent).not.toContain("工具 / Tools");
    expect(container.textContent).not.toContain("[ 数据同步 ]");
    expect(container.textContent).not.toContain("[ 火星编辑器 ]");
    expect(container.textContent).not.toContain("[ 全文检索 ]");

    [
      "Mercury",
      "Venus",
      "Earth",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
    ].forEach((planetName) => {
      expect(container.textContent).toContain(planetName);
    });

    expect(container.textContent).toContain("Module Placeholder");
    expect(container.textContent).toContain("STANDBY");
    expect(container.textContent).toContain("ONLINE");
  });

  it("uses the night earth texture for the central situation map", () => {
    renderSunConsole();
    const centralEarth = container.querySelector<HTMLElement>(
      '[data-testid="central-earth-situation-map"]'
    );

    expect(centralEarth?.style.backgroundImage).toContain(
      "/textures/2k_earth_nightmap.jpg"
    );
  });

  it("renders a compact waveform for fleet system health", () => {
    renderSunConsole();
    const waveform = container.querySelector('[data-testid="fleet-health-waveform"]');

    expect(waveform?.querySelectorAll("path")).toHaveLength(2);
  });

  it("renders native SVG micro charts and updates chart data every second", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T03:04:05Z"));
    renderSunConsole();
    const ringChart = container.querySelector('[data-testid="micro-chart-ring"]');
    const lineChart = container.querySelector('[data-testid="micro-chart-line"]');
    const barCharts = container.querySelectorAll('[data-testid="micro-chart-bar"]');
    const initialBars = barCharts[0]?.querySelectorAll("rect");
    const initialLastBarHeight = initialBars?.[initialBars.length - 1]?.getAttribute("height");

    expect(ringChart?.querySelector("circle")).not.toBeNull();
    expect(lineChart?.querySelector("polyline")).not.toBeNull();
    expect(barCharts).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const updatedBars = container
      .querySelectorAll('[data-testid="micro-chart-bar"]')[0]
      ?.querySelectorAll("rect");
    expect(updatedBars?.[updatedBars.length - 1]?.getAttribute("height")).not.toBe(
      initialLastBarHeight
    );
  });

  it("loads APAC supply-chain rows from generated crawler JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 1,
            label: "新加坡枢纽",
            subtitle: "Live Feed · example.test",
            value: "Cargo throughput rises on APAC lanes",
            metricLabel: "Maritime Signal",
            icon: "port",
            variant: "positive",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderSunConsole();

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/data/apac-supply-chain.json?t="),
      expect.objectContaining({ cache: "no-store" })
    );
    expect(container.textContent).toContain("Cargo throughput rises on APAC lanes");
  });

  it("allows placeholder planets to be selected from the navigation", () => {
    const onPlanetSelect = renderSunConsole();

    act(() => {
      getButton("Venus").click();
    });

    expect(onPlanetSelect).toHaveBeenCalledWith("venus");
  });

  it("moves planet navigation highlight with pointer hover instead of pinning Earth", () => {
    renderSunConsole();
    const earthButton = getButton("Earth");
    const marsButton = getButton("Mars");

    expect(earthButton.className).not.toContain("border-cyan-300/80");
    expect(marsButton.textContent).not.toContain(">");

    act(() => {
      marsButton.dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true, relatedTarget: null })
      );
    });

    expect(marsButton.className).toContain("border-cyan-300/80");
    expect(earthButton.className).not.toContain("border-cyan-300/80");
    expect(marsButton.textContent).toContain(">");
  });

  it("renders a live Beijing clock", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-09T03:04:05Z"));

    renderSunConsole();

    expect(container.textContent).toContain("Time (BJT)");
    expect(container.textContent).toContain("11:04:05");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(container.textContent).toContain("11:04:06");
  });
});
