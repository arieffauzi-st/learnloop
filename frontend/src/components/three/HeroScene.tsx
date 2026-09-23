import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group, Mesh } from 'three'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'

/** LearnLoop palette (mirrors src/index.css tokens) + meadow greens. */
const COLORS = {
  cream: '#fff9f0',
  coral: '#ff6b6b',
  teal: '#4ecdc4',
  sunny: '#ffd93d',
  ink: '#3a2e39',
  grass: '#7ecb6b',
  grassLight: '#9adb7f',
  grassDark: '#5cb354',
  leaf: '#3fa34d',
  leafDark: '#2e7d3b',
  trunk: '#8a5a44',
  rock: '#b9c2c4',
}

const FADE = 0.18
/** Fallback speeds; recomputed from the Walk/Run clip cadence at load. */
const WALK_SPEED = 2.4
const RUN_SPEED = 4.6
/** World units covered per full Walk / Run animation cycle. */
const WALK_STRIDE = 0.95
const RUN_STRIDE = 2.1
/** Smooth turn-rate cap (rad/s) so the character never snaps. */
const TURN_RATE = 8
/** Walkable meadow radius and the world edge the ball bounces off. */
const WORLD_R = 11
const CHAR_CLAMP_R = 9.6
const BALL_R = 0.3
/** Camera orbit clamp (radians). */
const ORBIT_CLAMP = 0.38
/** Double-click window for run. */
const DBL_CLICK_MS = 350
const BURST_COUNT = 10
const BURST_LIFE = 0.7
/** Ball friction per second (velocity multiplier). */
const BALL_FRICTION = Math.exp(-2.0)

export type HeroSceneProps = {
  /** Optional router hook (LandingPage passes react-router navigate). */
  onNavigate?: (to: string) => void
}

/** Canvas-texture sprite with a floating label. */
function makeLabelTexture(text: string) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 96
  const ctx = c.getContext('2d')!
  ctx.font = 'bold 40px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 9
  ctx.strokeStyle = COLORS.ink
  ctx.strokeText(text, 128, 48)
  ctx.fillStyle = COLORS.sunny
  ctx.fillText(text, 128, 48)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Material whose emissive intensity lerps toward the hover glow value. */
function GlowMaterial({ glow, color }: { glow: React.MutableRefObject<number>; color: string }) {
  const mat = useRef<THREE.MeshLambertMaterial>(null)
  useFrame(() => {
    if (mat.current) mat.current.emissiveIntensity = glow.current
  })
  return (
    <meshLambertMaterial
      ref={mat}
      color={color}
      emissive={color}
      emissiveIntensity={0}
      flatShading={true}
    />
  )
}

/** Clickable meadow object: hover glow + floating label sprite. */
function Hotspot({
  label,
  labelY,
  frozen,
  dragging,
  onGo,
  children,
}: {
  label: string
  labelY: number
  frozen: boolean
  dragging: React.MutableRefObject<boolean>
  onGo: () => void
  children: (glow: React.MutableRefObject<number>) => React.ReactNode
}) {
  const glow = useRef(0)
  const hovered = useRef(false)
  const labelTex = useMemo(() => makeLabelTexture(label), [label])

  const setHover = (v: boolean) => {
    hovered.current = v
    document.body.style.cursor = v ? 'pointer' : 'auto'
  }
  useEffect(() => () => setHover(false), [])

  useFrame((_, rawDelta) => {
    const target = hovered.current ? 0.55 : 0
    glow.current += (target - glow.current) * Math.min(1, Math.min(rawDelta, 0.1) * 10)
  })

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation()
        setHover(true)
      }}
      onPointerOut={() => setHover(false)}
      onPointerUp={(e) => {
        e.stopPropagation()
        if (dragging.current) return
        onGo()
      }}
    >
      {children(glow)}
      {!frozen && (
        <sprite position={[0, labelY, 0]} scale={[1.5, 0.56, 1]}>
          <spriteMaterial map={labelTex} transparent depthWrite={false} />
        </sprite>
      )}
    </group>
  )
}

/** Pool of small flat-shaded star blocks popped when the character explores. */
function StarPool({ pool }: { pool: React.MutableRefObject<(Group | null)[]> }) {
  return (
    <group>
      {Array.from({ length: BURST_COUNT }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            pool.current[i] = g
          }}
          visible={false}
        >
          <mesh>
            <boxGeometry args={[0.09, 0.09, 0.09]} />
            <meshLambertMaterial
              color={i % 2 === 0 ? COLORS.sunny : COLORS.coral}
              flatShading={true}
              transparent
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Flat-shaded box helper (positions are in parent-group local space). */
function Box({
  args,
  color,
  position,
  rotation,
}: {
  args: [number, number, number]
  color: string
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={args} />
      <meshLambertMaterial color={color} flatShading={true} />
    </mesh>
  )
}

/** Deterministic pseudo-random so placements stay stable across renders. */
function mulberry(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Obstacle = { x: number; z: number; r: number }

/** Static meadow props: trees, rocks, bushes (also ball-collision obstacles). */
function useScatter() {
  return useMemo(() => {
    const rnd = mulberry(20260923)
    // Keep the middle open and avoid the two hotspot spots.
    const reserved: Obstacle[] = [
      { x: -4.5, z: -4.5, r: 2.4 },
      { x: 4.8, z: -4.8, r: 2.4 },
      { x: 0, z: 0, r: 2.5 },
    ]
    const pick = (n: number, rMin: number, rMax: number) => {
      const out: { x: number; z: number; r: number; s: number }[] = []
      let guard = 0
      while (out.length < n && guard++ < 200) {
        const a = rnd() * Math.PI * 2
        const rad = rMin + rnd() * (rMax - rMin)
        const x = Math.cos(a) * rad
        const z = Math.sin(a) * rad
        const r = 0.9
        if (reserved.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r)) continue
        out.push({ x, z, r, s: 0.75 + rnd() * 0.6 })
      }
      return out
    }
    return {
      trees: pick(14, 5.5, 10.2),
      rocks: pick(4, 4.5, 9.5),
      bushes: pick(4, 4.5, 9.5),
    }
  }, [])
}

/** Low-poly tree: cylinder trunk + two stacked cone canopies. */
function Tree({ x, z, s }: { x: number; z: number; s: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 1.1, 6]} />
        <meshLambertMaterial color={COLORS.trunk} flatShading={true} />
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <coneGeometry args={[0.75, 1.2, 7]} />
        <meshLambertMaterial color={COLORS.leaf} flatShading={true} />
      </mesh>
      <mesh position={[0, 2.15, 0]}>
        <coneGeometry args={[0.52, 0.95, 7]} />
        <meshLambertMaterial color={COLORS.leafDark} flatShading={true} />
      </mesh>
    </group>
  )
}

/** Two-tone coral ball with cream patches; rolls to match its velocity. */
function Ball({
  pos,
  vel,
  onClick,
}: {
  pos: React.MutableRefObject<THREE.Vector3>
  vel: React.MutableRefObject<{ x: number; z: number }>
  onClick: (e: ThreeEvent<PointerEvent>) => void
}) {
  const spin = useRef<Group>(null)
  useFrame((_, rawDelta) => {
    const g = spin.current
    if (!g) return
    g.position.copy(pos.current)
    // Roll: rotation axis = up × velocity, angle = distance / radius.
    const { x: vx, z: vz } = vel.current
    const speed = Math.hypot(vx, vz)
    if (speed > 0.01) {
      const axis = new THREE.Vector3(vz, 0, -vx).normalize()
      g.rotateOnWorldAxis(axis, (speed * Math.min(rawDelta, 0.1)) / BALL_R)
    }
  })
  return (
    <group ref={spin} onPointerUp={onClick}>
      <mesh position={[0, BALL_R, 0]} castShadow={false}>
        <sphereGeometry args={[BALL_R, 16, 12]} />
        <meshLambertMaterial color={COLORS.coral} flatShading={true} />
      </mesh>
      {/* Cream "pentagon-ish" patches (slightly embedded dodeca faces). */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i / 5) * Math.PI * 2) * BALL_R * 0.72,
            BALL_R + Math.sin(i * 2.1) * BALL_R * 0.45,
            Math.sin((i / 5) * Math.PI * 2) * BALL_R * 0.72,
          ]}
          scale={0.13}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color={COLORS.cream} flatShading={true} />
        </mesh>
      ))}
      {/* Soft contact shadow blob. */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color={COLORS.ink} transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Blocky cloud that drifts sideways and wraps around the field. */
function Cloud({ x, y, z, s, speed }: { x: number; y: number; z: number; s: number; speed: number }) {
  const g = useRef<Group>(null)
  useFrame((_, delta) => {
    if (!g.current) return
    g.current.position.x += speed * Math.min(delta, 0.1)
    if (g.current.position.x > 16) g.current.position.x = -16
  })
  return (
    <group ref={g} position={[x, y, z]} scale={s}>
      <Box args={[1.6, 0.5, 0.9]} color={COLORS.cream} position={[0, 0, 0]} />
      <Box args={[0.9, 0.55, 0.8]} color={COLORS.cream} position={[0.7, 0.35, 0]} />
      <Box args={[0.7, 0.45, 0.7]} color={COLORS.cream} position={[-0.6, 0.28, 0.1]} />
    </group>
  )
}

/** The open meadow + character movement controller + kickable ball. */
function Meadow({
  frozen,
  onNavigate,
  keys,
}: {
  frozen: boolean
  onNavigate?: (to: string) => void
  keys: React.MutableRefObject<Set<string>>
}) {
  const { invalidate } = useThree()
  const world = useRef<Group>(null)
  const char = useRef<Group>(null)
  const target = useRef<THREE.Vector3 | null>(null)
  const moving = useRef<'walk' | 'run' | null>(null)
  const lastClick = useRef(0)
  const dragging = useRef(false)
  const lastPop = useRef(new THREE.Vector3(99, 0, 99))
  const burstPool = useRef<(Group | null)[]>([])
  const scatter = useScatter()

  const ballPos = useRef(new THREE.Vector3(1.6, 0, 1.2))
  const ballVel = useRef({ x: 0, z: 0 })

  const gltf = useGLTF('/models/character.glb')
  const { actions, mixer } = useAnimations(gltf.animations, char)
  const currentAnim = useRef('Idle')
  /** Speeds derived from the Walk/Run clip durations (stride-matched). */
  const speeds = useRef({ walk: WALK_SPEED, run: RUN_SPEED })
  const bases = useRef({ walk: 0, run: 0 })

  // Compute movement speeds from the animation's natural cadence so the
  // feet never slide: speed = clip duration × stride length per cycle.
  useEffect(() => {
    const walk = actions['Walk']
    const run = actions['Run']
    if (walk) {
      bases.current.walk = walk.getClip().duration
      speeds.current.walk = THREE.MathUtils.clamp(bases.current.walk * WALK_STRIDE, 1.6, 3.4)
    }
    if (run) {
      bases.current.run = run.getClip().duration
      speeds.current.run = THREE.MathUtils.clamp(bases.current.run * RUN_STRIDE, 3.6, 6.4)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions])

  const play = (name: string, speed?: number) => {
    const next = actions[name]
    if (!next) return
    if (currentAnim.current !== name) {
      next.reset().fadeIn(FADE).play()
      const prev = actions[currentAnim.current]
      if (prev && prev.isRunning()) prev.crossFadeTo(next, FADE, false)
      currentAnim.current = name
    }
    // Match stride to actual velocity (timeScale = speed / base cadence).
    if (speed !== undefined) {
      const base = name === 'Run' ? bases.current.run : name === 'Walk' ? bases.current.walk : 0
      if (base > 0) next.timeScale = speed / base
    }
  }

  const clampChar = (g: Group) => {
    // Soft circular meadow boundary.
    const r = Math.hypot(g.position.x, g.position.z)
    if (r > CHAR_CLAMP_R) {
      g.position.x *= CHAR_CLAMP_R / r
      g.position.z *= CHAR_CLAMP_R / r
    }
  }

  /** Occasionally pop a tiny star when arriving somewhere new. */
  const maybePopStar = (pos: THREE.Vector3) => {
    if (pos.distanceTo(lastPop.current) < 1.4 || Math.random() > 0.5) return
    lastPop.current.copy(pos)
    const t = performance.now() / 1000
    burstPool.current.forEach((p, i) => {
      if (!p) return
      p.visible = true
      p.userData.t0 = t
      p.position.set(pos.x, 0.6, pos.z)
      const a = (i / burstPool.current.length) * Math.PI * 2
      p.userData.vel = new THREE.Vector3(
        Math.cos(a) * (0.8 + Math.random() * 0.5),
        1.4 + Math.random() * 1.0,
        Math.sin(a) * (0.8 + Math.random() * 0.5),
      )
    })
  }

  /** Move to a clamped floor point (run on double-click / Shift). */
  const goTo = (point: THREE.Vector3, run: boolean) => {
    const r = Math.hypot(point.x, point.z)
    const scale = r > CHAR_CLAMP_R ? CHAR_CLAMP_R / r : 1
    const p = new THREE.Vector3(point.x * scale, 0, point.z * scale)
    const g = char.current
    if (!g) return
    if (frozen) {
      // Reduced motion: no walk animation — settle straight into place.
      g.position.copy(p)
      invalidate()
      return
    }
    target.current = p
    moving.current = run ? 'run' : 'walk'
  }

  /** Tap the ball: pop it away from the character. */
  const popBall = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (dragging.current) return
    const g = char.current
    const dir = new THREE.Vector3(1, 0, 0)
    if (g) {
      dir.set(ballPos.current.x - g.position.x, 0, ballPos.current.z - g.position.z)
      if (dir.lengthSq() < 1e-4) dir.set(Math.sin(g.rotation.y), 0, Math.cos(g.rotation.y))
      dir.normalize()
    }
    ballVel.current.x += dir.x * 6.5
    ballVel.current.z += dir.z * 6.5
    invalidate()
  }

  // Initial animation state.
  useEffect(() => {
    const idle = actions['Idle']
    if (!idle) return
    if (frozen) {
      idle.setLoop(THREE.LoopOnce, 1)
      idle.clampWhenFinished = true
      idle.reset().paused = true
      idle.play()
      idle.time = 0
      mixer.update(0)
    } else {
      idle.setLoop(THREE.LoopRepeat, Infinity)
      idle.reset().fadeIn(FADE).play()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer, actions, frozen])

  // One-shot Wave (character click) falls back to Idle when finished.
  useEffect(() => {
    const onFinished = () => play(moving.current ? 'Walk' : 'Idle')
    mixer.addEventListener('finished', onFinished)
    return () => mixer.removeEventListener('finished', onFinished)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer, actions])

  // Drag-to-orbit + click-vs-drag discrimination (6px threshold), wired to
  // the canvas element so page scrolling still works.
  useEffect(() => {
    const el = document.querySelector<HTMLCanvasElement>('[data-hero-canvas]')
    if (!el) return
    let downX = 0
    let downY = 0
    let downT = 0

    const onDown = (e: PointerEvent) => {
      downX = e.clientX
      downY = e.clientY
      downT = performance.now()
      dragging.current = false
    }
    const onMove = (e: PointerEvent) => {
      if (!downT) return
      if (!dragging.current && Math.hypot(e.clientX - downX, e.clientY - downY) > 6) {
        dragging.current = true
        downX = e.clientX
        downY = e.clientY
      }
      if (dragging.current && world.current) {
        world.current.rotation.y = THREE.MathUtils.clamp(
          world.current.rotation.y + e.movementX * 0.004,
          -ORBIT_CLAMP,
          ORBIT_CLAMP,
        )
      }
    }
    const onUp = () => {
      downT = 0
      // Clear drag state after the click handler on the floor has run.
      requestAnimationFrame(() => {
        dragging.current = false
      })
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  /** Reflect a unit velocity against a collision normal, damped. */
  const bounce = (nx: number, nz: number, restitution: number) => {
    const v = ballVel.current
    const dot = v.x * nx + v.z * nz
    if (dot < 0) {
      v.x -= (1 + restitution) * dot * nx
      v.z -= (1 + restitution) * dot * nz
    }
  }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const g = char.current
    if (!g) return

    if (!frozen) {
      mixer.update(delta)

      const k = keys.current
      let dx = 0
      let dz = 0
      if (k.has('w') || k.has('arrowup')) dz -= 1
      if (k.has('s') || k.has('arrowdown')) dz += 1
      if (k.has('a') || k.has('arrowleft')) dx -= 1
      if (k.has('d') || k.has('arrowright')) dx += 1

      let speed = 0
      if (dx !== 0 || dz !== 0) {
        // Keyboard: continuous movement, Shift = run.
        const len = Math.hypot(dx, dz)
        speed = k.has('shift') ? speeds.current.run : speeds.current.walk
        g.position.x += (dx / len) * speed * delta
        g.position.z += (dz / len) * speed * delta
        clampChar(g)
        target.current = null
        moving.current = k.has('shift') ? 'run' : 'walk'
      } else if (target.current) {
        // Click-to-move: fixed speed toward the target, then Idle.
        const t = target.current
        speed = moving.current === 'run' ? speeds.current.run : speeds.current.walk
        const dist = Math.hypot(t.x - g.position.x, t.z - g.position.z)
        if (dist <= speed * delta + 1e-4) {
          g.position.set(t.x, 0, t.z)
          target.current = null
          moving.current = null
          maybePopStar(g.position)
        } else {
          const step = (speed * delta) / dist
          g.position.x += (t.x - g.position.x) * step
          g.position.z += (t.z - g.position.z) * step
          clampChar(g)
        }
      } else {
        moving.current = null
      }

      // Crossfade Walk / Run / Idle with stride-matched timeScale.
      if (moving.current) play(moving.current, speed)
      else if (currentAnim.current === 'Walk' || currentAnim.current === 'Run') play('Idle')

      // Face the movement direction with a capped turn-rate (no snapping).
      const fdx = target.current
        ? target.current.x - g.position.x
        : dx
      const fdz = target.current
        ? target.current.z - g.position.z
        : dz
      if (fdx * fdx + fdz * fdz > 1e-6) {
        const desired = Math.atan2(fdx, fdz)
        let diff = desired - g.rotation.y
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        const maxStep = TURN_RATE * delta
        g.rotation.y += THREE.MathUtils.clamp(diff, -maxStep, maxStep)
      }

      // --- Ball physics ---
      const bp = ballPos.current
      const bv = ballVel.current
      // Character kicks it: push in the movement direction on contact.
      const cdx = bp.x - g.position.x
      const cdz = bp.z - g.position.z
      const cd = Math.hypot(cdx, cdz)
      const kickR = BALL_R + 0.42
      if (cd < kickR && cd > 1e-4) {
        const nx = cdx / cd
        const nz = cdz / cd
        bp.x = g.position.x + nx * kickR
        bp.z = g.position.z + nz * kickR
        const dirx = dx !== 0 || dz !== 0 ? dx : target.current ? target.current.x - g.position.x : nx
        const dirz = dx !== 0 || dz !== 0 ? dz : target.current ? target.current.z - g.position.z : nz
        const dl = Math.hypot(dirx, dirz) || 1
        const push = Math.max(speed, 1.5) * 1.35
        bv.x = (dirx / dl) * push
        bv.z = (dirz / dl) * push
      }
      // Integrate + friction.
      const bs = Math.hypot(bv.x, bv.z)
      if (bs > 0.01) {
        bp.x += bv.x * delta
        bp.z += bv.z * delta
        bv.x *= Math.pow(BALL_FRICTION, delta)
        bv.z *= Math.pow(BALL_FRICTION, delta)
        // Bounce off trees / rocks / bushes.
        for (const o of obstacles) {
          const ox = bp.x - o.x
          const oz = bp.z - o.z
          const d = Math.hypot(ox, oz)
          const min = o.r + BALL_R
          if (d < min && d > 1e-4) {
            bp.x = o.x + (ox / d) * min
            bp.z = o.z + (oz / d) * min
            bounce(ox / d, oz / d, 0.55)
          }
        }
        // Soft circular world edge: bounce back, never leave.
        const r = Math.hypot(bp.x, bp.z)
        if (r > WORLD_R - 0.4 - BALL_R) {
          const nx = bp.x / r
          const nz = bp.z / r
          bp.x = nx * (WORLD_R - 0.4 - BALL_R)
          bp.z = nz * (WORLD_R - 0.4 - BALL_R)
          bounce(-nx, -nz, 0.6)
        }
        invalidate()
      }
    }

    // Star particles: ballistic arc + fade, then hide.
    const now = performance.now() / 1000
    let animating = false
    for (const p of burstPool.current) {
      if (!p?.visible) continue
      animating = true
      const age = now - (p.userData.t0 as number)
      if (age >= BURST_LIFE) {
        p.visible = false
        continue
      }
      const v = p.userData.vel as THREE.Vector3
      p.position.addScaledVector(v, delta)
      v.y -= 6.5 * delta
      const mat = (p.children[0] as Mesh).material as THREE.MeshLambertMaterial
      mat.opacity = 1 - age / BURST_LIFE
    }
    // Render on demand only while something moves.
    if (animating || (!frozen && moving.current)) invalidate()
  })

  /** Static obstacle list for ball collisions (tree/rock/bush footprints). */
  const obstacles: Obstacle[] = useMemo(
    () => [
      ...scatter.trees.map((t) => ({ x: t.x, z: t.z, r: 0.55 * t.s + 0.15 })),
      ...scatter.rocks.map((t) => ({ x: t.x, z: t.z, r: 0.5 * t.s })),
      ...scatter.bushes.map((t) => ({ x: t.x, z: t.z, r: 0.55 * t.s })),
    ],
    [scatter],
  )

  return (
    <>
      {/* Meadow + character rotate together for the drag orbit; the camera
          stays fixed at a pleasant isometric-ish angle. */}
      <group ref={world}>
        {/* Ground: big soft meadow disc (walkable — click/tap here) */}
        <mesh
          onPointerUp={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation()
            if (dragging.current) return
            const run = performance.now() - lastClick.current < DBL_CLICK_MS
            lastClick.current = performance.now()
            goTo(e.point, run)
          }}
        >
          <circleGeometry args={[WORLD_R, 48]} />
          <meshLambertMaterial color={COLORS.grass} flatShading={true} />
        </mesh>

        {/* Soft green tone patches */}
        <mesh position={[2.5, 0.01, 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3.2, 20]} />
          <meshBasicMaterial color={COLORS.grassLight} transparent opacity={0.55} />
        </mesh>
        <mesh position={[-3, 0.01, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.6, 20]} />
          <meshBasicMaterial color={COLORS.grassDark} transparent opacity={0.4} />
        </mesh>
        <mesh position={[0.5, 0.01, -3.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.2, 20]} />
          <meshBasicMaterial color={COLORS.grassLight} transparent opacity={0.45} />
        </mesh>
        <mesh position={[5, 0.012, 3.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.6, 16]} />
          <meshBasicMaterial color={COLORS.grassDark} transparent opacity={0.35} />
        </mesh>
        <mesh position={[-5.5, 0.012, -3]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.4, 16]} />
          <meshBasicMaterial color={COLORS.grassLight} transparent opacity={0.4} />
        </mesh>

        {/* Soft circular world border */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[WORLD_R - 0.25, WORLD_R, 48]} />
          <meshBasicMaterial color={COLORS.cream} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[WORLD_R - 0.5, WORLD_R - 0.25, 48]} />
          <meshBasicMaterial color={COLORS.teal} transparent opacity={0.5} />
        </mesh>

        {/* Rolling hills silhouettes around the edge */}
        <mesh position={[-8.5, -0.6, -6.5]}>
          <sphereGeometry args={[3.4, 12, 8]} />
          <meshLambertMaterial color={COLORS.grassDark} flatShading={true} />
        </mesh>
        <mesh position={[9, -1.1, -6]}>
          <sphereGeometry args={[4.2, 12, 8]} />
          <meshLambertMaterial color={COLORS.leafDark} flatShading={true} />
        </mesh>
        <mesh position={[0, -1.3, -10.5]}>
          <sphereGeometry args={[4.6, 12, 8]} />
          <meshLambertMaterial color={COLORS.grassDark} flatShading={true} />
        </mesh>
        <mesh position={[9.5, -1.6, 4]}>
          <sphereGeometry args={[3.6, 12, 8]} />
          <meshLambertMaterial color={COLORS.grassDark} flatShading={true} />
        </mesh>

        {/* Sun */}
        <mesh position={[-7, 8.5, -8]}>
          <sphereGeometry args={[1.1, 14, 10]} />
          <meshBasicMaterial color={COLORS.sunny} />
        </mesh>

        {/* Blocky drifting clouds */}
        <Cloud x={-6} y={7.4} z={-5} s={1.1} speed={0.25} />
        <Cloud x={4} y={8.2} z={-3} s={0.85} speed={0.18} />
        <Cloud x={9} y={7.0} z={-7} s={1.3} speed={0.3} />

        {/* Scattered trees / rocks / bushes */}
        {scatter.trees.map((t, i) => (
          <Tree key={i} x={t.x} z={t.z} s={t.s} />
        ))}
        {scatter.rocks.map((t, i) => (
          <mesh key={i} position={[t.x, 0.28 * t.s, t.z]} scale={t.s}>
            <dodecahedronGeometry args={[0.42, 0]} />
            <meshLambertMaterial color={COLORS.rock} flatShading={true} />
          </mesh>
        ))}
        {scatter.bushes.map((t, i) => (
          <mesh key={i} position={[t.x, 0.3 * t.s, t.z]} scale={t.s}>
            <icosahedronGeometry args={[0.45, 0]} />
            <meshLambertMaterial color={COLORS.leaf} flatShading={true} />
          </mesh>
        ))}

        {/* Signpost — navigates to /games */}
        <group position={[-4.5, 0, -4.5]}>
          <Hotspot
            label="🎮 Games"
            labelY={2.5}
            frozen={frozen}
            dragging={dragging}
            onGo={() => onNavigate?.('/games')}
          >
            {(glow) => (
              <group>
                <mesh position={[0, 0.85, 0]}>
                  <cylinderGeometry args={[0.09, 0.11, 1.7, 6]} />
                  <meshLambertMaterial color={COLORS.trunk} flatShading={true} />
                </mesh>
                <mesh position={[-0.15, 1.55, 0]} rotation={[0, 0, 0.06]}>
                  <boxGeometry args={[1.5, 0.45, 0.14]} />
                  <GlowMaterial glow={glow} color={COLORS.teal} />
                </mesh>
                <mesh position={[0.3, 1.15, 0]} rotation={[0, 0, -0.05]}>
                  <boxGeometry args={[1.1, 0.38, 0.12]} />
                  <GlowMaterial glow={glow} color={COLORS.coral} />
                </mesh>
              </group>
            )}
          </Hotspot>
        </group>

        {/* Gate arch — navigates to /login */}
        <group position={[4.8, 0, -4.8]} rotation={[0, Math.PI * 0.75, 0]}>
          <Hotspot
            label="🚪 Sign in"
            labelY={2.9}
            frozen={frozen}
            dragging={dragging}
            onGo={() => onNavigate?.('/login')}
          >
            {(glow) => (
              <group>
                <mesh position={[-1.05, 1.15, 0]}>
                  <boxGeometry args={[0.3, 2.3, 0.3]} />
                  <meshLambertMaterial color={COLORS.trunk} flatShading={true} />
                </mesh>
                <mesh position={[1.05, 1.15, 0]}>
                  <boxGeometry args={[0.3, 2.3, 0.3]} />
                  <meshLambertMaterial color={COLORS.trunk} flatShading={true} />
                </mesh>
                <mesh position={[0, 2.35, 0]}>
                  <boxGeometry args={[2.7, 0.4, 0.34]} />
                  <GlowMaterial glow={glow} color={COLORS.sunny} />
                </mesh>
                <mesh position={[0, 1.6, 0]}>
                  <boxGeometry args={[0.12, 0.9, 0.1]} />
                  <meshLambertMaterial color={COLORS.coral} flatShading={true} />
                </mesh>
              </group>
            )}
          </Hotspot>
        </group>

        {/* Kickable ball */}
        <Ball pos={ballPos} vel={ballVel} onClick={popBall} />

        {/* Character: feet on the ground; click = friendly Wave. */}
        <group
          ref={char}
          scale={0.55}
          position={[0, 0, 1.5]}
          rotation={[0, 0, 0]}
        >
          <primitive
            object={gltf.scene}
            onPointerUp={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation()
              if (dragging.current || frozen || moving.current) return
              const wave = actions['Wave']
              if (!wave) return
              wave.setLoop(THREE.LoopOnce, 1)
              wave.clampWhenFinished = true
              wave.reset().fadeIn(FADE).play()
              currentAnim.current = 'Wave'
            }}
          />
          {/* Soft contact shadow blob under the character's feet. */}
          <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.55, 20]} />
            <meshBasicMaterial color={COLORS.ink} transparent opacity={0.14} depthWrite={false} />
          </mesh>
        </group>
      </group>

      <StarPool pool={burstPool} />
    </>
  )
}

/** Interactive meadow hero: tap/click the field to walk (double-click or
 *  Shift = run), WASD/arrows while the scene is focused, kick the ball by
 *  walking into it or tapping it, drag for a clamped orbit, signpost →
 *  /games, gate → /login. dpr capped [1, 1.5], transparent background;
 *  reduced-motion keeps a static pose and teleports on click. */
export default function HeroScene({ onNavigate }: HeroSceneProps) {
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
    <div
      data-hero-root=""
      tabIndex={0}
      role="application"
      aria-label="Interactive meadow: tap the grass to move the character, kick the ball, or use WASD and arrow keys while focused"
      className="w-full h-full outline-none focus-visible:ring-2 focus-visible:ring-coral/60 rounded-3xl"
      onKeyDownCapture={(e) => {
        // Keyboard movement events are consumed by Meadow via a shared ref;
        // here we just keep the browser from scrolling on arrows/space.
        const k = e.key.toLowerCase()
        if (k.startsWith('arrow') || k === ' ') e.preventDefault()
      }}
    >
      <Canvas
        dpr={dpr}
        frameloop={frozen ? 'demand' : 'always'}
        camera={{ position: [0, 9.5, 14], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 0.8, 0)
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <SceneContent frozen={frozen} onNavigate={onNavigate} />
      </Canvas>
    </div>
  )
}

/** Inner scene: owns the shared key set and keyboard listeners (attached to
 *  the tabbable container element, removed cleanly on unmount). */
function SceneContent({
  frozen,
  onNavigate,
}: {
  frozen: boolean
  onNavigate?: (to: string) => void
}) {
  const { gl } = useThree()
  const container = useMemo(
    () => gl.domElement.closest<HTMLElement>('[data-hero-root]'),
    [gl],
  )
  const keys = useMemo(() => new Set<string>(), [])

  useEffect(() => {
    if (!container) return
    const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (MOVE_KEYS.has(k) || k === 'shift') {
        e.preventDefault()
        keys.add(k)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase())
      keys.delete('shift')
    }
    const onBlur = () => keys.clear()
    container.addEventListener('keydown', onKeyDown)
    container.addEventListener('keyup', onKeyUp)
    container.addEventListener('blur', onBlur)
    return () => {
      container.removeEventListener('keydown', onKeyDown)
      container.removeEventListener('keyup', onKeyUp)
      container.removeEventListener('blur', onBlur)
    }
  }, [container, keys])

  const keysRef = useRef(keys)
  keysRef.current = keys

  return (
    <>
      <CanvasTag />
      <ambientLight intensity={0.95} />
      <directionalLight position={[6, 9, 5]} intensity={1.05} />
      <Meadow frozen={frozen} onNavigate={onNavigate} keys={keysRef} />
    </>
  )
}

// Mark the canvas so Meadow's drag-orbit effect can find it (set by CanvasTag).
function CanvasTag() {
  const { gl } = useThree()
  useEffect(() => {
    gl.domElement.setAttribute('data-hero-canvas', '')
  }, [gl])
  return null
}

useGLTF.preload('/models/character.glb')
