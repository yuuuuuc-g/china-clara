import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GalaxyNodes, updateGalaxyNodeColors } from "./GalaxyNodes";
import type { NodeData } from "@/app/api/nodes/route";

describe("GalaxyNodes", () => {
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
  });

  it("uses nodesData length as the instanced node count", () => {
    const nodesData: NodeData[] = [
      { id: "chunk-1", chapter_title: "规则", chunk_index: 0 },
      { id: "chunk-2", chapter_title: "产权", chunk_index: 1 },
      { id: "chunk-3", chapter_title: "分工", chunk_index: 2 },
    ];

    act(() => {
      root.render(<GalaxyNodes highlightedNodeId={null} nodesData={nodesData} />);
    });

    expect(container.querySelector("[data-node-count]")).toHaveAttribute(
      "data-node-count",
      "3"
    );
  });

  it("updates every instance color and marks instanceColor dirty once per target change", () => {
    const nodesData: Pick<NodeData, "id">[] = [
      { id: "chunk-1" },
      { id: "chunk-2" },
      { id: "chunk-3" },
    ];
    const setColorAt = vi.fn();
    const mesh = {
      setColorAt,
      instanceColor: {
        needsUpdate: false,
      },
    };

    updateGalaxyNodeColors(mesh, nodesData, "chunk-2");

    expect(setColorAt).toHaveBeenCalledTimes(3);
    expect(setColorAt).toHaveBeenNthCalledWith(2, 1, new THREE.Color("#fbbf24"));
    expect(mesh.instanceColor.needsUpdate).toBe(true);
  });
});
