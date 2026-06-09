"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

interface SolarBloomProps {
  strength?: number;
  radius?: number;
  threshold?: number;
}

export function SolarBloom({
  strength = 0.16,
  radius = 0.22,
  threshold = 0.72,
}: SolarBloomProps) {
  const { gl, scene, camera, size } = useThree();

  const composer = useMemo(() => {
    const nextComposer = new EffectComposer(gl);
    const nextBloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      strength,
      radius,
      threshold
    );

    nextComposer.addPass(new RenderPass(scene, camera));
    nextComposer.addPass(nextBloomPass);
    nextComposer.addPass(new OutputPass());

    return nextComposer;
  }, [camera, gl, radius, scene, size.height, size.width, strength, threshold]);

  useEffect(() => {
    composer.setPixelRatio(Math.min(gl.getPixelRatio(), 1.5));
    composer.setSize(size.width, size.height);
  }, [composer, gl, size.height, size.width]);

  useEffect(() => {
    return () => {
      composer.dispose();
    };
  }, [composer]);

  useFrame(() => {
    composer.render();
  }, 1);

  return null;
}
