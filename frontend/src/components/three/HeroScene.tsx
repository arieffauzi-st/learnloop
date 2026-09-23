import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group, Material, Mesh, Sprite } from 'three'
import { CanvasTexture } from 'three'
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

/* ------------------------------------------------------------------ */
/* Interaction plumbing                                                */
/* ------------------------------------------------------------------ */

/** Click reactions, cycled randomly (never the same twice in a row). */
type Reaction = 'hop' | 'spin' | 'flap' | 'burst'
const REACTIONS: Reaction[] = ['hop', 'spin', 'flap', 'burst']
const pickReaction = (last: Reaction | null): Reaction => {
  const options = REACTIONS.filter((r) => r !== last)
  return options[Math.floor(Math.random() * options.length)]
}

/** Mutable interaction state kept in a ref (no React re-renders per frame). */
type Interaction = {
  last: Reaction | null
  /** Active click reaction + its local clock (seconds since trigger). */
  reaction: Reaction | null
  reactionT: number
  /** Pointer tracking for click vs drag (click: < 6px move, < 300ms). */
  down: boolean
  downX: number
  downY: number
  downTime: number
  moved: number
  /** Drag-rotate state: user yaw/pitch offsets + inertial velocity. */
  dragging: boolean
  yaw: number
  pitch: number
  yawVel: number
  /** Hover (desktop) + press feedback. */
  hover: boolean
  hoverLerp: number
  pressedT: number
}

const freshInteraction = (): Interaction => ({
  last: null,
  reaction: null,
  reactionT: 0,
  down: false,
  downX: 0,
  downY: 0,
  downTime: 0,
  moved: 0,
  dragging: false,
  yaw: 0,
  pitch: 0,
  yawVel: 0,
  hover: false,
  hoverLerp: 0,
  pressedT: 0,
})

/** Pre-rendered "+10 XP ⭐" sprite texture — built once, reused forever. */
function useXpTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.font = 'bold 44px "Trebuchet MS", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 8
      ctx.strokeStyle = COLORS.ink
      ctx.strokeText('+10 XP ⭐', 128, 64)
      ctx.fillStyle = COLORS.cream
      ctx.fillText('+10 XP ⭐', 128, 64)
    }
    return new CanvasTexture(canvas)
  }, [])
}

/** Fixed particle pool: small colored boxes that pop outward and fade.
 *  Meshes are allocated once — bursts just reset positions/velocities. */
const POOL_SIZE = 16
function ParticleBurst({ burstRef }: { burstRef: React.RefObject<{ fire: () => void } | null> }) {
  const group = useRef<Group>(null)

  // Per-particle state (kept outside React)
  const state = useRef(
    Array.from({ length: POOL_SIZE }, () => ({ vel: [0, 0, 0], t: -1 })),
  ).current

  burstRef.current = {
    fire: () => {
      state.forEach((p, i) => {
        p.t = 0
        const a = (i / POOL_SIZE) * Math.PI * 2 + Math.random() * 0.6
        const speed = 1.6 + Math.random() * 1.4
        p.vel = [
          Math.cos(a) * speed,
          1.4 + Math.random() * 1.6,
          Math.sin(a) * speed * 0.6,
        ]
      })
    },
  }

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const dt = Math.min(delta, 0.1)
    g.children.forEach((child, i) => {
      const p = state[i]
      const mesh = child as Mesh
      if (p.t < 0) {
        mesh.visible = false
        return
      }
      p.t += dt
      if (p.t >= 1) {
        p.t = -1
        mesh.visible = false
        return
      }
      // Simple ballistic pop + gravity, scale/opacity fade over 1s
      p.vel[1] -= 5.5 * dt
      mesh.position.x += p.vel[0] * dt
      mesh.position.y += p.vel[1] * dt
      mesh.position.z += p.vel[2] * dt
      mesh.rotation.x += dt * 6
      mesh.rotation.z += dt * 5
      const s = 0.16 * (1 - p.t * 0.7)
      mesh.scale.setScalar(s)
      const mat = mesh.material as Material
      mat.opacity = 1 - p.t
      mesh.visible = true
    })
  })

  const burstColors = useMemo(
    () =>
      Array.from({ length: POOL_SIZE }, (_, i) =>
        [COLORS.coral, COLORS.teal, COLORS.sunny, COLORS.cream][i % 4],
      ),
    [],
  )

  return (
    <group ref={group}>
      {burstColors.map((color, i) => (
        <mesh key={i} visible={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={color} transparent opacity={1} />
        </mesh>
      ))}
    </group>
  )
}

/** Minecraft-style voxel paper-duck buddy, built ONLY from boxes (~17 blocks).
 *  Whole-figure bob, wings flap via group rotation, squash-and-stretch.
 *  Fully interactive: click/tap reactions, inertial drag-rotate (clamped
 *  tilt, eases back to front-facing), hover/press feedback. Delta-time
 *  driven so everything is frame-rate agnostic. */
function VoxelBuddy({ frozen }: { frozen: boolean }) {
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const leftWing = useRef<Group>(null)
  const rightWing = useRef<Group>(null)
  const cap = useRef<Group>(null)
  const leftEye = useRef<Group>(null)
  const rightEye = useRef<Group>(null)
  const xpSprite = useRef<Sprite>(null)
  const burstRef = useRef<{ fire: () => void } | null>(null)
  const it = useRef<Interaction>(freshInteraction())
  const xpT = useRef(-1)
  const xpTexture = useXpTexture()

  // Window-level pointer move/up so drags keep working outside the canvas
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const s = it.current
      if (!s.down) return
      const dx = e.clientX - s.downX
      const dy = e.clientY - s.downY
      s.moved = Math.max(s.moved, Math.hypot(dx, dy))
      if (s.moved >= 6) {
        s.dragging = true
        s.yawVel = dx * 0.004
        s.yaw += dx * 0.012
        s.pitch = Math.max(-0.45, Math.min(0.45, s.pitch + dy * 0.004))
        s.downX = e.clientX
        s.downY = e.clientY
      }
    }
    const onUp = () => {
      const s = it.current
      if (!s.down) return
      s.down = false
      const elapsed = performance.now() - s.downTime
      if (!s.dragging && s.moved < 6 && elapsed < 300) {
        // It's a click/tap → trigger a reaction (never the same twice in a row)
        const next = pickReaction(s.last)
        s.last = next
        s.reaction = next
        s.reactionT = 0
        if (next === 'burst') burstRef.current?.fire()
        if (Math.random() < 0.4) xpT.current = 0
      }
      s.dragging = false
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  const onPointerDown = (e: { stopPropagation: () => void; clientX: number; clientY: number }) => {
    const s = it.current
    s.down = true
    s.downX = e.clientX
    s.downY = e.clientY
    s.downTime = performance.now()
    s.moved = 0
    if (!frozen) s.pressedT = 0.001 // press squash
    e.stopPropagation()
  }
  const onPointerOver = () => {
    it.current.hover = true
    if (!frozen) document.body.style.cursor = 'pointer'
  }
  const onPointerOut = () => {
    it.current.hover = false
    document.body.style.cursor = ''
  }

  // Reduced-motion click path: swap a blink + XP text, zero animation.
  const [frozenBlink, setFrozenBlink] = useState(false)
  const [frozenXp, setFrozenXp] = useState(false)
  const onClickFrozen = () => {
    setFrozenBlink(true)
    setFrozenXp(true)
    window.setTimeout(() => setFrozenBlink(false), 350)
    window.setTimeout(() => setFrozenXp(false), 900)
  }

  useFrame((_, delta) => {
    const r = root.current
    if (!r) return
    if (frozen) return // static pose; blink/XP handled by React state above
    const s = it.current
    const dt = Math.min(delta, 0.1)
    const t = ((r.userData.t as number) ?? 0) + dt
    r.userData.t = t

    /* --- base idle pose --- */
    let bob = Math.sin(t * 1.5) * 0.16
    let squash = 1 + Math.sin(t * 3) * 0.03
    let flap = Math.sin(t * 2.2) * 0.5 + 0.25
    const sway = Math.sin(t * 0.6) * 0.12

    /* --- click reaction timeline --- */
    if (s.reaction) {
      s.reactionT += dt
      const rt = s.reactionT
      if (s.reaction === 'hop') {
        // Anticipation squash → jump → landing bounce
        if (rt < 0.14) {
          squash = 1 - 0.35 * (rt / 0.14)
        } else if (rt < 0.62) {
          const j = (rt - 0.14) / 0.48
          bob += Math.sin(j * Math.PI) * 1.1
          squash = 1 + Math.sin(j * Math.PI) * 0.18
        } else if (rt < 0.8) {
          const k = (rt - 0.62) / 0.18
          squash = 1 - Math.sin(k * Math.PI) * 0.22
        } else {
          s.reaction = null
        }
      } else if (s.reaction === 'spin') {
        if (rt < 0.14) {
          squash = 1 - 0.3 * (rt / 0.14)
        } else if (rt < 0.7) {
          const j = (rt - 0.14) / 0.56
          bob += Math.sin(j * Math.PI) * 0.9
          squash = 1 + Math.sin(j * Math.PI) * 0.15
          r.userData.spin = j * Math.PI * 2
        } else if (rt < 0.88) {
          squash = 1 - Math.sin(((rt - 0.7) / 0.18) * Math.PI) * 0.2
        } else {
          r.userData.spin = 0
          s.reaction = null
        }
      } else if (s.reaction === 'flap') {
        // Wing-flap frenzy + blink
        if (rt < 0.9) {
          flap = Math.sin(rt * 30) * 0.9
          const blink = Math.sin(Math.min(rt * 4, Math.PI) * 2) > 0.6 ? 0.12 : 1
          if (leftEye.current) leftEye.current.scale.y = blink
          if (rightEye.current) rightEye.current.scale.y = blink
        } else {
          if (leftEye.current) leftEye.current.scale.y = 1
          if (rightEye.current) rightEye.current.scale.y = 1
          s.reaction = null
        }
      } else if (s.reaction === 'burst') {
        // Star burst: quick happy hop + confetti (particles self-animate)
        if (rt < 0.45) {
          bob += Math.sin((rt / 0.45) * Math.PI) * 0.5
        } else {
          s.reaction = null
        }
      }
    }

    /* --- drag-rotate with inertia, easing back to front-facing --- */
    if (!s.dragging) {
      s.yaw += s.yawVel
      s.yawVel *= 0.92
      s.yaw *= 0.97
      s.pitch *= 0.97
    }

    /* --- press squash + hover scale --- */
    let extraScale = 1
    if (s.pressedT > 0) {
      s.pressedT += dt
      if (s.pressedT < 0.18) squash *= 1 - 0.12 * Math.sin((s.pressedT / 0.18) * Math.PI)
      else s.pressedT = 0
    }
    s.hoverLerp += ((s.hover ? 1 : 0) - s.hoverLerp) * 0.15

    /* --- apply pose --- */
    const spin = (r.userData.spin as number) ?? 0
    r.position.y = bob
    r.rotation.y = sway + s.yaw + spin
    r.rotation.x = s.pitch
    if (body.current) {
      body.current.scale.set(
        (2 - squash) * extraScale,
        squash * extraScale,
        (2 - squash) * extraScale,
      )
    }
    if (leftWing.current) leftWing.current.rotation.z = flap * 0.6
    if (rightWing.current) rightWing.current.rotation.z = -flap * 0.6
    if (cap.current) cap.current.rotation.z = Math.sin(t * 2.2) * 0.08

    /* --- floating +10 XP sprite --- */
    if (xpSprite.current) {
      if (xpT.current >= 0) {
        xpT.current += dt
        if (xpT.current > 1.1) {
          xpT.current = -1
          xpSprite.current.visible = false
        } else {
          xpSprite.current.visible = true
          xpSprite.current.position.y = 1.9 + xpT.current * 0.7
          ;(xpSprite.current.material as Material).opacity = 1 - xpT.current / 1.1
        }
      } else {
        xpSprite.current.visible = false
      }
    }
  })

  const eyes = (
    <>
      <group ref={leftEye} position={[-0.24, 0.72, 0.53]} scale={[1, frozenBlink ? 0.12 : 1, 1]}>
        <Block position={[0, 0, 0]} size={[0.2, 0.3, 0.05]} color={COLORS.ink} />
        <Block position={[0.05, 0.06, 0.04]} size={[0.07, 0.07, 0.03]} color={COLORS.cream} />
      </group>
      <group ref={rightEye} position={[0.24, 0.72, 0.53]} scale={[1, frozenBlink ? 0.12 : 1, 1]}>
        <Block position={[0, 0, 0]} size={[0.2, 0.3, 0.05]} color={COLORS.ink} />
        <Block position={[0.05, 0.06, 0.04]} size={[0.07, 0.07, 0.03]} color={COLORS.cream} />
      </group>
    </>
  )

  return (
    <group
      ref={root}
      userData={{ t: 0, spin: 0 }}
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={frozen ? onClickFrozen : undefined}
    >
      {/* Soft shadow blob — plain dark circle mesh, no shadow maps */}
      <mesh position={[0, -1.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.95, 24]} />
        <meshBasicMaterial color={COLORS.ink} transparent opacity={0.12} />
      </mesh>

      <group ref={body}>
        {/* Cube head (coral) with big ink eyes */}
        <Block position={[0, 0.55, 0]} size={[1.05, 1.05, 1.05]} color={COLORS.coral} />
        {eyes}
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

      {/* Floating "+10 XP ⭐" sprite (shared texture, no per-click allocation) */}
      <sprite ref={xpSprite} position={[0, 1.9, 0.5]} visible={frozen ? frozenXp : false} scale={[1.4, 0.7, 1]}>
        <spriteMaterial map={xpTexture} transparent depthWrite={false} />
      </sprite>

      <ParticleBurst burstRef={burstRef} />
    </group>
  )
}

/** Playful interactive 3D hero scene: Minecraft-style voxel paper duck on a
 *  floating grass block. Tap/click reactions (hop / spin-jump / flap frenzy /
 *  star burst + XP sprite), inertial drag-rotate with clamped tilt, hover and
 *  press feedback. Built entirely from boxes, flat shading, dpr capped 1.5,
 *  no physics engine. prefers-reduced-motion keeps a static pose while still
 *  allowing a click to swap a blink + XP text. Transparent background blends
 *  with the cream page; fiber pauses rendering when the tab is hidden. */
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
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      aria-hidden
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <VoxelBuddy frozen={frozen} />
      <GrassPedestal />
    </Canvas>
  )
}
