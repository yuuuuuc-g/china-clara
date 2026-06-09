"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";

interface CoreStarProps {
  onSunClick?: () => void;
}

const SOLAR_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SOLAR_FRAGMENT_SHADER = `
  uniform sampler2D surfaceMap;
  uniform float time;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 point) {
    vec2 base = floor(point);
    vec2 fraction = fract(point);
    vec2 smoothFraction = fraction * fraction * (3.0 - 2.0 * fraction);

    float bottomLeft = hash(base);
    float bottomRight = hash(base + vec2(1.0, 0.0));
    float topLeft = hash(base + vec2(0.0, 1.0));
    float topRight = hash(base + vec2(1.0, 1.0));

    float bottom = mix(bottomLeft, bottomRight, smoothFraction.x);
    float top = mix(topLeft, topRight, smoothFraction.x);

    return mix(bottom, top, smoothFraction.y);
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int octave = 0; octave < 5; octave++) {
      value += amplitude * noise(point);
      point *= 2.12;
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = max(dot(normalize(vNormal), viewDirection), 0.0);

    vec2 slowFlow = vUv * 3.2 + vec2(time * 0.035, time * 0.018);
    vec2 fastFlow = vUv * 10.0 - vec2(time * 0.055, time * 0.032);
    float broadTurbulence = fbm(slowFlow);
    float filamentTurbulence = fbm(fastFlow);

    vec3 textureColor = texture2D(surfaceMap, vUv).rgb;
    float textureHeat = max(textureColor.r, textureColor.g * 0.9);
    float plasma = smoothstep(
      0.24,
      1.0,
      textureHeat * 0.72 + broadTurbulence * 0.42 + filamentTurbulence * 0.22
    );
    float hotCore = pow(facing, 6.2) * smoothstep(0.56, 1.0, plasma + broadTurbulence * 0.24);
    float moltenRim = pow(1.0 - facing, 1.35) * (0.28 + plasma * 0.24);
    float filament = smoothstep(0.42, 0.96, filamentTurbulence + plasma * 0.28);

    vec3 ember = vec3(0.95, 0.06, 0.0);
    vec3 moltenOrange = vec3(1.0, 0.20, 0.0);
    vec3 gold = vec3(1.0, 0.42, 0.0);
    vec3 hotGold = vec3(1.0, 0.58, 0.035);

    vec3 color = mix(ember, moltenOrange, plasma);
    color = mix(color, gold, clamp(filament * 0.72, 0.0, 1.0));
    color = mix(color, hotGold, clamp(hotCore * 0.34, 0.0, 1.0));

    float emissiveIntensity =
      1.05 +
      plasma * 0.74 +
      filament * 0.36 +
      hotCore * 0.82 +
      moltenRim * 0.38;

    gl_FragColor = vec4(color * emissiveIntensity, 1.0);
  }
`;

export function CoreStar({ onSunClick }: CoreStarProps) {
  const starRef = useRef<THREE.Mesh>(null!);
  const surfaceMaterialRef = useRef<THREE.ShaderMaterial>(null!);

  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load("/textures/sun.jpg");
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, []);

  const surfaceUniforms = useMemo(
    () => ({
      surfaceMap: { value: texture },
      time: { value: 0 },
    }),
    [texture]
  );

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame(({ clock }, delta) => {
    starRef.current.rotation.y += delta * 0.22;
    surfaceMaterialRef.current.uniforms.time.value = clock.elapsedTime;
  });

  return (
    <group>
      <Sphere ref={starRef} args={[2, 128, 128]}>
        <shaderMaterial
          ref={surfaceMaterialRef}
          uniforms={surfaceUniforms}
          vertexShader={SOLAR_VERTEX_SHADER}
          fragmentShader={SOLAR_FRAGMENT_SHADER}
          toneMapped={false}
        />
      </Sphere>

      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSunClick?.();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[2.12, 32, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* 核心光源：照亮周围带有 MeshStandardMaterial 的行星 */}
      <pointLight
        color="#ff8c00"
        intensity={5.4}
        distance={82}
        decay={1.65}
      />
      <pointLight
        color="#ffb000"
        intensity={1.35}
        distance={22}
        decay={2}
      />
    </group>
  );
}
