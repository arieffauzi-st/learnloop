import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import { Canvas, useFrame } from '@react-three/fiber'

/** LearnLoop palette (mirrors src/index.css tokens). */
const COLORS = {
  cream: '#fff9f0',
  coral: '#ff6b6b',
  teal: '#4ecdc4',
  sunny: '#ffd93d',
  ink: '#3a2e39',
}

/** Flat-shaded voxel material — one shared look for every block. */
function VoxelMaterial({ color }: { color: string }) {
  return <meshLambertMaterial color={color} flatShading={true} key={color} />
}

/** Single axis-aligned box block (the only geometry primitive used). */
function Block({
  position,
  size,
  color,
}: {
  position: [number, number, number]
  size: [number, number, number]
  color: string
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <VoxelMaterial color={color} />
    </mesh>
  )
}

/** Floating grass-block pedestal: cream "grass" cap + teal dirt sides,
 *  stacked boxes only. */
function GrassPedestal() {
  return (
    <group position={[0, -1.55, 0]}>
      <Block position={[0, 0.3, 0]} size={[2.3, 0.6, 2.3]} color={COLORS.cream} />
      <Block position={[0, -0.35, 0]} size={[2.1, 0.7, 2.1]} color={COLORS.teal} />
      <Block position={[0, -0.95, 0]} size={[1.85, 0.5, 1.85]} color={COLORS.teal} />
    </group>
  )
}

const FROZEN = { squash: 1, flap: 0.25, bob: 0, yaw: 0.5 }

/** Minecraft-style voxel paper-duck buddy, built ONLY from boxes (~17 blocks).
 *  Whole-figure bob + slow yaw, wings flap via group rotation, body does a
 *  tiny squash-and-stretch. Delta-time driven so speed is frame-rate agnostic. */
function VoxelBuddy({ frozen }: { frozen: boolean }) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const leftWing = useRef<Group>(null)
  const rightWing = useRef<Group>(null)
  const cap = useRef<Group>(null)

  useFrame((_, delta) => {
    const r = root.current
    if (!r) return
    const t = ((r.userData.t as number) ?? 0) + Math.min(delta, 0.1)
    r.userData.t = t

    const bob = frozen ? FROZEN.bob : Math.sin(t * 1.5) * 0.16
    const squash = frozen ? FROZEN.squash : 1 + Math.sin(t * 3) * 0.03
    const flap = frozen ? FROZEN.flap : Math.sin(t * 2.2) * 0.5 + 0.25
    const yaw = frozen ? FROZEN.yaw : t * 0.25

    r.position.y = bob
    r.rotation.y = yaw
    // Squash-and-stretch on the body group (stretch Y, squish XZ)
    if (body.current) body.current.scale.set(2 - squash, squash, 2 - squash)
    // Wing flap: small periodic rotation around the shoulder pivot
    if (leftWing.current) leftWing.current.rotation.z = flap * 0.6
    if (rightWing.current) rightWing.current.rotation.z = -flap * 0.6
    if (cap.current) cap.current.rotation.z = Math.sin(t * 2.2) * 0.08
  })

  return (
    <group ref={root} userData={{ t: 0 }}>
      {/* Soft shadow blob — plain dark circle mesh, no shadow maps */}
      <mesh position={[0, -1.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 24]} />
        <meshBasicMaterial color={COLORS.ink} transparent opacity={0.12} />
      </mesh>

      <group ref={body}>
        {/* Cube head (coral) with big ink eyes */}
        <Block position={[0, 0.55, 0]} size={[1.05, 1.05, 1.05]} color={COLORS.coral} />
        {/* Eyes: ink blocks with tiny cream glints */}
        <Block position={[-0.24, 0.72, 0.53]} size={[0.2, 0.3, 0.05]} color={COLORS.ink} />
        <Block position={[0.24, 0.72, 0.53]} size={[0.2, 0.3, 0.05]} color={COLORS.ink} />
        <Block position={[-0.19, 0.78, 0.57]} size={[0.07, 0.07, 0.03]} color={COLORS.cream} />
        <Block position={[0.29, 0.78, 0.57]} size={[0.07, 0.07, 0.03]} color={COLORS.cream} />
        {/* Sunny beak */}
        <Block position={[0, 0.42, 0.56]} size={[0.42, 0.18, 0.14]} color={COLORS.sunny} />

        {/* Cube body (cream) under the head */}
        <Block position={[0, -0.28, 0]} size={[0.9, 0.85, 0.8]} color={COLORS.cream} />

        {/* Wings: teal blocks in shoulder-pivot groups so they can flap */}
        <group ref={leftWing} position={[-0.52, -0.15, 0]}>
          <Block position={[-0.16, -0.28, 0]} size={[0.18, 0.6, 0.55]} color={COLORS.teal} />
        </group>
        <group ref={rightWing} position={[0.52, -0.15, 0]}>
          <Block position={[0.16, -0.28, 0]} size={[0.18, 0.6, 0.55]} color={COLORS.teal} />
        </group>

        {/* Sunny feet peeking under the body */}
        <Block position={[-0.2, -0.78, 0.1]} size={[0.28, 0.12, 0.36]} color={COLORS.sunny} />
        <Block position={[0.2, -0.78, 0.1]} size={[0.28, 0.12, 0.36]} color={COLORS.sunny} />

        {/* Teal cap: brim + top block, gently wiggles */}
        <group ref={cap} position={[0, 1.08, 0]}>
          <Block position={[0, -0.02, 0.12]} size={[1.05, 0.1, 0.9]} color={COLORS.teal} />
          <Block position={[0, 0.1, -0.05]} size={[0.9, 0.2, 0.7]} color={COLORS.teal} />
        </group>
      </group>
    </group>
  )
}

/** Playful 3D hero scene: Minecraft-style voxel paper buddy on a floating
 *  grass block. Built entirely from boxes, flat shading, dpr capped 1.5,
 *  cheap frameloop. Transparent background blends with the cream page.
 *  drei/fiber pause rendering when the tab is hidden (rAF stops automatically). */
export default function HeroScene() {
  const [frozen, setFrozen] = useState(false)
  const dpr = useMemo<[number, number]>(() => [1, 1.5], [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setFrozen(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  return (
    <Canvas
      dpr={dpr}
      frameloop={frozen ? 'demand' : 'always'}
      camera={{ position: [0, 0.3, 5.2], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ width: '100%', height: '100%' }}
      aria-hidden
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <VoxelBuddy frozen={frozen} />
      <GrassPedestal />
    </Canvas>
  )
}
