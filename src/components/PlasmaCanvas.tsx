import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, memo, useEffect } from "react";
import * as THREE from "three";

// ─── Plasma Particles ────────────────────────────────────────
const PARTICLE_COUNT = 600;

const particleVertexShader = `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  uniform float uTime;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec3 pos = position;
    float t = uTime * 0.3;
    
    // Organic floating motion
    pos.x += sin(t + aPhase * 6.28) * 0.5;
    pos.y += cos(t * 0.7 + aPhase * 4.0) * 0.4;
    pos.z += sin(t * 0.5 + aPhase * 3.0) * 0.3;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    
    // Pulse alpha
    vAlpha = 0.3 + 0.5 * sin(t * 2.0 + aPhase * 6.28);
    vColor = aColor;
  }
`;

const particleFragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float glow = 1.0 - dist * 2.0;
    glow = pow(glow, 2.0);
    gl_FragColor = vec4(vColor, glow * vAlpha * 0.6);
  }
`;

function PlasmaParticles() {
  const meshRef = useRef<THREE.Points>(null);
  const uniformsRef = useRef({ uTime: { value: 0 } });

  const { positions, sizes, phases, colors } = useMemo(() => {
    const p = new Float32Array(PARTICLE_COUNT * 3);
    const s = new Float32Array(PARTICLE_COUNT);
    const ph = new Float32Array(PARTICLE_COUNT);
    const c = new Float32Array(PARTICLE_COUNT * 3);

    // Crunchyroll orange: hsl(25, 93%, 54%) → rgb(244, 117, 33)
    // Cursed purple: hsl(270, 60%, 55%) → rgb(123, 47, 190)
    const orange = new THREE.Color(0xf47521);
    const purple = new THREE.Color(0x7b2fbe);
    const gold = new THREE.Color(0xd4a843);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // Spread in a wide field
      p[i3] = (Math.random() - 0.5) * 12;
      p[i3 + 1] = (Math.random() - 0.5) * 8;
      p[i3 + 2] = (Math.random() - 0.5) * 6;
      s[i] = Math.random() * 3 + 0.5;
      ph[i] = Math.random();

      // Color distribution
      const r = Math.random();
      const col = r < 0.45 ? orange : r < 0.8 ? purple : gold;
      c[i3] = col.r;
      c[i3 + 1] = col.g;
      c[i3 + 2] = col.b;
    }
    return { positions: p, sizes: s, phases: ph, colors: c };
  }, []);

  useFrame((_, delta) => {
    uniformsRef.current.uTime.value += delta;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniformsRef.current}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Energy Orbs (large glowing spheres) ─────────────────────
function EnergyOrb({ position, color, speed = 1 }: { position: [number, number, number]; color: string; speed?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const col = useMemo(() => new THREE.Color(color), [color]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * speed;
    ref.current.position.x = position[0] + Math.sin(t * 0.5) * 1.2;
    ref.current.position.y = position[1] + Math.cos(t * 0.4) * 0.8;
    ref.current.scale.setScalar(1 + Math.sin(t) * 0.15);
  });

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.4, 16, 16]} />
      <meshBasicMaterial color={col} transparent opacity={0.08} />
    </mesh>
  );
}

// ─── Warp Grid ───────────────────────────────────────────────
const gridVertexShader = `
  uniform float uTime;
  varying float vAlpha;
  
  void main() {
    vec3 pos = position;
    pos.z += sin(pos.x * 0.5 + uTime * 0.3) * 0.3;
    pos.z += cos(pos.y * 0.4 + uTime * 0.2) * 0.2;
    
    vec4 mvp = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_Position = mvp;
    
    float dist = length(pos.xy) / 8.0;
    vAlpha = max(0.0, 1.0 - dist) * 0.12;
  }
`;

const gridFragmentShader = `
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(0.96, 0.46, 0.13, vAlpha);
  }
`;

function WarpGrid() {
  const uniformsRef = useRef({ uTime: { value: 0 } });

  useFrame((_, delta) => {
    uniformsRef.current.uTime.value += delta;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const verts: number[] = [];
    const size = 14;
    const divisions = 30;
    const step = size / divisions;

    // Horizontal lines
    for (let i = 0; i <= divisions; i++) {
      const y = -size / 2 + i * step;
      for (let j = 0; j < divisions; j++) {
        const x1 = -size / 2 + j * step;
        const x2 = x1 + step;
        verts.push(x1, y, 0, x2, y, 0);
      }
    }
    // Vertical lines
    for (let i = 0; i <= divisions; i++) {
      const x = -size / 2 + i * step;
      for (let j = 0; j < divisions; j++) {
        const y1 = -size / 2 + j * step;
        const y2 = y1 + step;
        verts.push(x, y1, 0, x, y2, 0);
      }
    }

    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    return geo;
  }, []);

  return (
    <lineSegments geometry={geometry} position={[0, 0, -3]}>
      <shaderMaterial
        vertexShader={gridVertexShader}
        fragmentShader={gridFragmentShader}
        uniforms={uniformsRef.current}
        transparent
        depthWrite={false}
      />
    </lineSegments>
  );
}

// ─── Connection Lines ────────────────────────────────────────
function ConnectionLines() {
  const ref = useRef<THREE.LineSegments>(null);
  const posRef = useRef<Float32Array>();

  const nodes = useMemo(() => {
    const n: THREE.Vector3[] = [];
    for (let i = 0; i < 20; i++) {
      n.push(new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4,
      ));
    }
    return n;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * 0.3;
    const verts: number[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const ni = nodes[i];
      const px = ni.x + Math.sin(t + i) * 0.5;
      const py = ni.y + Math.cos(t * 0.7 + i) * 0.3;
      const pz = ni.z;

      for (let j = i + 1; j < nodes.length; j++) {
        const nj = nodes[j];
        const qx = nj.x + Math.sin(t + j) * 0.5;
        const qy = nj.y + Math.cos(t * 0.7 + j) * 0.3;
        const dist = Math.sqrt((px - qx) ** 2 + (py - qy) ** 2 + (pz - nj.z) ** 2);
        if (dist < 3.5) {
          verts.push(px, py, pz, qx, qy, nj.z);
        }
      }
    }

    const arr = new Float32Array(verts);
    posRef.current = arr;
    const geo = ref.current.geometry as THREE.BufferGeometry;
    geo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    geo.computeBoundingSphere();
  });

  return (
    <lineSegments ref={ref}>
      <bufferGeometry />
      <lineBasicMaterial color="#7b2fbe" transparent opacity={0.06} />
    </lineSegments>
  );
}

// ─── Camera Rig (gentle sway) ────────────────────────────────
function CameraRig() {
  const { camera } = useThree();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.15;
    camera.position.x = Math.sin(t) * 0.5;
    camera.position.y = Math.cos(t * 0.7) * 0.3;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ─── Scene ───────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <CameraRig />
      <PlasmaParticles />
      <WarpGrid />
      <ConnectionLines />

      {/* Energy orbs */}
      <EnergyOrb position={[-3, 1, -1]} color="#f47521" speed={0.8} />
      <EnergyOrb position={[3, -1, -2]} color="#7b2fbe" speed={0.6} />
      <EnergyOrb position={[0, 2, -1.5]} color="#f47521" speed={1} />
      <EnergyOrb position={[-2, -2, -1]} color="#7b2fbe" speed={0.9} />

      {/* Ambient light for depth */}
      <ambientLight intensity={0.1} />
    </>
  );
}

// ─── Canvas Wrapper ──────────────────────────────────────────
export const PlasmaCanvas = memo(({ className = "" }: { className?: string }) => {
  return (
    <div className={`fixed inset-0 pointer-events-none ${className}`} style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
});
PlasmaCanvas.displayName = "PlasmaCanvas";
