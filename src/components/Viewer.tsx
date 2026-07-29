import { useEffect, useRef, useState } from 'react'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { getCurrentWindow, PhysicalPosition } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import type { Manifest, Settings } from '../types'
import { getSettings, loadPet, getBaseDataDir } from '../stores/petStore'
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
    console.log('[viewer] manifestRef updated to:', manifest?.name, manifest?.behavior)
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

    loadPet(petName)
      .then(async (m) => {
        console.log('[viewer] loaded manifest behavior:', m.behavior)
        console.time(`[perf] Viewer 加载 ${petName} 帧图`)
        const baseDir = await getBaseDataDir()
        const petDir = `${baseDir.replace(/\\/g, '/')}/pets/${petName}`
        const map: Record<string, string> = {}
        for (const cfg of Object.values(m.states)) {
          for (const frame of cfg.frames) {
            if (!map[frame]) {
              map[frame] = convertFileSrc(`${petDir}/${frame}`)
            }
          }
        }
        imageMapRef.current = map
        console.timeEnd(`[perf] Viewer 加载 ${petName} 帧图`)
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
    console.log('[viewer] behavior loop start, behavior:', manifest.behavior)
    const behavior = manifest.behavior
    const { walk_speed, idle_time, random_states, edge_bounce } = behavior
    const [idleMin, idleMax] = idle_time
    const rand = (a: number, b: number) => a + Math.random() * (b - a)
    let phaseEnd = performance.now() + rand(idleMin, idleMax) * 1000
    let vx = walk_speed
    let vy = walk_speed
    let mode: 'idle' | 'walk' = 'idle'
    let lastTime = performance.now()
    let lastFlipX = flipXRef.current
    let rafId = 0

    function getWalkBounds() {
      const sf = window.devicePixelRatio || 1
      const winW = manifestRef.current!.window.width * sf
      const winH = manifestRef.current!.window.height * sf
      const screenW = window.screen.availWidth * sf
      const screenH = window.screen.availHeight * sf
      const maxX = Math.max(0, screenW - winW)
      const maxY = Math.max(0, screenH - winH)
      return { maxX, maxY }
    }

    function initWalkVelocity() {
      const angle = Math.random() * Math.PI * 2
      vx = Math.cos(angle) * walk_speed
      vy = Math.sin(angle) * walk_speed
    }

    function moveWindow() {
      const walkArea = behavior.walk_area ?? 'screen'
      if (walkArea !== 'screen' && walkArea !== 'spot') {
        console.warn('[viewer] unknown walk_area:', walkArea, 'treating as screen')
      }
      console.log('[viewer] moveWindow walk_area:', walkArea, 'pos:', posRef.current)
      // 原地走模式只播放 walk 动画，不移动窗口位置
      if (walkArea === 'spot') return
      const { maxX, maxY } = getWalkBounds()
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
      winRef.current.setPosition(new PhysicalPosition(Math.round(nx), Math.round(ny))).catch((err) => {
        console.error('[viewer] setPosition failed:', err)
      })

      const nextFlip = vx < 0
      if (nextFlip !== lastFlipX) {
        lastFlipX = nextFlip
        setFlipX(nextFlip)
      }
    }

    function loop(now: number) {
      if (now - lastTime >= 16) {
        lastTime = now

        if (mode === 'idle') {
          if (now >= phaseEnd && stateRef.current === 'idle') {
            const candidates = (random_states ?? []).filter((s) => manifestRef.current!.states[s]?.frames.length > 0)
            if (candidates.length > 0) {
              const pick = candidates[Math.floor(Math.random() * candidates.length)]
              console.log('[viewer] random pick:', pick)
              setState(pick)
              setFrameIndex(0)
              setStateTick((t) => t + 1)

              // 如果 random_states 选中了 walk，则进入游走模式并移动窗口
              if (pick === 'walk') {
                console.log('[viewer] enter walk mode (random_states)')
                mode = 'walk'
                phaseEnd = now + rand(2, 5) * 1000
                initWalkVelocity()
              } else {
                phaseEnd = now + 500
              }
            } else if (edge_bounce) {
              // 兼容旧配置：没有 random_states 但开启了旧版游走开关
              console.log('[viewer] enter walk mode (edge_bounce legacy)')
              mode = 'walk'
              phaseEnd = now + rand(2, 5) * 1000
              initWalkVelocity()
              if (manifestRef.current!.states.walk) {
                setState('walk')
                setFrameIndex(0)
                setStateTick((t) => t + 1)
              }
            }
          }
        } else if (mode === 'walk') {
          if (!dragRef.current.dragging) {
            moveWindow()
          }

          if (now >= phaseEnd || stateRef.current !== 'walk') {
            console.log('[viewer] exit walk mode')
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

  const dragRef = useRef({
    dragging: false,
    started: false,
    startX: 0,
    startY: 0,
    winStartX: 0,
    winStartY: 0,
    hasMoved: false,
    startTime: 0,
  })

  async function handleMouseDown(e: React.MouseEvent) {
    console.log('handleMouseDown', e.button, e.screenX, e.screenY)
    if (e.button !== 0) return
    setMenu((m) => ({ ...m, show: false }))
    const { x, y } = await winRef.current.outerPosition().catch(() => ({ x: posRef.current.x, y: posRef.current.y }))
    dragRef.current = {
      dragging: manifest?.behavior.drag_physics ?? false,
      started: false,
      startX: e.screenX,
      startY: e.screenY,
      winStartX: x,
      winStartY: y,
      hasMoved: false,
      startTime: performance.now(),
    }
    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)
  }

  function handleGlobalMouseMove(e: MouseEvent) {
    if (!dragRef.current.dragging) return
    const dx = e.screenX - dragRef.current.startX
    const dy = e.screenY - dragRef.current.startY
    if (!dragRef.current.started && Math.sqrt(dx * dx + dy * dy) > 3) {
      dragRef.current.started = true
      dragRef.current.hasMoved = true
    }
    if (dragRef.current.started) {
      const sf = window.devicePixelRatio || 1
      const newX = dragRef.current.winStartX + Math.round(dx * sf)
      const newY = dragRef.current.winStartY + Math.round(dy * sf)
      posRef.current = { x: newX, y: newY }
      winRef.current.setPosition(new PhysicalPosition(newX, newY)).catch(console.error)
    }
  }

  function handleGlobalMouseUp(e: MouseEvent) {
    console.log('handleGlobalMouseUp', e.screenX, e.screenY, dragRef.current)
    window.removeEventListener('mousemove', handleGlobalMouseMove)
    window.removeEventListener('mouseup', handleGlobalMouseUp)
    const dx = e.screenX - dragRef.current.startX
    const dy = e.screenY - dragRef.current.startY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const duration = performance.now() - dragRef.current.startTime
    if (!dragRef.current.hasMoved && distance < 5 && duration < 250) {
      handleClick()
    }
    dragRef.current.dragging = false
    dragRef.current.started = false
  }

  function handleClick() {
    console.log('handleClick')
    triggerClick()
  }

  const effectiveFlip = flipOverride ?? flipX

  function triggerClick() {
    const m = manifestRef.current
    if (!m) return
    const target = m.interactions.on_click
    const targetCfg = m.states[target]
    console.log('triggerClick', { target, targetCfg, states: Object.keys(m.states) })
    if (targetCfg && targetCfg.frames.length > 0) {
      setState(target)
      setFrameIndex(0)
      setStateTick((t) => t + 1)
    } else {
      const available = Object.keys(m.states).join(', ')
      console.warn(`on_click 状态「${target}」不存在或没有帧，当前可用状态: ${available}`)
      alert(`点击响应状态「${target}」不存在或没有帧。\n当前可用状态: ${available || '无'}\n请到编辑器「行为配置」中修改「点击响应状态」。`)
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

  function handleContextMenu(e: React.MouseEvent) {
    console.log('handleContextMenu')
    e.preventDefault()
    const m = manifestRef.current
    const width = m?.window.width ?? 150
    const height = m?.window.height ?? 150
    const MENU_WIDTH = 140
    const MENU_HEIGHT = 90
    let x = e.clientX
    let y = e.clientY
    if (x + MENU_WIDTH > width) x = Math.max(0, width - MENU_WIDTH)
    if (y + MENU_HEIGHT > height) y = Math.max(0, height - MENU_HEIGHT)
    setMenu({ x, y, show: true })
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
          className="absolute z-50 min-w-max whitespace-nowrap rounded border border-slate-300 bg-white/90 shadow"
          style={{ left: menu.x, top: menu.y }}
          onMouseLeave={() => setMenu((m) => ({ ...m, show: false }))}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setFlipOverride((v) => !(v ?? flipX))}
            className="block w-full whitespace-nowrap px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
          >
            水平翻转{effectiveFlip ? ' ✓' : ''}
          </button>
          {flipOverride !== null && (
            <button
              onClick={() => setFlipOverride(null)}
              className="block w-full whitespace-nowrap px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
            >
              恢复自动朝向
            </button>
          )}
          <button
            onClick={closePet}
            className="block w-full whitespace-nowrap px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
          >
            关闭宠物
          </button>
        </div>
      )}
    </div>
  )
}
