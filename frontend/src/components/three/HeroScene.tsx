import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group, Mesh } from 'three'
import * as THREE from 'three'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'

/** LearnLoop palette (mirrors src/index.css tokens). */
const COLORS = {
  cream: '#fff9f0',
  coral: '#ff6b6b',
  teal: '#4ecdc4',
  sunny: '#ffd93d',
  ink: '#3a2e39',
}

const FADE = 0.18
const WALK_SPEED = 2.4
const RUN_SPEED = 4.6
/** Walkable floor clamp (keeps the character inside the room). */
const BOUNDS = { minX: -4.3, maxX: 4.3, minZ: -2.9, maxZ: 3.2 }
/** Camera orbit clamp (radians). */
const ORBIT_CLAMP = 0.38
/** Double-click window for run. */
const DBL_CLICK_MS = 350
const BURST_COUNT = 10
const BURST_LIFE = 0.7

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

/** Clickable room object: hover glow + floating label sprite. */
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

/** The cozy open room + character movement controller. */
function Room({
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

  const gltf = useGLTF('/models/character.glb')
  const { actions, mixer } = useAnimations(gltf.animations, char)
  const currentAnim = useRef('Idle')

  const play = (name: string) => {
    if (currentAnim.current === name) return
    const next = actions[name]
    if (!next) return
    next.reset().fadeIn(FADE).play()
    const prev = actions[currentAnim.current]
    if (prev && prev.isRunning()) prev.crossFadeTo(next, FADE, false)
    currentAnim.current = name
  }

  const clampChar = (g: Group) => {
    g.position.x = THREE.MathUtils.clamp(g.position.x, BOUNDS.minX, BOUNDS.maxX)
    g.position.z = THREE.MathUtils.clamp(g.position.z, BOUNDS.minZ, BOUNDS.maxZ)
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
    const p = new THREE.Vector3(
      THREE.MathUtils.clamp(point.x, BOUNDS.minX, BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(point.z, BOUNDS.minZ, BOUNDS.maxZ),
    )
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

      if (dx !== 0 || dz !== 0) {
        // Keyboard: continuous movement, Shift = run.
        const len = Math.hypot(dx, dz)
        const speed = k.has('shift') ? RUN_SPEED : WALK_SPEED
        g.position.x += (dx / len) * speed * delta
        g.position.z += (dz / len) * speed * delta
        clampChar(g)
        target.current = null
        moving.current = k.has('shift') ? 'run' : 'walk'
      } else if (target.current) {
        // Click-to-move: fixed speed toward the target, then Idle.
        const t = target.current
        const speed = moving.current === 'run' ? RUN_SPEED : WALK_SPEED
        const dist = Math.hypot(t.x - g.position.x, t.z - g.position.z)
        if (dist <= (speed * delta + 1e-4)) {
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

      // Smoothly face the movement direction (shortest-angle lerp).
      const face = target.current
      if (face) {
        const fdx = face.x - g.position.x
        const fdz = face.z - g.position.z
        if (fdx * fdx + fdz * fdz > 1e-6) {
          const desired = Math.atan2(fdx, fdz)
          let diff = desired - g.rotation.y
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          g.rotation.y += diff * Math.min(1, delta * 10)
        }
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

  return (
    <>
      {/* Room + character rotate together for the drag orbit; the camera
          stays fixed at a pleasant isometric-ish angle. */}
      <group ref={world}>
        {/* Floor (walkable — click/tap here) */}
        <mesh
          position={[0, -0.2, 0]}
          onPointerUp={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation()
            if (dragging.current) return
            const run = performance.now() - lastClick.current < DBL_CLICK_MS
            lastClick.current = performance.now()
            goTo(e.point, run)
          }}
        >
          <boxGeometry args={[10.4, 0.4, 8.4]} />
          <meshLambertMaterial color={COLORS.cream} flatShading={true} />
        </mesh>

        {/* Rug (two flat layers) */}
        <mesh position={[0.4, 0.012, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4.6, 3.4]} />
          <meshBasicMaterial color={COLORS.teal} transparent opacity={0.5} />
        </mesh>
        <mesh position={[0.4, 0.02, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.4, 2.4]} />
          <meshBasicMaterial color={COLORS.coral} transparent opacity={0.35} />
        </mesh>

        {/* Two back walls */}
        <Box args={[10.4, 3.4, 0.35]} color={COLORS.teal} position={[0, 1.5, -4.2]} />
        <Box args={[0.35, 3.4, 8.4]} color={COLORS.coral} position={[-5.2, 1.5, 0]} />

        {/* Window on the back wall with a sunny glow */}
        <group position={[1.8, 1.7, -4.0]}>
          <Box args={[2.0, 0.18, 0.22]} color={COLORS.cream} position={[0, 0.9, 0]} />
          <Box args={[2.0, 0.18, 0.22]} color={COLORS.cream} position={[0, -0.9, 0]} />
          <Box args={[0.18, 1.9, 0.22]} color={COLORS.cream} position={[-0.95, 0, 0]} />
          <Box args={[0.18, 1.9, 0.22]} color={COLORS.cream} position={[0.95, 0, 0]} />
          <Box args={[0.14, 1.7, 0.16]} color={COLORS.cream} position={[0, 0, 0]} />
          <mesh position={[0, 0, -0.06]}>
            <planeGeometry args={[1.9, 1.8]} />
            <meshBasicMaterial color={COLORS.sunny} transparent opacity={0.75} />
          </mesh>
        </group>

        {/* Door on the left wall — navigates to /login */}
        <group position={[-5.02, 0, 1.6]} rotation={[0, Math.PI / 2, 0]}>
          <Hotspot
            label="🚪 Sign in"
            labelY={2.6}
            frozen={frozen}
            dragging={dragging}
            onGo={() => onNavigate?.('/login')}
          >
            {(glow) => (
              <group>
                <mesh position={[0, 1.35, 0.05]}>
                  <boxGeometry args={[1.25, 2.6, 0.14]} />
                  <GlowMaterial glow={glow} color={COLORS.sunny} />
                </mesh>
                <mesh position={[0.42, 1.35, 0.16]}>
                  <sphereGeometry args={[0.07, 8, 8]} />
                  <meshLambertMaterial color={COLORS.ink} flatShading={true} />
                </mesh>
              </group>
            )}
          </Hotspot>
        </group>

        {/* Desk (back-left corner) */}
        <group position={[-3.4, 0, -3.3]}>
          <Box args={[2.2, 0.14, 1.0]} color={COLORS.sunny} position={[0, 1.0, 0]} />
          <Box args={[0.14, 1.0, 0.9]} color={COLORS.coral} position={[-1.0, 0.5, 0]} />
          <Box args={[0.14, 1.0, 0.9]} color={COLORS.coral} position={[1.0, 0.5, 0]} />
        </group>

        {/* TV console with game screen — navigates to /games */}
        <group position={[2.6, 0, -3.5]}>
          <Box args={[2.4, 0.9, 0.9]} color={COLORS.coral} position={[0, 0.45, 0]} />
          <Box args={[0.16, 0.45, 0.8]} color={COLORS.ink} position={[-1.0, 0.22, 0]} />
          <Box args={[0.16, 0.45, 0.8]} color={COLORS.ink} position={[1.0, 0.22, 0]} />
          <Hotspot
            label="🎮 Games"
            labelY={2.9}
            frozen={frozen}
            dragging={dragging}
            onGo={() => onNavigate?.('/games')}
          >
            {(glow) => (
              <group>
                <Box args={[1.9, 1.25, 0.1]} color={COLORS.ink} position={[0, 1.85, -0.02]} />
                <mesh position={[0, 1.85, 0.05]}>
                  <boxGeometry args={[1.7, 1.05, 0.12]} />
                  <GlowMaterial glow={glow} color={COLORS.teal} />
                </mesh>
              </group>
            )}
          </Hotspot>
        </group>

        {/* Potted plant (right-front corner) */}
        <group position={[4.0, 0, 2.6]}>
          <Box args={[0.55, 0.6, 0.55]} color={COLORS.coral} position={[0, 0.3, 0]} />
          <Box
            args={[0.7, 0.7, 0.7]}
            color={COLORS.teal}
            position={[0, 1.0, 0]}
            rotation={[0, 0.5, 0]}
          />
          <Box
            args={[0.5, 0.5, 0.5]}
            color={COLORS.teal}
            position={[0.1, 1.55, 0]}
            rotation={[0, 0.9, 0]}
          />
        </group>

        {/* Character: feet on the floor; click = friendly Wave. */}
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

/** Interactive room diorama hero: tap/click the floor to walk (double-click or
 *  Shift = run), WASD/arrows while the scene is focused, drag for a clamped
 *  orbit, TV → /games, door → /login. dpr capped [1, 1.5], transparent
 *  background; reduced-motion keeps a static pose and teleports on click. */
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
      aria-label="Interactive room: tap the floor to move the character, or use WASD and arrow keys while focused"
      className="w-full h-full outline-none focus-visible:ring-2 focus-visible:ring-coral/60 rounded-3xl"
      onKeyDownCapture={(e) => {
        // Keyboard movement events are consumed by Room via a shared ref;
        // here we just keep the browser from scrolling on arrows/space.
        const k = e.key.toLowerCase()
        if (k.startsWith('arrow') || k === ' ') e.preventDefault()
      }}
    >
      <Canvas
        dpr={dpr}
        frameloop={frozen ? 'demand' : 'always'}
        camera={{ position: [0, 7.6, 10.8], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        onCreated={({ camera }) => {
          camera.lookAt(0, 1.0, 0)
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
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 4]} intensity={1.0} />
      <Room frozen={frozen} onNavigate={onNavigate} keys={keysRef} />
    </>
  )
}

// Mark the canvas so Room's drag-orbit effect can find it (set by CanvasTag).
function CanvasTag() {
  const { gl } = useThree()
  useEffect(() => {
    gl.domElement.setAttribute('data-hero-canvas', '')
  }, [gl])
  return null
}

useGLTF.preload('/models/character.glb')
