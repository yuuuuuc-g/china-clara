"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { NodeData } from "@/app/api/nodes/route";

const NODE_RADIUS = 0.035;
const HIGHLIGHT_COLOR = new THREE.Color("#fbbf24");

export interface GalaxyNodesProps {
  nodesData: Pick<NodeData, "id">[];
  highlightedNodeId: string | null;
}

interface InstanceColorBuffer {
  needsUpdate: boolean;
}

export interface InstancedColorTarget {
  instanceColor: InstanceColorBuffer | null;
  setColorAt(index: number, color: THREE.Color): void;
}

interface InstancedMeshTarget extends InstancedColorTarget {
  instanceMatrix: InstanceColorBuffer;
  setMatrixAt(index: number, matrix: THREE.Matrix4): void;
}

function isInstancedMeshTarget(value: unknown): value is InstancedMeshTarget {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<InstancedMeshTarget>;

  return (
    typeof candidate.setMatrixAt === "function" &&
    typeof candidate.setColorAt === "function" &&
    Boolean(candidate.instanceMatrix)
  );
}

function getBaseColor(index: number, total: number): THREE.Color {
  const hue = total <= 1 ? 0.56 : 0.56 + (index / (total - 1)) * 0.18;

  return new THREE.Color().setHSL(hue, 0.82, 0.58);
}

function getNodePosition(index: number, total: number): THREE.Vector3 {
  const radius = 1.6 + (index % 37) * 0.035;
  const angle = index * 2.399963229728653;
  const verticalProgress = total <= 1 ? 0.5 : index / (total - 1);
  const y = (verticalProgress - 0.5) * 2.6;

  return new THREE.Vector3(
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius
  );
}

export function updateGalaxyNodeColors(
  mesh: InstancedColorTarget,
  nodesData: Pick<NodeData, "id">[],
  highlightedNodeId: string | null
) {
  nodesData.forEach((node, index) => {
    const color = node.id === highlightedNodeId
      ? HIGHLIGHT_COLOR
      : getBaseColor(index, nodesData.length);

    mesh.setColorAt(index, color);
  });

  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}

export function GalaxyNodes({ nodesData, highlightedNodeId }: GalaxyNodesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const sphereGeometry = useMemo(
    () => new THREE.SphereGeometry(NODE_RADIUS, 8, 8),
    []
  );
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ toneMapped: false }),
    []
  );

  useEffect(() => {
    const mesh = meshRef.current;

    if (!isInstancedMeshTarget(mesh)) {
      return;
    }

    const matrix = new THREE.Matrix4();

    nodesData.forEach((_, index) => {
      matrix.setPosition(getNodePosition(index, nodesData.length));
      mesh.setMatrixAt(index, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, [nodesData]);

  useEffect(() => {
    const mesh = meshRef.current;

    if (!isInstancedMeshTarget(mesh)) {
      return;
    }

    updateGalaxyNodeColors(mesh, nodesData, highlightedNodeId);
  }, [highlightedNodeId, nodesData]);

  useEffect(() => {
    return () => {
      sphereGeometry.dispose();
      material.dispose();
    };
  }, [material, sphereGeometry]);

  return (
    <instancedMesh
      args={[sphereGeometry, material, nodesData.length]}
      data-node-count={nodesData.length}
      ref={meshRef}
    />
  );
}
