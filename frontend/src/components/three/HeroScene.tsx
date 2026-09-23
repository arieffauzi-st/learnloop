import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'

/** LearnLoop palette (mirrors src/index.css tokens). */
const COLORS = {
  cream: '#fff9f0',
  coral: '#ff6b6b',
  teal: '#4ecdc4',
  sunny: '#ffd93d',
  ink: '#3a2e39',
}

/** Reaction cycled through on each click. */
type Reaction = 'hop' | 'wave' | 'punch' | 'yes' | 'spin'
const REACTIONS: Reaction[] = ['hop', 'wave', 'punch', 'yes', 'spin']
/** Crossfade duration for every animation transition. */
const FADE = 0.2

/** Canvas-texture sprite that floats up and fades: the "+10 XP" popup. */
function XpSprite({ sprite }: { sprite: React.RefObject<THREE.Sprite | null> }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 128
    const ctx = c.getContext('2d')!
    ctx.font = 'bold 72px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 10
    ctx.strokeStyle = COLORS.ink
    ctx.strokeText('+10 XP', 128, 64)
    ctx.fillStyle = COLORS.sunny
    ctx.fillText('+10 XP', 128, 64)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])

  return (
    <sprite ref={sprite} visible={false} position={[0, 1.6, 0]} scale={[1.1, 0.55, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  )
}

const BURST_COUNT = 14
const BURST_LIFE = 0.85

/** Pool of small flat-shaded blocks for the star-burst particle effect. */
function StarBurst({ pool }: { pool: React.MutableRefObject<(Group | null)[]> }) {
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
            <boxGeometry args={[0.11, 0.11, 0.11]} />
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

/** The Quaternius CC0 character (vertex-colored GLB) driving the hero.
 *  Idle loops by default; clicks crossfade (0.2s) into a one-shot reaction,
 *  then chain back to Idle. Bob/sway lives on the pedestal wrapper group,
 *  never on the skinned mesh's root bone. */
function Character({
  frozen,
  burstPool,
  xpSprite,
  dragYaw,
}: {
  frozen: boolean
  burstPool: React.MutableRefObject<(Group | null)[]>
  xpSprite: React.RefObject<THREE.Sprite | null>
  dragYaw: React.MutableRefObject<number>
}) {
  const group = useRef<Group>(null)
  const spinT = useRef(0)
  const queued = useRef<string | null>(null)
  const hover = useRef(false)

  const gltf = useGLTF('/models/character.glb')
  const { actions, mixer } = useAnimations(gltf.animations, group)

  const crossfade = (to: string, dur = FADE) => {
    const next = actions[to]
    if (!next) return
    next.reset().fadeIn(dur).play()
    for (const [name, act] of Object.entries(actions)) {
      if (name !== to && act && act.isRunning()) act.crossFadeTo(next, dur, false)
    }
  }

  const startReaction = (r: Reaction) => {
    if (frozen) return
    for (const act of Object.values(actions)) {
      if (!act) continue
      act.setLoop(THREE.LoopOnce, 1)
      act.clampWhenFinished = true
    }
    // Idle must keep looping.
    actions['Idle']?.setLoop(THREE.LoopRepeat, Infinity)
    queued.current = null

    if (r === 'hop') {
      crossfade('Jump')
      queued.current = 'Jump_Land'
    } else if (r === 'wave') {
      crossfade('Wave')
    } else if (r === 'punch') {
      crossfade('Punch')
      triggerBurst()
    } else if (r === 'yes') {
      crossfade('Yes')
    } else if (r === 'spin') {
      crossfade('Jump')
      spinT.current = 0.001 // start procedural 360° yaw spin
    }
  }

  const triggerBurst = () => {
    const t = performance.now() / 1000
    burstPool.current.forEach((p, i) => {
      if (!p) return
      p.visible = true
      p.userData.t0 = t
      const a = (i / burstPool.current.length) * Math.PI * 2
      p.userData.vel = new THREE.Vector3(
        Math.cos(a) * (1.1 + Math.random() * 0.6),
        1.6 + Math.random() * 1.2,
        Math.sin(a) * (1.1 + Math.random() * 0.6),
      )
      p.position.set(0, 0.4, 0)
    })
    const s = xpSprite.current
    if (s) {
      s.visible = true
      s.userData.t0 = t
      s.position.y = 1.6
    }
  }

  // Chain one-shot clips: finished -> queued clip -> back to Idle.
  useEffect(() => {
    const onFinished = () => {
      if (queued.current) {
        const next = queued.current
        queued.current = null
        crossfade(next)
      } else {
        crossfade('Idle')
      }
    }
    mixer.addEventListener('finished', onFinished)
    return () => mixer.removeEventListener('finished', onFinished)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer, actions])

  // Initial animation state.
  useEffect(() => {
    const idle = actions['Idle']
    if (!idle) return
    if (frozen) {
      // Reduced motion: freeze on the first frame of Idle, never play.
      idle.setLoop(THREE.LoopOnce, 1)
      idle.clampWhenFinished = true
      idle.reset()
      idle.paused = true
      idle.play()
      idle.time = 0
      mixer.update(0)
    } else {
      idle.reset().fadeIn(FADE).play()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer, actions, frozen])

  // Window-level reaction events (fired by usePointerInteractions on click).
  useEffect(() => {
    const onReact = (e: Event) => startReaction((e as CustomEvent).detail as Reaction)
    window.addEventListener('hero:react', onReact)
    return () => window.removeEventListener('hero:react', onReact)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer, actions, frozen])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const g = group.current
    if (!g) return

    if (!frozen) {
      mixer.update(delta)

      // Procedural 360° yaw spin while Jump plays (spin-jump reaction).
      if (spinT.current > 0) {
        spinT.current += delta
        const p = spinT.current / 0.8
        g.rotation.y = dragYaw.current + (p < 1 ? p * Math.PI * 2 : Math.PI * 2)
        if (p >= 1) {
          spinT.current = 0
          g.rotation.y = dragYaw.current
        }
      } else {
        g.rotation.y = dragYaw.current
      }
    }

    // Star burst particles: ballistic arc + fade, then hide.
    const now = performance.now() / 1000
    for (const p of burstPool.current) {
      if (!p?.visible) continue
      const age = now - (p.userData.t0 as number)
      if (age >= BURST_LIFE) {
        p.visible = false
        continue
      }
      const v = p.userData.vel as THREE.Vector3
      p.position.addScaledVector(v, delta)
      v.y -= 6.5 * delta
      const mat = (p.children[0] as THREE.Mesh).material as THREE.MeshLambertMaterial
      mat.opacity = 1 - age / BURST_LIFE
    }

    // "+10 XP" popup: float up and fade out.
    const xp = xpSprite.current
    if (xp?.visible) {
      const age = now - (xp.userData.t0 as number)
      if (age >= 1) {
        xp.visible = false
      } else {
        xp.position.y = 1.6 + age * 0.9
        ;(xp.material as THREE.SpriteMaterial).opacity = 1 - age
      }
    }

    // Subtle hover feedback (whole character group, scaled around its feet).
    const target = hover.current ? 1.04 : 1
    g.scale.lerp(new THREE.Vector3(target, target, target), 0.15)
  })

  // Model: ~3.76 units tall, feet at y≈0 → scale 0.55 ≈ 2.07 units tall,
  // feet placed on the pedestal top (y = -0.95), centered on the pedestal.
  return (
    <group ref={group} position={[0, -0.95, 0]} scale={0.55}>
      <primitive
        object={gltf.scene}
        onPointerOver={() => {
          if (!frozen) {
            hover.current = true
            document.body.style.cursor = 'pointer'
          }
        }}
        onPointerOut={() => {
          hover.current = false
          document.body.style.cursor = 'auto'
        }}
      />
    </group>
  )
}

/** Floating grass-block pedestal: cream "grass" cap + teal dirt sides.
 *  Carries the character, XP sprite and star-burst pool; gentle bob/sway
 *  animates this wrapper group (NOT the skinned mesh's root bone). */
function Pedestal({
  frozen,
  children,
}: {
  frozen: boolean
  children: React.ReactNode
}) {
  const root = useRef<Group>(null)

  useFrame((_, rawDelta) => {
    const r = root.current
    if (!r || frozen) return
    const t = ((r.userData.t as number) ?? 0) + Math.min(rawDelta, 0.1)
    r.userData.t = t
    r.position.y = Math.sin(t * 1.5) * 0.1
    r.rotation.z = Math.sin(t * 0.9) * 0.02
  })

  return (
    <group ref={root} userData={{ t: 0 }}>
      <mesh position={[0, -1.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.1, 24]} />
        <meshBasicMaterial color={COLORS.ink} transparent opacity={0.12} />
      </mesh>
      {/* Blocks sit so the grass cap top lands at world y = -0.95 */}
      <mesh position={[0, -1.25, 0]}>
        <boxGeometry args={[2.3, 0.6, 2.3]} />
        <meshLambertMaterial color={COLORS.cream} flatShading={true} />
      </mesh>
      <mesh position={[0, -1.9, 0]}>
        <boxGeometry args={[2.1, 0.7, 2.1]} />
        <meshLambertMaterial color={COLORS.teal} flatShading={true} />
      </mesh>
      <mesh position={[0, -2.5, 0]}>
        <boxGeometry args={[1.85, 0.5, 1.85]} />
        <meshLambertMaterial color={COLORS.teal} flatShading={true} />
      </mesh>
      {children}
    </group>
  )
}

/** Drag-to-rotate + click-vs-drag discrimination (6px / 300ms threshold),
 *  wired to the canvas element so page scrolling still works. */
function usePointerInteractions(
  canvas: React.RefObject<HTMLCanvasElement | null>,
  dragYaw: React.MutableRefObject<number>,
  onClick: () => void,
) {
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    let downX = 0
    let downY = 0
    let downT = 0
    let dragging = false

    const onDown = (e: PointerEvent) => {
      downX = e.clientX
      downY = e.clientY
      downT = performance.now()
      dragging = false
    }
    const onMove = (e: PointerEvent) => {
      if (downT === 0) return
      const dx = e.clientX - downX
      const dy = e.clientY - downY
      if (!dragging && dx * dx + dy * dy > 36) dragging = true
      if (dragging) dragYaw.current += e.movementX * 0.005
    }
    const onUp = (e: PointerEvent) => {
      const quick =
        Math.hypot(e.clientX - downX, e.clientY - downY) <= 6 &&
        performance.now() - downT <= 300
      downT = 0
      if (quick && !dragging) onClick()
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [canvas, dragYaw, onClick])
}

/** Playful 3D hero scene: the Quaternius CC0 animated character on a floating
 *  grass pedestal, replacing the voxel duck. Vertex-colored materials render
 *  as-is; flat shading stays consistent with the scene. dpr capped 1.5,
 *  cheap frameloop, transparent background. drei/fiber pause rendering when
 *  the tab is hidden (rAF stops automatically). */
export default function HeroScene() {
  const [frozen, setFrozen] = useState(false)
  const dpr = useMemo<[number, number]>(() => [1, 1.5], [])
  const dragYaw = useRef(0)
  const burstPool = useRef<(Group | null)[]>([])
  const xpSprite = useRef<THREE.Sprite | null>(null)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const reactionIdx = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setFrozen(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  usePointerInteractions(canvas, dragYaw, () => {
    if (frozen) return
    // Cycle reactions: hop, wave, punch, yes, spin.
    const r = REACTIONS[reactionIdx.current++ % REACTIONS.length]
    window.dispatchEvent(new CustomEvent('hero:react', { detail: r }))
  })

  return (
    <Canvas
      dpr={dpr}
      frameloop={frozen ? 'demand' : 'always'}
      camera={{ position: [0, 0.3, 5.2], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        canvas.current = gl.domElement
      }}
      style={{ width: '100%', height: '100%' }}
      aria-hidden
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <Pedestal frozen={frozen}>
        <Character
          frozen={frozen}
          dragYaw={dragYaw}
          burstPool={burstPool}
          xpSprite={xpSprite}
        />
      </Pedestal>
      <XpSprite sprite={xpSprite} />
      <StarBurst pool={burstPool} />
    </Canvas>
  )
}

useGLTF.preload('/models/character.glb')
