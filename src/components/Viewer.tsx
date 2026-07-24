import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import type { Manifest, Settings } from '../types'
import { getSettings } from '../stores/petStore'
import Live2dViewer from './Live2dViewer'

export const LIVE2D_PET_NAME = '__live2d__'

function getPetNameFromHash(): string | null {
  const hash = window.location.hash.slice(1)
  const query = hash.split('?')[1] || ''
  const params = new URLSearchParams(query)
  return params.get('petName')
}

function revokeImageMap(map: Record<string, string>) {
  Object.values(map).forEach((url) => {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  })
}

export default function Viewer() {
  const [petName, setPetName] = useState<string | null>(getPetNameFromHash)
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [imageMap, setImageMap] = useState<Record<string, string>>({})
  const [state, setState] = useState('idle')
  const [frameIndex, setFrameIndex] = useState(0)
  const [error, setError] = useState('')
  const [flipX, setFlipX] = useState(false)
  const [flipOverride, setFlipOverride] = useState<boolean | null>(null)
  const [popKey, setPopKey] = useState(0)
  const [stateTick, setStateTick] = useState(0)
  const [settings, setSettings] = useState<Settings>({
    opacity: 1.0,
    always_on_top: true,
    ignore_mouse: false,
    follow_mouse: true,
    key_reaction: true,
    current_pet: '',
    data_dir: '',
  })

  const winRef = useRef(getCurrentWindow())
  const dragStart = useRef({ x: 0, y: 0 })
  const stateRef = useRef(state)
  const manifestRef = useRef(manifest)
  const posRef = useRef({ x: 100, y: 100 })
  const imageMapRef = useRef<Record<string, string>>({})
  const flipXRef = useRef(flipX)
  const flipOverrideRef = useRef(flipOverride)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    manifestRef.current = manifest
  }, [manifest])

  useEffect(() => {
    flipXRef.current = flipX
  }, [flipX])

  useEffect(() => {
    flipOverrideRef.current = flipOverride
  }, [flipOverride])

  const [menu, setMenu] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false })

  useEffect(() => {
    document.body.classList.add('viewer-root')
    function onHashChange() {
      setPetName(getPetNameFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error)
  }, [])

  useEffect(() => {
    document.body.style.opacity = String(settings.opacity)
  }, [settings.opacity])

  useEffect(() => {
    const unlistenMouse = listen<{ direction: 'left' | 'right' }>('global-mouse', ({ payload }) => {
      if (!settings.follow_mouse || !manifestRef.current) return
      setFlipX(payload.direction === 'left')
    })

    const unlistenKey = listen<{ vk: number }>('global-key', () => {
      if (!settings.key_reaction || !manifestRef.current) return
      triggerKey()
    })

    return () => {
      unlistenMouse.then((f) => f()).catch(console.error)
      unlistenKey.then((f) => f()).catch(console.error)
    }
  }, [settings.follow_mouse, settings.key_reaction])

  useEffect(() => {
    if (!petName) {
      setManifest(null)
      setError('')
      return
    }
    setError('')
    setManifest(null)
    // 释放旧宠物的 blob URL
    revokeImageMap(imageMapRef.current)
    imageMapRef.current = {}
    setImageMap({})
    setState('idle')
    setFrameIndex(0)
    // 同步 React 状态中的窗口位置，使行走逻辑从实际位置开始
    winRef.current
      .outerPosition()
      .then((pos) => {
        posRef.current = { x: pos.x, y: pos.y }
      })
      .catch(() => {
        posRef.current = { x: 100, y: 100 }
      })

    invoke<Manifest>('load_pet', { petName })
      .then(async (m) => {
        const map: Record<string, string> = {}
        for (const cfg of Object.values(m.states)) {
          for (const frame of cfg.frames) {
            if (!map[frame]) {
              const bytes: number[] = await invoke('load_pet_image', { petName, imageName: frame })
              const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
              map[frame] = URL.createObjectURL(blob)
            }
          }
        }
        imageMapRef.current = map
        setManifest(m)
        setImageMap(map)
        setState('idle')
      })
      .catch((e) => setError(String(e)))

    return () => {
      revokeImageMap(imageMapRef.current)
      imageMapRef.current = {}
    }
  }, [petName])

  // Animation loop: requestAnimationFrame + time-based frame stepping
  useEffect(() => {
    if (!manifest) return
    const cfg = manifest.states[state]
    if (!cfg || cfg.frames.length === 0) return

    let idx = 0
    let dir = 1
    setFrameIndex(0)
    let lastTime = performance.now()
    const interval = 1000 / cfg.fps
    let rafId = 0

    function loop(now: number) {
      const elapsed = now - lastTime
      if (elapsed >= interval) {
        // 累积多帧间隔，避免后台恢复后狂跳
        const steps = Math.floor(elapsed / interval)
        lastTime += steps * interval

        for (let s = 0; s < steps; s++) {
          if (cfg.loop && cfg.pingpong && cfg.frames.length > 1) {
            idx += dir
            if (idx >= cfg.frames.length - 1) {
              idx = cfg.frames.length - 1
              dir = -1
            } else if (idx <= 0) {
              idx = 0
              dir = 1
            }
          } else {
            idx += 1
            if (idx >= cfg.frames.length) {
              if (cfg.loop) {
                idx = 0
              } else {
                idx = cfg.frames.length - 1
                const next = cfg.next || 'idle'
                setState(next)
                // 状态切换后本 effect 会重新执行，此处不再继续 schedule
                return
              }
            }
          }
        }
        setFrameIndex(idx)
      }
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [state, manifest, stateTick])

  // Behavior loop: idle/walk/random states, driven by requestAnimationFrame
  useEffect(() => {
    if (!manifest) return
    const { walk_speed, idle_time, random_states, edge_bounce } = manifest.behavior
    const [idleMin, idleMax] = idle_time
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    let phaseEnd = performance.now() + rand(idleMin, idleMax) * 1000
    let vx = walk_speed
    let vy = walk_speed
    let mode: 'idle' | 'walk' = 'idle'
    let lastTime = performance.now()
    let lastFlipX = flipXRef.current
    let rafId = 0

    function loop(now: number) {
      if (now - lastTime >= 16) {
        lastTime = now

        if (mode === 'idle') {
          if (now >= phaseEnd && stateRef.current === 'idle') {
            const candidates = (random_states ?? []).filter((s) => manifestRef.current!.states[s]?.frames.length > 0)
            if (candidates.length > 0) {
              const pick = candidates[Math.floor(Math.random() * candidates.length)]
              setState(pick)
              setFrameIndex(0)
              setStateTick((t) => t + 1)
              phaseEnd = now + 500
            } else if (edge_bounce) {
              mode = 'walk'
              phaseEnd = now + rand(2, 5) * 1000
              const angle = Math.random() * Math.PI * 2
              vx = Math.cos(angle) * walk_speed
              vy = Math.sin(angle) * walk_speed
              if (manifestRef.current!.states.walk) {
                setState('walk')
                setFrameIndex(0)
                setStateTick((t) => t + 1)
              }
            }
          }
        } else {
          const maxX = window.screen.availWidth - manifestRef.current!.window.width
          const maxY = window.screen.availHeight - manifestRef.current!.window.height
          let nx = posRef.current.x + vx
          let ny = posRef.current.y + vy
          if (nx <= 0 || nx >= maxX) {
            vx = -vx
            nx = Math.max(0, Math.min(nx, maxX))
          }
          if (ny <= 0 || ny >= maxY) {
            vy = -vy
            ny = Math.max(0, Math.min(ny, maxY))
          }
          posRef.current = { x: nx, y: ny }
          winRef.current.setPosition(new PhysicalPosition(nx, ny)).catch(console.error)

          const nextFlip = vx < 0
          if (nextFlip !== lastFlipX) {
            lastFlipX = nextFlip
            setFlipX(nextFlip)
          }

          if (now >= phaseEnd) {
            mode = 'idle'
            phaseEnd = now + rand(idleMin, idleMax) * 1000
            if (stateRef.current === 'walk') {
              setState('idle')
            }
          }
        }
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [manifest])

  const currentFrame = manifest?.states[state]?.frames[frameIndex]
  const imageUrl = currentFrame ? imageMap[currentFrame] : undefined

  async function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    dragStart.current = { x: e.screenX, y: e.screenY }
    setMenu((m) => ({ ...m, show: false }))
    if (manifest?.behavior.drag_physics) {
      try {
        await winRef.current.startDragging()
      } catch (err) {
        console.error(err)
      }
    }
  }

  function handleMouseUp(e: React.MouseEvent) {
    const dx = e.screenX - dragStart.current.x
    const dy = e.screenY - dragStart.current.y
    if (Math.sqrt(dx * dx + dy * dy) < 5) {
      handleClick()
    }
  }

  const effectiveFlip = flipOverride ?? flipX

  function triggerClick() {
    const m = manifestRef.current
    if (!m) return
    const target = m.interactions.on_click
    const targetCfg = m.states[target]
    const idleFrames = m.states.idle?.frames ?? []
    const hasDistinctClick =
      targetCfg &&
      targetCfg.frames.length > 0 &&
      !(targetCfg.frames.length === 1 && targetCfg.frames[0] === idleFrames[0])
    if (hasDistinctClick) {
      setState(target)
      setFrameIndex(0)
      setStateTick((t) => t + 1)
    } else {
      setPopKey((k) => k + 1)
    }
  }

  function triggerKey() {
    const m = manifestRef.current
    if (!m) return
    const typingCfg = m.states['typing']
    if (typingCfg && typingCfg.frames.length > 0) {
      setState('typing')
      setFrameIndex(0)
      setStateTick((t) => t + 1)
    } else {
      triggerClick()
    }
  }

  function handleClick() {
    triggerClick()
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, show: true })
  }

  async function closePet() {
    try {
      await invoke('close_pet_window')
    } catch (e) {
      console.error(e)
    }
  }

  if (!petName) {
    return (
      <div className="viewer-root flex h-full w-full items-center justify-center text-xs text-white/50">
        等待选择宠物...
      </div>
    )
  }

  if (petName === LIVE2D_PET_NAME) {
    return <Live2dViewer />
  }

  if (error) {
    return (
      <div className="viewer-root flex h-full w-full items-center justify-center text-xs text-red-400">
        {error}
      </div>
    )
  }

  if (!manifest) {
    return (
      <div className="viewer-root flex h-full w-full items-center justify-center">
        <div className="loading-card flex flex-col items-center justify-center gap-2">
          <div className="loading-ring" />
          <div className="text-[11px] font-medium text-white">Loading {petName}...</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="viewer-root relative"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      style={{
        width: manifest.window.width,
        height: manifest.window.height,
      }}
    >
      {imageUrl ? (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ transform: effectiveFlip ? 'scaleX(-1)' : undefined, pointerEvents: 'none' }}
        >
          <img
            key={popKey}
            src={imageUrl}
            alt={state}
            draggable={false}
            className={
              popKey > 0
                ? 'pet-pop'
                : state === 'idle' && (manifest.states.idle?.frames.length ?? 0) <= 1
                  ? 'pet-breathe'
                  : undefined
            }
            onAnimationEnd={() => setPopKey(0)}
            style={{
              width: manifest.window.width * manifest.window.scale,
              height: manifest.window.height * manifest.window.scale,
              objectFit: 'contain',
            }}
          />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-white/50">No image</div>
      )}

      {menu.show && (
        <div
          className="absolute z-50 rounded border border-slate-300 bg-white/90 shadow"
          style={{ left: menu.x, top: menu.y }}
          onMouseLeave={() => setMenu((m) => ({ ...m, show: false }))}
        >
          <button
            onClick={() => setFlipOverride((v) => !(v ?? flipX))}
            className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
          >
            水平翻转{effectiveFlip ? ' ✓' : ''}
          </button>
          {flipOverride !== null && (
            <button
              onClick={() => setFlipOverride(null)}
              className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
            >
              恢复自动朝向
            </button>
          )}
          <button
            onClick={closePet}
            className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
          >
            关闭宠物
          </button>
        </div>
      )}
    </div>
  )
}
