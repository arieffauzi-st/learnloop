import { useRef } from 'react'
import type { Group, Mesh } from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'

/** LearnLoop palette (mirrors src/index.css tokens). */
const COLORS = {
  cream: '#fff9f0',
  coral: '#ff6b6b',
  teal: '#4ecdc4',
  sunny: '#ffd93d',
  ink: '#3a2e39',
}

/** Low-poly folded-paper blob buddy: faceted body + paper eyes, built from
 *  simple geometry only (no assets, tiny polycount). Bobbing + pointer tilt. */
function PaperBuddy() {
  const group = useRef<Group>(null)

  useFrame(({ clock, pointer }) => {
    const g = group.current
    if (!g) return
    const t = clock.getElapsedTime()
    // Gentle bob + slow idle wobble
    g.position.y = Math.sin(t * 1.4) * 0.18
    g.rotation.z = Math.sin(t * 0.9) * 0.06
    // Pointer-follow tilt so the character feels alive (orbit-free)
    g.rotation.y += (pointer.x * 0.5 - g.rotation.y) * 0.06
    g.rotation.x += (-pointer.y * 0.3 - g.rotation.x) * 0.06
  })

  return (
    <group ref={group}>
      {/* Faceted folded-paper body */}
      <mesh castShadow={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={COLORS.sunny} flatShading roughness={0.6} metalness={0} />
      </mesh>
      {/* Folded "nose" ridge to suggest paper */}
      <mesh position={[0, -0.15, 0.85]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[0.35, 0.6, 4]} />
        <meshStandardMaterial color={COLORS.coral} flatShading roughness={0.6} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.32, 0.25, 0.85]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={COLORS.ink} />
      </mesh>
      <mesh position={[0.32, 0.25, 0.85]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={COLORS.ink} />
      </mesh>
      {/* Cheeks */}
      <mesh position={[-0.55, -0.05, 0.75]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color={COLORS.coral} />
      </mesh>
      <mesh position={[0.55, -0.05, 0.75]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color={COLORS.coral} />
      </mesh>
    </group>
  )
}

/** Tiny low-poly star (octahedron) — a handful around the buddy. */
function MiniStar({ position, color, scale }: { position: [number, number, number]; color: string; scale: number }) {
  return (
    <Float speed={2} rotationIntensity={1.4} floatIntensity={1.6}>
      <mesh position={position} scale={scale}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} flatShading roughness={0.5} />
      </mesh>
    </Float>
  )
}

/** Thin ring orbiting behind the character. */
function OrbitRing({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.getElapsedTime() * 0.3
  })
  return (
    <mesh ref={ref} position={position} rotation={[1.1, 0.4, 0]}>
      <torusGeometry args={[1.7, 0.045, 8, 48]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  )
}

/** Playful 3D hero scene: folded-paper buddy + floating star/ring particles.
 *  Lightweight on purpose — low polycount, dpr capped, transparent background
 *  so it blends with the cream page. drei/fiber pause rendering when the tab
 *  is hidden (rAF stops automatically). */
export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop="always"
      camera={{ position: [0, 0, 5.2], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ width: '100%', height: '100%' }}
      aria-hidden
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <PaperBuddy />
      <OrbitRing position={[0, 0, -0.6]} color={COLORS.teal} />
      <MiniStar position={[-2.1, 1.1, -0.5]} color={COLORS.coral} scale={0.22} />
      <MiniStar position={[2.2, 0.9, -0.8]} color={COLORS.coral} scale={0.18} />
      <MiniStar position={[1.6, -1.3, -0.4]} color={COLORS.teal} scale={0.2} />
      <MiniStar position={[-1.7, -1.2, -0.7]} color={COLORS.ink} scale={0.14} />
      <MiniStar position={[0.4, 1.7, -1]} color={COLORS.sunny} scale={0.16} />
    </Canvas>
  )
}
