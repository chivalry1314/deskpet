import { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen } from '@tauri-apps/api/event'
import live2d from '../utils/live2d'
import { getSettings } from '../stores/petStore'

export default function Live2dViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false })

  useEffect(() => {
    document.body.classList.add('viewer-root')
    let cancelled = false

    async function init() {
      try {
        const modelDir = await invoke<string>('get_model_dir')
        if (cancelled || !canvasRef.current) return
        await live2d.load(canvasRef.current, modelDir, 'cat.model3.json')
        if (cancelled) return
        setReady(true)
      } catch (e) {
        if (!cancelled) setError(String(e))
      }
    }
    init()

    return () => {
      cancelled = true
      live2d.destroy()
    }
  }, [])

  useEffect(() => {
    function onResize() {
      live2d.resizeModel()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 键盘联动：触发随机动画
  useEffect(() => {
    let active = true
    let unlistenFn: (() => void) | null = null
    getSettings()
      .then((settings) => {
        if (!settings.key_reaction || !active) return
        return listen('global-key', () => {
          live2d.startRandomMotion('CAT_motion')
        })
      })
      .then((fn) => {
        if (fn) unlistenFn = fn
      })
      .catch(console.error)
    return () => {
      active = false
      unlistenFn?.()
    }
  }, [])

  async function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    setMenu((m) => ({ ...m, show: false }))
    await getCurrentWindow().startDragging()
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

  if (error) {
    return (
      <div
        className="viewer-root flex h-full w-full items-center justify-center p-2 text-center text-xs text-red-400"
        onMouseDown={handleMouseDown}
      >
        {error}
      </div>
    )
  }

  return (
    <div
      className="viewer-root relative h-full w-full"
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
    >
      <canvas ref={canvasRef} id="live2dCanvas" className="h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="loading-card flex flex-col items-center justify-center gap-2">
            <div className="loading-ring" />
            <div className="text-[11px] font-medium text-white">Live2D 加载中...</div>
          </div>
        </div>
      )}
      {menu.show && (
        <div
          className="absolute z-50 rounded border border-slate-300 bg-white/90 shadow"
          style={{ left: menu.x, top: menu.y }}
          onMouseLeave={() => setMenu((m) => ({ ...m, show: false }))}
        >
          <button
            onClick={closePet}
            className="block px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
          >
            关闭宠物
          </button>
        </div>
      )}
    </div>
  )
}
